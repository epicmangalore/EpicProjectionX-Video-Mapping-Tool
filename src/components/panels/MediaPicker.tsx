"use client";

import { useRef, useState, useEffect } from "react";
import { useProjectStore } from "@/store/project-store";
import { useModalStore } from "@/store/modal-store";
import { toast } from "@/store/toast-store";
import { generateId } from "@/lib/utils";
import { processFile } from "@/lib/media-utils";
import { Image, Video, Palette, Type, Upload, X, Search, Plus, Webcam, Trash2 } from "lucide-react";
import { PRESET_MEDIA } from "@/lib/media/MediaPresets";

interface MediaPickerProps {
    onSelect: (assetId: string | null) => void;
    onClose: () => void;
    currentMediaId: string | null;
}

export function MediaPicker({ onSelect, onClose, currentMediaId }: MediaPickerProps) {
    const mediaAssets = useProjectStore((state) => state.mediaAssets);
    const addMediaAsset = useProjectStore((state) => state.addMediaAsset);
    const clearAllMedia = useProjectStore((state) => state.clearAllMedia);
    const confirm = useModalStore((state) => state.confirm);
    const [searchQuery, setSearchQuery] = useState("");
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [hoveredAssetId, setHoveredAssetId] = useState<string | null>(null);

    const filteredAssets = mediaAssets.filter(asset =>
        asset.type !== "shader" &&
        asset.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (files && files.length > 0) {
            for (const file of Array.from(files)) {
                try {
                    await processFile(file, addMediaAsset);
                } catch (error: any) {
                    console.error('Failed to process file:', file.name, error);
                    const errorMessage = error.message || 'Failed to import file';
                    toast.error(errorMessage, 8000);
                }
            }
        }
    };

    const handleAddColor = () => {
        const colors = ["#7c3aed", "#06b6d4", "#f59e0b", "#ef4444", "#10b981", "#8b5cf6"];
        const randomColor = colors[Math.floor(Math.random() * colors.length)];
        const mediaId = generateId();
        addMediaAsset({
            id: mediaId,
            name: `Color ${randomColor}`,
            type: "color",
            color: randomColor,
        });
    };

    // Close on escape
    useEffect(() => {
        const handleEsc = (e: KeyboardEvent) => {
            if (e.key === "Escape") onClose();
        };
        window.addEventListener("keydown", handleEsc);
        return () => window.removeEventListener("keydown", handleEsc);
    }, [onClose]);

    return (
        <div className="flex flex-col h-full bg-zinc-900 border border-white/10 shadow-2xl rounded-xl overflow-hidden animate-in fade-in duration-300">
            {/* Header */}
            <div className="p-4 border-b border-white/5 flex items-center justify-between bg-zinc-900/80 backdrop-blur-md">
                <div className="flex items-center gap-3">
                    <div className="p-1.5 bg-electric-purple/20 rounded-md">
                        <Video className="w-4 h-4 text-electric-purple" />
                    </div>
                    <div>
                        <h2 className="text-xs font-bold text-white uppercase tracking-wider">Media Assets</h2>
                        <p className="text-[10px] text-zinc-500 uppercase font-medium">Assign to Surface</p>
                    </div>
                </div>
                <button
                    onClick={onClose}
                    className="p-1.5 hover:bg-white/10 rounded-md text-zinc-500 hover:text-white transition-colors"
                >
                    <X className="w-4 h-4" />
                </button>
            </div>

            {/* Toolbar - More compact for sidebar */}
            <div className="p-3 border-b border-white/5 flex flex-col gap-2 bg-zinc-900/50">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-600" />
                    <input
                        type="text"
                        placeholder="Search assets..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-9 pr-3 py-1.5 bg-zinc-950 border border-white/5 rounded-md text-xs focus:outline-none focus:border-electric-purple transition-colors"
                    />
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={() => fileInputRef.current?.click()}
                        className="flex-1 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded text-[10px] font-bold flex items-center justify-center gap-2 transition-all active:scale-95 border border-white/5"
                    >
                        <Upload className="w-3 h-3" />
                        IMPORT
                    </button>
                    <button
                        onClick={handleAddColor}
                        className="flex-1 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded text-[10px] font-bold flex items-center justify-center gap-2 transition-all active:scale-95 border border-white/5"
                    >
                        <Palette className="w-3 h-3" />
                        COLOR
                    </button>
                    <button
                        onClick={async () => {
                            const ok = await confirm({
                                title: "Clear Library",
                                message: "Are you sure you want to clear all media? This will remove media from ALL surfaces in ALL scenes.",
                                confirmLabel: "Clear All",
                                cancelLabel: "Cancel"
                            });
                            if (ok) {
                                clearAllMedia();
                            }
                        }}
                        className="p-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/20 rounded transition-all active:scale-95 flex items-center justify-center"
                        title="Clear All Media"
                    >
                        <Trash2 className="w-3.5 h-3.5" />
                    </button>
                </div>
                <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*,video/*"
                    multiple
                    className="hidden"
                    onChange={handleFileUpload}
                />
            </div>

            {/* Grid - Scrollable area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-6 bg-zinc-950/20 no-scrollbar">
                {/* System Inputs */}
                <div>
                    <h3 className="text-[9px] font-bold text-zinc-600 uppercase tracking-widest mb-3 pl-1">System Inputs</h3>
                    <div className="grid grid-cols-2 gap-2">
                        <button
                            onClick={() => onSelect(null)}
                            className={`flex items-center gap-3 p-2 rounded-lg border transition-all ${!currentMediaId ? 'bg-zinc-800 border-electric-cyan text-white' : 'bg-zinc-900/30 border-white/5 text-zinc-500 hover:border-white/10 hover:text-zinc-300'}`}
                        >
                            <div className="w-8 h-8 rounded bg-black/40 flex items-center justify-center">
                                <X className="w-4 h-4" />
                            </div>
                            <span className="text-[10px] font-bold uppercase tracking-tight">None (Black)</span>
                        </button>

                        <button
                            onClick={() => {
                                const webcamAsset = mediaAssets.find(a => a.type === "webcam");
                                if (!webcamAsset) {
                                    const newId = generateId();
                                    addMediaAsset({
                                        id: newId,
                                        name: "Webcam Input",
                                        type: "webcam",
                                    });
                                    onSelect(newId);
                                } else {
                                    onSelect(webcamAsset.id);
                                }
                            }}
                            className={`flex items-center gap-3 p-2 rounded-lg border transition-all ${currentMediaId?.includes('webcam') ? 'bg-zinc-800 border-electric-cyan text-white' : 'bg-zinc-900/30 border-white/5 text-zinc-500 hover:border-white/10 hover:text-zinc-300'}`}
                        >
                            <div className="w-8 h-8 rounded bg-black/40 flex items-center justify-center">
                                <Webcam className="w-4 h-4" />
                            </div>
                            <span className="text-[10px] font-bold uppercase tracking-tight">USB Webcam</span>
                        </button>
                    </div>
                </div>

                {/* VJ Loops / Presets */}
                <div>
                    <h3 className="text-[9px] font-bold text-zinc-600 uppercase tracking-widest mb-3 pl-1">VJ Loops & Presets</h3>
                    <div className="grid grid-cols-4 gap-2">
                        {PRESET_MEDIA.map((preset) => (
                            <button
                                key={preset.id}
                                onClick={() => {
                                    // Check if this preset is already in the store
                                    const exists = mediaAssets.some(a => a.id === preset.id);
                                    if (!exists) {
                                        // Add it to the store so the rest of the app can use it
                                        addMediaAsset(preset);
                                    }
                                    onSelect(preset.id);
                                }}
                                onMouseEnter={() => setHoveredAssetId(preset.id)}
                                onMouseLeave={() => setHoveredAssetId(null)}
                                className={`group aspect-video rounded-lg border overflow-hidden relative transition-all bg-zinc-900/50 ${currentMediaId === preset.id ? 'border-electric-cyan bg-electric-cyan/5' : 'border-white/5 hover:border-white/20'}`}
                            >
                                <div className="absolute inset-0">
                                    {preset.type === "video" && preset.url && (
                                        <video
                                            src={preset.url}
                                            autoPlay={hoveredAssetId === preset.id}
                                            muted
                                            loop
                                            preload="metadata"
                                            className={`w-full h-full object-cover transition-opacity duration-300 ${hoveredAssetId !== preset.id ? 'opacity-80' : 'opacity-100'}`}
                                        />
                                    )}
                                </div>

                                {currentMediaId === preset.id && (
                                    <div className="absolute inset-0 border-2 border-electric-cyan shadow-[inset_0_0_10px_rgba(6,182,212,0.3)] z-10" />
                                )}

                                <div className="absolute inset-x-0 bottom-0 p-1.5 bg-gradient-to-t from-black/80 to-transparent">
                                    <p className="text-[8px] font-bold text-white/90 truncate uppercase tracking-tighter">
                                        {preset.name}
                                    </p>
                                </div>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Media Library */}
                <div>
                    <h3 className="text-[9px] font-bold text-zinc-600 uppercase tracking-widest mb-3 pl-1">Media Library</h3>
                    <div className="grid grid-cols-4 gap-2">
                        {filteredAssets.map((asset) => (
                            <button
                                key={asset.id}
                                onClick={() => onSelect(asset.id)}
                                onMouseEnter={() => setHoveredAssetId(asset.id)}
                                onMouseLeave={() => setHoveredAssetId(null)}
                                className={`group aspect-video rounded-lg border overflow-hidden relative transition-all bg-zinc-900/50 ${currentMediaId === asset.id ? 'border-electric-cyan bg-electric-cyan/5' : 'border-white/5 hover:border-white/20'}`}
                            >
                                {/* Asset Preview */}
                                <div className="absolute inset-0">
                                    {asset.type === "color" && (
                                        <div className="w-full h-full" style={{ backgroundColor: asset.color }} />
                                    )}
                                    {(asset.type === "image" || asset.type === "video") && asset.thumbnail && (
                                        <img
                                            src={asset.thumbnail}
                                            alt={asset.name}
                                            className={`w-full h-full object-cover transition-opacity duration-300 ${hoveredAssetId === asset.id && asset.type === "video" ? 'opacity-0' : 'opacity-100'}`}
                                        />
                                    )}
                                    {asset.type === "video" && asset.url && hoveredAssetId === asset.id && (
                                        <video
                                            src={asset.url}
                                            autoPlay
                                            muted
                                            loop
                                            className="w-full h-full object-cover animate-in fade-in duration-300"
                                        />
                                    )}
                                </div>

                                {/* Selection Mask */}
                                {currentMediaId === asset.id && (
                                    <div className="absolute inset-0 border-2 border-electric-cyan shadow-[inset_0_0_10px_rgba(6,182,212,0.3)] z-10" />
                                )}

                                {/* Label Overlay - subtle */}
                                <div className="absolute inset-x-0 bottom-0 p-1.5 bg-gradient-to-t from-black/80 to-transparent">
                                    <p className="text-[8px] font-bold text-white/90 truncate uppercase tracking-tighter">
                                        {asset.name}
                                    </p>
                                </div>
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Footer */}
            <div className="p-3 bg-zinc-900 border-t border-white/5 flex items-center justify-between text-[9px] text-zinc-600 font-bold uppercase tracking-wider">
                <span>{filteredAssets.length} Assets (+ {PRESET_MEDIA.length} Presets)</span>
                <span className="text-zinc-700">LIBRARY V1.0</span>
            </div>
        </div>
    );
}
