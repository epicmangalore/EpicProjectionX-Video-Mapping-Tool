"use client";

import { useProjectStore } from "@/store/project-store";
import { useEffectsStore, defaultEffectSettings } from "@/store/effects-store";
import { useUIStore } from "@/store/ui-store";
import { Wand2, X, Trash2, Power, RotateCcw } from "lucide-react";

interface EffectConfigPanelProps {
    onClose?: () => void;
}

export function EffectConfigPanel({ onClose }: EffectConfigPanelProps) {
    const activeConfig = useUIStore((state) => state.activeEffectConfig);
    const setActiveEffectConfig = useUIStore((state) => state.setActiveEffectConfig);
    const mediaAssets = useProjectStore((state) => state.mediaAssets);
    const getActiveSurfaces = useProjectStore((state) => state.getActiveSurfaces);
    const updateEffect = useProjectStore((state) => state.updateEffect);
    const removeEffect = useProjectStore((state) => state.removeEffect);
    const toggleEffect = useProjectStore((state) => state.toggleEffect);
    const updateMediaAsset = useProjectStore((state) => state.updateMediaAsset);

    const surfaceEffects = useEffectsStore((state) => state.surfaceEffects);
    const updateSurfaceEffect = useEffectsStore((state) => state.updateSurfaceEffect);

    if (!activeConfig) return null;

    const surfaces = getActiveSurfaces();
    const surface = surfaces.find(s => s.id === activeConfig.surfaceId);
    if (!surface) return null;

    const handleClose = () => {
        if (onClose) onClose();
        setActiveEffectConfig(null);
    };

    // Render logic for stackable FX
    if (activeConfig.type === "stackable") {
        const fx = surface.effects.find(e => e.id === activeConfig.effectId);
        if (!fx) return null;

        const effectTypes: { type: string; label: string; min: number; max: number; step: number }[] = [
            { type: "brightness", label: "Brightness", min: -1, max: 1, step: 0.01 },
            { type: "contrast", label: "Contrast", min: -1, max: 1, step: 0.01 },
            { type: "saturation", label: "Saturation", min: -1, max: 1, step: 0.01 },
            { type: "hue", label: "Hue Shift", min: 0, max: 1, step: 0.01 },
            { type: "blur", label: "Blur", min: 0, max: 10, step: 0.1 },
            { type: "chromatic", label: "Chromatic Aberration", min: 0, max: 10, step: 0.1 },
            { type: "rgbShift", label: "RGB Shift", min: 0, max: 10, step: 0.1 },
        ];

        const config = effectTypes.find(t => t.type === fx.type);

        return (
            <div className="flex flex-col h-full glass border-l border-white/10 text-zinc-200">
                {/* Header */}
                <div className="p-4 border-b border-white/10 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Wand2 className="w-4 h-4 text-electric-purple" />
                        <h2 className="text-sm font-bold uppercase tracking-wider">{fx.type.replace("-", " ")}</h2>
                    </div>
                    <button
                        onClick={handleClose}
                        className="p-1.5 hover:bg-white/10 rounded-md transition-colors"
                    >
                        <X className="w-4 h-4 text-zinc-500" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-6 no-scrollbar">
                    {/* Status Section */}
                    <div className="space-y-3">
                        <label className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider">Effect Status</label>
                        <div className="flex gap-2">
                            <button
                                onClick={() => toggleEffect(surface.id, fx.id)}
                                className={`flex-1 py-2.5 rounded-lg flex items-center justify-center gap-2 text-xs font-bold transition-all border ${fx.enabled
                                    ? "bg-electric-cyan/10 border-electric-cyan/30 text-electric-cyan"
                                    : "bg-white/5 border-white/5 text-zinc-500"
                                    }`}
                            >
                                <Power className="w-3.5 h-3.5" />
                                {fx.enabled ? "Enabled" : "Disabled"}
                            </button>
                            <button
                                onClick={() => {
                                    removeEffect(surface.id, fx.id);
                                    handleClose();
                                }}
                                className="px-4 py-2.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-500 hover:bg-red-500/20 transition-all"
                            >
                                <Trash2 className="w-3.5 h-3.5" />
                            </button>
                        </div>
                    </div>

                    {/* Parameters Section */}
                    {fx.enabled && config && (
                        <div className="space-y-4">
                            <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-wider">
                                <span className="text-zinc-500">Amount</span>
                                <span className="text-electric-cyan font-mono">{fx.params.amount?.toFixed(2)}</span>
                            </div>
                            <div className="h-2 bg-zinc-950 border border-white/5 rounded-full relative overflow-hidden">
                                <div
                                    className="absolute inset-y-0 left-0 bg-gradient-to-r from-electric-purple/30 to-electric-purple"
                                    style={{
                                        width: `${((fx.params.amount - config.min) / (config.max - config.min)) * 100}%`
                                    }}
                                />
                                <input
                                    type="range"
                                    min={config.min}
                                    max={config.max}
                                    step={config.step}
                                    value={fx.params.amount || 0}
                                    onChange={(e) => updateEffect(surface.id, fx.id, { amount: parseFloat(e.target.value) })}
                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                />
                            </div>
                        </div>
                    )}
                </div>
            </div>
        );
    }

    // Render logic for Shader FX
    if (activeConfig.type === "shader") {
        const effect = mediaAssets.find(a => a.id === activeConfig.effectId);
        if (!effect || effect.type !== "shader" || !effect.uniforms) return null;

        const uniformKeys = Object.keys(effect.uniforms);

        return (
            <div className="flex flex-col h-full glass border-l border-white/10 text-zinc-200">
                {/* Header */}
                <div className="p-4 border-b border-white/10 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Wand2 className="w-4 h-4 text-electric-cyan" />
                        <h2 className="text-sm font-bold uppercase tracking-wider">{effect.name}</h2>
                    </div>
                    <button
                        onClick={handleClose}
                        className="p-1.5 hover:bg-white/10 rounded-md transition-colors"
                    >
                        <X className="w-4 h-4 text-zinc-500" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-6 no-scrollbar">
                    {/* Status Section */}
                    <div className="space-y-3">
                        <label className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider">Effect Actions</label>
                        <button
                            onClick={() => {
                                const nextShaderEffectIds = (surface.shaderEffectIds || []).filter(id => id !== effect.id);
                                useProjectStore.getState().updateSurface(surface.id, { shaderEffectIds: nextShaderEffectIds });
                                handleClose();
                            }}
                            className="w-full py-2.5 rounded-lg flex items-center justify-center gap-2 text-xs font-bold bg-red-500/10 border border-red-500/20 text-red-500 hover:bg-red-500/20 transition-all font-mono"
                        >
                            REMOVE EFFECT
                        </button>
                    </div>

                    {/* Parameters Section */}
                    <div className="space-y-5">
                        <label className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider block">Parameters</label>
                        {uniformKeys.map((key) => {
                            const value = effect.uniforms![key];
                            const isArray = Array.isArray(value);

                            if (!isArray && typeof value === 'number') {
                                return (
                                    <div key={key} className="space-y-3">
                                        <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-wider">
                                            <span className="text-zinc-400 capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</span>
                                            <span className="text-electric-cyan font-mono">{value.toFixed(2)}</span>
                                        </div>
                                        <div className="h-2 bg-zinc-950 border border-white/5 rounded-full relative overflow-hidden">
                                            <div
                                                className="absolute inset-y-0 left-0 bg-gradient-to-r from-electric-cyan/30 to-electric-cyan"
                                                style={{ width: `${value * 100}%` }}
                                            />
                                            <input
                                                type="range"
                                                min="0"
                                                max="1"
                                                step="0.01"
                                                value={value}
                                                onChange={(e) => {
                                                    const nextUniforms = {
                                                        ...effect.uniforms,
                                                        [key]: parseFloat(e.target.value)
                                                    };
                                                    updateMediaAsset(effect.id, { uniforms: nextUniforms });
                                                }}
                                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                            />
                                        </div>
                                    </div>
                                );
                            }

                            if (isArray && value.length === 3) {
                                const hex = "#" + value.map(c => Math.round(c * 255).toString(16).padStart(2, '0')).join('');

                                return (
                                    <div key={key} className="space-y-3">
                                        <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest block capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</label>
                                        <div className="flex items-center gap-3 bg-zinc-950/50 border border-white/5 rounded-lg px-3 py-2 group hover:border-white/10 transition-colors">
                                            <input
                                                type="text"
                                                value={hex}
                                                onChange={(e) => {
                                                    const val = e.target.value;
                                                    if (/^#[0-9A-F]{6}$/i.test(val)) {
                                                        const r = parseInt(val.slice(1, 3), 16) / 255;
                                                        const g = parseInt(val.slice(3, 5), 16) / 255;
                                                        const b = parseInt(val.slice(5, 7), 16) / 255;
                                                        const nextUniforms = {
                                                            ...effect.uniforms,
                                                            [key]: [r, g, b]
                                                        };
                                                        updateMediaAsset(effect.id, { uniforms: nextUniforms });
                                                    }
                                                }}
                                                className="bg-transparent border-none text-[10px] font-mono text-zinc-300 focus:outline-none flex-1 w-full uppercase"
                                            />
                                            <div
                                                className="w-4 h-4 rounded shadow-inner border border-white/10"
                                                style={{ backgroundColor: hex }}
                                            />
                                        </div>
                                    </div>
                                );
                            }

                            if (isArray && value.length === 2) {
                                return (
                                    <div key={key} className="space-y-3">
                                        <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest block capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</label>
                                        <div className="grid grid-cols-2 gap-4">
                                            {value.map((v, i) => (
                                                <div key={i} className="space-y-2">
                                                    <div className="flex justify-between text-[9px] font-mono text-zinc-500 uppercase">
                                                        <span>{i === 0 ? 'X' : 'Y'}</span>
                                                        <span>{v.toFixed(2)}</span>
                                                    </div>
                                                    <div className="h-1.5 bg-zinc-950 border border-white/5 rounded-full relative overflow-hidden">
                                                        <div
                                                            className="absolute inset-y-0 left-0 bg-electric-cyan/40"
                                                            style={{ width: `${v * 100}%` }}
                                                        />
                                                        <input
                                                            type="range"
                                                            min="0"
                                                            max="1"
                                                            step="0.01"
                                                            value={v}
                                                            onChange={(e) => {
                                                                const nextVal = [...value];
                                                                nextVal[i] = parseFloat(e.target.value);
                                                                const nextUniforms = {
                                                                    ...effect.uniforms,
                                                                    [key]: nextVal
                                                                };
                                                                updateMediaAsset(effect.id, { uniforms: nextUniforms });
                                                            }}
                                                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                                        />
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                );
                            }

                            return null;
                        })}
                    </div>
                </div>
            </div>
        );
    }

    // Render logic for Base Adjustments
    if (activeConfig.type === "base") {
        const effects = surfaceEffects[surface.id] || defaultEffectSettings;

        const baseControls = [
            { key: "brightness", label: "Brightness", min: -1, max: 1, step: 0.01 },
            { key: "contrast", label: "Contrast", min: -1, max: 1, step: 0.01 },
            { key: "saturation", label: "Saturation", min: -1, max: 1, step: 0.01 },
            { key: "hue", label: "Hue Shift", min: 0, max: 1, step: 0.01 },
        ];

        return (
            <div className="flex flex-col h-full glass border-l border-white/10 text-zinc-200">
                {/* Header */}
                <div className="p-4 border-b border-white/10 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Wand2 className="w-4 h-4 text-electric-purple" />
                        <h2 className="text-sm font-bold uppercase tracking-wider">Base Adjustments</h2>
                    </div>
                    <button onClick={handleClose} className="p-1.5 hover:bg-white/10 rounded-md transition-colors">
                        <X className="w-4 h-4 text-zinc-500" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-6 no-scrollbar">
                    <div className="space-y-3">
                        <label className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider">Globals</label>
                        <button
                            onClick={() => updateSurfaceEffect(surface.id, defaultEffectSettings)}
                            className="w-full py-2.5 rounded-lg flex items-center justify-center gap-2 text-xs font-bold bg-zinc-900/50 border border-white/5 text-zinc-400 hover:text-zinc-200 hover:border-white/10 transition-all font-mono"
                        >
                            <RotateCcw className="w-3.5 h-3.5" />
                            RESET ALL BASE
                        </button>
                    </div>

                    <div className="space-y-6">
                        <label className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider block">Color & Light</label>
                        {baseControls.map((control) => {
                            const val = (effects as any)[control.key] ?? 0;
                            return (
                                <div key={control.key} className="space-y-3">
                                    <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-wider">
                                        <span className="text-zinc-400">{control.label}</span>
                                        <span className="text-electric-cyan font-mono">{val.toFixed(2)}</span>
                                    </div>
                                    <div className="h-2 bg-zinc-950 border border-white/5 rounded-full relative overflow-hidden">
                                        <div
                                            className="absolute inset-y-0 left-0 bg-gradient-to-r from-electric-purple/30 to-electric-purple"
                                            style={{ width: `${((val - control.min) / (control.max - control.min)) * 100}%` }}
                                        />
                                        <input
                                            type="range"
                                            min={control.min}
                                            max={control.max}
                                            step={control.step}
                                            value={val}
                                            onChange={(e) => updateSurfaceEffect(surface.id, { [control.key]: parseFloat(e.target.value) })}
                                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                        />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        );
    }

    return null;
}
