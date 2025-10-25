// (() => {
//   if (window.__LEXI_WIDGET__) return;
//   window.__LEXI_WIDGET__ = true;

//   function onReady(fn) {
//     document.readyState !== "loading"
//       ? fn()
//       : document.addEventListener("DOMContentLoaded", fn);
//   }

//   const px = (v, fallback) => {
//     if (v == null || v === "") return fallback;
//     return /^[\d.]+$/.test(String(v)) ? `${v}px` : String(v);
//   };

//   onReady(() => {
//     const s = document.currentScript;
//     const ds = (s && s.dataset) || {};

//     // ----- config -----
//     const right = px(ds.right, pos === "right" ? "20px" : "");
//     const left = px(ds.left, pos === "left" ? "20px" : "");
//     if (right) iframe.style.right = right;
//     if (left) iframe.style.left = left;

//     // computed offsets
//     const bottomPx = parseFloat(ds.bottom ?? "20") || 20;
//     const rightPx =
//       parseFloat(ds.right ?? (pos === "right" ? "20" : "")) ||
//       (pos === "right" ? 20 : 0);
//     const leftPx =
//       parseFloat(ds.left ?? (pos === "left" ? "20" : "")) ||
//       (pos === "left" ? 20 : 0);
//     const CLOSED_W = Number(ds.closedWidth || 64);
//     const CLOSED_H = Number(ds.closedHeight || 64);
//     const OPEN_W = Number(ds.width || 380);
//     const OPEN_H = Number(ds.height || 600);
//     const z = Number(ds.zindex || 2147483647);

//     // Build iframe URL with params
//     const src =
//       ds.src ||
//       ds["src"] ||
//       ds["data-src"] ||
//       "https://cdn.yourdomain.com/widget/index.html";
//     const url = new URL(src);
//     if (ds.apiUrl) url.searchParams.set("apiUrl", ds.apiUrl);
//     if (ds.companyId) url.searchParams.set("companyId", ds.companyId);
//     url.searchParams.set("theme", ds.theme || "dark");
//     url.searchParams.set("position", pos);
//     url.searchParams.set("embedded", "1");

//     // ----- launcher button (outside iframe) -----
//     const launcher = document.createElement("button");
//     launcher.type = "button";
//     launcher.setAttribute("aria-label", "Open chat");
//     launcher.style.position = "fixed";
//     launcher.style.bottom = px(bottomPx, "20px");
//     if (pos === "right") {
//       launcher.style.right = px(rightPx, "20px");
//     } else {
//       launcher.style.left = px(leftPx, "20px");
//     }
//     launcher.style.width = CLOSED_W + "px";
//     launcher.style.height = CLOSED_H + "px";
//     launcher.style.borderRadius = "50%";
//     launcher.style.border = "none";
//     launcher.style.cursor = "pointer";
//     launcher.style.display = "grid";
//     launcher.style.placeItems = "center";
//     launcher.style.color = "#fff";
//     launcher.style.fontSize = "22px";
//     launcher.style.background = "linear-gradient(135deg, #7b5cff, #5ce1e6)";
//     launcher.style.boxShadow = "0 10px 28px rgba(0,0,0,0.28)";
//     launcher.style.backdropFilter = "blur(10px)";
//     launcher.style.transition = "transform 0.18s ease, box-shadow 0.18s ease";
//     // launcher (stays at bottomPx)
//     launcher.style.zIndex = String(z);
//     launcher.textContent = "✦";

//     // hover/active
//     launcher.addEventListener("pointerenter", () => {
//       launcher.style.transform = "scale(1.05)";
//       launcher.style.boxShadow = "0 14px 36px rgba(0,0,0,0.34)";
//     });
//     launcher.addEventListener("pointerleave", () => {
//       launcher.style.transform = "none";
//       launcher.style.boxShadow = "0 10px 28px rgba(0,0,0,0.28)";
//     });
//     launcher.addEventListener("pointerdown", () => {
//       launcher.style.transform = "scale(0.98)";
//     });
//     launcher.addEventListener("pointerup", () => {
//       launcher.style.transform = "scale(1.05)";
//     });

