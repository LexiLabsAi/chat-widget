// (() => {
//   if (window.__LEXI_WIDGET__) return;
//   window.__LEXI_WIDGET__ = true;

//   // ⚠️ Capture the script element NOW (while this script is executing)
//   const SCRIPT_EL =
//     document.currentScript ||
//     Array.from(document.getElementsByTagName("script")).find((s) =>
//       (s.getAttribute("src") || "").includes("lexi-loader")
//     );

//   function onReady(fn) {
//     document.readyState !== "loading"
//       ? fn()
//       : document.addEventListener("DOMContentLoaded", fn);
//   }

//   function pxNum(v, fallback = 0) {
//     if (v == null || v === "") return fallback;
//     const m = String(v).match(/[\d.]+/);
//     return m ? parseFloat(m[0]) : fallback;
//   }

//   // Tune this if you change CSS:
//   const INTERNAL_WINDOW_BOTTOM = 100; // .lexi-window { bottom: 100px }
//   const BUTTON_SIZE = 64;
//   const GAP = 16;

//   function appendParams(baseUrl, params) {
//     const u = new URL(baseUrl, window.location.href);
//     for (const [k, v] of Object.entries(params)) {
//       if (v != null && v !== "") u.searchParams.set(k, String(v));
//     }
//     return u.toString();
//   }

//   onReady(() => {
//     // Use the captured reference; do not call document.currentScript here.
//     const script = SCRIPT_EL;
//     if (!script) {
//       console.error("[Lexi] Could not locate loader <script> element.");
//       return;
//     }

//     const ds = script.dataset || {};
//     const apiUrl = ds.apiUrl || "";
//     const companyId = ds.companyId || "";
//     const theme = (ds.theme || "dark").toLowerCase();
//     const position = (ds.position || "right").toLowerCase(); // 'right'|'left'
//     const launcherBottom = ds.bottom || "20px";
//     const launcherSide = ds.side || "20px";
//     const chatWindowBottom = ds.chatWindowBottom || "100px";
//     const zIndex = ds.zIndex || "2147483000";

//     if (!companyId)
//       console.error("[Lexi] Missing data-company-id on <script>.");

//     // Robust default iframe URL = <loader dir>/index.html
//     const loaderSrc = script.getAttribute("src") || "";
//     const defaultBase = new URL("index.html", new URL(loaderSrc, location.href))
//       .href;

//     // Your preference: use data-src for the iframe when provided
//     const iframeBase = ds.src || defaultBase;

//     const iframeUrl = appendParams(iframeBase, {
//       companyId,
//       apiUrl,
//       theme,
//       position,
//     });

//     const sideProp = position === "left" ? "left" : "right";

//     // start of wrap
//     const wrap = document.createElement("div");
//     Object.assign(wrap.style, {
//       position: "fixed",
//       border: "0",
//       width: "0",
//       height: "0",
//       opacity: "0",
//       pointerEvents: "none",
//       zIndex: String(parseInt(zIndex, 10) - 1),
//       transition: "opacity .2s ease",
//     });

//     // wrapper gets positioned; iframe fills it
//     wrap.style.bottom = chatWindowBottom;
//     wrap.style[sideProp] = launcherSide;

//     const iframe = document.createElement("iframe");
//     iframe.src = iframeUrl;

//     Object.assign(iframe.style, {
//       position: "absolute",
//       inset: "0",
//       width: "100%",
//       height: "100%",
//       border: "0",
//       opacity: "1",
//       pointerEvents: "auto",
//       transition: "transform .2s ease, filter .2s ease, box-shadow .2s ease",
//     });

//     wrap.appendChild(iframe);
//     document.body.appendChild(wrap);

//     // end of wrap

//     // document.body.appendChild(iframe);

//     // Launcher button
//     const btn = document.createElement("button");
//     btn.setAttribute("aria-label", "Open chat");
//     btn.textContent = "✦";
//     Object.assign(btn.style, {
//       position: "fixed",
//       width: "64px",
//       height: "64px",
//       [sideProp]: launcherSide,
//       bottom: launcherBottom,
//       borderRadius: "50%",
//       border: "none",
//       cursor: "pointer",
//       display: "grid",
//       placeItems: "center",
//       fontSize: "22px",
//       color: "#fff",
//       background: "linear-gradient(135deg, #7b5cff, #5ce1e6)",
//       boxShadow: "0 10px 28px rgba(0,0,0,.28)",
//       backdropFilter: "blur(10px)",
//       zIndex,
//       pointerEvents: "auto",
//     });
//     document.body.appendChild(btn);

