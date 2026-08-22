"use client";

import { useState } from "react";
import { useProjectStore } from "@/store/project-store";
import { useAudioStore } from "@/store/audio-store";
import { Plus, Trash2, Volume2, VolumeX } from "lucide-react";
import type { AudioMapping } from "@/store/project-store";

const AUDIO_BANDS = [
    { value: "bass", label: "Bass" },
    { value: "mid", label: "Mid" },
    { value: "treble", label: "Treble" },
    { value: "volume", label: "Volume" },
    { value: "energy", label: "Energy" },
    { value: "centroid", label: "Centroid" },
    { value: "rolloff", label: "Rolloff" },
    { value: "zcr", label: "ZCR" },
    { value: "rms", label: "RMS" },
] as const;

const MAPPABLE_PROPERTIES = [
    { value: "opacity", label: "Opacity" },
    { value: "blur", label: "Blur" },
    { value: "chromatic", label: "Chromatic Aberration" },
    { value: "brightness", label: "Brightness" },
    { value: "contrast", label: "Contrast" },
    { value: "saturation", label: "Saturation" },
    { value: "hue", label: "Hue" },
    { value: "rgbShift", label: "RGB Shift" },
    { value: "colorTint.r", label: "Color Tint R" },
    { value: "colorTint.g", label: "Color Tint G" },
    { value: "colorTint.b", label: "Color Tint B" },
    { value: "scale", label: "Scale" },
    { value: "scale.x", label: "Scale X" },
    { value: "scale.y", label: "Scale Y" },
    { value: "rotation", label: "Rotation" },
    { value: "position.x", label: "Position X" },
    { value: "position.y", label: "Position Y" },
] as const;