//     document.body.appendChild(launcher);

//     // ----- chat iframe (hidden until open) -----
//     const iframe = document.createElement("iframe");
//     iframe.src = url.toString();
//     iframe.title = ds.title || "Lexi Chat";
//     iframe.setAttribute("aria-label", "Lexi Chat");
//     iframe.allow = "clipboard-read; clipboard-write; microphone *";
//     iframe.sandbox = [
//       "allow-scripts",
//       "allow-same-origin",
//       "allow-forms",
//       "allow-popups",
//       "allow-downloads",
//       "allow-modals",
//       "allow-popups-to-escape-sandbox",
//     ].join(" ");

//     iframe.style.position = "fixed";
//     iframe.style.border = "none";
//     iframe.style.overflow = "hidden";
//     iframe.style.background = "transparent";
//     iframe.style.boxShadow = "0 18px 48px rgba(0,0,0,0.28)";
//     iframe.style.transition =
//       "transform 0.38s cubic-bezier(0.21,1.02,0.35,1), opacity 0.28s ease-out";
//     iframe.style.willChange = "transform, opacity";
//     iframe.style.zIndex = z;

//     // size & placement when open (bottom is above the launcher + 16px gap)
//     const chatBottom = bottomPx + CLOSED_H + 16;

//     iframe.style.position = "fixed";
//     iframe.style.width = OPEN_W + "px";
//     iframe.style.height = OPEN_H + "px";
//     iframe.style.bottom = chatBottom + "px"; // <— ensures chat sits above launcher
//     if (pos === "right") iframe.style.right = rightPx + "px";
//     else iframe.style.left = leftPx + "px";
//     iframe.style.borderRadius = "18px";
//     iframe.style.boxShadow = "0 18px 48px rgba(0,0,0,0.28)";
//     iframe.style.background = "transparent";
//     iframe.style.zIndex = String(z - 1); // launcher stays clickable above
//     iframe.style.transition =
//       "transform 0.38s cubic-bezier(0.21,1.02,0.35,1), opacity 0.28s ease-out";
//     iframe.style.willChange = "transform, opacity";
//     iframe.style.display = "none";
//     iframe.style.pointerEvents = "none";

//     document.body.appendChild(iframe);

//     let isOpen = false;

//     const open = () => {
//       if (isOpen) return;
//       isOpen = true;
//       launcher.classList.add("lexi-active");
//       iframe.style.display = "block";
//       requestAnimationFrame(() => {
//         iframe.style.opacity = "1";
//         iframe.style.transform = "translateY(0) scale(1)";
//         iframe.style.pointerEvents = "auto";
//       });
//       iframe.contentWindow?.postMessage({ type: "lexi:open" }, "*");
//     };

//     const close = () => {
//       if (!isOpen) return;
//       isOpen = false;
//       launcher.classList.remove("lexi-active");
//       iframe.style.opacity = "0";
//       iframe.style.transform = "translateY(16px) scale(0.96)";
//       iframe.style.pointerEvents = "none";
//       // hide after transition
//       setTimeout(() => {
//         if (!isOpen) iframe.style.display = "none";
//       }, 380);
//       iframe.contentWindow?.postMessage({ type: "lexi:close" }, "*");
//     };

//     launcher.addEventListener("click", () => (isOpen ? close() : open()));

//     // Handle messages from inside the iframe (your component already posts these)
//     const origin = (() => {
//       try {
//         return new URL(iframe.src).origin;
//       } catch {
//         return "*";
//       }
//     })();
//     window.addEventListener("message", (ev) => {
//       if (ev.source !== iframe.contentWindow) return;
//       if (origin !== "*" && ev.origin !== origin) return;
//       const msg = ev.data || {};

//       if (msg.type === "lexi:open") open();
//       if (msg.type === "lexi:close") close();

