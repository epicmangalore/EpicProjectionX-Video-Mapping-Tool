"use client";

import { useLayerStore, BlendMode, Layer } from "@/store/layer-store";
import { useProjectStore } from "@/store/project-store"; // For media assets
import { Eye, EyeOff, X, Layers, Plus, GripVertical } from "lucide-react";
import { RotaryKnob } from "@/components/ui/RotaryKnob";
import React, { useCallback, useMemo } from "react";

// Memoized Layer Component to prevent re-renders of all layers when one changes
const LayerRow = React.memo(({
    layer,
    index,
    activeLayerId,
    mediaAssets,
    videos,
    onActivate,
    onUpdate,
    onRemove,
    onTriggerClip,
    onReorder,
    isFirst,
    isLast
}: {
    layer: Layer,
    index: number,
    activeLayerId: string | null,
    mediaAssets: any[],
    videos: any[],
    onActivate: (id: string) => void,
    onUpdate: (id: string, updates: Partial<Layer>) => void,
    onRemove: (id: string) => void,
    onTriggerClip: (layerId: string, clipId: string | null) => void, // clipId can be null for clearing
    onReorder: (index: number, direction: 'up' | 'down') => void,
    isFirst: boolean,
    isLast: boolean
}) => {
    return (
        <div
            onClick={() => onActivate(layer.id)}
            className={`group relative border-b border-white/5 p-3 transition-colors ${activeLayerId === layer.id ? 'bg-white/5' : 'hover:bg-white/5'}`}
        >
            {/* Layer Header */}
            <div className="flex items-center gap-3 mb-3">
                <div className="flex flex-col gap-1">
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onUpdate(layer.id, { visible: !layer.visible });
                        }}
                        className={`transition-colors ${layer.visible ? 'text-electric-cyan' : 'text-zinc-700'}`}
                    >
                        {layer.visible ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                    </button>
                    <div className="flex flex-col gap-0.5">
                        <button
                            onClick={(e) => { e.stopPropagation(); onReorder(index, 'up'); }}
                            disabled={isFirst}
                            className="text-zinc-600 hover:text-zinc-300 disabled:opacity-20 disabled:hover:text-zinc-600"
                        >
                            <div className="w-0 h-0 border-l-[3px] border-l-transparent border-r-[3px] border-r-transparent border-b-[4px] border-b-current" />
                        </button>
                        <button
                            onClick={(e) => { e.stopPropagation(); onReorder(index, 'down'); }}
                            disabled={isLast}
                            className="text-zinc-600 hover:text-zinc-300 disabled:opacity-20 disabled:hover:text-zinc-600"
                        >
                            <div className="w-0 h-0 border-l-[3px] border-l-transparent border-r-[3px] border-r-transparent border-t-[4px] border-t-current" />
                        </button>
                    </div>
                </div>

                <div className="flex-1 min-w-0">
                    <input
                        type="text"
                        value={layer.name}
                        onChange={(e) => onUpdate(layer.id, { name: e.target.value })}
                        className="bg-transparent border-none p-0 text-xs font-bold text-zinc-100 focus:outline-none w-full"
                    />
                    <div className="flex items-center justify-between mt-0.5">
                        <div className="text-[10px] text-zinc-500 font-mono truncate max-w-[120px]">
                            {mediaAssets.find(a => a.id === layer.activeClipId)?.name || 'Empty'}
                        </div>
                        {layer.activeClipId && (
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    // Cast to any to allow null for clearing as per store definition
                                    onTriggerClip(layer.id, null as any);
                                }}
                                className="text-[9px] text-zinc-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all px-1.5 py-0.5 rounded hover:bg-red-500/10"
                            >
                                CLEAR
                            </button>
                        )}
                    </div>
                </div>

                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        onRemove(layer.id);
                    }}
                    className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-red-500/20 text-zinc-600 hover:text-red-400 transition-all"
                >
                    <X className="w-3 h-3" />
                </button>
            </div>

            {/* Controls Row */}
            <div className="flex items-end gap-4 mb-4">
                <div className="relative group/knob">
                    <RotaryKnob
                        label="Opacity"
                        value={layer.opacity}
                        min={0}
                        max={1}
                        step={0.01}
                        color="#00f0ff"
                        formatValue={(v) => `${Math.round(v * 100)}%`}
                        onChange={(val) => onUpdate(layer.id, { opacity: val })}
                        size={40}
                    />
                    <div className="absolute inset-0 opacity-0 group-hover/knob:opacity-100 flex items-center justify-center pointer-events-none">
                        <div className="bg-black/80 text-[8px] text-white px-1 rounded backdrop-blur-sm pointer-events-auto cursor-pointer"
                            onClick={(e) => {
                                e.stopPropagation();
                                const midiStore = require("@/store/midi-store").useMIDIStore.getState();
                                midiStore.startLearning(`layer-${layer.id}:opacity`);
                            }}
                        >
                            MIDI
                        </div>
                    </div>
                </div>

                <div className="relative group/knob">
                    <RotaryKnob
                        label="Speed"
                        value={layer.speed}
                        min={-4}
                        max={4}
                        step={0.1}
                        color="#ff9900"
                        formatValue={(v) => `${v.toFixed(1)}x`}
                        onChange={(val) => onUpdate(layer.id, { speed: val })}
                        size={40}
                    />
                    <div className="absolute inset-0 opacity-0 group-hover/knob:opacity-100 flex items-center justify-center pointer-events-none">
                        <div className="bg-black/80 text-[8px] text-white px-1 rounded backdrop-blur-sm pointer-events-auto cursor-pointer"
                            onClick={(e) => {
                                e.stopPropagation();
                                const midiStore = require("@/store/midi-store").useMIDIStore.getState();
                                midiStore.startLearning(`layer-${layer.id}:speed`);
                            }}
                        >
                            MIDI
                        </div>
                    </div>
                </div>

                <div className="flex-1 space-y-1">
                    <label className="text-[9px] text-zinc-600 font-bold uppercase block">Blend</label>
                    <select
                        value={layer.blendMode}
                        onChange={(e) => onUpdate(layer.id, { blendMode: e.target.value as BlendMode })}
                        className="w-full bg-zinc-900 border border-white/10 rounded px-2 py-1 text-xs text-zinc-300 focus:outline-none"
                    >
                        <option value="normal">Normal</option>
                        <option value="add">Add</option>
                        <option value="multiply">Multiply</option>
                        <option value="screen">Screen</option>
                        <option value="overlay">Overlay</option>
                    </select>
                </div>
            </div>

            {/* Clip Grid - Scrollable & Dynamic */}
            <div className="relative">
                <div className="grid grid-cols-4 gap-1.5 max-h-[120px] overflow-y-auto custom-scrollbar pr-1">
                    {videos.map((asset) => (
                        <button
                            key={asset.id}
                            onClick={(e) => {
                                e.stopPropagation();
                                onTriggerClip(layer.id, asset.id);
                            }}
                            className={`aspect-square rounded border transition-all flex items-center justify-center p-0.5 overflow-hidden ${layer.activeClipId === asset.id
                                ? 'border-electric-cyan bg-electric-cyan/20 ring-1 ring-electric-cyan'
                                : 'border-white/5 bg-zinc-900 hover:border-white/20'
                                }`}
                            title={asset.name}
                        >
                            {asset.thumbnail ? (
                                <img src={asset.thumbnail} className="w-full h-full object-cover rounded-[1px]" alt="" />
                            ) : (
                                <div className="text-[8px] text-zinc-600 font-mono truncate px-1 w-full text-center">
                                    {asset.name}
                                </div>
                            )}
                        </button>
                    ))}
                    {videos.length < 8 && Array.from({ length: 8 - videos.length }).map((_, i) => (
                        <div key={`placeholder-${i}`} className="aspect-square rounded border border-white/5 bg-zinc-900/10 dashed flex items-center justify-center opacity-30">
                            <Plus className="w-2 h-2 text-zinc-800" />
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}, (prev, next) => {
    // Custom comparison for performance
    // Only re-render if the layer object itself changes, or activeLayerId, or reorder state
    return (
        prev.layer === next.layer &&
        prev.activeLayerId === next.activeLayerId &&
        prev.index === next.index &&
        prev.isFirst === next.isFirst &&
        prev.isLast === next.isLast &&
        prev.videos === next.videos // Should refer to same array unless assets change
    );
});

export function LayerPanel() {
    const { layers, activeLayerId, updateLayer, setActiveLayer, triggerClip, addLayer, removeLayer, reorderLayers } = useLayerStore();
    const mediaAssets = useProjectStore((state) => state.mediaAssets);

    const videos = useMemo(() => mediaAssets.filter(a => a.type === "video" || a.type === "webcam"), [mediaAssets]);

    const handleReorder = useCallback((index: number, direction: 'up' | 'down') => {
        if (direction === 'up' && index > 0) {
            reorderLayers(index, index - 1);
        } else if (direction === 'down' && index < layers.length - 1) {
            reorderLayers(index, index + 1);
        }
    }, [layers.length, reorderLayers]);

    // Stable handlers
    const handleUpdate = useCallback((id: string, updates: Partial<Layer>) => updateLayer(id, updates), [updateLayer]);
    const handleRemove = useCallback((id: string) => removeLayer(id), [removeLayer]);
    const handleTrigger = useCallback((layerId: string, clipId: string | null) => triggerClip(layerId, clipId), [triggerClip]);
    const handleActivate = useCallback((id: string) => setActiveLayer(id), [setActiveLayer]);

    return (
        <div className="flex flex-col h-full bg-zinc-950 border-white/5 font-sans">
            <div className="p-3 border-b border-white/5 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Layers className="w-4 h-4 text-electric-cyan" />
                    <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-400">Layer Mixer</h3>
                </div>
                <button
                    onClick={addLayer}
                    className="p-1.5 hover:bg-white/5 rounded text-zinc-500 hover:text-white transition-colors"
                >
                    <Plus className="w-4 h-4" />
                </button>
            </div>

            <div className="flex-1 overflow-y-auto no-scrollbar py-2 space-y-2">
                {layers.map((layer, index) => (
                    <LayerRow
                        key={layer.id}
                        layer={layer}
                        index={index}
                        activeLayerId={activeLayerId}
                        mediaAssets={mediaAssets}
                        videos={videos}
                        onActivate={handleActivate}
                        onUpdate={handleUpdate}
                        onRemove={handleRemove}
                        onTriggerClip={handleTrigger}
                        onReorder={handleReorder}
                        isFirst={index === 0}
                        isLast={index === layers.length - 1}
                    />
                ))}
            </div>
        </div>
    );
}
