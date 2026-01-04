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

    const sideProp = position === "left" ? "left" : "right";

    // start of wrap
    const wrap = document.createElement("div");
    Object.assign(wrap.style, {
      position: "fixed",
      // ✅ Explicitly set all positioning properties
      top: "auto",
      border: "0",
      width: "0",
      bottom: chatWindowBottom,
      [sideProp]: launcherSide,
      [sideProp === "left" ? "right" : "left"]: "auto", // Set opposite side to auto
      border: "0",
      width: "0",
      height: "0",
      opacity: "0",
      pointerEvents: "none",
      zIndex: String(parseInt(zIndex, 10) - 1),
      transition: "opacity .2s ease",
      // ✅ Force GPU compositing to prevent Safari repaints
      transform: "translateZ(0)",
      WebkitTransform: "translateZ(0)",
    });

    // ✅ ADD THIS IMMEDIATELY AFTER:
    const isMobile = window.matchMedia("(max-width: 600px)").matches;
    if (isMobile) {
      wrap.style.borderRadius = "0";
    } else {
      wrap.style.borderRadius = "16px";
    }

    const iframe = document.createElement("iframe");
    iframe.src = iframeUrl;

    Object.assign(iframe.style, {
      position: "absolute",
      inset: "0",
      width: "100%",
      height: "100%",
      border: "0",
      opacity: "1",
      pointerEvents: "auto",
      transition: "transform .2s ease, filter .2s ease, box-shadow .2s ease",
    });

    wrap.appendChild(iframe);
    document.body.appendChild(wrap);
    // end of wrap

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
      transform: "translateZ(0)", // ✅ GPU compositing
      WebkitTransform: "translateZ(0)",
    });
    document.body.appendChild(btn);

    // ✅✅✅ THE STYLE CODE GOES RIGHT HERE ✅✅✅
    const style = document.createElement("style");
    style.textContent = `
      .lexi-chat-btn {
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      }

      .lexi-chat-icon {
        width: 24px;
        height: 24px;
        flex-shrink: 0;
        transition: transform 0.3s ease;
      }

      .lexi-chat-text {
        max-width: 0;
        opacity: 0;
        white-space: nowrap;
        overflow: hidden;
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      }

      .lexi-chat-btn:hover .lexi-chat-text {
        max-width: 100px;
        opacity: 1;
        margin-right: 4px;
      }

      .lexi-chat-btn:hover {
        padding-right: 20px;
        box-shadow: 0 6px 24px rgba(123, 92, 255, 0.5);
        transform: translateY(-2px);
      }

      .lexi-chat-btn:active {
        transform: translateY(0);
      }

      .lexi-chat-btn.hidden {
        opacity: 0;
        pointer-events: none;
        transform: scale(0.8);
      }
    `;
    document.head.appendChild(style);
    // ✅✅✅ END OF STYLE CODE ✅✅✅

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

      // ✅ PROPER DETECTION (not forced)
      const isMobile = window.matchMedia("(max-width: 600px)").matches;

      if (isMobile) {
        // Mobile: full screen
        wrap.style.width = "100vw";
        wrap.style.height = "100vh";
        wrap.style.top = "0";
        wrap.style.bottom = "0";
        wrap.style.left = "0";
        wrap.style.right = "0";
        wrap.style.borderRadius = "0";
      } else {
        // Desktop: floating card
        wrap.style.width = "380px";
        wrap.style.height = "600px";
        wrap.style.top = "auto";
        wrap.style.bottom = chatWindowBottom; // Should be "100px"
        wrap.style.left = "auto";
        wrap.style.right = launcherSide; // Should be "20px"
        wrap.style.borderRadius = "16px";
      }

      wrap.style.pointerEvents = "auto";
      wrap.style.opacity = "1";

      iframe.style.filter = "blur(0)";
      iframe.style.transform = "translateY(0) scale(1)";
      iframe.style.boxShadow = "0 18px 48px #00000047";

      iframe.contentWindow?.postMessage({ type: "lexi:open" }, "*");

      btn.style.transform = "scale(0.9) translateZ(0)";
      btn.style.boxShadow = "0 8px 22px rgba(0,0,0,.24)";
    }

    function close() {
      if (!isOpen) return;
      isOpen = false;

      wrap.style.pointerEvents = "none";
      wrap.style.opacity = "0";
      wrap.style.width = "0";
      wrap.style.height = "0";

      iframe.style.filter = "blur(6px)";
      iframe.style.transform = "translateY(16px) scale(0.96)";
      iframe.style.boxShadow = "none";

      iframe.contentWindow?.postMessage({ type: "lexi:close" }, "*");

      btn.style.boxShadow = "0 10px 28px rgba(0,0,0,.28)";
    }

    btn.addEventListener("click", () => (isOpen ? close() : open()));

    window.addEventListener("message", (e) => {
      const t = e?.data?.type;
      if (t === "lexi:open") open();
      else if (t === "lexi:close") close();
    });

    // ✅ SIMPLIFIED - only runs on orientation change
    window.addEventListener("orientationchange", () => {
      if (!isOpen) return;

      setTimeout(() => {
        const isMobile = window.innerWidth <= 600;
        const w = isMobile ? window.innerWidth : 380;
        const h = isMobile ? window.innerHeight : 600;

        wrap.style.width = w + "px";
        wrap.style.height = h + "px";
      }, 250);
    });
  });
})();
