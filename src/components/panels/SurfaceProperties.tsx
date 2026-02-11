"use client";

import { useProjectStore } from "@/store/project-store";
import { useActiveSurfaces } from "@/hooks/useActiveSurfaces";
import React, { useRef } from "react";
import { useUIStore } from "@/store/ui-store";
import { EffectsPanel } from "./EffectsPanel";
import { AudioMappingPanel } from "./AudioMappingPanel";
import { EdgeBlendingControls } from "./EdgeBlendingControls";
import { Trash2, Copy, Type, Italic, AlignLeft, AlignCenter, AlignRight, Upload, AlignStartHorizontal, AlignCenterHorizontal, AlignEndHorizontal, AlignStartVertical, AlignCenterVertical, AlignEndVertical, Link2, MousePointer2, Layers } from "lucide-react";
import { MasterControls } from "./MasterControls";
import { RotaryKnob } from "@/components/ui/RotaryKnob";
import { processFile } from "@/lib/media-utils";
import { generateId, truncateMiddle } from "@/lib/utils";

// Group functionality removed

export function SurfaceProperties() {
    const surfaces = useActiveSurfaces();
    const mediaAssets = useProjectStore((state) => state.mediaAssets);
    const selectedIds = useProjectStore((state) => state.selectedSurfaceIds);
    const updateSurface = useProjectStore((state) => state.updateSurface);
    const alignSurfaces = useProjectStore((state) => state.alignSurfaces);
    const updateMediaAsset = useProjectStore((state) => state.updateMediaAsset);
    const deleteSurface = useProjectStore((state) => state.deleteSurface);
    const duplicateSurface = useProjectStore((state) => state.duplicateSurface);
    const addMediaAsset = useProjectStore((state) => state.addMediaAsset);
    const initializeMeshWarp = useProjectStore((state) => state.initializeMeshWarp);
    const toolMode = useUIStore((state) => state.toolMode);
    const setToolMode = useUIStore((state) => state.setToolMode);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const selectedSurface = surfaces.find((s) => selectedIds.includes(s.id));

    // Helper: apply media to a surface
    const applyMedia = (surfaceId: string, mediaId: string | null) => {
        updateSurface(surfaceId, { mediaId });
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file && selectedSurface) {
            const mediaId = await processFile(file, addMediaAsset);
            applyMedia(selectedSurface.id, mediaId);
        }
    };

    if (!selectedSurface) {
        return (
            <aside className="w-80 h-full bg-zinc-950 border-l border-white/5 flex flex-col">
                <div className="panel-header">
                    Properties
                </div>
                <div className="flex-1 p-4 flex items-center justify-center opacity-50">
                    <div className="text-center">
                        <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-white/5 flex items-center justify-center">
                            <MousePointer2 className="w-5 h-5 text-zinc-600" />
                        </div>
                        <p className="text-sm text-zinc-500">Select a surface</p>
                    </div>
                </div>
            </aside>
        );
    }

    return (
        <aside className="w-80 h-full bg-zinc-950 border-l border-white/5 flex flex-col font-sans">
            <div className="panel-header">
                Properties
                <div className="flex gap-1">
                    <button
                        onClick={() => duplicateSurface(selectedSurface.id)}
                        className="p-1.5 hover:bg-white/10 rounded text-zinc-400 hover:text-white transition-colors"
                        title="Duplicate"
                    >
                        <Copy className="w-3.5 h-3.5" />
                    </button>
                    <button
                        onClick={() => deleteSurface(selectedSurface.id)}
                        className="p-1.5 hover:bg-red-500/10 rounded text-zinc-400 hover:text-red-400 transition-colors"
                        title="Delete"
                    >
                        <Trash2 className="w-3.5 h-3.5" />
                    </button>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto no-scrollbar p-4 space-y-4">
                {/* Surface Name */}
                <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Name</label>
                    <input
                        type="text"
                        value={selectedSurface.name}
                        onChange={(e) =>
                            updateSurface(selectedSurface.id, { name: e.target.value })
                        }
                        className="w-full px-3 py-2 bg-dark-800 border border-white/10 rounded-md text-sm focus:outline-none focus:border-electric-cyan"
                    />
                </div>

                {/* Media Selector */}
                <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Media Source</label>
                    <div className="flex gap-2">
                        <select
                            value={selectedSurface.mediaId || ""}
                            onChange={(e) => {
                                const val = e.target.value;
                                if (val === "webcam-builtin") {
                                    // Check if a webcam asset already exists
                                    const webcamAsset = mediaAssets.find(a => a.type === "webcam");
                                    if (!webcamAsset) {
                                        const newId = generateId();
                                        addMediaAsset({
                                            id: newId,
                                            name: "Webcam Input",
                                            type: "webcam",
                                        });
                                        applyMedia(selectedSurface.id, newId);
                                    } else {
                                        applyMedia(selectedSurface.id, webcamAsset.id);
                                    }
                                } else {
                                    applyMedia(selectedSurface.id, val || null);
                                }
                            }}
                            className="flex-1 min-w-0 px-3 py-2 bg-dark-800 border border-white/10 rounded-md text-sm focus:outline-none focus:border-electric-cyan"
                        >
                            <option value="">None</option>
                            <option value="webcam-builtin">Webcam</option>
                            <optgroup label="Assets">
                                {mediaAssets
                                    .filter((asset) => asset.type !== "shader" && asset.type !== "webcam")
                                    .map((asset) => (
                                        <option key={asset.id} value={asset.id}>
                                            {truncateMiddle(asset.name, 25)}
                                        </option>
                                    ))}
                            </optgroup>
                        </select>
                        <button
                            onClick={() => fileInputRef.current?.click()}
                            className="p-2 aspect-square glass glass-hover rounded-md flex items-center justify-center text-zinc-400 hover:text-electric-cyan transition-colors"
                            title="Upload New Asset"
                        >
                            <Upload className="w-4 h-4" />
                        </button>
                    </div>
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*,video/*"
                        className="hidden"
                        onChange={handleFileUpload}
                    />
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                    <button
                        onClick={() => duplicateSurface(selectedSurface.id)}
                        className="flex-1 px-3 py-2 text-xs glass glass-hover rounded-md flex items-center justify-center gap-2"
                    >
                        <Copy className="w-3 h-3" />
                        Duplicate
                    </button>
                    <button
                        onClick={() => deleteSurface(selectedSurface.id)}
                        className="flex-1 px-3 py-2 text-xs glass glass-hover rounded-md flex items-center justify-center gap-2 text-red-400 hover:bg-red-500/20"
                    >
                        <Trash2 className="w-3 h-3" />
                        Delete
                    </button>
                </div>

                {/* Media Placement */}
                <div className={`space-y-4 border-t border-white/5 pt-4 ${!selectedSurface.mediaId ? "opacity-30 pointer-events-none" : ""}`}>
                    <div className="flex items-center justify-between">
                        <h3 className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest">Media Placement</h3>
                    </div>

                    {/* Fit Mode - Segmented Control */}
                    <div className="flex bg-zinc-900 border border-white/10 rounded overflow-hidden">
                        {[
                            { id: "stretch", label: "STRETCH" },
                            { id: "cover", label: "FILL" },
                            { id: "contain", label: "FIT" }
                        ].map((mode) => (
                            <button
                                key={mode.id}
                                onClick={() => updateSurface(selectedSurface.id, {
                                    textureSettings: {
                                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                        fit: mode.id as any,
                                        scale: { x: 1, y: 1 },
                                        offset: { x: 0, y: 0 },
                                        rotation: 0,
                                        flipX: false,
                                        flipY: false
                                    }
                                })}
                                className={`flex-1 py-1.5 text-[10px] font-medium transition-colors border-r border-white/5 last:border-r-0 transform-gpu ${(selectedSurface.textureSettings?.fit || "stretch") === mode.id
                                    ? "bg-zinc-800 text-white shadow-[inset_0_1px_0_0_rgba(255,255,255,0.1)]"
                                    : "text-zinc-500 hover:text-zinc-300 hover:bg-white/5"
                                    }`}
                            >
                                {mode.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Transform Deck - simplified */}
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <h3 className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest">Transform</h3>
                        <div className="h-px bg-white/5 flex-1 ml-3" />
                    </div>

                    <div className="grid grid-cols-3 gap-0 justify-items-center items-end">
                        {/* Scale Group with Lock */}
                        <div className="col-span-2 flex items-center gap-1 pr-4 border-r border-white/5 mr-4 h-full pb-1">
                            <RotaryKnob
                                label="Scale X"
                                value={selectedSurface.scale.x}
                                min={0.1}
                                max={5}
                                step={0.1}
                                color="#00f0ff"
                                defaultValue={1}
                                onChange={(val) => {
                                    const updates: Partial<typeof selectedSurface> = { scale: { ...selectedSurface.scale, x: val } };
                                    if (selectedSurface.aspectRatioLocked) {
                                        const ratio = selectedSurface.scale.y / selectedSurface.scale.x;
                                        updates.scale!.y = val * ratio;
                                    }
                                    updateSurface(selectedSurface.id, updates);
                                }}
                            />

                            {/* Aspect Lock */}
                            <button
                                onClick={() => updateSurface(selectedSurface.id, { aspectRatioLocked: !selectedSurface.aspectRatioLocked })}
                                className={`p-1.5 rounded-full transition-all mb-5 ${selectedSurface.aspectRatioLocked
                                    ? "bg-electric-cyan text-black"
                                    : "text-zinc-600 hover:text-zinc-400"
                                    }`}
                                title="Lock Aspect Ratio"
                            >
                                <Link2 className="w-3 h-3" />
                            </button>

                            <RotaryKnob
                                label="Scale Y"
                                value={selectedSurface.scale.y}
                                min={0.1}
                                max={5}
                                step={0.1}
                                color="#00f0ff"
                                defaultValue={1}
                                onChange={(val) => {
                                    const updates: Partial<typeof selectedSurface> = { scale: { ...selectedSurface.scale, y: val } };
                                    if (selectedSurface.aspectRatioLocked) {
                                        const ratio = selectedSurface.scale.x / selectedSurface.scale.y;
                                        updates.scale!.x = val * ratio;
                                    }
                                    updateSurface(selectedSurface.id, updates);
                                }}
                            />
                        </div>

                        {/* Rotation */}
                        <div className="pb-1">
                            <RotaryKnob
                                label="Rotate"
                                value={selectedSurface.rotation}
                                min={-Math.PI}
                                max={Math.PI}
                                step={0.05}
                                color="#ff9900"
                                defaultValue={0}
                                formatValue={(v) => `${Math.round(v * (180 / Math.PI))}°`}
                                onChange={(val) => updateSurface(selectedSurface.id, { rotation: val })}
                            />
                        </div>
                    </div>


                    <div className="mt-4 space-y-3 border-t border-white/5 pt-4">
                        {/* Horizontal Alignment */}
                        <div className="grid grid-cols-3 gap-1 bg-zinc-900/50 border border-white/5 rounded p-0.5">
                            <button
                                onClick={() => alignSurfaces("left")}
                                className="p-1.5 rounded hover:bg-white/5 text-zinc-500 hover:text-electric-cyan transition-all flex items-center justify-center"
                                title="Align Left"
                            >
                                <AlignStartVertical className="w-3.5 h-3.5" />
                            </button>
                            <button
                                onClick={() => alignSurfaces("center")}
                                className="p-1.5 rounded hover:bg-white/5 text-zinc-500 hover:text-electric-cyan transition-all flex items-center justify-center"
                                title="Align Center"
                            >
                                <AlignCenterVertical className="w-3.5 h-3.5" />
                            </button>
                            <button
                                onClick={() => alignSurfaces("right")}
                                className="p-1.5 rounded hover:bg-white/5 text-zinc-500 hover:text-electric-cyan transition-all flex items-center justify-center"
                                title="Align Right"
                            >
                                <AlignEndVertical className="w-3.5 h-3.5" />
                            </button>
                        </div>

                        {/* Vertical Alignment */}
                        <div className="grid grid-cols-3 gap-1 bg-zinc-900/50 border border-white/5 rounded p-0.5">
                            <button
                                onClick={() => alignSurfaces("top")}
                                className="p-1.5 rounded hover:bg-white/5 text-zinc-500 hover:text-electric-cyan transition-all flex items-center justify-center"
                                title="Align Top"
                            >
                                <AlignStartHorizontal className="w-3.5 h-3.5" />
                            </button>
                            <button
                                onClick={() => alignSurfaces("middle")}
                                className="p-1.5 rounded hover:bg-white/5 text-zinc-500 hover:text-electric-cyan transition-all flex items-center justify-center"
                                title="Align Middle"
                            >
                                <AlignCenterHorizontal className="w-3.5 h-3.5" />
                            </button>
                            <button
                                onClick={() => alignSurfaces("bottom")}
                                className="p-1.5 rounded hover:bg-white/5 text-zinc-500 hover:text-electric-cyan transition-all flex items-center justify-center"
                                title="Align Bottom"
                            >
                                <AlignEndHorizontal className="w-3.5 h-3.5" />
                            </button>
                        </div>
                    </div>
                </div>

                {/* Text Properties Deck */}
                {(() => {
                    const media = mediaAssets.find(m => m.id === selectedSurface.mediaId);
                    if (media?.type === "text") {
                        return (
                            <div className="bg-zinc-950/50 border border-white/5 rounded p-3">
                                <div className="flex items-center justify-between mb-4 border-b border-white/5 pb-2">
                                    <h3 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Text Properties</h3>
                                    <Type className="w-3 h-3 text-zinc-500" />
                                </div>

                                {/* Text Content */}
                                <div className="mb-4">
                                    <textarea
                                        value={media.text || ""}
                                        onChange={(e) => updateMediaAsset(media.id, { text: e.target.value })}
                                        className="w-full bg-zinc-900 border border-white/10 rounded p-2 text-xs font-sans focus:outline-none focus:border-white/20 min-h-[60px] resize-y"
                                        placeholder="Enter text..."
                                    />
                                </div>

                                {/* Typography Controls */}
                                <div className="space-y-3">
                                    {/* Font & Style */}
                                    <div className="flex gap-2">
                                        <select
                                            value={media.fontFamily || "sans-serif"}
                                            onChange={(e) => updateMediaAsset(media.id, { fontFamily: e.target.value })}
                                            className="flex-1 bg-zinc-900 border border-white/10 rounded px-2 py-1.5 text-xs focus:outline-none"
                                        >
                                            <option value="sans-serif">Sans Serif</option>
                                            <option value="serif">Serif</option>
                                            <option value="monospace">Monospace</option>
                                            <option value="Inter">Inter</option>
                                            <option value="Arial">Arial</option>
                                        </select>
                                        <button
                                            onClick={() => updateMediaAsset(media.id, { fontStyle: media.fontStyle === "italic" ? "normal" : "italic" })}
                                            className={`p-1.5 rounded border ${media.fontStyle === "italic" ? "bg-zinc-800 border-white/20 text-white" : "border-white/5 text-zinc-500 hover:text-zinc-300"}`}
                                        >
                                            <Italic className="w-3.5 h-3.5" />
                                        </button>
                                    </div>

                                    {/* Weight & Size */}
                                    <div className="flex gap-2">
                                        <select
                                            value={media.fontWeight || "normal"}
                                            onChange={(e) => updateMediaAsset(media.id, { fontWeight: e.target.value })}
                                            className="flex-1 bg-zinc-900 border border-white/10 rounded px-2 py-1.5 text-xs focus:outline-none"
                                        >
                                            <option value="light">Light</option>
                                            <option value="normal">Regular</option>
                                            <option value="bold">Bold</option>
                                        </select>
                                        <div className="flex items-center gap-1 bg-zinc-900 border border-white/10 rounded px-2 w-20">
                                            <span className="text-[9px] text-zinc-600 font-bold">px</span>
                                            <input
                                                type="number"
                                                value={media.fontSize || 80}
                                                onChange={(e) => updateMediaAsset(media.id, { fontSize: parseInt(e.target.value) || 12 })}
                                                className="w-full bg-transparent border-none text-xs text-right focus:outline-none py-1"
                                            />
                                        </div>
                                    </div>

                                    {/* Line Height & Spacing */}
                                    <div className="grid grid-cols-2 gap-2">
                                        <div className="flex items-center gap-2 bg-zinc-900 border border-white/10 rounded px-2">
                                            <span className="text-[10px] text-zinc-500">↕</span>
                                            <input
                                                type="number"
                                                step="0.1"
                                                value={media.lineHeight || 1.2}
                                                onChange={(e) => updateMediaAsset(media.id, { lineHeight: parseFloat(e.target.value) || 1.2 })}
                                                className="w-full bg-transparent border-none text-xs text-right focus:outline-none py-1.5"
                                            />
                                        </div>
                                        <div className="flex items-center gap-2 bg-zinc-900 border border-white/10 rounded px-2">
                                            <span className="text-[10px] text-zinc-500">↔</span>
                                            <input
                                                type="number"
                                                value={media.letterSpacing || 0}
                                                onChange={(e) => updateMediaAsset(media.id, { letterSpacing: parseInt(e.target.value) || 0 })}
                                                className="w-full bg-transparent border-none text-xs text-right focus:outline-none py-1.5"
                                            />
                                        </div>
                                    </div>

                                    {/* Alignment & Color */}
                                    <div className="flex gap-2">
                                        <div className="flex bg-zinc-900 border border-white/10 rounded p-0.5">
                                            {[
                                                { align: "left", Icon: AlignLeft },
                                                { align: "center", Icon: AlignCenter },
                                                { align: "right", Icon: AlignRight },
                                            ].map(({ align, Icon }) => (
                                                <button
                                                    key={align}
                                                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                                    onClick={() => updateMediaAsset(media.id, { textAlign: align as any })}
                                                    className={`p-1.5 rounded-sm ${media.textAlign === align ? "bg-zinc-800 text-white shadow-sm" : "text-zinc-500 hover:text-zinc-300"}`}
                                                >
                                                    <Icon className="w-3.5 h-3.5" />
                                                </button>
                                            ))}
                                        </div>
                                        <div className="flex-1 flex items-center gap-2 bg-zinc-900 border border-white/10 rounded px-2">
                                            <div
                                                className="w-4 h-4 rounded-sm border border-white/10 shadow-sm"
                                                style={{ backgroundColor: media.textColor || "#ffffff" }}
                                            />
                                            <input
                                                type="text"
                                                value={media.textColor || "#ffffff"}
                                                onChange={(e) => updateMediaAsset(media.id, { textColor: e.target.value })}
                                                className="flex-1 bg-transparent border-none text-xs font-mono focus:outline-none py-1.5"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    }
                    return null;
                })()}

                {/* Appearance Deck */}
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <h3 className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest">Appearance</h3>
                        <div className="h-px bg-white/5 flex-1 ml-3" />
                    </div>

                    <div className="flex gap-4 justify-center">
                        <RotaryKnob
                            label="Opacity"
                            value={selectedSurface.opacity}
                            min={0}
                            max={1}
                            step={0.01}
                            color="#b400ff"
                            defaultValue={1}
                            formatValue={(v) => `${Math.round(v * 100)}%`}
                            onChange={(val) => updateSurface(selectedSurface.id, { opacity: val })}
                        />

                        <div className="flex-1 flex flex-col justify-end gap-2">
                            <div>
                                <label className="text-[9px] text-zinc-600 font-bold uppercase mb-1 block">Blend Mode</label>
                                <select
                                    value={selectedSurface.blendMode}
                                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                    onChange={(e) => updateSurface(selectedSurface.id, { blendMode: e.target.value as any })}
                                    className="w-full bg-zinc-900 border border-white/10 rounded px-2 py-1 text-xs focus:outline-none focus:border-electric-purple"
                                >
                                    <option value="normal">Normal</option>
                                    <option value="multiply">Multiply</option>
                                    <option value="screen">Screen</option>
                                    <option value="overlay">Overlay</option>
                                    <option value="additive">Additive</option>
                                </select>
                            </div>
                            <div>
                                <label className="text-[9px] text-zinc-600 font-bold uppercase mb-1 block">Layer Order</label>
                                <input
                                    type="number"
                                    value={selectedSurface.zIndex}
                                    onChange={(e) => updateSurface(selectedSurface.id, { zIndex: parseInt(e.target.value) || 0 })}
                                    className="w-full bg-zinc-900 border border-white/10 rounded px-2 py-1 text-xs font-mono focus:outline-none focus:border-electric-purple"
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Global Composition Source Toggle */}
                <div className="pt-2 border-t border-white/5 space-y-2">
                    <label className="flex items-center justify-between text-[11px] text-zinc-400 group cursor-pointer p-1 rounded hover:bg-white/5 transition-colors">
                        <div className="flex items-center gap-2">
                            <Layers className="w-3 h-3 group-hover:text-electric-cyan transition-colors" />
                            <span>Use Mixed Composition</span>
                        </div>
                        <button
                            onClick={() => updateSurface(selectedSurface.id, { useComposition: !selectedSurface.useComposition })}
                            className={`w-8 h-4 rounded-full transition-all relative ${selectedSurface.useComposition ? 'bg-electric-cyan/30' : 'bg-zinc-800'}`}
                        >
                            <div className={`absolute top-0.5 w-3 h-3 rounded-full transition-all ${selectedSurface.useComposition ? 'right-0.5 bg-electric-cyan' : 'left-0.5 bg-zinc-500'}`} />
                        </button>
                    </label>
                    <p className="text-[10px] text-zinc-500 leading-relaxed italic px-1">
                        Override individual media with the global layer mix.
                    </p>

                    {selectedSurface.useComposition && (
                        <div className="pt-2 animate-in fade-in slide-in-from-top-1 duration-200">
                            <label className="text-[9px] text-zinc-600 font-bold uppercase mb-2 block px-1">Mapping Mode</label>
                            <div className="flex bg-zinc-900 border border-white/10 rounded p-0.5">
                                {[
                                    { id: "local", label: "Repeat (Local)", desc: "Each surface shows full mix" },
                                    { id: "global", label: "Continue (Global)", desc: "Surfaces slice the mix" }
                                ].map((mode) => (
                                    <button
                                        key={mode.id}
                                        onClick={() => updateSurface(selectedSurface.id, {
                                            compositionMapping: mode.id as "local" | "global"
                                        })}
                                        className={`flex-1 py-1.5 px-2 text-[10px] font-medium transition-all rounded-sm ${(selectedSurface.compositionMapping || "local") === mode.id
                                            ? "bg-zinc-800 text-white shadow-sm"
                                            : "text-zinc-500 hover:text-zinc-300 hover:bg-white/5"
                                            }`}
                                        title={mode.desc}
                                    >
                                        {mode.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Mesh Warp Settings (only visible when mesh warp tool is active) */}
                {toolMode === "mesh-warp" && selectedSurface.meshWarp && (
                    <div className="border-t border-white/5 pt-4">
                        <div className="px-2 py-2 bg-electric-cyan/5 border border-electric-cyan/20 rounded">
                            <div className="flex items-center justify-between mb-2">
                                <label className="text-[9px] text-electric-cyan font-bold uppercase">Grid Density</label>
                                <span className="text-[9px] text-electric-cyan/70 font-mono">{selectedSurface.meshWarp.gridSize} x {selectedSurface.meshWarp.gridSize}</span>
                            </div>
                            <input
                                type="range"
                                min="2"
                                max="10"
                                step="1"
                                value={selectedSurface.meshWarp.gridSize}
                                onChange={(e) => {
                                    initializeMeshWarp(selectedSurface.id, parseInt(e.target.value));
                                }}
                                className="w-full h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-electric-cyan"
                            />
                            <button
                                onClick={() => {
                                    updateSurface(selectedSurface.id, { meshWarp: null });
                                    setToolMode("select");
                                }}
                                className="mt-2 w-full py-1 text-[9px] text-red-400 hover:text-red-300 border border-red-500/20 hover:bg-red-500/10 rounded"
                            >
                                Reset / Remove Warp
                            </button>
                        </div>
                    </div>
                )}

                {/* Border & Glow Deck */}
                <div className="bg-zinc-900/30 border border-white/5 rounded-lg overflow-hidden">
                    <div className="flex items-center justify-between p-3 border-b border-white/5 pb-2">
                        <div className="flex items-center gap-2">
                            <h3 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Border & Glow</h3>
                            <button
                                onClick={() => updateSurface(selectedSurface.id, {
                                    border: {
                                        ...selectedSurface.border || {
                                            color: "#00ff00",
                                            width: 2,
                                            opacity: 1,
                                            glow: 0.5,
                                            style: "solid",
                                            animation: "none",
                                            animationSpeed: 1
                                        },
                                        enabled: !selectedSurface.border?.enabled
                                    }
                                })}
                                className={`w-8 h-4 rounded-full relative transition-colors ${selectedSurface.border?.enabled ? "bg-electric-cyan" : "bg-zinc-800"}`}
                            >
                                <div className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-transform ${selectedSurface.border?.enabled ? "left-4.5 translate-x-1" : "left-0.5"}`} />
                            </button>
                        </div>
                        <div className={`w-2 h-2 rounded-full transition-shadow ${selectedSurface.border?.enabled ? "bg-electric-cyan shadow-[0_0_5px_rgba(0,240,255,0.5)]" : "bg-zinc-800"}`}></div>
                    </div>

                    {selectedSurface.border?.enabled && (
                        <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
                            {/* Color Picker */}
                            <div className="flex items-center justify-between">
                                <label className="text-[9px] text-zinc-500 font-bold uppercase">Color</label>
                                <div className="flex items-center gap-2">
                                    <div
                                        className="w-4 h-4 rounded-sm border border-white/10 shadow-sm"
                                        style={{ backgroundColor: selectedSurface.border.color }}
                                    />
                                    <input
                                        type="color"
                                        value={selectedSurface.border.color}
                                        onChange={(e) => updateSurface(selectedSurface.id, {
                                            border: { ...selectedSurface.border!, color: e.target.value }
                                        })}
                                        className="w-8 h-6 bg-transparent border-none p-0 cursor-pointer"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <RotaryKnob
                                    label="Width"
                                    value={selectedSurface.border.width}
                                    min={1}
                                    max={20}
                                    step={0.5}
                                    color={selectedSurface.border.color}
                                    defaultValue={2}
                                    onChange={(val) => updateSurface(selectedSurface.id, {
                                        border: { ...selectedSurface.border!, width: val }
                                    })}
                                />
                                <RotaryKnob
                                    label="Opacity"
                                    value={selectedSurface.border.opacity}
                                    min={0}
                                    max={1}
                                    step={0.05}
                                    color={selectedSurface.border.color}
                                    defaultValue={1}
                                    formatValue={(v) => `${Math.round(v * 100)}%`}
                                    onChange={(val) => updateSurface(selectedSurface.id, {
                                        border: { ...selectedSurface.border!, opacity: val }
                                    })}
                                />
                            </div>

                            <div className="space-y-1">
                                <div className="flex items-center justify-between">
                                    <label className="text-[9px] text-zinc-500 font-bold uppercase">Glow Intensity</label>
                                    <span className="text-[9px] text-zinc-400 font-mono">{(selectedSurface.border.glow * 100).toFixed(0)}%</span>
                                </div>
                                <input
                                    type="range"
                                    min="0"
                                    max="2"
                                    step="0.1"
                                    value={selectedSurface.border.glow}
                                    onChange={(e) => updateSurface(selectedSurface.id, {
                                        border: { ...selectedSurface.border!, glow: parseFloat(e.target.value) }
                                    })}
                                    className="w-full h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-electric-cyan"
                                />
                            </div>

                            {/* Border Style */}
                            <div className="space-y-1">
                                <label className="text-[9px] text-zinc-500 font-bold uppercase">Style</label>
                                <div className="flex bg-zinc-900 border border-white/10 rounded p-0.5">
                                    {["solid", "dashed", "dotted"].map((style) => (
                                        <button
                                            key={style}
                                            onClick={() => updateSurface(selectedSurface.id, {
                                                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                                border: { ...selectedSurface.border!, style: style as any }
                                            })}
                                            className={`flex-1 py-1 text-[10px] uppercase rounded-sm transition-all ${selectedSurface.border!.style === style ? "bg-zinc-800 text-white shadow-sm" : "text-zinc-500 hover:text-zinc-300"}`}
                                        >
                                            {style}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Animation Type */}
                            <div className="space-y-1">
                                <label className="text-[9px] text-zinc-500 font-bold uppercase">Animation</label>
                                <select
                                    value={selectedSurface.border.animation || "none"}
                                    onChange={(e) => updateSurface(selectedSurface.id, {
                                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                        border: { ...selectedSurface.border!, animation: e.target.value as any }
                                    })}
                                    className="w-full bg-zinc-900 border border-white/10 rounded px-2 py-1.5 text-xs focus:outline-none"
                                >
                                    <option value="none">None</option>
                                    <option value="march">Marching Ants</option>
                                    <option value="pulse">Pulse Width</option>
                                    <option value="breathe">Breathe Opacity</option>
                                    <option value="flicker">Flicker</option>
                                </select>
                            </div>

                            {/* Animation Speed */}
                            {selectedSurface.border.animation !== "none" && (
                                <div className="space-y-1 animate-in fade-in slide-in-from-top-1">
                                    <div className="flex items-center justify-between">
                                        <label className="text-[9px] text-zinc-500 font-bold uppercase">Speed</label>
                                        <span className="text-[9px] text-zinc-400 font-mono">{selectedSurface.border.animationSpeed?.toFixed(1) || 1.0}x</span>
                                    </div>
                                    <input
                                        type="range"
                                        min="0.1"
                                        max="5"
                                        step="0.1"
                                        value={selectedSurface.border.animationSpeed || 1}
                                        onChange={(e) => updateSurface(selectedSurface.id, {
                                            border: { ...selectedSurface.border!, animationSpeed: parseFloat(e.target.value) }
                                        })}
                                        className="w-full h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-electric-cyan"
                                    />
                                </div>
                            )}

                        </div>
                    )}
                </div>

                <EdgeBlendingControls surfaceId={selectedSurface.id} />
                <div data-tour="effects-panel">
                    <EffectsPanel />
                </div>
                <div data-tour="audio-panel">
                    <AudioMappingPanel />
                </div>
            </div>

            {/* Global Master Controls */}
            <div className="border-t border-white/10">
                <MasterControls />
            </div>
        </aside >
    );
}
