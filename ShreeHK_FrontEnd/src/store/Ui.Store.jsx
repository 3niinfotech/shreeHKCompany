// import { create } from "zustand";
// import { persist } from "zustand/middleware";

// const useUIStore = create(
//   persist(
//     (set) => ({
//       sidebarOpen: true,
//       toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
//       isDarkMode: false,
//       toggleTheme: () => set((state) => ({ isDarkMode: !state.isDarkMode })),
//     }),
//     { name: "ui-storage" }
//   )
// );

// export default useUIStore;

import { create } from "zustand";
import { persist } from "zustand/middleware";

const useUIStore = create(
    persist(
        (set) => ({
            sidebarOpen: true,
            isDarkMode: false,
            viewMode: "web",
            toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
            toggleTheme: () => set((state) => ({ isDarkMode: !state.isDarkMode })),
            setThemeMode: (mode) => set({ isDarkMode: mode === "dark" }),
            setViewMode: (viewMode) => set({ viewMode }),
            toggleViewMode: () =>
                set((state) => ({
                    viewMode: state.viewMode === "web" ? "dashboard" : "web",
                })),

            // Modal State
            modal: {
                isOpen: false,
                title: "",
                content: null,
                footer: null,
                width: 600,
                loading: false,
            },

            openModal: ({ title, content, footer, width = 600 }) =>
                set((state) => ({
                    modal: { ...state.modal, isOpen: true, title, content, footer, width },
                })),

            closeModal: () =>
                set((state) => ({
                    modal: { ...state.modal, isOpen: false, content: null, footer: null, loading: false },
                })),

            setModalLoading: (status) =>
                set((state) => ({
                    modal: { ...state.modal, loading: status },
                })),

            rapaportPanelOpen: false,
            rapaportPanelExpanded: false,
            rapaportInterval: "1D",
            setRapaportPanelOpen: (rapaportPanelOpen) => set({ rapaportPanelOpen }),
            toggleRapaportPanel: () =>
                set((state) => ({ rapaportPanelOpen: !state.rapaportPanelOpen })),
            setRapaportPanelExpanded: (rapaportPanelExpanded) => set({ rapaportPanelExpanded }),
            toggleRapaportPanelExpanded: () =>
                set((state) => ({ rapaportPanelExpanded: !state.rapaportPanelExpanded })),
            setRapaportInterval: (rapaportInterval) => set({ rapaportInterval }),
        }),
        {
            name: "ui-storage",
            partialize: (state) => ({
                sidebarOpen: state.sidebarOpen,
                isDarkMode: state.isDarkMode,
                viewMode: state.viewMode,
                rapaportPanelOpen: state.rapaportPanelOpen,
                rapaportPanelExpanded: state.rapaportPanelExpanded,
                rapaportInterval: state.rapaportInterval,
            }),
        }
    )
);

export default useUIStore;