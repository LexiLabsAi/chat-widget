//working start

// (() => {
//   if (window.__LEXI_WIDGET__) return;
//   window.__LEXI_WIDGET__ = true;

//   function onReady(fn) {
//     document.readyState !== "loading"
//       ? fn()
//       : document.addEventListener("DOMContentLoaded", fn);
//   }

//   function px(v, fallback) {
//     if (v == null || v === "") return fallback;
//     return /^[\d.]+$/.test(String(v)) ? `${v}px` : String(v);
//   }

//   onReady(() => {
//     const script = document.currentScript;
//     const ds = (script && script.dataset) || {};

//     const apiUrl = ds.apiUrl || "";
//     const companyId = ds.companyId || "";
//     const theme = (ds.theme || "dark").toLowerCase();
//     const position = (ds.position || "right").toLowerCase(); // 'left'|'right'
//     const launcherBottom = px(ds.bottom, "20px"); // optional overrides
//     const launcherSide = px(ds.side, "20px");
//     const zIndex = ds.zIndex || "2147483000";

//     if (!companyId) {
//       console.error("[Lexi] Missing data-company-id on <script>.");
//     }

//     // --- Robust fallback for iframe URL:
//     // 1) Prefer data-src (your explicit iframe URL)
//     // 2) Otherwise, derive "<loader_dir>/index.html" from the loader's own src
//     const loaderSrc = script?.getAttribute("src") || "";
//     const defaultBase = new URL("index.html", new URL(loaderSrc, location.href))
//       .href;
//     const iframeBase = ds.src || defaultBase; // <-- data-src wins

//     const iframeUrl = appendParams(iframeBase, {
//       companyId,
//       apiUrl,
//       theme,
//       position,
//     });

//     console.log("[Lexi] iframeUrl:", iframeUrl);

//     // Iframe (initially hidden)
//     const iframe = document.createElement("iframe");
//     iframe.src = iframeUrl;
//     iframe.allow = "clipboard-write *; autoplay *";
//     iframe.loading = "eager";
//     iframe.style.position = "fixed";
//     iframe.style.border = "0";
//     iframe.style.width = "0";
//     iframe.style.height = "0";
//     iframe.style.opacity = "0";
//     iframe.style.pointerEvents = "none";
//     iframe.style.transition = "opacity .2s ease, transform .2s ease";
//     iframe.style.zIndex = String(parseInt(zIndex) - 1);

//     // Position based on side
//     const sideProp = position === "left" ? "left" : "right";
//     iframe.style[sideProp] = launcherSide;
//     iframe.style.bottom = launcherBottom;

//     document.body.appendChild(iframe);

//     // External launcher button
//     const btn = document.createElement("button");
//     btn.setAttribute("aria-label", "Open chat");
//     btn.innerHTML = "✦";
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

//     let isOpen = false;

//     function open() {
//       if (isOpen) return;
//       isOpen = true;
//       // size iframe like your window
//       const w = Math.min(380, window.innerWidth);
//       const h = Math.min(600, window.innerHeight);
//       iframe.style.width = w + "px";
//       iframe.style.height = h + "px";
//       iframe.style.pointerEvents = "auto";
//       iframe.style.opacity = "1";
//       // Nudge from bottom-right/left (matches your SCSS)
//       iframe.style.transform = "translateY(0)";
//       // Tell child to open its internal state
//       iframe.contentWindow?.postMessage({ type: "lexi:open" }, "*");
//       // Subtle launcher tuck
//       btn.style.transform = "scale(.9)";
//       btn.style.boxShadow = "0 8px 22px rgba(0,0,0,.24)";
//     }

//     function close() {
//       if (!isOpen) return;
//       isOpen = false;
//       iframe.style.pointerEvents = "none";
//       iframe.style.opacity = "0";
//       iframe.style.width = "0";
//       iframe.style.height = "0";
//       iframe.style.transform = "translateY(6px)";
//       iframe.contentWindow?.postMessage({ type: "lexi:close" }, "*");
//       btn.style.transform = "scale(1)";
//       btn.style.boxShadow = "0 10px 28px rgba(0,0,0,.28)";
//     }

//     btn.addEventListener("click", () => {
//       isOpen ? close() : open();
//     });

//     // Child → parent events
//     window.addEventListener("message", (e) => {
//       const t = e?.data?.type;
//       if (t === "lexi:open") {
//         open();
//       } else if (t === "lexi:close") {
//         close();
//       } else if (t === "lexi:resize") {
//         // Optional: child can ask a resize: {type:'lexi:resize', width, height}
//         const { width, height } = e.data || {};
//         if (width && height) {
//           iframe.style.width = px(width, iframe.style.width);
//           iframe.style.height = px(height, iframe.style.height);
//         }
//       }
//     });

//     // Mobile: make iframe full screen when open
//     function handleResize() {
//       if (!isOpen) return;
//       const small = window.matchMedia("(max-width: 600px)").matches;
//       if (small) {
//         iframe.style.width = "100vw";
//         iframe.style.height = "100vh";
//         iframe.style[sideProp] = "0";
//         iframe.style.bottom = "0";
//       } else {
//         iframe.style[sideProp] = launcherSide;
//         iframe.style.bottom = launcherBottom;
//         iframe.style.width = Math.min(380, window.innerWidth) + "px";
//         iframe.style.height = Math.min(600, window.innerHeight) + "px";
//       }
//     }
//     window.addEventListener("resize", handleResize);
//   });
// })();

//working end

