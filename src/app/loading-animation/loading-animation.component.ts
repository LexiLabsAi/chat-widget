import {
  Component,
  AfterViewInit,
  Input,
  ViewChild,
  ElementRef,
} from '@angular/core';
import * as THREE from 'three';

type Mode = 'idle' | 'opening' | 'open';

@Component({
  selector: 'jhi-loading-animation',
  standalone: true,
  templateUrl: './loading-animation.component.html',
  styleUrls: ['./loading-animation.component.scss'],
})
export class LoadingAnimationComponent implements AfterViewInit {
  @Input() canvasSize = 100;

  // Lighter stroke by default
  @Input() strokeColorA = '#AECBFF';
  @Input() strokeColorB = '#E6F4FF';
  @Input() baseGlowOpacity = 0.32; // a bit brighter so outline is always visible
  @Input() stripeOpacity = 0.9;
  @Input() stripeWidthPx = 12;
  @Input() glowStripeCount = 6;
  @Input() tubeRadius = 2;

  // Timings & speeds
  @Input() animDurationMs = 1800;
  @Input() idleStrokeSpeed = 0.35; // degrees/second equivalent (converted to UV below)
  @Input() openingStrokeSpeed = 1.2;
  @Input() openStrokeSpeed = 0.55;

  // Geometry resolution
  private tubularSegments = 200;
  private radialSegments = 24;

  @ViewChild('wrap', { static: true }) wrapRef!: ElementRef<HTMLDivElement>;

  private circlePathRadius = 26;

  private mode: Mode = 'idle';
  private openStart = 0;
  private openTotal = 1800;

  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private renderer!: THREE.WebGLRenderer;

  private mesh!: THREE.Mesh<THREE.TubeGeometry, THREE.MeshBasicMaterial>;
  private group = new THREE.Group();

  private sourcePositions!: Float32Array;
  private targetPositions!: Float32Array;

  ngAfterViewInit(): void {
    this.openTotal = this.animDurationMs;
    this.initScene();
    this.setIdleMode();
    this.animate();
  }

  startOpenSequence(): void {
    this.mode = 'opening';
    this.openStart = performance.now();
    this.mesh.scale.set(1, 1, 1);
    this.mesh.rotation.set(0, 0, 0);
  }

  backToIdle(): void {
    const posAttr = this.mesh.geometry.getAttribute(
      'position'
    ) as THREE.BufferAttribute;
    posAttr.array.set(this.sourcePositions);
    posAttr.needsUpdate = true;
    this.mesh.geometry.computeVertexNormals();

    this.mesh.rotation.set(0, 0, 0);
    this.mesh.scale.set(1, 1, 1);
    this.setIdleMode();
  }

  private setIdleMode(): void {
    this.mode = 'idle';
    this.group.rotation.set(0, 0, 0);
    this.group.position.set(0, 0, 0);
  }

  private setOpenMode(): void {
    this.mode = 'open';
    const posAttr = this.mesh.geometry.getAttribute(
      'position'
    ) as THREE.BufferAttribute;
    posAttr.array.set(this.targetPositions);
    posAttr.needsUpdate = true;
    this.mesh.geometry.computeVertexNormals();
    this.mesh.rotation.set(0, 0, 0);
    this.mesh.scale.set(1, 1, 1);
  }