//     // CSP fallback: if inline styles are blocked, drop a visible plain button
//     const computed = getComputedStyle(btn);
//     if (computed.position !== "fixed") {
//       console.warn(
//         "[Lexi] Inline styles blocked by CSP. Using fallback styles."
//       );
//       btn.removeAttribute("style");
//       btn.style.position = "fixed";
//       btn.style.top = "10px";
//       btn.style.left = "10px";
//       btn.style.zIndex = zIndex;
//       btn.style.padding = "10px 14px";
//       btn.style.background = "#7b5cff";
//       btn.style.color = "#fff";
//       btn.style.border = "none";
//       btn.style.borderRadius = "10px";
//       btn.textContent = "Chat";
//     }

//     let isOpen = false;

//     function open() {
//       if (isOpen) return;
//       isOpen = true;

//       // ✅ apply correct mobile/desktop positioning immediately
//       handleResize();

//       wrap.style.pointerEvents = "auto";
//       wrap.style.opacity = "1";

//       // animation stays on iframe so it doesn't fight offset transform
//       iframe.style.filter = "blur(0)";
//       iframe.style.transform = "translateY(0) scale(1)";
//       iframe.style.boxShadow = "0 18px 48px #00000047";

//       iframe.contentWindow?.postMessage({ type: "lexi:open" }, "*");

//       btn.style.boxShadow = "0 8px 22px rgba(0,0,0,.24)";
//     }

//     function close() {
//       if (!isOpen) return;
//       isOpen = false;

//       wrap.style.pointerEvents = "none";
//       wrap.style.opacity = "0";
//       wrap.style.width = "0";
//       wrap.style.height = "0";

//       iframe.style.filter = "blur(6px)";
//       iframe.style.transform = "translateY(16px) scale(0.96)";
//       iframe.style.boxShadow = "none";

//       iframe.contentWindow?.postMessage({ type: "lexi:close" }, "*");

//       btn.style.boxShadow = "0 10px 28px rgba(0,0,0,.28)";
//     }

//     btn.addEventListener("click", () => (isOpen ? close() : open()));

//     window.addEventListener("message", (e) => {
//       const t = e?.data?.type;
//       if (t === "lexi:open") open();
//       else if (t === "lexi:close") close();
//       else if (t === "lexi:resize") {
//         const { width, height } = e.data || {};
//         if (width) wrap.style.width = pxNum(width, wrap.style.width) + "px";
//         if (height) wrap.style.height = pxNum(height, wrap.style.height) + "px";
//         positionFloatingUI(); // ✅ re-anchor after resize
//       }
//     });

//     function positionFloatingUI() {
//       const vv = window.visualViewport;

//       const offsetTop = vv ? vv.offsetTop : 0;
//       const offsetLeft = vv ? vv.offsetLeft : 0;
//       const vw = vv ? vv.width : window.innerWidth;
//       const vh = vv ? vv.height : window.innerHeight;

//       const isMobile = matchMedia("(max-width: 600px)").matches;

//       // desired chat size (keep your dimensions)
//       const windowBottomPx = pxNum(launcherBottom, 20) + BUTTON_SIZE + GAP;
//       const w = Math.min(380, vw);
//       const h = Math.min(600, vh - windowBottomPx);

//       // ---- CHAT (wrap) ----
//       wrap.style.width = w + "px";
//       wrap.style.height = h + "px";

//       // set side
//       wrap.style[sideProp] = launcherSide;
//       // IMPORTANT: set top explicitly (visual viewport aligned)
//       wrap.style.bottom = "auto";
//       wrap.style.top = `calc(${offsetTop + (vh - windowBottomPx - h)}px)`;

//       // ---- BUTTON ----
//       // Keep button anchored to bottom/right (stable),
//       // and only compensate via transform for visualViewport movement
//       btn.style.top = "auto";
//       btn.style.bottom = launcherBottom;

