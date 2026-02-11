"use client";

import { useProjectStore } from "@/store/project-store";
import { useActiveSurfaces } from "@/hooks/useActiveSurfaces";
import { Wand2, X } from "lucide-react";

export function ShaderEffectControls() {
    const surfaces = useActiveSurfaces();
    const selectedIds = useProjectStore((state) => state.selectedSurfaceIds);
    const mediaAssets = useProjectStore((state) => state.mediaAssets);
    const updateMediaAsset = useProjectStore((state) => state.updateMediaAsset);
    const updateSurface = useProjectStore((state) => state.updateSurface);

    const selectedSurface = surfaces.find((s) => selectedIds.includes(s.id));
    if (!selectedSurface) return null;

    // Get shader effects from the surface's shaderEffectIds array
    const shaderEffectIds = selectedSurface.shaderEffectIds || [];
    const shaderEffects = shaderEffectIds
        .map(id => mediaAssets.find(a => a.id === id))
        .filter((a): a is NonNullable<typeof a> => a !== undefined && a.type === "shader" && !!a.uniforms);

    if (shaderEffects.length === 0) return null;

    const handleUniformChange = (effectId: string, key: string, value: number | number[]) => {
        const effect = mediaAssets.find(a => a.id === effectId);
        if (!effect || !effect.uniforms) return;

        updateMediaAsset(effectId, {
            uniforms: {
                ...effect.uniforms,
                [key]: value,
            },
        });
    };

    const handleRemoveEffect = (effectId: string) => {
        const newEffects = shaderEffectIds.filter(id => id !== effectId);
        updateSurface(selectedSurface.id, {
            shaderEffectIds: newEffects,
        });
    };

    return (
        <div className="p-4 border-t border-white/10 space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold flex items-center gap-2">
                    <Wand2 className="w-4 h-4 text-electric-purple" />
                    Shader Effects
                </h3>
                <span className="text-[10px] text-zinc-500 uppercase tracking-wider">
                    {shaderEffects.length} Active
                </span>
            </div>

            {/* Effect Controls */}
            {shaderEffects.map((effect) => {
                const uniforms = effect.uniforms!;
                const uniformKeys = Object.keys(uniforms);

                return (
                    <div key={effect.id} className="border border-white/10 rounded-lg p-3 space-y-2 bg-zinc-900/30">
                        {/* Effect Header */}
                        <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                                <Wand2 className="w-3 h-3 text-electric-purple" />
                                <span className="text-xs font-semibold text-zinc-200">
                                    {effect.name}
                                </span>
                            </div>
                            <button
                                onClick={() => handleRemoveEffect(effect.id)}
                                className="p-1 hover:bg-red-500/20 rounded text-red-400 hover:text-red-300 transition-colors"
                                title="Remove effect"
                            >
                                <X className="w-3 h-3" />
                            </button>
                        </div>

                        {/* Uniforms */}
                        {uniformKeys.map((key) => {
                            const value = uniforms[key];
                            const isArray = Array.isArray(value);

                            if (isArray && value.length === 3) {
                                // RGB color
                                const hexColor = `#${value.map(v => Math.floor(v * 255).toString(16).padStart(2, '0')).join('')}`;
                                return (
                                    <div key={key}>
                                        <label className="text-xs text-muted-foreground mb-1 block capitalize">
                                            {key.replace(/([A-Z])/g, ' $1').trim()}
                                        </label>
                                        <div className="flex items-center gap-2">
                                            <input
                                                type="color"
                                                value={hexColor}
                                                onChange={(e) => {
                                                    const hex = e.target.value;
                                                    const r = parseInt(hex.slice(1, 3), 16) / 255;
                                                    const g = parseInt(hex.slice(3, 5), 16) / 255;
                                                    const b = parseInt(hex.slice(5, 7), 16) / 255;
                                                    handleUniformChange(effect.id, key, [r, g, b]);
                                                }}
                                                className="w-12 h-8 rounded cursor-pointer border border-white/10"
                                            />
                                            <span className="text-[10px] font-mono text-zinc-500">
                                                {value.map(v => v.toFixed(2)).join(', ')}
                                            </span>
                                        </div>
                                    </div>
                                );
                            } else if (isArray && value.length === 2) {
                                // Vec2
                                return (
                                    <div key={key}>
                                        <label className="text-xs text-muted-foreground mb-2 block capitalize">
                                            {key.replace(/([A-Z])/g, ' $1').trim()}
                                        </label>
                                        <div className="grid grid-cols-2 gap-2">
                                            <div>
                                                <span className="text-[9px] text-zinc-600 uppercase">X</span>
                                                <input
                                                    type="range"
                                                    value={value[0]}
                                                    onChange={(e) => handleUniformChange(effect.id, key, [parseFloat(e.target.value), value[1]])}
                                                    min="0"
                                                    max="1"
                                                    step="0.01"
                                                    className="w-full"
                                                />
                                            </div>
                                            <div>
                                                <span className="text-[9px] text-zinc-600 uppercase">Y</span>
                                                <input
                                                    type="range"
                                                    value={value[1]}
                                                    onChange={(e) => handleUniformChange(effect.id, key, [value[0], parseFloat(e.target.value)])}
                                                    min="0"
                                                    max="1"
                                                    step="0.01"
                                                    className="w-full"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                );
                            } else if (typeof value === 'number') {
                                // Float
                                return (
                                    <div key={key}>
                                        <label className="text-xs text-muted-foreground mb-1 block capitalize">
                                            {key.replace(/([A-Z])/g, ' $1').trim()}: {value.toFixed(2)}
                                        </label>
                                        <input
                                            type="range"
                                            value={value}
                                            onChange={(e) => handleUniformChange(effect.id, key, parseFloat(e.target.value))}
                                            min="0"
                                            max="1"
                                            step="0.01"
                                            className="w-full"
                                        />
                                    </div>
                                );
                            }
                            return null;
                        })}
                    </div>
                );
            })}
        </div>
    );
}