  private initScene(): void {
    this.camera = new THREE.PerspectiveCamera(65, 1, 1, 10000);
    this.camera.position.z = 170;

    this.scene = new THREE.Scene();
    this.scene.add(this.group);

    // Bubble with RIGHT-side tail, centered
    class ChatBubblePath extends THREE.Curve<THREE.Vector3> {
      constructor(
        private R = 26,
        private tailDepth = 12,
        private tailAngle = (Math.PI * 7) / 4, // 315° bottom-right
        private tailWidthDeg = 30
      ) {
        super();
      }
      override getPoint(t: number): THREE.Vector3 {
        const TWO_PI = Math.PI * 2;
        const baseW = (this.tailWidthDeg * Math.PI) / 180;
        const a0 = this.tailAngle - baseW / 2;
        const a1 = this.tailAngle + baseW / 2;

        const arcLen1 = a0 >= 0 ? a0 : a0 + TWO_PI;
        const arcLen2 = TWO_PI - (a1 >= 0 ? a1 : a1 + TWO_PI);
        const tailLen = baseW;
        const wOut = tailLen * 0.5;
        const wBack = tailLen * 0.5;

        const total = arcLen1 + wOut + wBack + arcLen2;
        const p = t * total;

        let x = 0,
          y = 0;
        if (p < arcLen1) {
          const ang = p;
          x = this.R * Math.cos(ang);
          y = this.R * Math.sin(ang);
        } else if (p < arcLen1 + wOut) {
          const u = (p - arcLen1) / wOut;
          const bx = this.R * Math.cos(a0),
            by = this.R * Math.sin(a0);
          const tx = (this.R + this.tailDepth) * Math.cos(this.tailAngle);
          const ty = (this.R + this.tailDepth) * Math.sin(this.tailAngle);
          x = bx + u * (tx - bx);
          y = by + u * (ty - by);
        } else if (p < arcLen1 + wOut + wBack) {
          const u = (p - (arcLen1 + wOut)) / wBack;
          const tx = (this.R + this.tailDepth) * Math.cos(this.tailAngle);
          const ty = (this.R + this.tailDepth) * Math.sin(this.tailAngle);
          const bx = this.R * Math.cos(a1),
            by = this.R * Math.sin(a1);
          x = tx + u * (bx - tx);
          y = ty + u * (by - ty);
        } else {
          const u = (p - (arcLen1 + wOut + wBack)) / arcLen2;
          const ang = a1 + u * (TWO_PI - a1);
          x = this.R * Math.cos(ang);
          y = this.R * Math.sin(ang);
        }

        const z = 0.35 * Math.sin(t * 4 * Math.PI);
        return new THREE.Vector3(x, y, z);
      }
    }

    class CirclePath extends THREE.Curve<THREE.Vector3> {
      constructor(private R: number) {
        super();
      }
      override getPoint(t: number): THREE.Vector3 {
        const a = t * Math.PI * 2;
        return new THREE.Vector3(Math.cos(a) * this.R, Math.sin(a) * this.R, 0);
      }
    }

    const sourceCurve = new ChatBubblePath(
      this.circlePathRadius,
      12,
      (Math.PI * 7) / 4,
      30
    );
    const circleCurve = new CirclePath(this.circlePathRadius);

    // Animated stroke texture
    const strokeTex = this.createStrokeTexture(
      this.strokeColorA,
      this.strokeColorB,
      this.stripeWidthPx,
      this.baseGlowOpacity,
      this.stripeOpacity,
      this.glowStripeCount
    );
    // IMPORTANT: enable repeat on T (vertical) so scrolling Y works on all UV layouts
    strokeTex.wrapS = THREE.RepeatWrapping;
    strokeTex.wrapT = THREE.RepeatWrapping; // <— key change
    strokeTex.repeat.set(1, this.glowStripeCount); // stripes repeated along V (around the tube)
    strokeTex.offset.set(0, 0);
    strokeTex.matrixAutoUpdate = true;

    const material = new THREE.MeshBasicMaterial({
      map: strokeTex.clone(), // clone so this instance owns its offset/repeat
      transparent: true,
      opacity: 1,
      side: THREE.DoubleSide,
    });

    const sourceGeom = new THREE.TubeGeometry(
      sourceCurve,
      this.tubularSegments,
      this.tubeRadius,
      this.radialSegments,
      true
    );
    this.sourcePositions = (
      sourceGeom.getAttribute('position') as THREE.BufferAttribute
    ).array.slice(0) as Float32Array;
    this.mesh = new THREE.Mesh(sourceGeom, material);
    this.group.add(this.mesh);

    const targetGeom = new THREE.TubeGeometry(
      circleCurve,
      this.tubularSegments,
      this.tubeRadius,
      this.radialSegments,
      true
    );
    this.targetPositions = (
      targetGeom.getAttribute('position') as THREE.BufferAttribute
    ).array.slice(0) as Float32Array;
    targetGeom.dispose();

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.setSize(this.canvasSize, this.canvasSize);
    this.renderer.setClearColor(0x000000, 0);
    this.wrapRef.nativeElement.appendChild(this.renderer.domElement);
  }

