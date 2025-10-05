(() => {
  if (window.__LEXI_WIDGET__) return; // avoid double insert
  window.__LEXI_WIDGET__ = true;

  function onReady(fn) {
    document.readyState !== "loading"
      ? fn()
      : document.addEventListener("DOMContentLoaded", fn);
  }

  onReady(() => {
    const s = document.currentScript;
    const ds = (s && s.dataset) || {};
    const src =
      ds.src ||
      ds["src"] ||
      ds["data-src"] ||
      "https://cdn.yourdomain.com/widget/index.html";

    const url = new URL(src);
    if (ds.apiUrl) url.searchParams.set("apiUrl", ds.apiUrl);
    if (ds.companyId) url.searchParams.set("companyId", ds.companyId);

    url.searchParams.set("theme", ds.theme || "dark");
    url.searchParams.set("position", ds.position || "right");

    const iframe = document.createElement("iframe");
    iframe.src = url.toString();
    iframe.title = ds.title || "Lexi Chat";
    iframe.setAttribute("aria-label", "Lexi Chat");
    iframe.allow = "clipboard-read; clipboard-write; microphone *";
    iframe.sandbox = [
      "allow-scripts",
      "allow-same-origin",
      "allow-forms",
      "allow-popups",
      "allow-downloads",
      "allow-modals",
      "allow-popups-to-escape-sandbox",
    ].join(" ");

    // ✅ Launcher-style defaults
    iframe.style.position = "fixed";
    iframe.style.bottom = "20px";
    const position = ds.position || "right";
    iframe.style[position] = "20px";
    iframe.style.width = "64px";
    iframe.style.height = "64px";
    iframe.style.border = "none";
    iframe.style.borderRadius = "50%";
    iframe.style.overflow = "hidden";
    iframe.style.background = "transparent";
    iframe.style.boxShadow = "0 8px 24px rgba(0, 0, 0, 0.25)";
    iframe.style.transition = "all 0.3s cubic-bezier(0.22, 1, 0.36, 1)";
    iframe.style.zIndex = "2147483647"; // Highest possible
    iframe.style.willChange = "width, height, transform";

    document.body.appendChild(iframe);

    const OPEN_W = Number(ds.width || 380);
    const OPEN_H = Number(ds.height || 600);

    const setSize = (w, h, r = "16px") => {
      iframe.style.width = w + "px";
      iframe.style.height = h + "px";
      iframe.style.borderRadius = r;
    };

    const origin = (() => {
      try {
        return new URL(iframe.src).origin;
      } catch {
        return "*";
      }
    })();

    // ✅ Handle messages from inside the iframe
    window.addEventListener("message", (ev) => {
      if (ev.source !== iframe.contentWindow) return;
      if (origin !== "*" && ev.origin !== origin) return;
      const msg = ev.data || {};

      if (msg.type === "lexi:open") {
        setSize(OPEN_W, OPEN_H, "16px");
        iframe.style.boxShadow = "0 18px 48px rgba(0,0,0,0.35)";
        iframe.animate(
          [
            { transform: "scale(0.85)", opacity: 0.8 },
            { transform: "scale(1)", opacity: 1 },
          ],
          { duration: 260, easing: "cubic-bezier(0.22,1,0.36,1)" }
        );
      }

      if (msg.type === "lexi:close") {
        setSize(64, 64, "50%");
        iframe.style.boxShadow = "0 8px 24px rgba(0,0,0,0.25)";
      }

      if (msg.type === "lexi:size" && msg.payload) {
        setSize(msg.payload.w, msg.payload.h);
      }
    });

    // ✅ Optional host API
    window.lexi = window.lexi || {};
    window.lexi.open = () =>
      iframe.contentWindow?.postMessage({ type: "lexi:open" }, "*");
    window.lexi.close = () =>
      iframe.contentWindow?.postMessage({ type: "lexi:close" }, "*");
  });
})();
