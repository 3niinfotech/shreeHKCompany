const TABLE_BODY_MIN_HEIGHT = 160;
const TABLE_CHROME_RESERVE = 96;
/** Filter→table gap + container bottom margin in diamondInventoryTable.scss */
const PAGE_INNER_GAP = 18;

export const measureInventoryTableHeight = (pageEl, currentHeight) => {
  if (!pageEl) return currentHeight ?? TABLE_BODY_MIN_HEIGHT;

  const filterEl = pageEl.querySelector(".inventory-filter-wrapper");
  const pageRect = pageEl.getBoundingClientRect();
  const filterHeight = filterEl instanceof HTMLElement ? filterEl.offsetHeight : 0;
  const viewportHeight = window.innerHeight || document.documentElement.clientHeight;

  // Prefer flex page-shell height so table fills down to layout footer
  const pageInner = Math.floor(pageEl.clientHeight || pageRect.height || 0);
  const fromPage = pageInner > 0 ? pageInner - filterHeight - PAGE_INNER_GAP : 0;
  const fromViewport = Math.floor(
    viewportHeight - pageRect.top - filterHeight - TABLE_CHROME_RESERVE
  );
  const availableHeight = fromPage > TABLE_BODY_MIN_HEIGHT ? fromPage : fromViewport;
  const nextHeight = availableHeight > TABLE_BODY_MIN_HEIGHT ? availableHeight : TABLE_BODY_MIN_HEIGHT;

  if (currentHeight != null && Math.abs(nextHeight - currentHeight) <= 1) {
    return currentHeight;
  }

  return nextHeight;
};
