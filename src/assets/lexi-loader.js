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

    iframe.style.bottom = chatWindowBottom;

    const sideProp = position === "left" ? "left" : "right";
    iframe.style[sideProp] = launcherSide;

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
      // const w = Math.min(380, window.innerWidth);
      // const h = Math.min(600, window.innerHeight);
      // iframe.style.width = w + "px";
      // iframe.style.height = h + "px";

      // ✅ apply correct mobile/desktop positioning immediately
      handleResize();

      iframe.style.pointerEvents = "auto";
      iframe.style.opacity = "1";
      iframe.style.filter = "blur(0)";
      iframe.style.transform = "translateY(0) scale(1)";
      iframe.style.boxShadow = "0 18px 48px #00000047";
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
      iframe.style.filter = "blur(6px)";
      iframe.style.transform = "translateY(16px) scale(0.96)";
      iframe.style.boxShadow = "none";

      // ✅ restore your configured anchor so next open starts from the right place
      iframe.style[sideProp] = launcherSide;
      iframe.style.bottom = chatWindowBottom;

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
        const vv = window.visualViewport;
        const h = vv ? vv.height : window.innerHeight;
        const w = vv ? vv.width : window.innerWidth;

        iframe.style.width = w + "px";
        iframe.style.height = h + "px";
        iframe.style.left = "0";
        iframe.style.right = "0";
        iframe.style.bottom = "0";
      } else {
        // ✅ ALWAYS open above the launcher button
        const windowBottomPx = pxNum(launcherBottom, 20) + BUTTON_SIZE + GAP;

        iframe.style[sideProp] = launcherSide;
        iframe.style.bottom = windowBottomPx + "px";

        iframe.style.width = Math.min(380, innerWidth) + "px";
        iframe.style.height = Math.min(600, innerHeight) + "px";
      }
    }
    window.addEventListener("resize", handleResize);

    // ✅ ADD THESE RIGHT HERE
    if (window.visualViewport) {
      window.visualViewport.addEventListener("resize", handleResize);
      window.visualViewport.addEventListener("scroll", handleResize);
    }
  });
})();
