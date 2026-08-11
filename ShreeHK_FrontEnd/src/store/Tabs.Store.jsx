import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { HOME_TAB } from "../utils/tabRouteMeta";

const DEFAULT_TABS = [{ ...HOME_TAB, closable: false }];

const useTabsStore = create(
  persist(
    (set) => ({
      tabs: DEFAULT_TABS,
      activeKey: HOME_TAB.key,

      openTab: (tab) => {
        const path = tab.path === "" ? HOME_TAB.path : tab.path;

        if (path === HOME_TAB.path) {
          set((state) =>
            state.activeKey === HOME_TAB.key ? state : { activeKey: HOME_TAB.key }
          );
          return;
        }

        set((state) => {
          const existing = state.tabs.find((t) => t.path === path);
          if (existing) {
            if (state.activeKey === existing.key) return state;
            return { activeKey: existing.key };
          }

          const key = tab.key ?? path;
          const newTab = {
            key,
            label: tab.label,
            path,
            closable: tab.closable !== false,
          };

          return {
            tabs: [...state.tabs, newTab],
            activeKey: key,
          };
        });
      },

      closeTab: (key) => {
        if (key === HOME_TAB.key) return;

        set((state) => {
          const index = state.tabs.findIndex((t) => t.key === key);
          if (index === -1) return state;

          const wasActive = state.activeKey === key;
          const newTabs = state.tabs.filter((t) => t.key !== key);
          let newActiveKey = state.activeKey;

          if (wasActive) {
            const newIndex = Math.max(0, index - 1);
            newActiveKey = newTabs[newIndex]?.key ?? HOME_TAB.key;
          }

          return { tabs: newTabs, activeKey: newActiveKey };
        });
      },

      setActiveTab: (key) =>
        set((state) => (state.activeKey === key ? state : { activeKey: key })),
    }),
    {
      name: "tabs-storage",
      storage: createJSONStorage(() => sessionStorage),
      partialize: (state) => ({
        tabs: state.tabs,
        activeKey: state.activeKey,
      }),
      merge: (persisted, current) => {
        const saved = persisted ?? {};
        let tabs = Array.isArray(saved.tabs) ? saved.tabs : current.tabs;
        if (!tabs.some((t) => t.key === HOME_TAB.key)) {
          tabs = [{ ...HOME_TAB, closable: false }, ...tabs];
        } else {
          tabs = tabs.map((t) =>
            t.key === HOME_TAB.key ? { ...t, closable: false, path: HOME_TAB.path, label: HOME_TAB.label } : t
          );
        }
        const activeKey = saved.activeKey ?? current.activeKey;
        return { ...current, ...saved, tabs, activeKey };
      },
    }
  )
);

export default useTabsStore;
