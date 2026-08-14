const TABLE_BODY_MIN_HEIGHT = 160;
const TABLE_CHROME_RESERVE = 96;

export const measureInventoryTableHeight = (pageEl, currentHeight) => {
  if (!pageEl) return currentHeight ?? TABLE_BODY_MIN_HEIGHT;

  const filterEl = pageEl.querySelector(".inventory-filter-wrapper");
  const pageRect = pageEl.getBoundingClientRect();
  const filterHeight = filterEl instanceof HTMLElement ? filterEl.offsetHeight : 0;
  const viewportHeight = window.innerHeight || document.documentElement.clientHeight;
  const availableHeight = Math.floor(viewportHeight - pageRect.top - filterHeight - TABLE_CHROME_RESERVE);
  const nextHeight = availableHeight > TABLE_BODY_MIN_HEIGHT ? availableHeight : TABLE_BODY_MIN_HEIGHT;

  if (currentHeight != null && Math.abs(nextHeight - currentHeight) <= 1) {
    return currentHeight;
  }

  return nextHeight;
};
