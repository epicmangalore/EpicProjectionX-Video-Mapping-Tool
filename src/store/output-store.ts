import { create } from "zustand";

interface OutputState {
    // Output window
    outputWindowOpen: boolean;
    outputWindowRef: Window | null;

    // Display settings
    isFullscreen: boolean;
    resolution: { width: number; height: number };
    resolutionPreset: "1080p" | "4K" | "custom";

    // Performance monitoring
    showPerformanceMonitor: boolean;
    fps: number;
    frameTime: number;
    memoryUsage: number;

    isOutput: boolean;

    // Actions
    setIsOutput: (isOutput: boolean) => void;
    openOutputWindow: () => void;
    closeOutputWindow: () => void;
    toggleFullscreen: () => void;
    setResolution: (width: number, height: number) => void;
    setResolutionPreset: (preset: "1080p" | "4K" | "custom") => void;
    togglePerformanceMonitor: () => void;
    updatePerformanceMetrics: (fps: number, frameTime: number, memory: number) => void;
}

export const useOutputStore = create<OutputState>((set, get) => ({
    outputWindowOpen: false,
    outputWindowRef: null,
    isFullscreen: false,
    resolution: { width: 1920, height: 1080 },
    resolutionPreset: "1080p",
    showPerformanceMonitor: false,
    fps: 60,
    frameTime: 16.67,
    memoryUsage: 0,
    isOutput: false,

    setIsOutput: (isOutput) => set({ isOutput }),
    openOutputWindow: () => {
        // Use Electron IPC if available
        if (typeof window !== 'undefined' && (window as any).electron?.openOutputWindow) {
            (window as any).electron.openOutputWindow();
            set({ outputWindowOpen: true });
            return;
        }

        const { resolution } = get();
        const outputWindow = window.open(
            "/output",
            "ProjectionX Output",
            `width=${resolution.width},height=${resolution.height},menubar=no,toolbar=no,location=no,status=no`
        );

        if (outputWindow) {
            set({ outputWindowOpen: true, outputWindowRef: outputWindow });
        } else {
            console.warn("Could not open output window. Popups may be blocked by your browser.");
            if (typeof window !== 'undefined') {
                alert("Could not open Output Window. Please allow popups for this site in your browser settings.");
            }
        }
    },

    closeOutputWindow: () => {
        // Use Electron IPC if available
        if (typeof window !== 'undefined' && (window as any).electron?.closeOutputWindow) {
            (window as any).electron.closeOutputWindow();
            set({ outputWindowOpen: false });
            return;
        }

        const { outputWindowRef } = get();
        if (outputWindowRef && !outputWindowRef.closed) {
            outputWindowRef.close();
        }
        set({ outputWindowOpen: false, outputWindowRef: null });
    },

    toggleFullscreen: () => {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen();
            set({ isFullscreen: true });
        } else {
            document.exitFullscreen();
            set({ isFullscreen: false });
        }
    },

    setResolution: (width, height) => {
        set({ resolution: { width, height }, resolutionPreset: "custom" });
    },

    setResolutionPreset: (preset) => {
        const resolutions = {
            "1080p": { width: 1920, height: 1080 },
            "4K": { width: 3840, height: 2160 },
            custom: get().resolution,
        };
        set({ resolution: resolutions[preset], resolutionPreset: preset });
    },

    togglePerformanceMonitor: () => {
        set((state) => ({ showPerformanceMonitor: !state.showPerformanceMonitor }));
    },

    updatePerformanceMetrics: (fps, frameTime, memory) => {
        set({ fps, frameTime, memoryUsage: memory });
    },
}));
