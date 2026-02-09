"use client";

import { useLayerStore, BlendMode } from "@/store/layer-store";
import { useProjectStore } from "@/store/project-store";
import { Layers, Play, Pause, X, Plus, GripVertical, Settings2, Eye, EyeOff } from "lucide-react";
import { RotaryKnob } from "@/components/ui/RotaryKnob";

export function LayerPanel() {
    const { layers, activeLayerId, updateLayer, setActiveLayer, triggerClip, addLayer, removeLayer } = useLayerStore();
    const mediaAssets = useProjectStore((state) => state.mediaAssets);

    const videos = mediaAssets.filter(a => a.type === "video" || a.type === "webcam");

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

            <div className="flex-1 overflow-y-auto no-scrollbar py-2">
                {layers.map((layer) => (
                    <div
                        key={layer.id}
                        onClick={() => setActiveLayer(layer.id)}
                        className={`group relative border-b border-white/5 p-3 transition-colors ${activeLayerId === layer.id ? 'bg-white/5' : 'hover:bg-white/5'}`}
                    >
                        {/* Layer Header */}
                        <div className="flex items-center gap-3 mb-3">
                            <div className="flex flex-col gap-1">
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        updateLayer(layer.id, { visible: !layer.visible });
                                    }}
                                    className={`transition-colors ${layer.visible ? 'text-electric-cyan' : 'text-zinc-700'}`}
                                >
                                    {layer.visible ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                                </button>
                                <GripVertical className="w-3.5 h-3.5 text-zinc-800" />
                            </div>

                            <div className="flex-1 min-w-0">
                                <input
                                    type="text"
                                    value={layer.name}
                                    onChange={(e) => updateLayer(layer.id, { name: e.target.value })}
                                    className="bg-transparent border-none p-0 text-xs font-bold text-zinc-100 focus:outline-none w-full"
                                />
                                <div className="text-[10px] text-zinc-500 font-mono mt-0.5">
                                    {mediaAssets.find(a => a.id === layer.activeClipId)?.name || 'Empty'}
                                </div>
                            </div>

                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    removeLayer(layer.id);
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
                                    onChange={(val) => updateLayer(layer.id, { opacity: val })}
                                    size={40}
                                />
                                <div className="absolute inset-0 opacity-0 group-hover/knob:opacity-100 flex items-center justify-center pointer-events-none">
                                    <div className="bg-black/80 text-[8px] text-white px-1 rounded backdrop-blur-sm pointer-events-auto cursor-pointer"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            // Trigger MIDI learn
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
                                    onChange={(val) => updateLayer(layer.id, { speed: val })}
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
                                    onChange={(e) => updateLayer(layer.id, { blendMode: e.target.value as BlendMode })}
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

                        {/* Clip Grid */}
                        <div className="grid grid-cols-4 gap-1.5">
                            {videos.slice(0, 8).map((asset) => (
                                <button
                                    key={asset.id}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        triggerClip(layer.id, asset.id);
                                    }}
                                    className={`aspect-square rounded border transition-all flex items-center justify-center p-0.5 overflow-hidden ${layer.activeClipId === asset.id
                                        ? 'border-electric-cyan bg-electric-cyan/20 ring-1 ring-electric-cyan'
                                        : 'border-white/5 bg-zinc-900 hover:border-white/20'
                                        }`}
                                >
                                    {asset.thumbnail ? (
                                        <img src={asset.thumbnail} className="w-full h-full object-cover rounded-[1px]" alt="" />
                                    ) : (
                                        <div className="text-[8px] text-zinc-600 font-mono truncate px-1">
                                            {asset.name}
                                        </div>
                                    )}
                                </button>
                            ))}
                            {/* Dummy clip slots if empty */}
                            {Array.from({ length: Math.max(0, 4 - videos.length) }).map((_, i) => (
                                <div key={i} className="aspect-square rounded border border-white/5 bg-zinc-900/30 dashed flex items-center justify-center">
                                    <Plus className="w-2 h-2 text-zinc-800" />
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
