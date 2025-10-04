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
    const src = ds.src || "https://cdn.yourdomain.com/widget/index.html"; // update after deploy

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

    // Start as launcher-sized
    iframe.width = "64";
    iframe.height = "64";
    iframe.style.position = "fixed";
    iframe.style.border = "0";
    iframe.style.background = "transparent";
    iframe.style.zIndex = "2147483647";
    iframe.style.bottom = "20px";
    if ((ds.position || "right") === "left") iframe.style.left = "20px";
    else iframe.style.right = "20px";

    document.body.appendChild(iframe);

    const setSize = (w, h) => {
      iframe.width = String(w);
      iframe.height = String(h);
    };

    const OPEN_W = Number(ds.width || 380);
    const OPEN_H = Number(ds.height || 600);

    const origin = (() => {
      try {
        return new URL(iframe.src).origin;
      } catch {
        return "*";
      }
    })();

    window.addEventListener("message", (ev) => {
      if (ev.source !== iframe.contentWindow) return;
      if (origin !== "*" && ev.origin !== origin) return;
      const msg = ev.data || {};
      if (msg.type === "lexi:open") setSize(OPEN_W, OPEN_H);
      if (msg.type === "lexi:close") setSize(64, 64);
      if (msg.type === "lexi:size" && msg.payload)
        setSize(msg.payload.w, msg.payload.h);
    });

    // Optional host API
    window.lexi = window.lexi || {};
    window.lexi.open = () =>
      iframe.contentWindow?.postMessage({ type: "lexi:open" }, "*");
    window.lexi.close = () =>
      iframe.contentWindow?.postMessage({ type: "lexi:close" }, "*");
  });
})();
