export async function loadXlsx() {
  const mod = await import("xlsx-js-style");
  return mod.default ?? mod;
}