export function AudioMappingPanel() {
    const selectedSurfaceIds = useProjectStore((state) => state.selectedSurfaceIds);
    const getActiveSurfaces = useProjectStore((state) => state.getActiveSurfaces);
    const updateSurface = useProjectStore((state) => state.updateSurface);
    const isEnabled = useAudioStore((state) => state.isEnabled);
    const initAudio = useAudioStore((state) => state.initAudio);
    const stopAudio = useAudioStore((state) => state.stopAudio);
    const levels = useAudioStore((state) => state.levels);

    const surfaces = getActiveSurfaces();
    const selectedSurface = surfaces.find(s => selectedSurfaceIds.includes(s.id));

    const [isExpanded, setIsExpanded] = useState(true);

    const handleAddMapping = () => {
        if (!selectedSurface) return;

        const newMapping: AudioMapping = {
            id: `mapping_${Date.now()}`,
            band: "bass",
            property: "opacity",
            min: 0,
            max: 1,
            enabled: true,
            smoothing: 0.2,
        };

        updateSurface(selectedSurface.id, {
            audioMappings: [...selectedSurface.audioMappings, newMapping],
        });
    };

    const handleRemoveMapping = (mappingId: string) => {
        if (!selectedSurface) return;

        updateSurface(selectedSurface.id, {
            audioMappings: selectedSurface.audioMappings.filter(m => m.id !== mappingId),
        });
    };

    const handleUpdateMapping = (mappingId: string, updates: Partial<AudioMapping>) => {
        if (!selectedSurface) return;

        updateSurface(selectedSurface.id, {
            audioMappings: selectedSurface.audioMappings.map(m =>
                m.id === mappingId ? { ...m, ...updates } : m
            ),
        });
    };

    const handleToggleAudio = async () => {
        if (isEnabled) {
            stopAudio();
        } else {
            await initAudio();
        }
    };

    if (!selectedSurface) {
        return (
            <div className="flex-1 flex items-center justify-center p-4">
                <div className="text-center text-zinc-500 text-sm">
                    <p>Select a surface to configure</p>
                    <p className="text-xs mt-1">audio-reactive mappings</p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full bg-zinc-950">
            {/* Header */}
            <div className="flex items-center justify-between p-3 border-b border-white/10">
                <button
                    onClick={() => setIsExpanded(!isExpanded)}
                    className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-zinc-400 hover:text-white transition-colors"
                >
                    <span className={`transform transition-transform ${isExpanded ? 'rotate-90' : ''}`}>▶</span>
                    Audio Reactivity
                </button>

                <button
                    onClick={handleToggleAudio}
                    className={`flex items-center gap-1.5 px-2 py-1 rounded text-xs transition-all ${
                        isEnabled
                            ? 'bg-electric-cyan/20 text-electric-cyan border border-electric-cyan/30'
                            : 'bg-zinc-800 text-zinc-500 border border-zinc-700 hover:border-zinc-600'
                    }`}
                    title={isEnabled ? "Disable audio input" : "Enable audio input"}
                >
                    {isEnabled ? <Volume2 className="h-3 w-3" /> : <VolumeX className="h-3 w-3" />}
                    {isEnabled ? 'ON' : 'OFF'}
                </button>
            </div>

            {isExpanded && (
                <>
                    {/* Audio Levels Visualization */}
                    {isEnabled && (
                        <div className="p-3 border-b border-white/10 bg-black/20">
                            <div className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider mb-2">Live Levels</div>
                            <div className="grid grid-cols-3 gap-2">
                                {Object.entries(levels).slice(0, 9).map(([band, level]) => (
                                    <div key={band} className="flex flex-col gap-1">
                                        <div className="text-[8px] text-zinc-600 uppercase">{band}</div>
                                        <div className="h-1.5 bg-zinc-900 rounded-full overflow-hidden">
                                            <div
                                                className="h-full bg-electric-cyan transition-all duration-75"
                                                style={{ width: `${Math.min(level * 100, 100)}%` }}
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Mappings List */}
                    <div className="flex-1 overflow-y-auto p-3 space-y-3">
                        {selectedSurface.audioMappings.length === 0 ? (
                            <div className="text-center py-8 text-zinc-600 text-xs">
                                <p>No audio mappings</p>
                                <p className="mt-1">Click + to add one</p>
                            </div>
                        ) : (
                            selectedSurface.audioMappings.map((mapping) => (
                                <div
                                    key={mapping.id}
                                    className="bg-zinc-900/50 border border-white/5 rounded-lg p-3 space-y-2"
                                >
                                    {/* Mapping Header */}
                                    <div className="flex items-center justify-between">
                                        <button
                                            onClick={() => handleUpdateMapping(mapping.id, { enabled: !mapping.enabled })}
                                            className={`text-xs font-bold px-2 py-0.5 rounded transition-colors ${
                                                mapping.enabled
                                                    ? 'text-electric-cyan bg-electric-cyan/10'
                                                    : 'text-zinc-600 bg-zinc-800'
                                            }`}
                                        >
                                            {mapping.enabled ? 'ENABLED' : 'DISABLED'}
                                        </button>
                                        <button
                                            onClick={() => handleRemoveMapping(mapping.id)}
                                            className="text-zinc-600 hover:text-red-400 transition-colors"
                                        >
                                            <Trash2 className="h-3 w-3" />
                                        </button>
                                    </div>

                                    {/* Band Selection */}
                                    <div>
                                        <label className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider block mb-1">
                                            Audio Band
                                        </label>
                                        <select
                                            value={mapping.band}
                                            onChange={(e) => handleUpdateMapping(mapping.id, { band: e.target.value as AudioMapping["band"] })}
                                            className="w-full bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-xs text-zinc-200 focus:outline-none focus:border-electric-cyan"
                                        >
                                            {AUDIO_BANDS.map(band => (
                                                <option key={band.value} value={band.value}>{band.label}</option>
                                            ))}
                                        </select>
                                    </div>

                                    {/* Property Selection */}
                                    <div>
                                        <label className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider block mb-1">
                                            Target Property
                                        </label>
                                        <select
                                            value={mapping.property}
                                            onChange={(e) => handleUpdateMapping(mapping.id, { property: e.target.value })}
                                            className="w-full bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-xs text-zinc-200 focus:outline-none focus:border-electric-cyan"
                                        >
                                            {MAPPABLE_PROPERTIES.map(prop => (
                                                <option key={prop.value} value={prop.value}>{prop.label}</option>
                                            ))}
                                        </select>
                                    </div>

                                    {/* Min/Max Range */}
                                    <div className="grid grid-cols-2 gap-2">
                                        <div>
                                            <label className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider block mb-1">
                                                Min
                                            </label>
                                            <input
                                                type="number"
                                                step="0.1"
                                                value={mapping.min}
                                                onChange={(e) => handleUpdateMapping(mapping.id, { min: parseFloat(e.target.value) })}
                                                className="w-full bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-xs text-zinc-200 focus:outline-none focus:border-electric-cyan"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider block mb-1">
                                                Max
                                            </label>
                                            <input
                                                type="number"
                                                step="0.1"
                                                value={mapping.max}
                                                onChange={(e) => handleUpdateMapping(mapping.id, { max: parseFloat(e.target.value) })}
                                                className="w-full bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-xs text-zinc-200 focus:outline-none focus:border-electric-cyan"
                                            />
                                        </div>
                                    </div>

                                    {/* Smoothing */}
                                    <div>
                                        <label className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider block mb-1">
                                            Smoothing: {((mapping.smoothing || 0) * 100).toFixed(0)}%
                                        </label>
                                        <input
                                            type="range"
                                            min="0"
                                            max="1"
                                            step="0.05"
                                            value={mapping.smoothing || 0}
                                            onChange={(e) => handleUpdateMapping(mapping.id, { smoothing: parseFloat(e.target.value) })}
                                            className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-electric-cyan"
                                        />
                                    </div>
                                </div>
                            ))
                        )}
                    </div>

                    {/* Add Mapping Button */}
                    <div className="p-3 border-t border-white/10">
                        <button
                            onClick={handleAddMapping}
                            className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-electric-cyan/10 border border-electric-cyan/30 rounded text-electric-cyan text-xs font-bold uppercase tracking-wider hover:bg-electric-cyan/20 transition-colors"
                        >
                            <Plus className="h-4 w-4" />
                            Add Mapping
                        </button>
                    </div>
                </>
            )}
        </div>
    );
}