//       // Do NOT recompute left/right here — keep original fixed anchor
//       // Just compensate via transform
//       btn.style.transform = isMobile
//         ? `translate(${offsetLeft}px, ${offsetTop}px) scale(${
//             isOpen ? 0.9 : 1
//           })`
//         : `scale(${isOpen ? 0.9 : 1})`;

//       // Optional: if you DON'T want this on desktop, gate it:
//       if (!isMobile) {
//         // restore normal desktop fixed behavior
//         wrap.style.top = "auto";
//         wrap.style.bottom = `calc(${windowBottomPx}px + env(safe-area-inset-bottom))`;

//         btn.style.top = "auto";
//         btn.style.bottom = launcherBottom;
//         btn.style.left = position === "left" ? launcherSide : "auto";
//         btn.style.right = position === "right" ? launcherSide : "auto";
//       }
//     }

//     function handleResize() {
//       if (!isOpen) return;
//       positionFloatingUI();
//     }

//     window.addEventListener("resize", handleResize);

//     // ✅ ADD THESE RIGHT HERE
//     if (window.visualViewport) {
//       window.visualViewport.addEventListener("resize", () => {
//         if (isOpen) positionFloatingUI();
//       });
//       window.visualViewport.addEventListener("scroll", () => {
//         if (isOpen) positionFloatingUI();
//       });
//     }

//     window.addEventListener("orientationchange", () => {
//       // allow the browser to settle its toolbar/viewport values
//       setTimeout(handleResize, 50);
//       setTimeout(handleResize, 250);
//     });
//   });
// })();

