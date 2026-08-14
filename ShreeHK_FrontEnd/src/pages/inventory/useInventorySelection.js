import { useCallback, useMemo, useRef, useSyncExternalStore } from "react";

const EMPTY_IDS = [];

function createSelectionStore() {
  let orderedIds = EMPTY_IDS;
  let selectedSet = new Set();
  let visibleIds = EMPTY_IDS;
  let visibleSet = new Set();
  let selectedVisibleCount = 0;
  let selectAllSnapshot = { isAllSelected: false, isIndeterminate: false };
  const listeners = new Set();

  const refreshSelectAllSnapshot = () => {
    const isAllSelected =
      visibleIds.length > 0 &&
      orderedIds.length === visibleIds.length &&
      selectedVisibleCount === visibleIds.length;
    const isIndeterminate = orderedIds.length > 0 && !isAllSelected;
    if (
      selectAllSnapshot.isAllSelected !== isAllSelected ||
      selectAllSnapshot.isIndeterminate !== isIndeterminate
    ) {
      selectAllSnapshot = { isAllSelected, isIndeterminate };
    }
  };

  const recountSelectedVisible = () => {
    let count = 0;
    for (let i = 0; i < visibleIds.length; i += 1) {
      if (selectedSet.has(visibleIds[i])) count += 1;
    }
    selectedVisibleCount = count;
  };

  const emit = () => {
    listeners.forEach((listener) => listener());
  };

  return {
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    getOrderedIds() {
      return orderedIds;
    },
    getSelectedSet() {
      return selectedSet;
    },
    getSelectAllState() {
      return selectAllSnapshot;
    },
    getVisibleIds() {
      return visibleIds;
    },
    isSelected(id) {
      return selectedSet.has(String(id));
    },
    setVisibleIds(ids) {
      visibleIds = (Array.isArray(ids) ? ids : EMPTY_IDS).map(String);
      visibleSet = new Set(visibleIds);
      recountSelectedVisible();
      refreshSelectAllSnapshot();
      emit();
    },
    toggle(id, checked) {
      const strId = String(id);
      if (checked) {
        if (selectedSet.has(strId)) return;
        selectedSet.add(strId);
        orderedIds = [...orderedIds, strId];
        if (visibleSet.has(strId)) selectedVisibleCount += 1;
      } else {
        if (!selectedSet.has(strId)) return;
        selectedSet.delete(strId);
        orderedIds = orderedIds.filter((item) => item !== strId);
        if (visibleSet.has(strId)) selectedVisibleCount -= 1;
      }
      refreshSelectAllSnapshot();
      emit();
    },
    selectAll(ids) {
      const nextIds = (Array.isArray(ids) ? ids : EMPTY_IDS).map(String);
      selectedSet = new Set(nextIds);
      orderedIds = nextIds;
      recountSelectedVisible();
      refreshSelectAllSnapshot();
      emit();
    },
    clear() {
      if (orderedIds.length === 0) return;
      selectedSet = new Set();
      orderedIds = EMPTY_IDS;
      selectedVisibleCount = 0;
      refreshSelectAllSnapshot();
      emit();
    },
    replace(nextIds) {
      const normalized = (Array.isArray(nextIds) ? nextIds : EMPTY_IDS).map(String);
      selectedSet = new Set(normalized);
      orderedIds = normalized;
      recountSelectedVisible();
      refreshSelectAllSnapshot();
      emit();
    },
  };
}

export function useInventorySelection() {
  const storeRef = useRef(null);
  if (!storeRef.current) {
    storeRef.current = createSelectionStore();
  }
  const store = storeRef.current;

  const selectedRowKeys = useSyncExternalStore(
    store.subscribe,
    store.getOrderedIds,
    store.getOrderedIds,
  );

  const selectedRowKeysSet = useMemo(
    () => store.getSelectedSet(),
    [selectedRowKeys, store],
  );

  const setSelectedRowKeys = useCallback(
    (updater) => {
      const current = store.getOrderedIds();
      const next = typeof updater === "function" ? updater(current) : updater;
      store.replace(next);
    },
    [store],
  );

  const handleToggleRowSelection = useCallback(
    (id, checked) => {
      store.toggle(id, checked);
    },
    [store],
  );

  const handleSelectAllToggle = useCallback(
    (checked) => {
      if (checked) {
        store.selectAll(store.getVisibleIds());
      } else {
        store.clear();
      }
    },
    [store],
  );

  const clearSelection = useCallback(() => {
    store.clear();
  }, [store]);

  return {
    store,
    selectedRowKeys,
    selectedRowKeysSet,
    setSelectedRowKeys,
    handleToggleRowSelection,
    handleSelectAllToggle,
    clearSelection,
  };
}

export function useRowSelectionState(store, rowId) {
  const getSnapshot = useCallback(
    () => (store ? store.isSelected(rowId) : false),
    [store, rowId],
  );
  const subscribe = useCallback(
    (listener) => (store ? store.subscribe(listener) : () => {}),
    [store],
  );
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

export function useSelectAllState(store) {
  const getSnapshot = useCallback(
    () => (store ? store.getSelectAllState() : null),
    [store],
  );
  const subscribe = useCallback(
    (listener) => (store ? store.subscribe(listener) : () => {}),
    [store],
  );
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

export function useSelectedRowKeys(store) {
  const getSnapshot = useCallback(
    () => (store ? store.getOrderedIds() : EMPTY_IDS),
    [store],
  );
  const subscribe = useCallback(
    (listener) => (store ? store.subscribe(listener) : () => {}),
    [store],
  );
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}
