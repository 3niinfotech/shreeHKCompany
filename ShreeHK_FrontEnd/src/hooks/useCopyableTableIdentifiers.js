import { useEffect, useRef } from "react";
import {
  copyIdentifierToClipboard,
  isCopyableIdentifierHeader,
} from "../utils/copyIdentifier";

const INTERACTIVE_SKIP = new Set(["INPUT", "TEXTAREA", "SELECT", "BUTTON"]);

function findTableCell(target) {
  return target?.closest?.("td.ant-table-cell");
}

function getColumnHeaderText(cell) {
  const table = cell?.closest?.("table");
  const row = cell?.closest?.("tr");
  if (!table || !row) return "";

  const cellIndex = Array.from(row.children).indexOf(cell);
  if (cellIndex < 0) return "";

  const headerRow = table.querySelector("thead tr");
  if (!headerRow) return "";

  const headerCell = headerRow.children[cellIndex];
  return headerCell?.innerText?.trim() || "";
}

function getCellText(cell) {
  return cell?.innerText?.trim() || "";
}

function shouldSkipTarget(target) {
  if (!target?.tagName) return true;
  if (INTERACTIVE_SKIP.has(target.tagName)) return true;
  if (target.isContentEditable) return true;
  if (target.closest(".ant-checkbox-wrapper, .ant-radio-wrapper, .ant-select")) return true;
  return false;
}

function selectionWithinCell(cell, selection) {
  if (!cell || !selection?.rangeCount) return false;
  const range = selection.getRangeAt(0);
  return cell.contains(range.commonAncestorContainer);
}

export default function useCopyableTableIdentifiers() {
  const lastCopyRef = useRef({ at: 0, value: "" });

  const copyOnce = (value) => {
    const text = String(value ?? "").trim();
    if (!text) return;

    const now = Date.now();
    if (
      lastCopyRef.current.value === text &&
      now - lastCopyRef.current.at < 400
    ) {
      return;
    }

    lastCopyRef.current = { at: now, value: text };
    copyIdentifierToClipboard(text);
  };

  useEffect(() => {
    const handleDoubleClick = (event) => {
      if (shouldSkipTarget(event.target)) return;

      const cell = findTableCell(event.target);
      if (!cell || !cell.closest(".ant-table")) return;

      const header = getColumnHeaderText(cell);
      if (!isCopyableIdentifierHeader(header)) return;

      const value = getCellText(cell);
      if (!value) return;

      event.preventDefault();
      event.stopPropagation();
      copyOnce(value);
    };

    const handleMouseUp = (event) => {
      if (shouldSkipTarget(event.target)) return;

      const selection = window.getSelection();
      const selectedText = selection?.toString()?.trim();
      if (!selectedText) return;

      const cell = findTableCell(event.target);
      if (!cell || !cell.closest(".ant-table")) return;
      if (!selectionWithinCell(cell, selection)) return;

      const header = getColumnHeaderText(cell);
      if (!isCopyableIdentifierHeader(header)) return;

      copyOnce(selectedText);
    };

    document.addEventListener("dblclick", handleDoubleClick, true);
    document.addEventListener("mouseup", handleMouseUp, true);

    return () => {
      document.removeEventListener("dblclick", handleDoubleClick, true);
      document.removeEventListener("mouseup", handleMouseUp, true);
    };
  }, []);
}
