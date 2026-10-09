import { useEffect, useState } from "react";

export const TABLE_BODY_MIN_HEIGHT = 160;

const VIEWPORT_BOTTOM_GAP = 8;

/** Minimum space for full pagination (total + size changer + jumper). */
export const PAGINATION_MIN_RESERVE = 56;

/** Scroll body height from a flex table container (fills remaining viewport). */
export function measureTableBodyScrollHeight(containerEl, options = {}) {
  if (!containerEl) return TABLE_BODY_MIN_HEIGHT;

  const paginationReserve = Number(options.paginationReserve) || 0;
  const summaryReserve = Number(options.summaryReserve) || 0;

  const rect = containerEl.getBoundingClientRect();
  let containerHeight = rect.height;
  if (containerHeight <= 0) return TABLE_BODY_MIN_HEIGHT;

  // A container that is not height-bounded by its parent grows with the body
  // height we set, which would feed back into the next measurement. Cap it at
  // the space left below the container inside the viewport.
  const viewportHeight = window.innerHeight || 0;
  if (viewportHeight > 0) {
    const available = viewportHeight - rect.top - VIEWPORT_BOTTOM_GAP;
    // Prefer remaining viewport so report tables fill to the bottom (no white gap).
    // Cap with measured height when flex already sized the container correctly.
    if (available > TABLE_BODY_MIN_HEIGHT) {
      if (containerHeight <= TABLE_BODY_MIN_HEIGHT + 20 || containerHeight < available - 24) {
        containerHeight = available;
      } else if (containerHeight > available) {
        containerHeight = available;
      }
    }
  }

  // Pagination rendered as sibling below the table container
  const parentEl = containerEl.parentElement;
  if (parentEl) {
    const siblingPag = Array.from(parentEl.children).find(
      (el) => el !== containerEl && el.querySelector?.(".ant-pagination")
    );
    if (siblingPag instanceof HTMLElement) {
      containerHeight -= siblingPag.offsetHeight;
    }
  }

  const tableHeader = containerEl.querySelector(".ant-table-header");
  const tableFooter = containerEl.querySelector(".ant-table-footer");
  const stickyScroll = containerEl.querySelector(".ant-table-sticky-scroll");
  const pagination = containerEl.querySelector(".ant-pagination");

  let reserved = 0;
  if (tableHeader instanceof HTMLElement) reserved += tableHeader.offsetHeight;
  if (tableFooter instanceof HTMLElement) reserved += tableFooter.offsetHeight;
  if (stickyScroll instanceof HTMLElement) reserved += stickyScroll.offsetHeight;

  // Fixed Table.Summary sits below the scroll body — must shrink scroll.y or it clips.
  let summaryHeight = 0;
  containerEl.querySelectorAll(".ant-table-summary").forEach((el) => {
    if (!(el instanceof HTMLElement)) return;
    if (el.closest(".ant-table-body")) return;
    summaryHeight = Math.max(summaryHeight, el.offsetHeight);
  });
  if (summaryHeight > 0) {
    reserved += summaryHeight;
  } else if (summaryReserve > 0) {
    reserved += summaryReserve;
  }

  if (pagination instanceof HTMLElement && pagination.offsetParent !== null) {
    const pagStyle = window.getComputedStyle(pagination);
    reserved += pagination.offsetHeight
      + (parseFloat(pagStyle.marginTop) || 0)
      + (parseFloat(pagStyle.marginBottom) || 0);
  } else if (paginationReserve > 0) {
    // Pagination not laid out yet — reserve space so scroll.y does not clip it.
    reserved += paginationReserve;
  }

  // Always keep at least paginationReserve when requested (complete controls wrap).
  if (paginationReserve > 0) {
    const pagBlock = pagination instanceof HTMLElement ? pagination.offsetHeight : 0;
    if (pagBlock > 0 && pagBlock < paginationReserve) {
      reserved += paginationReserve - pagBlock;
    }
  }

  const bodyHeight = Math.floor(containerHeight - reserved);
  return bodyHeight > TABLE_BODY_MIN_HEIGHT ? bodyHeight : TABLE_BODY_MIN_HEIGHT;
}

/**
 * @param {import('react').RefObject<HTMLElement|null>} containerRef
 * @param {unknown[]} [refreshDeps] Re-measure when layout/content above table changes.
 * @param {{ paginationReserve?: number, summaryReserve?: number }} [options]
 */
export default function useTableBodyScrollHeight(containerRef, refreshDeps = [], options = {}) {
  const [height, setHeight] = useState(TABLE_BODY_MIN_HEIGHT);
  const paginationReserve = options.paginationReserve ?? 0;
  const summaryReserve = options.summaryReserve ?? 0;

  useEffect(() => {
    const updateHeight = () => {
      if (!containerRef.current) return;
      setHeight(
        measureTableBodyScrollHeight(containerRef.current, {
          paginationReserve,
          summaryReserve,
        })
      );
    };

    updateHeight();
    const timer = window.setTimeout(updateHeight, 120);
    const rafId = window.requestAnimationFrame(updateHeight);
    window.addEventListener("resize", updateHeight);

    let resizeObserver;
    if (typeof ResizeObserver !== "undefined") {
      resizeObserver = new ResizeObserver(updateHeight);
      if (containerRef.current) resizeObserver.observe(containerRef.current);
      const pageRoot = containerRef.current?.closest(".app-page-root");
      if (pageRoot) resizeObserver.observe(pageRoot);
      const parentEl = containerRef.current?.parentElement;
      if (parentEl) resizeObserver.observe(parentEl);
    }

    return () => {
      window.removeEventListener("resize", updateHeight);
      window.clearTimeout(timer);
      window.cancelAnimationFrame(rafId);
      resizeObserver?.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...refreshDeps, paginationReserve, summaryReserve]);

  return height;
}
