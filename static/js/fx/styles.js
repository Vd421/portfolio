// Effect styles live next to the effect that needs them and are adopted once.
// Everything here only styles elements the effects create, or states the effects set,
// so the server-rendered page never depends on it.

const sheets = new Map();

export function css(id, text) {
  if (sheets.has(id)) return sheets.get(id);
  let sheet = null;
  try {
    sheet = new CSSStyleSheet();
    sheet.replaceSync(text);
    document.adoptedStyleSheets = [...document.adoptedStyleSheets, sheet];
  } catch {
    const el = document.createElement('style');
    el.dataset.fx = id;
    el.textContent = text;
    document.head.append(el);
  }
  sheets.set(id, sheet);
  return sheet;
}

// Motion-only scope, identical to the contract's CSS gate.
export const LIVE = ':root:not([data-motion="still"])';
