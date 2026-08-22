import { create } from "zustand";

export type ToolMode = "select" | "corner-pin" | "mesh-warp" | "transform" | "pen" | "hand" | "surface";
export type PenSubMode = "draw" | "edit";

export interface SnapLine {
    id: string; // "x-100" or "y-500"
    type: "horizontal" | "vertical";
    position: number; // x or y value
}

interface UIStore {
    // UI state
    toolMode: ToolMode;
    penSubMode: PenSubMode;
    showGrid: boolean;
    showRulers: boolean;
    showPerformanceMonitor: boolean;
    leftPanelOpen: boolean;
    rightPanelOpen: boolean;
    bottomPanelOpen: boolean;
    activeSnapLines: SnapLine[];
    isCanvasHovered: boolean;
    mediaPickerOpen: boolean;
    sidebarTab: "layers" | "fx" | "library";
    activeEffectConfig: {
        type: "stackable" | "shader" | "base" | "preview";
        effectId?: string;
        previewEffectId?: string;
        surfaceId: string;
    } | null;
    // Actions
    setToolMode: (mode: ToolMode) => void;
    setPenSubMode: (mode: PenSubMode) => void;
    toggleGrid: () => void;
    toggleRulers: () => void;
    togglePerformanceMonitor: () => void;
    toggleLeftPanel: () => void;
    toggleRightPanel: () => void;
    toggleBottomPanel: () => void;
    setSnapLines: (lines: SnapLine[]) => void;
    setCanvasHovered: (hovered: boolean) => void;
    setMediaPickerOpen: (open: boolean) => void;
    setSidebarTab: (tab: "layers" | "fx" | "library") => void;
    setActiveEffectConfig: (config: { type: "stackable" | "shader" | "base" | "preview"; effectId?: string; previewEffectId?: string; surfaceId: string } | null) => void;
}

export const useUIStore = create<UIStore>((set) => ({
    // Initial state
    toolMode: "select",
    penSubMode: "draw" as PenSubMode,
    showGrid: false,
    showRulers: false,
    showPerformanceMonitor: false,
    leftPanelOpen: true,
    rightPanelOpen: true,
    bottomPanelOpen: true,
    activeSnapLines: [],
    isCanvasHovered: false,
    mediaPickerOpen: false,
    sidebarTab: "layers",
    activeEffectConfig: null,

    // Actions
    setToolMode: (mode) => set({ toolMode: mode }),
    setPenSubMode: (mode) => set({ penSubMode: mode, toolMode: "pen" }),
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
    setSnapLines: (lines) => set({ activeSnapLines: lines }),
    setCanvasHovered: (hovered: boolean) => set({ isCanvasHovered: hovered }),
    setMediaPickerOpen: (open: boolean) => set({ mediaPickerOpen: open }),
    setSidebarTab: (tab) => set({ sidebarTab: tab }),
    setActiveEffectConfig: (config) => set({ activeEffectConfig: config }),
}));
