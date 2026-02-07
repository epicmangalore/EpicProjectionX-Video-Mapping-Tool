import { create } from "zustand";

export type ToolMode = "select" | "corner-pin" | "mesh-warp" | "transform" | "pen";

interface UIStore {
    // UI state
    toolMode: ToolMode;
    showGrid: boolean;
    showRulers: boolean;
    showPerformanceMonitor: boolean;
    leftPanelOpen: boolean;
    rightPanelOpen: boolean;
    bottomPanelOpen: boolean;
    // Actions
    setToolMode: (mode: ToolMode) => void;
    toggleGrid: () => void;
    toggleRulers: () => void;
    togglePerformanceMonitor: () => void;
    toggleLeftPanel: () => void;
    toggleRightPanel: () => void;
    toggleBottomPanel: () => void;
}

export const useUIStore = create<UIStore>((set) => ({
    // Initial state
    toolMode: "select",
    showGrid: false,
    showRulers: false,
    showPerformanceMonitor: false,
    leftPanelOpen: true,
    rightPanelOpen: true,
    bottomPanelOpen: true,

    // Actions
    setToolMode: (mode) => set({ toolMode: mode }),
    toggleGrid: () => set((state) => ({ showGrid: !state.showGrid })),
    toggleRulers: () => set((state) => ({ showRulers: !state.showRulers })),
    togglePerformanceMonitor: () =>
        set((state) => ({ showPerformanceMonitor: !state.showPerformanceMonitor })),
    toggleLeftPanel: () =>
        set((state) => ({ leftPanelOpen: !state.leftPanelOpen })),
    toggleRightPanel: () =>
        set((state) => ({ rightPanelOpen: !state.rightPanelOpen })),
    toggleBottomPanel: () =>
        set((state) => ({ bottomPanelOpen: !state.bottomPanelOpen })),
}));
