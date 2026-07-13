const STORAGE_PREFIX = "shreehk_inventory_filter_presets";

const storageKey = (pageKey, userId) =>
  `${STORAGE_PREFIX}:${pageKey}:${userId || "anonymous"}`;

export const loadFilterPresets = (pageKey, userId) => {
  try {
    const raw = localStorage.getItem(storageKey(pageKey, userId));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

export const saveFilterPreset = (pageKey, userId, name, values) => {
  const presets = loadFilterPresets(pageKey, userId);
  const trimmed = String(name || "").trim();
  if (!trimmed) return presets;

  const next = [
    { id: `${Date.now()}`, name: trimmed, values, savedAt: new Date().toISOString() },
    ...presets.filter((p) => p.name !== trimmed),
  ].slice(0, 20);

  localStorage.setItem(storageKey(pageKey, userId), JSON.stringify(next));
  return next;
};

export const deleteFilterPreset = (pageKey, userId, presetId) => {
  const presets = loadFilterPresets(pageKey, userId).filter((p) => p.id !== presetId);
  localStorage.setItem(storageKey(pageKey, userId), JSON.stringify(presets));
  return presets;
};