//       // optional dynamic resize from inside
//       if (msg.type === "lexi:size" && msg.payload) {
//         iframe.style.width = (msg.payload.w ?? OPEN_W) + "px";
//         iframe.style.height = (msg.payload.h ?? OPEN_H) + "px";
//       }
//     });

//     // Host API
//     window.lexi = window.lexi || {};
//     window.lexi.open = open;
//     window.lexi.close = close;
//   });
// })();

// (() => {
//   if (window.__LEXI_WIDGET__) return;
//   window.__LEXI_WIDGET__ = true;

//   function onReady(fn) {
//     document.readyState !== "loading"
//       ? fn()
//       : document.addEventListener("DOMContentLoaded", fn);
//   }
//   onReady(() => {
//     const ds = (document.currentScript && document.currentScript.dataset) || {};
//     const pos = (ds.position || "right").toLowerCase();

//     // Offsets & sizes
//     const bottomPx = Number(ds.bottom ?? 20); // launcher bottom
//     const rightPx = Number(ds.right ?? (pos === "right" ? 20 : 0));
//     const leftPx = Number(ds.left ?? (pos === "left" ? 20 : 0));
//     const CLOSED_W = Number(ds.closedWidth ?? 64);
//     const CLOSED_H = Number(ds.closedHeight ?? 64);
//     const OPEN_W = Number(ds.width ?? 380);
//     const OPEN_H = Number(ds.height ?? 600);
//     const z = Number(ds.zindex ?? 2147483647);

//     // Build iframe URL
//     const src =
//       ds.src ||
//       ds["data-src"] ||
//       "https://cdn.yourdomain.com/widget/index.html";
//     const url = new URL(src);
//     if (ds.apiUrl) url.searchParams.set("apiUrl", ds.apiUrl);
//     if (ds.companyId) url.searchParams.set("companyId", ds.companyId);
//     url.searchParams.set("theme", ds.theme || "dark");
//     url.searchParams.set("position", pos);
//     url.searchParams.set("embedded", "1");

//     // ----- LAUNCHER (stays 20px) -----
//     const launcher = document.createElement("button");
//     launcher.type = "button";
//     launcher.setAttribute("aria-label", "Open chat");
//     launcher.textContent = "✦";
//     launcher.style.cssText = `
//       position:fixed; border:none; cursor:pointer; display:grid; place-items:center;
//       width:${CLOSED_W}px; height:${CLOSED_H}px; border-radius:50%;
//       background:linear-gradient(135deg,#7b5cff,#5ce1e6); color:#fff; font-size:22px;
//       box-shadow:0 10px 28px rgba(0,0,0,.28); backdrop-filter:blur(10px);
//       bottom:${bottomPx}px; ${
//       pos === "right" ? `right:${rightPx}px;` : `left:${leftPx}px;`
//     }
//       z-index:${z};
//       transition:transform .18s ease, box-shadow .18s ease;
//     `;
//     document.body.appendChild(launcher);

//     // ----- CHAT IFRAME (opens at 100px = 20 + 64 + 16) -----
//     const chatBottom = bottomPx + CLOSED_H + 16; // <<< 100 when bottom=20, closedH=64
//     const iframe = document.createElement("iframe");
//     document.body.appendChild(iframe);

//     iframe.src = url.toString();
//     iframe.title = ds.title || "Lexi Chat";
//     iframe.allow = "clipboard-read; clipboard-write; microphone *";
//     iframe.sandbox = [
//       "allow-scripts",
//       "allow-same-origin",
//       "allow-forms",
//       "allow-popups",
//       "allow-downloads",
//       "allow-modals",
//       "allow-popups-to-escape-sandbox",
//     ].join(" ");
//     iframe.style.cssText = `
//       position:fixed; border:none; overflow:hidden; background:transparent;
//       width:${OPEN_W}px; height:${OPEN_H}px; border-radius:18px;
//       bottom:${chatBottom}px; ${
//       pos === "right" ? `right:${rightPx}px;` : `left:${leftPx}px;`
//     }
//       box-shadow:0 18px 48px rgba(0,0,0,.28);
//       z-index:${z - 1}; display:none; pointer-events:none; opacity:0;
//       transform:translateY(16px) scale(.96);
//       transition:transform .38s cubic-bezier(.21,1.02,.35,1), opacity .28s ease-out;
//       will-change:transform,opacity;
//     `;

