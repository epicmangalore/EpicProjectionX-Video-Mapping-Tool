"use client";

import { useState, useEffect } from "react";
import { useProjectStore } from "@/store/project-store";
import { useEffectsStore, defaultEffectSettings } from "@/store/effects-store";
import { useUIStore } from "@/store/ui-store";
import { effectsLibrary, type EffectMeta } from "@/lib/effects/EffectsLibrary";
import { toast } from "@/store/toast-store";
import { Wand2, X, Trash2, Power, RotateCcw, Plus, ChevronDown } from "lucide-react";
import { generateId } from "@/lib/utils";

const UNIFORM_ENUMS: Record<string, { label: string; value: number }[]> = {
    uAnimationStyle: [
        { label: "None", value: 0 },
        { label: "Marching Ants", value: 1 },
        { label: "Pulse", value: 2 },
        { label: "Breathe", value: 3 },
        { label: "Flicker", value: 4 },
    ],
    uMode: [
        { label: "Horizontal", value: 0 },
        { label: "Vertical", value: 1 },
        { label: "Both", value: 2 },
        { label: "Diagonal", value: 3 },
    ],
    uBaseShape: [
        { label: "Diamond", value: 0 },
        { label: "Circle", value: 1 },
        { label: "Square", value: 2 },
    ],
    uGradientShape: [
        { label: "Corners", value: 0 },
        { label: "Center", value: 1 },
        { label: "Linear", value: 2 },
    ],
    uWaveShape: [
        { label: "Sine", value: 0 },
        { label: "Square", value: 1 },
        { label: "Checks", value: 2 },
    ],
    uAspectRatio: [
        { label: "Auto", value: 0 },
        { label: "1:1", value: 1 },
        { label: "4:3", value: 2 },
        { label: "16:9", value: 3 },
    ],
    uDotShape: [
        { label: "Circle", value: 0 },
        { label: "Square", value: 1 },
    ]
};

interface EffectConfigPanelProps {
    onClose?: () => void;
}

