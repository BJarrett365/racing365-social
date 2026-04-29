import Script from "next/script";

/**
 * Browser extensions (QuickBooks, Grammarly, etc.) inject attributes onto
 * <html> before React hydrates, causing mismatches. This runs before Next
 * hydrates and strips common injected attributes; a short-lived observer
 * catches late injections.
 */
const BOOT = `
(function(){
  function clean() {
    try {
      var h = document.documentElement;
      if (!h) return;
      h.removeAttribute("data-qb-installed");
      Array.prototype.slice.call(h.attributes).forEach(function (a) {
        if (a.name === "data-qb-installed" || /^data-gr-/.test(a.name)) {
          h.removeAttribute(a.name);
        }
      });
    } catch (e) {}
  }
  clean();
  if (typeof MutationObserver !== "undefined" && document.documentElement) {
    var h = document.documentElement;
    var o = new MutationObserver(function () { clean(); });
    o.observe(h, { attributes: true, subtree: false });
    setTimeout(function () { o.disconnect(); }, 10000);
  }
})();
`;

export function ExtensionAttrCleaner() {
  return (
    <Script id="r365-extension-attr-cleaner" strategy="beforeInteractive">
      {BOOT}
    </Script>
  );
}