//     let open = false;
//     const doOpen = () => {
//       if (open) return;
//       open = true;
//       iframe.style.display = "block";
//       requestAnimationFrame(() => {
//         iframe.style.opacity = "1";
//         iframe.style.transform = "translateY(0) scale(1)";
//         iframe.style.pointerEvents = "auto";
//       });
//       iframe.contentWindow?.postMessage({ type: "lexi:open" }, "*");
//     };
//     const doClose = () => {
//       if (!open) return;
//       open = false;
//       iframe.style.opacity = "0";
//       iframe.style.transform = "translateY(16px) scale(.96)";
//       iframe.style.pointerEvents = "none";
//       setTimeout(() => {
//         if (!open) iframe.style.display = "none";
//       }, 380);
//       iframe.contentWindow?.postMessage({ type: "lexi:close" }, "*");
//     };

//     launcher.addEventListener("click", () => (open ? doClose() : doOpen()));

//     // Allow inside-frame controls to open/close/resize
//     const origin = (() => {
//       try {
//         return new URL(iframe.src).origin;
//       } catch {
//         return "*";
//       }
//     })();
//     window.addEventListener("message", (ev) => {
//       if (ev.source !== iframe.contentWindow) return;
//       if (origin !== "*" && ev.origin !== origin) return;
//       const msg = ev.data || {};
//       if (msg.type === "lexi:open") doOpen();
//       if (msg.type === "lexi:close") doClose();
//       if (msg.type === "lexi:size" && msg.payload) {
//         if (msg.payload.w) iframe.style.width = msg.payload.w + "px";
//         if (msg.payload.h) iframe.style.height = msg.payload.h + "px";
//       }
//     });

//     // Optional host API
//     window.lexi = window.lexi || {};
//     window.lexi.open = doOpen;
//     window.lexi.close = doClose;
//   });
// })();

