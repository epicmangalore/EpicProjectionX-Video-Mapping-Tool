"use client";

import { useProjectStore } from "@/store/project-store";
import { useEffectsStore, defaultEffectSettings } from "@/store/effects-store";
import { Wand2, RotateCcw } from "lucide-react";

export function EffectsPanel() {
    const surfaces = useProjectStore((state) => state.getActiveSurfaces());
    const selectedIds = useProjectStore((state) => state.selectedSurfaceIds);
    const surfaceEffects = useEffectsStore((state) => state.surfaceEffects);
    const updateSurfaceEffect = useEffectsStore((state) => state.updateSurfaceEffect);
    const resetSurfaceEffects = useEffectsStore((state) => state.resetSurfaceEffects);

    const selectedSurface = surfaces.find((s) => selectedIds.includes(s.id));

    if (!selectedSurface) {
        return (
            <div className="p-4 border-t border-white/10">
                <div className="text-center py-4">
                    <div className="w-10 h-10 mx-auto mb-2 rounded-full bg-electric-purple/20 flex items-center justify-center">
                        <Wand2 className="w-5 h-5 text-electric-purple" />
                    </div>
                    <p className="text-xs text-muted-foreground">Select a surface to add effects</p>
                </div>
            </div>
        );
    }

    const effects = surfaceEffects[selectedSurface.id] || defaultEffectSettings;

    const handleReset = () => {
        resetSurfaceEffects(selectedSurface.id);
    };

    return (
        <div className="p-4 border-t border-white/10 space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold flex items-center gap-2">
                    <Wand2 className="w-4 h-4 text-electric-purple" />
                    Effects
                </h3>
                <button
                    onClick={handleReset}
                    className="px-2 py-1 text-xs glass glass-hover rounded flex items-center gap-1"
                    title="Reset all effects"
                >
                    <RotateCcw className="w-3 h-3" />
                    Reset
                </button>
            </div>

            {/* Color Adjustments */}
            <div>
                <h4 className="text-xs font-semibold mb-3 text-muted-foreground uppercase">Color</h4>

                <div className="space-y-3">
                    {/* Brightness */}
                    <div>
                        <label className="text-xs text-muted-foreground mb-1 block">
                            Brightness: {Math.round(effects.brightness * 100)}
                        </label>
                        <input
                            type="range"
                            value={effects.brightness}
                            onChange={(e) =>
                                updateSurfaceEffect(selectedSurface.id, {
                                    brightness: parseFloat(e.target.value),
                                })
                            }
                            min="-1"
                            max="1"
                            step="0.01"
                            className="w-full"
                        />
                    </div>

                    {/* Contrast */}
                    <div>
                        <label className="text-xs text-muted-foreground mb-1 block">
                            Contrast: {Math.round(effects.contrast * 100)}
                        </label>
                        <input
                            type="range"
                            value={effects.contrast}
                            onChange={(e) =>
                                updateSurfaceEffect(selectedSurface.id, {
                                    contrast: parseFloat(e.target.value),
                                })
                            }
                            min="-1"
                            max="1"
                            step="0.01"
                            className="w-full"
                        />
                    </div>

                    {/* Saturation */}
                    <div>
                        <label className="text-xs text-muted-foreground mb-1 block">
                            Saturation: {Math.round(effects.saturation * 100)}
                        </label>
                        <input
                            type="range"
                            value={effects.saturation}
                            onChange={(e) =>
                                updateSurfaceEffect(selectedSurface.id, {
                                    saturation: parseFloat(e.target.value),
                                })
                            }
                            min="-1"
                            max="1"
                            step="0.01"
                            className="w-full"
                        />
                    </div>

                    {/* Hue */}
                    <div>
                        <label className="text-xs text-muted-foreground mb-1 block">
                            Hue Shift: {Math.round(effects.hue * 360)}°
                        </label>
                        <input
                            type="range"
                            value={effects.hue}
                            onChange={(e) =>
                                updateSurfaceEffect(selectedSurface.id, {
                                    hue: parseFloat(e.target.value),
                                })
                            }
                            min="0"
                            max="1"
                            step="0.01"
                            className="w-full"
                        />
                    </div>
                </div>
            </div>

            {/* Visual Effects */}
            <div>
                <h4 className="text-xs font-semibold mb-3 text-muted-foreground uppercase">Effects</h4>

                <div className="space-y-3">
                    {/* Blur */}
                    <div>
                        <label className="text-xs text-muted-foreground mb-1 block">
                            Blur: {effects.blur.toFixed(1)}
                        </label>
                        <input
                            type="range"
                            value={effects.blur}
                            onChange={(e) =>
                                updateSurfaceEffect(selectedSurface.id, {
                                    blur: parseFloat(e.target.value),
                                })
                            }
                            min="0"
                            max="10"
                            step="0.1"
                            className="w-full"
                        />
                    </div>

                    {/* Chromatic Aberration */}
                    <div>
                        <label className="text-xs text-muted-foreground mb-1 block">
                            Chromatic Aberration: {effects.chromaticAberration.toFixed(1)}
                        </label>
                        <input
                            type="range"
                            value={effects.chromaticAberration}
                            onChange={(e) =>
                                updateSurfaceEffect(selectedSurface.id, {
                                    chromaticAberration: parseFloat(e.target.value),
                                })
                            }
                            min="0"
                            max="10"
                            step="0.1"
                            className="w-full"
                        />
                    </div>

                    {/* RGB Shift */}
                    <div>
                        <label className="text-xs text-muted-foreground mb-1 block">
                            RGB Shift: {effects.rgbShift.toFixed(1)}
                        </label>
                        <input
                            type="range"
                            value={effects.rgbShift}
                            onChange={(e) =>
                                updateSurfaceEffect(selectedSurface.id, {
                                    rgbShift: parseFloat(e.target.value),
                                })
                            }
                            min="0"
                            max="10"
                            step="0.1"
                            className="w-full"
                        />
                    </div>
                </div>
            </div>

            {/* Color Tint */}
            <div>
                <h4 className="text-xs font-semibold mb-3 text-muted-foreground uppercase">Tint</h4>

                <div className="grid grid-cols-3 gap-2">
                    <div>
                        <label className="text-xs text-muted-foreground block mb-1">R</label>
                        <input
                            type="range"
                            value={effects.colorTint.r}
                            onChange={(e) =>
                                updateSurfaceEffect(selectedSurface.id, {
                                    colorTint: {
                                        ...effects.colorTint,
                                        r: parseFloat(e.target.value),
                                    },
                                })
                            }
                            min="0"
                            max="1"
                            step="0.01"
                            className="w-full"
                        />
                    </div>
                    <div>
                        <label className="text-xs text-muted-foreground block mb-1">G</label>
                        <input
                            type="range"
                            value={effects.colorTint.g}
                            onChange={(e) =>
                                updateSurfaceEffect(selectedSurface.id, {
                                    colorTint: {
                                        ...effects.colorTint,
                                        g: parseFloat(e.target.value),
                                    },
                                })
                            }
                            min="0"
                            max="1"
                            step="0.01"
                            className="w-full"
                        />
                    </div>
                    <div>
                        <label className="text-xs text-muted-foreground block mb-1">B</label>
                        <input
                            type="range"
                            value={effects.colorTint.b}
                            onChange={(e) =>
                                updateSurfaceEffect(selectedSurface.id, {
                                    colorTint: {
                                        ...effects.colorTint,
                                        b: parseFloat(e.target.value),
                                    },
                                })
                            }
                            min="0"
                            max="1"
                            step="0.01"
                            className="w-full"
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}