(() => {
  if (window.__LEXI_WIDGET__) return;
  window.__LEXI_WIDGET__ = true;

  const SCRIPT_EL =
    document.currentScript ||
    Array.from(document.getElementsByTagName("script")).find((s) =>
      (s.getAttribute("src") || "").includes("lexi-loader")
    );

  function onReady(fn) {
    document.readyState !== "loading"
      ? fn()
      : document.addEventListener("DOMContentLoaded", fn);
  }

  function appendParams(baseUrl, params) {
    const u = new URL(baseUrl, window.location.href);
    for (const [k, v] of Object.entries(params)) {
      if (v != null && v !== "") u.searchParams.set(k, String(v));
    }
    return u.toString();
  }

  onReady(() => {
    const script = SCRIPT_EL;
    if (!script) {
      console.error("[Lexi] Could not locate loader <script> element.");
      return;
    }

    const ds = script.dataset || {};
    const apiUrl = ds.apiUrl || "";
    const companyId = ds.companyId || "";
    const theme = (ds.theme || "dark").toLowerCase();
    const position = (ds.position || "right").toLowerCase();
    const launcherBottom = ds.bottom || "20px";
    const launcherSide = ds.side || "20px";
    const zIndex = ds.zIndex || "2147483000";

    if (!companyId)
      console.error("[Lexi] Missing data-company-id on <script>.");

    const loaderSrc = script.getAttribute("src") || "";
    const defaultBase = new URL("index.html", new URL(loaderSrc, location.href))
      .href;
    const iframeBase = ds.src || defaultBase;

    const iframeUrl = appendParams(iframeBase, {
      companyId,
      apiUrl,
      theme,
      position,
    });

    const sideProp = position === "left" ? "left" : "right";

    // ✅ FIXED: Static CSS positioning only
    const BUTTON_SIZE = 64;
    const GAP = 10;
    const CHAT_WIDTH = 380;
    const CHAT_HEIGHT = 600;

    // Launcher button - pure CSS fixed positioning
    const btn = document.createElement("button");
    btn.setAttribute("aria-label", "Open chat");
    btn.textContent = "✦";
    Object.assign(btn.style, {
      position: "fixed",
      width: `${BUTTON_SIZE}px`,
      height: `${BUTTON_SIZE}px`,
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
      // ✅ GPU compositing to prevent repaint during scroll
      transform: "translateZ(0)",
      WebkitTransform: "translateZ(0)",
      transition: "transform 0.2s ease, box-shadow 0.2s ease",
    });
    document.body.appendChild(btn);

    // Chat iframe wrapper - pure CSS fixed positioning
    const wrap = document.createElement("div");
    Object.assign(wrap.style, {
      position: "fixed",
      // ✅ Position relative to same corner as button
      [sideProp]: launcherSide,
      bottom: `calc(${launcherBottom} + ${BUTTON_SIZE}px + ${GAP}px)`,
      width: `${CHAT_WIDTH}px`,
      height: `${CHAT_HEIGHT}px`,
      maxWidth: "calc(100vw - 40px)",
      maxHeight: `calc(100vh - ${BUTTON_SIZE}px - ${GAP * 2}px)`,
      border: "0",
      borderRadius: "18px",
      overflow: "hidden",
      zIndex: String(parseInt(zIndex, 10) + 1),
      // Start hidden
      opacity: "0",
      pointerEvents: "none",
      // ✅ GPU compositing
      transform: "translateZ(0) translateY(16px) scale(0.96)",
      WebkitTransform: "translateZ(0) translateY(16px) scale(0.96)",
      filter: "blur(6px)",
      transition:
        "opacity 0.3s ease, transform 0.38s cubic-bezier(0.21, 1.02, 0.35, 1), filter 0.38s ease",
    });

    const iframe = document.createElement("iframe");
    iframe.src = iframeUrl;
    Object.assign(iframe.style, {
      position: "absolute",
      inset: "0",
      width: "100%",
      height: "100%",
      border: "0",
      borderRadius: "inherit",
    });

    wrap.appendChild(iframe);
    document.body.appendChild(wrap);

    // CSP fallback
    const computed = getComputedStyle(btn);
    if (computed.position !== "fixed") {
      console.warn(
        "[Lexi] Inline styles blocked by CSP. Using fallback styles."
      );
      btn.removeAttribute("style");
      btn.style.position = "fixed";
      btn.style.bottom = "20px";
      btn.style.right = "20px";
      btn.style.zIndex = zIndex;
      btn.style.padding = "10px 14px";
      btn.style.background = "#7b5cff";
      btn.style.color = "#fff";
      btn.style.border = "none";
      btn.style.borderRadius = "10px";
      btn.textContent = "Chat";
    }

    let isOpen = false;

    function open() {
      if (isOpen) return;
      isOpen = true;

      wrap.style.opacity = "1";
      wrap.style.pointerEvents = "auto";
      wrap.style.transform = "translateZ(0) translateY(0) scale(1)";
      wrap.style.WebkitTransform = "translateZ(0) translateY(0) scale(1)";
      wrap.style.filter = "blur(0)";

      btn.style.transform = "translateZ(0) scale(0.9)";
      btn.style.WebkitTransform = "translateZ(0) scale(0.9)";

      iframe.contentWindow?.postMessage({ type: "lexi:open" }, "*");
    }

    function close() {
      if (!isOpen) return;
      isOpen = false;

      wrap.style.opacity = "0";
      wrap.style.pointerEvents = "none";
      wrap.style.transform = "translateZ(0) translateY(16px) scale(0.96)";
      wrap.style.WebkitTransform = "translateZ(0) translateY(16px) scale(0.96)";
      wrap.style.filter = "blur(6px)";

      btn.style.transform = "translateZ(0) scale(1)";
      btn.style.WebkitTransform = "translateZ(0) scale(1)";

      iframe.contentWindow?.postMessage({ type: "lexi:close" }, "*");
    }

    btn.addEventListener("click", () => (isOpen ? close() : open()));

    window.addEventListener("message", (e) => {
      const t = e?.data?.type;
      if (t === "lexi:open") open();
      else if (t === "lexi:close") close();
    });

    // ✅ OPTIONAL: Only adjust on orientation change for mobile full-screen edge cases
    window.addEventListener("orientationchange", () => {
      setTimeout(() => {
        const vw = window.innerWidth;
        const vh = window.innerHeight;

        // Only constrain if chat would overflow
        if (vw < CHAT_WIDTH + 40) {
          wrap.style.width = `calc(100vw - 40px)`;
        } else {
          wrap.style.width = `${CHAT_WIDTH}px`;
        }

        if (vh < CHAT_HEIGHT + BUTTON_SIZE + GAP * 2) {
          wrap.style.height = `calc(100vh - ${BUTTON_SIZE}px - ${GAP * 2}px)`;
        } else {
          wrap.style.height = `${CHAT_HEIGHT}px`;
        }
      }, 200);
    });
  });
})();