export function EffectConfigPanel({ onClose }: EffectConfigPanelProps) {
    const activeConfig = useUIStore((state) => state.activeEffectConfig);
    const setActiveEffectConfig = useUIStore((state) => state.setActiveEffectConfig);
    const mediaAssets = useProjectStore((state) => state.mediaAssets);
    const addMediaAsset = useProjectStore((state) => state.addMediaAsset);
    const getActiveSurfaces = useProjectStore((state) => state.getActiveSurfaces);
    const updateSurface = useProjectStore((state) => state.updateSurface);
    const updateEffect = useProjectStore((state) => state.updateEffect);
    const removeEffect = useProjectStore((state) => state.removeEffect);
    const toggleEffect = useProjectStore((state) => state.toggleEffect);
    const updateMediaAsset = useProjectStore((state) => state.updateMediaAsset);

    const surfaceEffects = useEffectsStore((state) => state.surfaceEffects);
    const updateSurfaceEffect = useEffectsStore((state) => state.updateSurfaceEffect);

    // Preview state
    const [previewEffect, setPreviewEffect] = useState<EffectMeta | null>(null);
    const [previewUniforms, setPreviewUniforms] = useState<Record<string, any>>({});

    useEffect(() => {
        if (activeConfig?.type === "preview" && activeConfig.previewEffectId) {
            effectsLibrary.getEffect(activeConfig.previewEffectId).then(eff => {
                if (eff) {
                    setPreviewEffect(eff);
                    setPreviewUniforms(effectsLibrary.getDefaultUniforms(eff));
                }
            });
        } else {
            setPreviewEffect(null);
            setPreviewUniforms({});
        }
    }, [activeConfig]);

    if (!activeConfig) return null;

    const surfaces = getActiveSurfaces();
    const surface = surfaces.find(s => s.id === activeConfig.surfaceId);
    if (!surface) return null;

    const handleClose = () => {
        if (onClose) onClose();
        setActiveEffectConfig(null);
    };

    const handleAddEffect = async () => {
        if (!previewEffect || !surface) return;

        try {
            const shaderSource = await effectsLibrary.loadShader(previewEffect.id);
            const mediaId = generateId();

            addMediaAsset({
                id: mediaId,
                name: previewEffect.name,
                type: "shader",
                shaderSource,
                effectId: previewEffect.id,
                uniforms: previewUniforms,
            });

            const nextShaderEffectIds = [...(surface.shaderEffectIds || []), mediaId];
            updateSurface(surface.id, {
                shaderEffectIds: nextShaderEffectIds,
            });

            toast.success(`Applied ${previewEffect.name} to ${surface.name}`);
            handleClose();
        } catch (error) {
            console.error("Failed to add effect:", error);
            toast.error("Failed to apply effect");
        }
    };

    // Render logic for preview (Effect from Library)
    if (activeConfig.type === "preview" && previewEffect) {
        return (
            <div className="flex flex-col h-full glass border-l border-white/10 text-zinc-200">
                <div className="p-4 border-b border-white/10 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Wand2 className="w-4 h-4 text-electric-purple" />
                        <h2 className="text-sm font-bold uppercase tracking-wider text-zinc-100">Preview: {previewEffect.name}</h2>
                    </div>
                    <button onClick={handleClose} className="p-1.5 hover:bg-white/10 rounded-md transition-colors">
                        <X className="w-4 h-4 text-zinc-500" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-6 no-scrollbar">
                    <div className="space-y-6">
                        {/* Group colors in a grid if multiple exist */}
                        {(() => {
                            const entries = Object.entries(previewEffect.uniforms);
                            const floatEntries = entries.filter(([_, d]) => d.type === "float");
                            const colorEntries = entries.filter(([_, d]) => d.type === "color");
                            const otherEntries = entries.filter(([_, d]) => d.type !== "float" && d.type !== "color");

                            return (
                                <>
                                    {floatEntries.length > 0 && (
                                        <div className="space-y-4">
                                            <label className="text-[10px] text-zinc-400 uppercase font-bold tracking-wider block">Scalars</label>
                                            {floatEntries.map(([key, def]) => {
                                                const value = previewUniforms[key] ?? def.default;
                                                const enumOptions = UNIFORM_ENUMS[key];
                                                if (enumOptions) {
                                                    return (
                                                        <div key={key} className="space-y-3">
                                                            <label className="text-[10px] font-bold text-zinc-300 uppercase tracking-widest block">{def.label}</label>
                                                            <div className="relative group">
                                                                <select
                                                                    value={value}
                                                                    onChange={(e) => setPreviewUniforms(prev => ({ ...prev, [key]: parseFloat(e.target.value) }))}
                                                                    className="w-full bg-zinc-950/50 border border-white/5 rounded-lg pl-3 pr-10 py-2.5 text-xs text-zinc-300 appearance-none focus:outline-none focus:border-electric-purple/50 group-hover:border-white/10 transition-all cursor-pointer"
                                                                >
                                                                    {enumOptions.map(opt => (
                                                                        <option key={opt.value} value={opt.value} className="bg-zinc-900">{opt.label}</option>
                                                                    ))}
                                                                </select>
                                                                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 pointer-events-none group-hover:text-zinc-300 transition-colors" />
                                                            </div>
                                                        </div>
                                                    );
                                                }

                                                return (
                                                    <div key={key} className="space-y-3">
                                                        <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-wider">
                                                            <span className="text-zinc-300">{def.label}</span>
                                                            <span className="text-electric-cyan font-mono">{Number(value).toFixed(2)}</span>
                                                        </div>
                                                        <div className="h-2 bg-zinc-950 border border-white/5 rounded-full relative overflow-hidden">
                                                            <div
                                                                className="absolute inset-y-0 left-0 bg-gradient-to-r from-electric-purple/30 to-electric-purple"
                                                                style={{ width: `${((Number(value) - (def.min || 0)) / ((def.max || 1) - (def.min || 0))) * 100}%` }}
                                                            />
                                                            <input
                                                                type="range"
                                                                min={def.min ?? 0}
                                                                max={def.max ?? 1}
                                                                step={0.01}
                                                                value={value}
                                                                onChange={(e) => setPreviewUniforms(prev => ({ ...prev, [key]: parseFloat(e.target.value) }))}
                                                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                                            />
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}

                                    {colorEntries.length > 0 && (
                                        <div className="space-y-4">
                                            <label className="text-[10px] text-zinc-400 uppercase font-bold tracking-wider block">Colors</label>
                                            <div className="grid grid-cols-2 gap-3">
                                                {colorEntries.map(([key, def]) => {
                                                    const value = previewUniforms[key] ?? def.default;
                                                    if (!Array.isArray(value)) return null;
                                                    const hex = "#" + value.map((c: number) => Math.round(c * 255).toString(16).padStart(2, '0')).join('');
                                                    return (
                                                        <div key={key} className="space-y-2">
                                                            <label className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest block truncate">{def.label}</label>
                                                            <div className="flex items-center gap-2 bg-zinc-950/50 border border-white/5 rounded-lg px-2 py-1.5 group hover:border-white/10 transition-colors">
                                                                <input
                                                                    type="text"
                                                                    value={hex}
                                                                    onChange={(e) => {
                                                                        const val = e.target.value;
                                                                        if (/^#[0-9A-F]{6}$/i.test(val)) {
                                                                            const r = parseInt(val.slice(1, 3), 16) / 255;
                                                                            const g = parseInt(val.slice(3, 5), 16) / 255;
                                                                            const b = parseInt(val.slice(5, 7), 16) / 255;
                                                                            setPreviewUniforms(prev => ({ ...prev, [key]: [r, g, b] }));
                                                                        }
                                                                    }}
                                                                    className="bg-transparent border-none text-[10px] font-mono text-zinc-300 focus:outline-none flex-1 w-full uppercase"
                                                                />
                                                                <div className="w-3 h-3 rounded-sm shadow-inner border border-white/10 shrink-0" style={{ backgroundColor: hex }} />
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    )}

                                    {otherEntries.map(([key, def]) => {
                                        const value = previewUniforms[key] ?? def.default;
                                        if (def.type === "vec2" && Array.isArray(value)) {
                                            return (
                                                <div key={key} className="space-y-3">
                                                    <label className="text-[10px] font-bold text-zinc-300 uppercase tracking-widest block">{def.label}</label>
                                                    <div className="grid grid-cols-2 gap-4">
                                                        {value.map((v: number, i: number) => (
                                                            <div key={i} className="space-y-2">
                                                                <div className="flex justify-between text-[9px] font-mono text-zinc-400 uppercase">
                                                                    <span>{i === 0 ? 'X' : 'Y'}</span>
                                                                    <span>{v.toFixed(2)}</span>
                                                                </div>
                                                                <div className="h-1.5 bg-zinc-950 border border-white/5 rounded-full relative overflow-hidden">
                                                                    <div className="absolute inset-y-0 left-0 bg-electric-cyan/40" style={{ width: `${v * 100}%` }} />
                                                                    <input
                                                                        type="range"
                                                                        min="0"
                                                                        max="1"
                                                                        step="0.01"
                                                                        value={v}
                                                                        onChange={(e) => {
                                                                            const nextVal = [...value];
                                                                            nextVal[i] = parseFloat(e.target.value);
                                                                            setPreviewUniforms(prev => ({ ...prev, [key]: nextVal }));
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
                                </>
                            );
                        })()}
                    </div>
                </div>

                <div className="p-4 border-t border-white/10 bg-zinc-950/50">
                    <button
                        onClick={handleAddEffect}
                        className="w-full py-2.5 rounded-lg flex items-center justify-center gap-2 text-xs font-bold bg-electric-purple text-white hover:bg-electric-purple/90 transition-all shadow-[0_0_20px_rgba(180,0,255,0.3)]"
                    >
                        <Plus className="w-4 h-4" />
                        ADD EFFECT TO SURFACE
                    </button>
                </div>
            </div>
        );
    }

    // Render logic for stackable FX (Old basic FX)
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
                <div className="p-4 border-b border-white/10 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Wand2 className="w-4 h-4 text-electric-purple" />
                        <h2 className="text-sm font-bold uppercase tracking-wider">{fx.type.replace("-", " ")}</h2>
                    </div>
                    <button onClick={handleClose} className="p-1.5 hover:bg-white/10 rounded-md transition-colors">
                        <X className="w-4 h-4 text-zinc-500" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-6 no-scrollbar">
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
                                    toast.info(`Removed ${fx.type} effect`);
                                    handleClose();
                                }}
                                className="px-4 py-2.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-500 hover:bg-red-500/20 transition-all"
                            >
                                <Trash2 className="w-3.5 h-3.5" />
                            </button>
                        </div>
                    </div>

                    {fx.enabled && config && (
                        <div className="space-y-4">
                            <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-wider">
                                <span className="text-zinc-500">Amount</span>
                                <span className="text-electric-cyan font-mono">{fx.params.amount?.toFixed(2)}</span>
                            </div>
                            <div className="h-2 bg-zinc-950 border border-white/5 rounded-full relative overflow-hidden">
                                <div
                                    className="absolute inset-y-0 left-0 bg-gradient-to-r from-electric-purple/30 to-electric-purple"
                                    style={{ width: `${((fx.params.amount - config.min) / (config.max - config.min)) * 100}%` }}
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

        return (
            <div className="flex flex-col h-full glass border-l border-white/10 text-zinc-200">
                <div className="p-4 border-b border-white/10 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Wand2 className="w-4 h-4 text-electric-cyan" />
                        <h2 className="text-sm font-bold uppercase tracking-wider">{effect.name}</h2>
                    </div>
                    <button onClick={handleClose} className="p-1.5 hover:bg-white/10 rounded-md transition-colors">
                        <X className="w-4 h-4 text-zinc-500" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-6 no-scrollbar">
                    <div className="space-y-3">
                        <button
                            onClick={() => {
                                const nextShaderEffectIds = (surface.shaderEffectIds || []).filter(id => id !== effect.id);
                                updateSurface(surface.id, { shaderEffectIds: nextShaderEffectIds });
                                toast.info(`Removed ${effect.name}`);
                                handleClose();
                            }}
                            className="w-full py-2.5 rounded-lg flex items-center justify-center gap-2 text-xs font-bold bg-red-500/10 border border-red-500/20 text-red-500 hover:bg-red-500/20 transition-all font-mono"
                        >
                            <Trash2 className="w-3.5 h-3.5" />
                            REMOVE EFFECT
                        </button>
                    </div>

                    <div className="space-y-6">
                        {(() => {
                            const entries = Object.entries(effect.uniforms!);
                            const floatEntries = entries.filter(([_, value]) => !Array.isArray(value) && typeof value === 'number');
                            const colorEntries = entries.filter(([_, value]) => Array.isArray(value) && value.length === 3);
                            const otherEntries = entries.filter(([_, value]) => Array.isArray(value) && value.length === 2);

                            return (
                                <>
                                    {floatEntries.length > 0 && (
                                        <div className="space-y-4">
                                            <label className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider block">Scalars</label>
                                            {floatEntries.map(([key, value]) => {
                                                const enumOptions = UNIFORM_ENUMS[key];
                                                if (enumOptions) {
                                                    return (
                                                        <div key={key} className="space-y-3">
                                                            <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest block capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</label>
                                                            <div className="relative group">
                                                                <select
                                                                    value={value as number}
                                                                    onChange={(e) => {
                                                                        const nextUniforms = { ...effect.uniforms, [key]: parseFloat(e.target.value) };
                                                                        updateMediaAsset(effect.id, { uniforms: nextUniforms });
                                                                    }}
                                                                    className="w-full bg-zinc-950/50 border border-white/5 rounded-lg pl-3 pr-10 py-2.5 text-xs text-zinc-300 appearance-none focus:outline-none focus:border-electric-cyan/50 group-hover:border-white/10 transition-all cursor-pointer"
                                                                >
                                                                    {enumOptions.map(opt => (
                                                                        <option key={opt.value} value={opt.value} className="bg-zinc-900">{opt.label}</option>
                                                                    ))}
                                                                </select>
                                                                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 pointer-events-none group-hover:text-zinc-300 transition-colors" />
                                                            </div>
                                                        </div>
                                                    );
                                                }

                                                return (
                                                    <div key={key} className="space-y-3">
                                                        <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-wider">
                                                            <span className="text-zinc-400 capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</span>
                                                            <span className="text-electric-cyan font-mono">{(value as number).toFixed(2)}</span>
                                                        </div>
                                                        <div className="h-2 bg-zinc-950 border border-white/5 rounded-full relative overflow-hidden">
                                                            <div className="absolute inset-y-0 left-0 bg-gradient-to-r from-electric-cyan/30 to-electric-cyan" style={{ width: `${(value as number) * 100}%` }} />
                                                            <input
                                                                type="range"
                                                                min="0"
                                                                max="1"
                                                                step="0.01"
                                                                value={value as number}
                                                                onChange={(e) => {
                                                                    const nextUniforms = { ...effect.uniforms, [key]: parseFloat(e.target.value) };
                                                                    updateMediaAsset(effect.id, { uniforms: nextUniforms });
                                                                }}
                                                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                                            />
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}

                                    {colorEntries.length > 0 && (
                                        <div className="space-y-4">
                                            <label className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider block">Colors</label>
                                            <div className="grid grid-cols-2 gap-3">
                                                {colorEntries.map(([key, value]) => {
                                                    const hex = "#" + (value as number[]).map(c => Math.round(c * 255).toString(16).padStart(2, '0')).join('');
                                                    return (
                                                        <div key={key} className="space-y-2">
                                                            <label className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest block capitalize truncate">{key.replace(/([A-Z])/g, ' $1').trim()}</label>
                                                            <div className="flex items-center gap-2 bg-zinc-950/50 border border-white/5 rounded-lg px-2 py-1.5 group hover:border-white/10 transition-colors">
                                                                <input
                                                                    type="text"
                                                                    value={hex}
                                                                    onChange={(e) => {
                                                                        const val = e.target.value;
                                                                        if (/^#[0-9A-F]{6}$/i.test(val)) {
                                                                            const r = parseInt(val.slice(1, 3), 16) / 255;
                                                                            const g = parseInt(val.slice(3, 5), 16) / 255;
                                                                            const b = parseInt(val.slice(5, 7), 16) / 255;
                                                                            const nextUniforms = { ...effect.uniforms, [key]: [r, g, b] };
                                                                            updateMediaAsset(effect.id, { uniforms: nextUniforms });
                                                                        }
                                                                    }}
                                                                    className="bg-transparent border-none text-[10px] font-mono text-zinc-300 focus:outline-none flex-1 w-full uppercase"
                                                                />
                                                                <div className="w-3 h-3 rounded-sm shadow-inner border border-white/10 shrink-0" style={{ backgroundColor: hex }} />
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    )}

                                    {otherEntries.map(([key, value]) => {
                                        return (
                                            <div key={key} className="space-y-3">
                                                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest block capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</label>
                                                <div className="grid grid-cols-2 gap-4">
                                                    {(value as number[]).map((v, i) => (
                                                        <div key={i} className="space-y-2">
                                                            <div className="flex justify-between text-[9px] font-mono text-zinc-500 uppercase">
                                                                <span>{i === 0 ? 'X' : 'Y'}</span>
                                                                <span>{v.toFixed(2)}</span>
                                                            </div>
                                                            <div className="h-1.5 bg-zinc-950 border border-white/5 rounded-full relative overflow-hidden">
                                                                <div className="absolute inset-y-0 left-0 bg-electric-cyan/40" style={{ width: `${v * 100}%` }} />
                                                                <input
                                                                    type="range"
                                                                    min="0"
                                                                    max="1"
                                                                    step="0.01"
                                                                    value={v}
                                                                    onChange={(e) => {
                                                                        const nextVal = [...(value as number[])];
                                                                        nextVal[i] = parseFloat(e.target.value);
                                                                        const nextUniforms = { ...effect.uniforms, [key]: nextVal };
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
                                    })}
                                </>
                            );
                        })()}
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
                            onClick={() => {
                                updateSurfaceEffect(surface.id, defaultEffectSettings);
                                toast.info("Reset base adjustments");
                            }}
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
