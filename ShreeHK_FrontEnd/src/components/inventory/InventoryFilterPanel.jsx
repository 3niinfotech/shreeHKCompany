import React, { useState, useRef, useCallback, useEffect } from "react";
import { Button, Typography } from "antd";
import { ChevronDown, ChevronUp, SlidersHorizontal } from "lucide-react";
import styles from "../../assets/scss/components/inventoryFilterPanel.module.scss";
const { Text } = Typography;

const InventoryFilterPanel = ({
  sectionTitle = "Total Inventory",
  totalLabel,
  searchSlot,
  compactFilters,
  caratSlot,
  searchButtonSlot,
  advancedFilters,
  headerActionsLeft,
  headerActions,
  toolbarActions,
  defaultExpanded = false,
  expandOnHover = false,
  advancedTitle = "Advanced Filters",
}) => {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const [pinned, setPinned] = useState(defaultExpanded);
  const [prewarmAdvanced, setPrewarmAdvanced] = useState(defaultExpanded);
  const leaveTimer = useRef(null);
  const hasAdvanced = Boolean(advancedFilters);

  useEffect(() => {
    if (prewarmAdvanced || !hasAdvanced) return undefined;
    const idleId = window.requestIdleCallback
      ? window.requestIdleCallback(() => setPrewarmAdvanced(true), { timeout: 1500 })
      : window.setTimeout(() => setPrewarmAdvanced(true), 800);
    return () => {
      if (window.cancelIdleCallback && typeof idleId === "number") {
        window.cancelIdleCallback(idleId);
      } else {
        window.clearTimeout(idleId);
      }
    };
  }, [hasAdvanced, prewarmAdvanced]);

  const shouldRenderAdvanced = hasAdvanced && (expanded || prewarmAdvanced);

  const hasCompactRow =
    Boolean(searchSlot) ||
    Boolean(compactFilters) ||
    Boolean(caratSlot) ||
    Boolean(searchButtonSlot);

  const clearLeaveTimer = useCallback(() => {
    if (leaveTimer.current) {
      clearTimeout(leaveTimer.current);
      leaveTimer.current = null;
    }
  }, []);

  const openAdvanced = useCallback(() => {
    clearLeaveTimer();
    if (hasAdvanced) {
      setPrewarmAdvanced(true);
      setExpanded(true);
    }
  }, [clearLeaveTimer, hasAdvanced]);

  const scheduleClose = useCallback(() => {
    if (pinned || !expandOnHover) return;
    clearLeaveTimer();
    leaveTimer.current = setTimeout(() => setExpanded(false), 180);
  }, [pinned, expandOnHover, clearLeaveTimer]);

  const handleToggleClick = () => {
    clearLeaveTimer();
    const next = !expanded;
    setExpanded(next);
    setPinned(next);
    if (next) setPrewarmAdvanced(true);
  };

  const handleAdvancedHoverEnter = () => {
    if (expandOnHover && hasAdvanced && !pinned) {
      openAdvanced();
    }
  };

  const handleAdvancedHoverLeave = () => {
    if (!expandOnHover) return;
    scheduleClose();
  };

  return (
    <div className={styles.panel}>
      <div className={styles.header}>
        <div className={styles.headerMain}>
          <div className={styles.headerLeft}>
            <Text className={styles.sectionTitle}>{sectionTitle}</Text>
          </div>
          {hasCompactRow ? (
            <div className={styles.compactRow}>
              {searchSlot ? (
                <div className={styles.searchSlot}>{searchSlot}</div>
              ) : null}
              {caratSlot ? <div className={styles.caratSlot}>{caratSlot}</div> : null}
              {searchButtonSlot ? (
                <div className={styles.searchButtonSlot}>{searchButtonSlot}</div>
              ) : null}
              {compactFilters ? (
                <div className={styles.compactFilters}>{compactFilters}</div>
              ) : null}
            </div>
          ) : null}

          {toolbarActions ? (
            <div className={styles.toolbarRow}>{toolbarActions}</div>
          ) : null}
          <div className={styles.headerRight}>
            {headerActionsLeft ? (
              <div className={styles.headerActions}>{headerActionsLeft}</div>
            ) : null}
            {hasAdvanced ? (
              <Button
                type="default"
                size="small"
                className={`${styles.toggleBtn} ${expanded ? styles.toggleBtnActive : ""}`}
                icon={
                  expanded ? (
                    <ChevronUp size={14} />
                  ) : (
                    <ChevronDown size={14} />
                  )
                }
                onClick={handleToggleClick}
                onMouseEnter={handleAdvancedHoverEnter}
                onMouseLeave={handleAdvancedHoverLeave}
              >
                <SlidersHorizontal size={14} />
                {expanded ? "Hide Filters" : advancedTitle}
              </Button>
            ) : null}
            {headerActions ? (
              <div className={styles.headerActions}>{headerActions}</div>
            ) : null}
          </div>
        </div>
      </div>

      {shouldRenderAdvanced ? (
        <div
          className={styles.advancedBody}
          style={expanded ? undefined : { display: "none" }}
          aria-hidden={!expanded}
          onMouseEnter={clearLeaveTimer}
          onMouseLeave={handleAdvancedHoverLeave}
        >
          <div className={styles.advancedInner}>{advancedFilters}</div>
        </div>
      ) : null}
    </div>
  );
};

export default InventoryFilterPanel;
