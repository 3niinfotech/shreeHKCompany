import { useEffect, useState } from "react";

export const TABLE_BODY_MIN_HEIGHT = 160;

const VIEWPORT_BOTTOM_GAP = 8;

/** Scroll body height from a flex table container (fills remaining viewport). */
export function measureTableBodyScrollHeight(containerEl) {
  if (!containerEl) return TABLE_BODY_MIN_HEIGHT;

  const rect = containerEl.getBoundingClientRect();
  let containerHeight = rect.height;
  if (containerHeight <= 0) return TABLE_BODY_MIN_HEIGHT;

  // A container that is not height-bounded by its parent grows with the body
  // height we set, which would feed back into the next measurement. Cap it at
  // the space left below the container inside the viewport.
  const viewportHeight = window.innerHeight || 0;
  if (viewportHeight > 0) {
    const available = viewportHeight - rect.top - VIEWPORT_BOTTOM_GAP;
    if (available > TABLE_BODY_MIN_HEIGHT && available < containerHeight) {
      containerHeight = available;
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
  if (pagination instanceof HTMLElement && pagination.offsetParent !== null) {
    const pagStyle = window.getComputedStyle(pagination);
    reserved += pagination.offsetHeight
      + (parseFloat(pagStyle.marginTop) || 0)
      + (parseFloat(pagStyle.marginBottom) || 0);
  }

  const bodyHeight = Math.floor(containerHeight - reserved);
  return bodyHeight > TABLE_BODY_MIN_HEIGHT ? bodyHeight : TABLE_BODY_MIN_HEIGHT;
}

/**
 * @param {import('react').RefObject<HTMLElement|null>} containerRef
 * @param {unknown[]} [refreshDeps] Re-measure when layout/content above table changes.
 */
export default function useTableBodyScrollHeight(containerRef, refreshDeps = []) {
  const [height, setHeight] = useState(TABLE_BODY_MIN_HEIGHT);

  useEffect(() => {
    const updateHeight = () => {
      if (!containerRef.current) return;
      setHeight(measureTableBodyScrollHeight(containerRef.current));
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
  }, refreshDeps);

  return height;
}
