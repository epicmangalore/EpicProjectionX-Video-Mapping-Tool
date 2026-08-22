"use client";

import { useProjectStore } from "@/store/project-store";
import { useEffectsStore, defaultEffectSettings } from "@/store/effects-store";
import { useUIStore } from "@/store/ui-store";
import { Wand2, RotateCcw, Plus, Trash2, Power } from "lucide-react";

export function EffectsPanel() {
    const activeConfig = useUIStore((state) => state.activeEffectConfig);
    const setActiveEffectConfig = useUIStore((state) => state.setActiveEffectConfig);
    const surfaces = useProjectStore((state) => state.getActiveSurfaces());
    const selectedIds = useProjectStore((state) => state.selectedSurfaceIds);
    const surfaceEffects = useEffectsStore((state) => state.surfaceEffects);
    const resetSurfaceEffects = useEffectsStore((state) => state.resetSurfaceEffects);

    const addEffect = useProjectStore((state) => state.addEffect);
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

    const handleReset = () => {
        resetSurfaceEffects(selectedSurface.id);
    };

    return (
        <div className="p-4 border-t border-white/10 space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold flex items-center gap-2">
                    <Wand2 className="w-4 h-4 text-electric-purple" />
                    Applied FX
                </h3>
            </div>

            {/* Base Adjustments Summary Item */}
            <div
                onClick={() => setActiveEffectConfig({ type: "base", surfaceId: selectedSurface.id })}
                className={`p-3 rounded-lg border transition-all cursor-pointer flex items-center justify-between ${activeConfig?.type === "base" ? 'bg-electric-purple/10 border-electric-purple/30 ring-1 ring-electric-purple/20' : 'bg-zinc-900/50 border-white/10 hover:border-white/20'
                    }`}
            >
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-zinc-800 flex items-center justify-center">
                        <RotateCcw className="w-4 h-4 text-zinc-500" />
                    </div>
                    <div>
                        <div className="text-xs font-bold text-zinc-200">Base Adjustments</div>
                        <div className="text-[10px] text-zinc-500">Color, Contrast, Light</div>
                    </div>
                </div>
                <div className="text-zinc-600">
                    <Wand2 className="w-3.5 h-3.5" />
                </div>
            </div>

            <div className="h-px bg-white/5" />

            {/* Stackable FX List */}
            <div className="space-y-2">
                <div className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest pl-1 mb-1">Stackable FX</div>

                {selectedSurface.effects.length === 0 && (
                    <div className="text-center py-6 border border-dashed border-white/5 rounded-lg bg-zinc-900/20">
                        <p className="text-[11px] text-zinc-600">No stackable FX applied</p>
                    </div>
                )}

                {selectedSurface.effects.map((fx, index) => {
                    const isActive = activeConfig?.type === "stackable" && activeConfig.effectId === fx.id;

                    return (
                        <div
                            key={fx.id}
                            onClick={() => setActiveEffectConfig({ type: "stackable", effectId: fx.id, surfaceId: selectedSurface.id })}
                            className={`p-3 rounded-lg border cursor-pointer transition-all flex items-center justify-between ${isActive ? 'bg-electric-purple/10 border-electric-purple ring-1 ring-electric-purple/30' :
                                    fx.enabled ? 'bg-zinc-900/50 border-white/10 hover:border-white/20' : 'bg-zinc-900/10 border-white/5 opacity-50'
                                }`}
                        >
                            <div className="flex items-center gap-3">
                                <span className="text-[10px] font-bold text-zinc-500 font-mono w-4">#{index + 1}</span>
                                <span className="text-xs font-medium text-zinc-200 capitalize">{fx.type.replace("-", " ")}</span>
                            </div>
                            {fx.enabled && (
                                <div className="w-1.5 h-1.5 rounded-full bg-electric-cyan shadow-[0_0_8px_rgba(0,255,255,0.5)]" />
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Add FX Button / Dropdown */}
            <div className="pt-2">
                <select
                    onChange={(e) => {
                        if (e.target.value) {
                            addEffect(selectedSurface.id, e.target.value as any);
                            e.target.value = "";
                        }
                    }}
                    className="w-full bg-zinc-900 border border-white/10 rounded-lg px-3 py-2 text-xs text-zinc-300 focus:outline-none focus:border-electric-purple appearance-none cursor-pointer"
                    defaultValue=""
                >
                    <option value="" disabled>+ Add Effect...</option>
                    <optgroup label="Color">
                        <option value="brightness">Brightness</option>
                        <option value="contrast">Contrast</option>
                        <option value="saturation">Saturation</option>
                        <option value="hue">Hue Shift</option>
                    </optgroup>
                    <optgroup label="Visual">
                        <option value="blur">Blur</option>
                        <option value="chromatic">Chromatic Aberration</option>
                        <option value="rgbShift">RGB Shift</option>
                    </optgroup>
                </select>
            </div>
        </div>
    );
}