(() => {
  if (window.__LEXI_WIDGET__) return;
  window.__LEXI_WIDGET__ = true;

  function onReady(fn) {
    document.readyState !== "loading"
      ? fn()
      : document.addEventListener("DOMContentLoaded", fn);
  }

  function px(v, fallback) {
    if (v == null || v === "") return fallback;
    return /^[\d.]+$/.test(String(v)) ? `${v}px` : String(v);
  }

  onReady(() => {
    const script = document.currentScript;
    const ds = (script && script.dataset) || {};

    const apiUrl = ds.apiUrl || "";
    const companyId = ds.companyId || "";
    const theme = (ds.theme || "dark").toLowerCase();
    const position = (ds.position || "right").toLowerCase(); // 'left'|'right'
    const launcherBottom = px(ds.bottom, "20px"); // optional overrides
    const launcherSide = px(ds.side, "20px");
    const zIndex = ds.zIndex || "2147483000";

    if (!companyId) {
      console.error("[Lexi] Missing data-company-id on <script>.");
    }

    // --- Robust fallback for iframe URL:
    // 1) Prefer data-src (your explicit iframe URL)
    // 2) Otherwise, derive "<loader_dir>/index.html" from the loader's own src
    const loaderSrc = script?.getAttribute("src") || "";
    const defaultBase = new URL("index.html", new URL(loaderSrc, location.href))
      .href;
    const iframeBase = ds.src || defaultBase; // <-- data-src wins

    const iframeUrl = appendParams(iframeBase, {
      companyId,
      apiUrl,
      theme,
      position,
    });

    // Iframe (initially hidden)
    const iframe = document.createElement("iframe");
    iframe.src = iframeUrl;
    iframe.allow = "clipboard-write *; autoplay *";
    iframe.loading = "eager";
    iframe.style.position = "fixed";
    iframe.style.border = "0";
    iframe.style.width = "0";
    iframe.style.height = "0";
    iframe.style.opacity = "0";
    iframe.style.pointerEvents = "none";
    iframe.style.transition = "opacity .2s ease, transform .2s ease";
    iframe.style.zIndex = String(parseInt(zIndex) - 1);

    // Position based on side
    const sideProp = position === "left" ? "left" : "right";
    iframe.style[sideProp] = launcherSide;
    iframe.style.bottom = launcherBottom;

    document.body.appendChild(iframe);

    // External launcher button
    const btn = document.createElement("button");
    btn.setAttribute("aria-label", "Open chat");
    btn.innerHTML = "✦";
    Object.assign(btn.style, {
      position: "fixed",
      width: "64px",
      height: "64px",
      [sideProp]: launcherSide,
      bottom: launcherBottom,
      borderRadius: "50%",
      border: "none",
      cursor: "pointer",
      display: "grid",
      placeItems: "center",
      fontSize: "22px",
      color: "#fff",
      background: "linear-gradient(135deg, #7b5cff, #5ce1e6)",
      boxShadow: "0 10px 28px rgba(0,0,0,.28)",
      backdropFilter: "blur(10px)",
      zIndex,
      pointerEvents: "auto",
    });
    document.body.appendChild(btn);

    let isOpen = false;

    function open() {
      if (isOpen) return;
      isOpen = true;
      // size iframe like your window
      const w = Math.min(380, window.innerWidth);
      const h = Math.min(600, window.innerHeight);
      iframe.style.width = w + "px";
      iframe.style.height = h + "px";
      iframe.style.pointerEvents = "auto";
      iframe.style.opacity = "1";
      // Nudge from bottom-right/left (matches your SCSS)
      iframe.style.transform = "translateY(0)";
      // Tell child to open its internal state
      iframe.contentWindow?.postMessage({ type: "lexi:open" }, "*");
      // Subtle launcher tuck
      btn.style.transform = "scale(.9)";
      btn.style.boxShadow = "0 8px 22px rgba(0,0,0,.24)";
    }

    function close() {
      if (!isOpen) return;
      isOpen = false;
      iframe.style.pointerEvents = "none";
      iframe.style.opacity = "0";
      iframe.style.width = "0";
      iframe.style.height = "0";
      iframe.style.transform = "translateY(6px)";
      iframe.contentWindow?.postMessage({ type: "lexi:close" }, "*");
      btn.style.transform = "scale(1)";
      btn.style.boxShadow = "0 10px 28px rgba(0,0,0,.28)";
    }

    btn.addEventListener("click", () => {
      isOpen ? close() : open();
    });

    // Child → parent events
    window.addEventListener("message", (e) => {
      const t = e?.data?.type;
      if (t === "lexi:open") {
        open();
      } else if (t === "lexi:close") {
        close();
      } else if (t === "lexi:resize") {
        // Optional: child can ask a resize: {type:'lexi:resize', width, height}
        const { width, height } = e.data || {};
        if (width && height) {
          iframe.style.width = px(width, iframe.style.width);
          iframe.style.height = px(height, iframe.style.height);
        }
      }
    });

    // Mobile: make iframe full screen when open
    function handleResize() {
      if (!isOpen) return;
      const small = window.matchMedia("(max-width: 600px)").matches;
      if (small) {
        iframe.style.width = "100vw";
        iframe.style.height = "100vh";
        iframe.style[sideProp] = "0";
        iframe.style.bottom = "0";
      } else {
        iframe.style[sideProp] = launcherSide;
        iframe.style.bottom = launcherBottom;
        iframe.style.width = Math.min(380, window.innerWidth) + "px";
        iframe.style.height = Math.min(600, window.innerHeight) + "px";
      }
    }
    window.addEventListener("resize", handleResize);
  });
})();
