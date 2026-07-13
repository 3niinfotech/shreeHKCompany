import { toast } from "sonner";

const IDENTIFIER_HEADER_RE =
  /(?:^|\b)(sku|mfg\.?\s*code|certificate|cert\.?\s*#?|report\s*no\.?|stone\s*id|reference(?:\s*no\.?)?|ref\.?\s*no\.?)(?:\b|\/|$)/i;

export function isCopyableIdentifierHeader(headerText) {
  if (!headerText) return false;
  const normalized = String(headerText).replace(/\s+/g, " ").trim();
  return IDENTIFIER_HEADER_RE.test(normalized);
}

export async function copyIdentifierToClipboard(value) {
  const text = String(value ?? "").trim();
  if (!text || text === "-" || text === "—") return false;

  const toastLabel = text.length > 48 ? `${text.slice(0, 48)}…` : text;

  try {
    await navigator.clipboard.writeText(text);
    toast.success(`Copied: ${toastLabel}`);
    return true;
  } catch {
    try {
      const textarea = document.createElement("textarea");
      textarea.value = text;
      textarea.setAttribute("readonly", "");
      textarea.style.position = "fixed";
      textarea.style.left = "-9999px";
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      toast.success(`Copied: ${toastLabel}`);
      return true;
    } catch {
      toast.error("Could not copy to clipboard");
      return false;
    }
  }
}