  private createStrokeTexture(
    colorA: string,
    colorB: string,
    stripePx: number,
    baseOpacity: number,
    stripeOpacity: number,
    heads: number
  ): THREE.Texture {
    const W = 1024,
      H = 64;
    const c = document.createElement('canvas');
    c.width = W;
    c.height = H;
    const g = c.getContext('2d')!;

    // Base glow
    g.fillStyle = `rgba(230,244,255,${this.clamp(baseOpacity, 0, 1)})`;
    g.fillRect(0, 0, W, H);

    // Repeating gradient “heads”
    const stripeHalf = Math.max(2, Math.floor(stripePx / 2));
    const headWidth = Math.floor(W / heads);
    for (let i = 0; i < heads; i++) {
      const x0 = i * headWidth;
      const gradV = g.createLinearGradient(
        0,
        H / 2 - stripeHalf,
        0,
        H / 2 + stripeHalf
      );
      gradV.addColorStop(0, `rgba(0,0,0,0)`);
      gradV.addColorStop(0.25, this.hexToRgba(colorA, stripeOpacity * 0.9));
      gradV.addColorStop(0.5, this.hexToRgba(colorB, stripeOpacity));
      gradV.addColorStop(0.75, this.hexToRgba(colorA, stripeOpacity * 0.9));
      gradV.addColorStop(1, `rgba(0,0,0,0)`);
      g.fillStyle = gradV;

      const feather = Math.floor(headWidth * 0.25);
      const x1 = x0 + headWidth;
      g.save();
      g.beginPath();
      g.moveTo(x0, H / 2 - stripeHalf);
      g.lineTo(x0 + feather, H / 2 - stripeHalf);
      g.lineTo(x1 - feather, H / 2 - stripeHalf);
      g.lineTo(x1, H / 2 - stripeHalf);
      g.lineTo(x1, H / 2 + stripeHalf);
      g.lineTo(x1 - feather, H / 2 + stripeHalf);
      g.lineTo(x0 + feather, H / 2 + stripeHalf);
      g.lineTo(x0, H / 2 + stripeHalf);
      g.closePath();
      g.fill();
      g.restore();
    }

    const tex = new THREE.Texture(c);
    tex.needsUpdate = true;
    return tex;
  }

  private animate(): void {
    const now = performance.now();
    const mat = this.mesh.material as THREE.MeshBasicMaterial;
    const map = mat.map!;

    // Convert “degrees per second” to UV offset per ms on V axis
    const uvPerMs = (degPerSec: number) => degPerSec / 360 / 1000;

    if (this.mode === 'idle') {
      // scroll along V (Y) so it works regardless of TubeGeometry UV orientation
      map.offset.y =
        (map.offset.y +
          uvPerMs(this.idleStrokeSpeed) * (now - (this as any)._t || 0)) %
        1;
      map.needsUpdate = true;
    } else if (this.mode === 'opening') {
      const phase = this.clamp((now - this.openStart) / this.openTotal, 0, 1);
      const m = this.easeInOutQuad(phase);

      const posAttr = this.mesh.geometry.getAttribute(
        'position'
      ) as THREE.BufferAttribute;
      const arr = posAttr.array as Float32Array;
      const a = this.sourcePositions;
      const b = this.targetPositions;
      for (let i = 0; i < arr.length; i++) arr[i] = a[i] * (1 - m) + b[i] * m;
      posAttr.needsUpdate = true;
      this.mesh.geometry.computeVertexNormals();

      const scale = 1 - 0.08 * m;
      this.mesh.scale.set(scale, scale, scale);

      const speed = this.lerp(
        this.idleStrokeSpeed,
        this.openingStrokeSpeed,
        this.easeInOutQuad(phase)
      );
      map.offset.y =
        (map.offset.y + uvPerMs(speed) * (now - (this as any)._t || 0)) % 1;
      map.needsUpdate = true;

      if (phase >= 1) this.setOpenMode();
    } else if (this.mode === 'open') {
      map.offset.y =
        (map.offset.y +
          uvPerMs(this.openStrokeSpeed) * (now - (this as any)._t || 0)) %
        1;
      map.needsUpdate = true;
    }

    (this as any)._t = now; // save last timestamp

    this.renderer.render(this.scene, this.camera);
    requestAnimationFrame(() => this.animate());
  }

