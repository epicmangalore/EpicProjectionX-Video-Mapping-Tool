"use client";

import { useProjectStore } from "@/store/project-store";
import { useEffectsStore, defaultEffectSettings } from "@/store/effects-store";
import { Wand2, RotateCcw, Plus, Trash2, Power, ChevronDown } from "lucide-react";

export function EffectsPanel() {
    const surfaces = useProjectStore((state) => state.getActiveSurfaces());
    const selectedIds = useProjectStore((state) => state.selectedSurfaceIds);
    const surfaceEffects = useEffectsStore((state) => state.surfaceEffects);
    const updateSurfaceEffect = useEffectsStore((state) => state.updateSurfaceEffect);
    const resetSurfaceEffects = useEffectsStore((state) => state.resetSurfaceEffects);

    const addEffect = useProjectStore((state) => state.addEffect);
    const removeEffect = useProjectStore((state) => state.removeEffect);
    const updateEffect = useProjectStore((state) => state.updateEffect);
    const toggleEffect = useProjectStore((state) => state.toggleEffect);

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

    const effectTypes: { type: string; label: string; min: number; max: number; step: number }[] = [
        { type: "brightness", label: "Brightness", min: -1, max: 1, step: 0.01 },
        { type: "contrast", label: "Contrast", min: -1, max: 1, step: 0.01 },
        { type: "saturation", label: "Saturation", min: -1, max: 1, step: 0.01 },
        { type: "hue", label: "Hue Shift", min: 0, max: 1, step: 0.01 },
        { type: "blur", label: "Blur", min: 0, max: 10, step: 0.1 },
        { type: "chromatic", label: "Chromatic Aberration", min: 0, max: 10, step: 0.1 },
        { type: "rgbShift", label: "RGB Shift", min: 0, max: 10, step: 0.1 },
    ];

    return (
        <div className="p-4 border-t border-white/10 space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold flex items-center gap-2">
                    <Wand2 className="w-4 h-4 text-electric-purple" />
                    Applied FX
                </h3>
                <div className="flex gap-2">
                    <button
                        onClick={handleReset}
                        className="px-2 py-1 text-xs glass glass-hover rounded flex items-center gap-1"
                        title="Reset base adjustments"
                    >
                        <RotateCcw className="w-3 h-3" />
                        Reset Base
                    </button>
                </div>
            </div>

            {/* Legacy Color Adjustments (Hidden by default or preserved as 'base') */}
            <div className="opacity-50 hover:opacity-100 transition-opacity">
                <details className="group">
                    <summary className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest cursor-pointer list-none flex items-center gap-2 mb-2">
                        <ChevronDown className="w-3 h-3 group-open:rotate-180 transition-transform" />
                        Base Adjustments
                    </summary>
                    <div className="space-y-3 pt-2 border-l border-white/5 ml-1.5 pl-3">
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="text-[10px] text-zinc-500 block mb-1">Brightness</label>
                                <input
                                    type="range"
                                    value={effects.brightness}
                                    onChange={(e) => updateSurfaceEffect(selectedSurface.id, { brightness: parseFloat(e.target.value) })}
                                    min="-1" max="1" step="0.01" className="w-full h-1"
                                />
                            </div>
                            <div>
                                <label className="text-[10px] text-zinc-500 block mb-1">Contrast</label>
                                <input
                                    type="range"
                                    value={effects.contrast}
                                    onChange={(e) => updateSurfaceEffect(selectedSurface.id, { contrast: parseFloat(e.target.value) })}
                                    min="-1" max="1" step="0.01" className="w-full h-1"
                                />
                            </div>
                        </div>
                    </div>
                </details>
            </div>

            <div className="h-px bg-white/5" />

            {/* Stackable FX List */}
            <div className="space-y-3">
                {selectedSurface.effects.map((fx, index) => {
                    const config = effectTypes.find(t => t.type === fx.type);
                    return (
                        <div key={fx.id} className={`p-3 rounded-lg border bg-zinc-900/50 ${fx.enabled ? 'border-white/10' : 'border-white/5 opacity-50'}`}>
                            <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-2">
                                    <span className="text-[10px] font-bold text-zinc-500 font-mono">#{index + 1}</span>
                                    <span className="text-xs font-medium text-zinc-200 capitalize">{fx.type.replace("-", " ")}</span>
                                </div>
                                <div className="flex items-center gap-1">
                                    <button
                                        onClick={() => toggleEffect(selectedSurface.id, fx.id)}
                                        className={`p-1 rounded transition-colors ${fx.enabled ? 'text-electric-cyan hover:bg-white/5' : 'text-zinc-600 hover:bg-white/5'}`}
                                    >
                                        <Power className="w-3 h-3" />
                                    </button>
                                    <button
                                        onClick={() => removeEffect(selectedSurface.id, fx.id)}
                                        className="p-1 rounded text-zinc-600 hover:text-red-400 hover:bg-white/5 transition-colors"
                                    >
                                        <Trash2 className="w-3 h-3" />
                                    </button>
                                </div>
                            </div>

                            {fx.enabled && config && (
                                <div className="space-y-1">
                                    <div className="flex items-center justify-between text-[10px] text-zinc-500 mb-1">
                                        <span>Amount</span>
                                        <span className="font-mono">{fx.params.amount?.toFixed(2)}</span>
                                    </div>
                                    <input
                                        type="range"
                                        value={fx.params.amount || 0}
                                        onChange={(e) => updateEffect(selectedSurface.id, fx.id, { amount: parseFloat(e.target.value) })}
                                        min={config.min}
                                        max={config.max}
                                        step={config.step}
                                        className="w-full h-1 appearance-none bg-zinc-800 rounded-full accent-electric-purple"
                                    />
                                </div>
                            )}
                        </div>
                    );
                })}

                {selectedSurface.effects.length === 0 && (
                    <div className="text-center py-6 border border-dashed border-white/5 rounded-lg bg-zinc-900/20">
                        <p className="text-[11px] text-zinc-600">No stackable FX applied</p>
                    </div>
                )}
            </div>

            {/* Add FX Button / Dropdown */}
            <div className="grid grid-cols-2 gap-2">
                <select
                    onChange={(e) => {
                        if (e.target.value) {
                            addEffect(selectedSurface.id, e.target.value as any);
                            e.target.value = "";
                        }
                    }}
                    className="col-span-2 w-full bg-zinc-900 border border-white/10 rounded-lg px-3 py-2 text-xs text-zinc-300 focus:outline-none focus:border-electric-purple appearance-none cursor-pointer"
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
