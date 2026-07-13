/**
 * Global UI interaction audit — click, filter, modal, tab (Option B).
 * Batches events to reduce API noise; does not alter page behavior.
 */

const CLICK_DEBOUNCE_MS = 600;
const FILTER_DEBOUNCE_MS = 900;
const BATCH_FLUSH_MS = 1200;
const MAX_BATCH = 25;

const SKIP_CLOSEST = [
  "input[type='password']",
  "textarea",
  ".ant-select-dropdown",
  ".ant-picker-dropdown",
  ".ant-dropdown",
  ".ant-table-tbody",
  ".ant-pagination",
];

let pageContext = { path: "/", label: "Page", search: "" };
let queue = [];
let flushTimer = null;
let postHandler = null;
let lastClickKey = "";
let lastClickAt = 0;
const filterTimers = new Map();
const openModals = new Set();
let modalObserver = null;
let listenersAttached = false;

export function getAuditPageContext() {
  return { ...pageContext };
}

export function setAuditPageContext(ctx) {
  pageContext = { ...pageContext, ...ctx };
}

function shouldSkipTarget(el) {
  if (!el?.closest) return true;
  if (el.closest("[data-audit-skip]")) return true;
  return SKIP_CLOSEST.some((sel) => el.closest(sel));
}

function findInteractiveElement(el) {
  let node = el;
  while (node && node !== document.body) {
    if (
      node.matches?.(
        "button, [role='button'], .ant-btn, a[href], input[type='submit'], .ant-menu-item, .ant-tabs-tab, .ant-dropdown-trigger",
      )
    ) {
      return node;
    }
    node = node.parentElement;
  }
  return null;
}

function extractLabel(el) {
  const aria = el.getAttribute?.("aria-label");
  if (aria?.trim()) return aria.trim().slice(0, 120);
  const title = el.getAttribute?.("title");
  if (title?.trim()) return title.trim().slice(0, 120);
  const text = (el.textContent || "").replace(/\s+/g, " ").trim();
  if (text) return text.slice(0, 120);
  return el.tagName?.toLowerCase() || "element";
}

function extractTargetDescriptor(el) {
  const tag = el.tagName?.toLowerCase() || "element";
  const id = el.id ? `#${el.id}` : "";
  const cls = el.className && typeof el.className === "string"
    ? `.${el.className.split(/\s+/).slice(0, 2).join(".")}`
    : "";
  return `${tag}${id}${cls}`.slice(0, 160);
}

function enqueue(eventType, payload) {
  queue.push({
    eventType,
    path: pageContext.path,
    search: pageContext.search || null,
    pageLabel: pageContext.label,
    timestamp: new Date().toISOString(),
    ...payload,
  });

  if (queue.length >= MAX_BATCH) {
    flushQueue();
    return;
  }
  if (!flushTimer) {
    flushTimer = window.setTimeout(flushQueue, BATCH_FLUSH_MS);
  }
}

function flushQueue() {
  if (flushTimer) {
    window.clearTimeout(flushTimer);
    flushTimer = null;
  }
  if (!queue.length || !postHandler) return;
  const batch = queue.splice(0, MAX_BATCH);
  postHandler(batch);
}

function onDocumentClick(event) {
  if (pageContext.path?.startsWith("/auth")) return;
  const target = event.target;
  if (shouldSkipTarget(target)) return;

  const el = findInteractiveElement(target);
  if (!el || shouldSkipTarget(el)) return;

  const label = extractLabel(el);
  const descriptor = extractTargetDescriptor(el);
  const clickKey = `${pageContext.path}|${descriptor}|${label}`;
  const now = Date.now();
  if (clickKey === lastClickKey && now - lastClickAt < CLICK_DEBOUNCE_MS) return;
  lastClickKey = clickKey;
  lastClickAt = now;

  let eventType = "click";
  if (el.matches?.(".ant-tabs-tab")) eventType = "tab_switch";

  enqueue(eventType, {
    label,
    target: descriptor,
    meta: {
      href: el.getAttribute?.("href") || null,
      role: el.getAttribute?.("role") || null,
    },
  });
}

function onDocumentChange(event) {
  if (pageContext.path?.startsWith("/auth")) return;
  const el = event.target;
  if (!el || shouldSkipTarget(el)) return;

  const tag = el.tagName?.toLowerCase();
  const isFilter =
    tag === "select" ||
    el.matches?.(".ant-select-selection-search-input, .ant-picker-input input, input[type='search']") ||
    el.closest?.(".ant-form-item, [class*='filter'], [class*='Filter']");

  if (!isFilter) return;

  const fieldKey = el.name || el.id || extractTargetDescriptor(el);
  const timerKey = `${pageContext.path}|filter|${fieldKey}`;
  if (filterTimers.has(timerKey)) {
    window.clearTimeout(filterTimers.get(timerKey));
  }

  filterTimers.set(
    timerKey,
    window.setTimeout(() => {
      filterTimers.delete(timerKey);
      const value =
        el.type === "checkbox" || el.type === "radio"
          ? el.checked
          : (el.value ?? "").toString().slice(0, 200);
      enqueue("filter", {
        label: fieldKey,
        target: extractTargetDescriptor(el),
        meta: { value: value || null },
      });
    }, FILTER_DEBOUNCE_MS),
  );
}

function scanModals() {
  const wraps = document.querySelectorAll(".ant-modal-wrap");
  wraps.forEach((wrap) => {
    if (wrap.style.display === "none") return;
    const modal = wrap.querySelector(".ant-modal");
    if (!modal) return;
    const key = modal.getAttribute("aria-labelledby") || modal.innerText?.slice(0, 40) || "modal";
    if (openModals.has(key)) return;
    openModals.add(key);
    const titleEl = wrap.querySelector(".ant-modal-title");
    const title = (titleEl?.textContent || "Modal").trim().slice(0, 120);
    enqueue("modal_open", {
      label: title,
      target: "ant-modal",
      meta: { modalKey: key },
    });
  });

  openModals.forEach((key) => {
    const stillOpen = Array.from(wraps).some((wrap) => {
      if (wrap.style.display === "none") return false;
      const modal = wrap.querySelector(".ant-modal");
      const k = modal?.getAttribute("aria-labelledby") || modal?.innerText?.slice(0, 40) || "modal";
      return k === key;
    });
    if (!stillOpen) {
      openModals.delete(key);
      enqueue("modal_close", {
        label: key,
        target: "ant-modal",
        meta: { modalKey: key },
      });
    }
  });
}

function startModalObserver() {
  if (modalObserver) return;
  modalObserver = new MutationObserver(() => {
    scanModals();
  });
  modalObserver.observe(document.body, { childList: true, subtree: true });
}

export function mountAuditUiListeners(onBatchPost) {
  if (listenersAttached) return;
  listenersAttached = true;
  postHandler = onBatchPost;

  document.addEventListener("click", onDocumentClick, true);
  document.addEventListener("change", onDocumentChange, true);
  startModalObserver();
}

export function unmountAuditUiListeners() {
  if (!listenersAttached) return;
  listenersAttached = false;
  postHandler = null;
  document.removeEventListener("click", onDocumentClick, true);
  document.removeEventListener("change", onDocumentChange, true);
  if (modalObserver) {
    modalObserver.disconnect();
    modalObserver = null;
  }
  filterTimers.forEach((t) => window.clearTimeout(t));
  filterTimers.clear();
  openModals.clear();
  flushQueue();
}
