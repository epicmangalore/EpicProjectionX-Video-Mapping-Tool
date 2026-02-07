import { create } from "zustand";

export interface EffectSettings {
    // Color adjustments
    brightness: number; // -1 to 1
    contrast: number; // -1 to 1
    saturation: number; // -1 to 1
    hue: number; // 0 to 1 (360 degrees)
    colorTint: { r: number; g: number; b: number }; // 0 to 1

    // Visual effects
    blur: number; // 0 to 10
    chromaticAberration: number; // 0 to 10
    rgbShift: number; // 0 to 10

    // Edge blending
    blendLeft: number;
    blendRight: number;
    blendTop: number;
    blendBottom: number;
    blendFeather: number;
    blendGamma: number;
}

export const defaultEffectSettings: EffectSettings = {
    brightness: 0,
    contrast: 0,
    saturation: 0,
    hue: 0,
    colorTint: { r: 1, g: 1, b: 1 },
    blur: 0,
    chromaticAberration: 0,
    rgbShift: 0,
    blendLeft: 0,
    blendRight: 0,
    blendTop: 0,
    blendBottom: 0,
    blendFeather: 1,
    blendGamma: 2.2,
};

interface EffectsState {
    // Per-surface effects
    surfaceEffects: Record<string, EffectSettings>;

    // Global post-processing effects
    globalEffects: EffectSettings;

    // Actions
    updateSurfaceEffect: (surfaceId: string, settings: Partial<EffectSettings>) => void;
    resetSurfaceEffects: (surfaceId: string) => void;
    updateGlobalEffect: (settings: Partial<EffectSettings>) => void;
    resetGlobalEffects: () => void;
}

export const useEffectsStore = create<EffectsState>((set) => ({
    surfaceEffects: {},
    globalEffects: { ...defaultEffectSettings },

    updateSurfaceEffect: (surfaceId, settings) =>
        set((state) => ({
            surfaceEffects: {
                ...state.surfaceEffects,
                [surfaceId]: {
                    ...(state.surfaceEffects[surfaceId] || defaultEffectSettings),
                    ...settings,
                },
            },
        })),

    resetSurfaceEffects: (surfaceId) =>
        set((state) => {
            const { [surfaceId]: _, ...rest } = state.surfaceEffects;
            return { surfaceEffects: rest };
        }),

    updateGlobalEffect: (settings) =>
        set((state) => ({
            globalEffects: {
                ...state.globalEffects,
                ...settings,
            },
        })),

    resetGlobalEffects: () =>
        set({ globalEffects: { ...defaultEffectSettings } }),
}));