  private clamp(v: number, a: number, b: number) {
    return Math.max(a, Math.min(b, v));
  }
  private lerp(a: number, b: number, t: number) {
    return a + (b - a) * t;
  }
  private easeInOutQuad(t: number): number {
    return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
  }
  private hexToRgba(hex: string, alpha = 1) {
    const m = hex.replace('#', '');
    const bigint = parseInt(
      m.length === 3
        ? m
            .split('')
            .map((c) => c + c)
            .join('')
        : m,
      16
    );
    const r = (bigint >> 16) & 255,
      g = (bigint >> 8) & 255,
      b = bigint & 255;
    return `rgba(${r},${g},${b},${this.clamp(alpha, 0, 1)})`;
  }
}

// Chat bubble outline (rounded rect + right-side tail), clockwise, centered at (0,0)
// Chat bubble = circular outline with a right-side tail.
// Path is centered at (0,0), clockwise, and closed.
// Use same tubularSegments/radialSegments/tubeRadius as your circle target so morphing is smooth.
class ChatBubblePath extends THREE.Curve<THREE.Vector3> {
  constructor(
    private R = 26, // bubble circle radius (matches your circle target ~ Ring 24–28)
    private tailDepth = 12, // how far the tail sticks out (px)
    private tailAngle = (Math.PI * 7) / 4, // center angle of the tail (315° = bottom-right)
    private tailWidthDeg = 28 // angular width of the tail base (degrees)
  ) {
    super();
  }

  private clamp(v: number, a: number, b: number) {
    return Math.max(a, Math.min(b, v));
  }

  override getPoint(t: number): THREE.Vector3 {
    // Angles
    const TWO_PI = Math.PI * 2;
    const baseW = (this.tailWidthDeg * Math.PI) / 180; // tail base angular width (radians)
    const a0 = this.tailAngle - baseW / 2; // start of tail window
    const a1 = this.tailAngle + baseW / 2; // end of tail window

    // We split the 0..1 domain into: arc (0->a0), tail out, tail back, arc (a1->2π).
    // Convert t in [0,1) to an angle-like progress with proper segment proportions.
    // Segment proportions: big arcs + small tail legs.
    const arcLen1 = a0 >= 0 ? a0 : a0 + TWO_PI; // from 0 to a0 clockwise
    const arcLen2 = TWO_PI - (a1 >= 0 ? a1 : a1 + TWO_PI); // from a1 to 2π
    const tailLen = baseW; // we’ll map this to two straight legs
    const wOut = tailLen * 0.5;
    const wBack = tailLen * 0.5;

    const total = arcLen1 + wOut + wBack + arcLen2;

    let x = 0,
      y = 0;

    // Map t to segment
    const p = t * total;

    if (p < arcLen1) {
      // Arc 0 -> a0
      const ang = p;
      x = this.R * Math.cos(ang);
      y = this.R * Math.sin(ang);
    } else if (p < arcLen1 + wOut) {
      // Tail out: from base at a0 to tip (radially outward from tailAngle)
      const u = (p - arcLen1) / wOut; // 0..1
      const angBase = a0;
      const bx = this.R * Math.cos(angBase);
      const by = this.R * Math.sin(angBase);

      // Tail tip along outward normal at tailAngle (center of tail)
      const tx = (this.R + this.tailDepth) * Math.cos(this.tailAngle);
      const ty = (this.R + this.tailDepth) * Math.sin(this.tailAngle);

      x = bx + u * (tx - bx);
      y = by + u * (ty - by);
    } else if (p < arcLen1 + wOut + wBack) {
      // Tail back: from tip back to base at a1
      const u = (p - (arcLen1 + wOut)) / wBack; // 0..1
      const tx = (this.R + this.tailDepth) * Math.cos(this.tailAngle);
      const ty = (this.R + this.tailDepth) * Math.sin(this.tailAngle);

      const angBase = a1;
      const bx = this.R * Math.cos(angBase);
      const by = this.R * Math.sin(angBase);

      x = tx + u * (bx - tx);
      y = ty + u * (by - ty);
    } else {
      // Arc a1 -> 2π
      const u = (p - (arcLen1 + wOut + wBack)) / arcLen2; // 0..1
      const ang = a1 + u * (TWO_PI - a1);
      x = this.R * Math.cos(ang);
      y = this.R * Math.sin(ang);
    }

    // Subtle depth (keeps that premium feel)
    const z = 0.4 * Math.sin(t * 4 * Math.PI);
    return new THREE.Vector3(x, y, z);
  }
}
