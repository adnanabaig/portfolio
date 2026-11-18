// Copy the email address: the one handler behind Contact's COPY ADDRESS and
// the command palette's "Copy email". Uses the clipboard API, and falls back
// to selecting the address on the page (targetId) and execCommand("copy").
import portfolio from "../data/portfolio.json";

/** Selects the address on the page and tries execCommand("copy"). */
function selectAndCopy(targetId: string) {
  const node = document.getElementById(targetId);
  const selection = window.getSelection();
  if (!node || !selection) return false;
  const range = document.createRange();
  range.selectNodeContents(node);
  selection.removeAllRanges();
  selection.addRange(range);
  try {
    return document.execCommand("copy");
  } catch {
    return false;
  }
}

/**
 * Resolves true when the address reached the clipboard; false means it is
 * selected (if targetId exists) for a manual copy. Promise chain rather than
 * async/await, so no regenerator lands in the lazy chunks that use it.
 */
export function copyEmail(targetId = "uplink-address"): Promise<boolean> {
  const fallback = () => selectAndCopy(targetId);
  try {
    if (navigator.clipboard?.writeText) return navigator.clipboard.writeText(portfolio.email).then(() => true, fallback);
  } catch {
    // Fall through to the selection fallback.
  }
  return Promise.resolve(fallback());
}