(() => {
  if (window.__LEXI_WIDGET__) return;
  window.__LEXI_WIDGET__ = true;

  // ⚠️ Capture the script element NOW (while this script is executing)
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

  function pxNum(v, fallback = 0) {
    if (v == null || v === "") return fallback;
    const m = String(v).match(/[\d.]+/);
    return m ? parseFloat(m[0]) : fallback;
  }

  // Tune this if you change CSS:
  const INTERNAL_WINDOW_BOTTOM = 100; // .lexi-window { bottom: 100px }
  const BUTTON_SIZE = 64;
  const GAP = 16;

  function appendParams(baseUrl, params) {
    const u = new URL(baseUrl, window.location.href);
    for (const [k, v] of Object.entries(params)) {
      if (v != null && v !== "") u.searchParams.set(k, String(v));
    }
    return u.toString();
  }

  // const sideProp = position === "left" ? "left" : "right";
  // iframe.style[sideProp] = launcherSide;

  onReady(() => {
    // Use the captured reference; do not call document.currentScript here.
    const script = SCRIPT_EL;
    if (!script) {
      console.error("[Lexi] Could not locate loader <script> element.");
      return;
    }

    const ds = script.dataset || {};
    const apiUrl = ds.apiUrl || "";
    const companyId = ds.companyId || "";
    const theme = (ds.theme || "dark").toLowerCase();
    const position = (ds.position || "right").toLowerCase(); // 'right'|'left'
    const launcherBottom = ds.bottom || "20px";
    const launcherSide = ds.side || "20px";
    const chatWindowBottom = ds.chatWindowBottom || "100px";
    const zIndex = ds.zIndex || "2147483000";

    // const launcherBottomPx = toPxNumber(launcherBottom);
    // const iframeBottomPx =
    //  launcherBottomPx + BUTTON_SIZE + GAP - INTERNAL_WINDOW_BOTTOM;
    // Prevent negative if someone sets a tiny launcherBottom
    //iframe.style.bottom = Math.max(0, iframeBottomPx) + "px";

    if (!companyId)
      console.error("[Lexi] Missing data-company-id on <script>.");

    // Robust default iframe URL = <loader dir>/index.html
    const loaderSrc = script.getAttribute("src") || "";
    const defaultBase = new URL("index.html", new URL(loaderSrc, location.href))
      .href;

    // Your preference: use data-src for the iframe when provided
    const iframeBase = ds.src || defaultBase;

    const iframeUrl = appendParams(iframeBase, {
      companyId,
      apiUrl,
      theme,
      position,
    });

    // --- create iframe + button (same as before) ---
    const iframe = document.createElement("iframe");
    iframe.src = iframeUrl;
    iframe.allow = "clipboard-write *; autoplay *";
    iframe.loading = "eager";
    Object.assign(iframe.style, {
      position: "fixed",
      border: "0",
      width: "0",
      height: "0",
      opacity: "0",
      pointerEvents: "none",
      zIndex: String(parseInt(zIndex, 10) - 1),
      transition: "opacity .2s ease, transform .2s ease",
    });
    const sideProp = position === "left" ? "left" : "right";
    iframe.style[sideProp] = launcherSide;
    iframe.style.bottom = chatWindowBottom;

    // offset so window clears the launcher
    // const ib =
    //   pxNum(launcherBottom) + BUTTON_SIZE + GAP - INTERNAL_WINDOW_BOTTOM;
    // iframe.style.bottom = Math.max(0, ib) + "px";

    document.body.appendChild(iframe);

    // Launcher button
    const btn = document.createElement("button");
    btn.setAttribute("aria-label", "Open chat");
    btn.textContent = "✦";
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

    // CSP fallback: if inline styles are blocked, drop a visible plain button
    const computed = getComputedStyle(btn);
    if (computed.position !== "fixed") {
      console.warn(
        "[Lexi] Inline styles blocked by CSP. Using fallback styles."
      );
      btn.removeAttribute("style");
      btn.style.position = "fixed";
      btn.style.top = "10px";
      btn.style.left = "10px";
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
      const w = Math.min(380, window.innerWidth);
      const h = Math.min(600, window.innerHeight);
      iframe.style.width = w + "px";
      iframe.style.height = h + "px";
      iframe.style.pointerEvents = "auto";
      iframe.style.opacity = "1";
      iframe.style.transform = "translateY(0)";
      iframe.contentWindow?.postMessage({ type: "lexi:open" }, "*");
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
    btn.addEventListener("click", () => (isOpen ? close() : open()));

    window.addEventListener("message", (e) => {
      const t = e?.data?.type;
      if (t === "lexi:open") open();
      else if (t === "lexi:close") close();
      else if (t === "lexi:resize") {
        const { width, height } = e.data || {};
        if (width) iframe.style.width = pxNum(width, iframe.style.width);
        if (height) iframe.style.height = pxNum(height, iframe.style.height);
      }
    });

    function handleResize() {
      if (!isOpen) return;
      if (matchMedia("(max-width: 600px)").matches) {
        iframe.style.width = "100vw";
        iframe.style.height = "100vh";
        iframe.style[sideProp] = "0";
        iframe.style.bottom = "0";
      } else {
        iframe.style[sideProp] = launcherSide;
        iframe.style.bottom = chatWindowBottom;

        // const ib2 =
        //   pxNum(launcherBottom) + BUTTON_SIZE + GAP - INTERNAL_WINDOW_BOTTOM;
        // iframe.style.bottom = Math.max(0, ib2) + "px";

        //const launcherBottomPx = toPxNumber(launcherBottom);
        // const iframeBottomPx =
        //  launcherBottomPx + BUTTON_SIZE + GAP - INTERNAL_WINDOW_BOTTOM;
        // iframe.style.bottom = Math.max(0, iframeBottomPx) + "px";
        iframe.style.width = Math.min(380, innerWidth) + "px";
        iframe.style.height = Math.min(600, innerHeight) + "px";
      }
    }
    window.addEventListener("resize", handleResize);
  });
})();
