"use client";

import { useProjectStore } from "@/store/project-store";
import { useUIStore } from "@/store/ui-store"; // Added import
import { EffectsPanel } from "./EffectsPanel";
import { AudioReactivity } from "./AudioReactivity";
import { EdgeBlendingControls } from "./EdgeBlendingControls";
import { Trash2, Copy, Eye, Settings2, Plus, Minus, RotateCcw, Type, Bold, Italic, AlignLeft, AlignCenter, AlignRight, AlignJustify, Upload, AlignStartHorizontal, AlignCenterHorizontal, AlignEndHorizontal, AlignStartVertical, AlignCenterVertical, AlignEndVertical, Link2 } from "lucide-react";
import { MasterControls } from "./MasterControls";
import { RotaryKnob } from "@/components/ui/RotaryKnob";
import { processFile } from "@/lib/media-utils";
import { useRef } from "react";
import { generateId } from "@/lib/utils";

export function SurfaceProperties() {
    const surfaces = useProjectStore((state) => state.surfaces);
    const mediaAssets = useProjectStore((state) => state.mediaAssets);
    const selectedIds = useProjectStore((state) => state.selectedSurfaceIds);
    const updateSurface = useProjectStore((state) => state.updateSurface);
    const updateMediaAsset = useProjectStore((state) => state.updateMediaAsset);
    const deleteSurface = useProjectStore((state) => state.deleteSurface);
    const duplicateSurface = useProjectStore((state) => state.duplicateSurface);
    const addCorner = useProjectStore((state) => state.addCorner);
    const removeCorner = useProjectStore((state) => state.removeCorner);
    const resetCorners = useProjectStore((state) => state.resetCorners);
    const addMediaAsset = useProjectStore((state) => state.addMediaAsset);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file && selectedSurface) {
            const mediaId = await processFile(file, addMediaAsset);
            updateSurface(selectedSurface.id, { mediaId });
        }
    };

    const selectedSurface = surfaces.find((s) => selectedIds.includes(s.id));

    if (!selectedSurface) {
        return (
            <aside className="w-80 h-full bg-zinc-900 border-l border-white/5 flex flex-col">
                <div className="px-4 py-3 border-b border-white/5 bg-zinc-900">
                    <h2 className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Properties</h2>
                </div>
                <div className="flex-1 p-4 flex items-center justify-center">
                    <div className="text-center">
                        <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-zinc-800 flex items-center justify-center">
                            <Eye className="w-6 h-6 text-zinc-600" />
                        </div>
                        <p className="text-sm text-zinc-500">No surface selected</p>
                        <p className="text-xs text-zinc-600 mt-1">
                            Click a surface to edit properties
                        </p>
                    </div>
                </div>
            </aside>
        );
    }

    return (
        <aside className="w-80 h-full bg-zinc-900 border-l border-white/5 flex flex-col font-sans">
            <div className="px-4 py-3 border-b border-white/5 bg-zinc-900">
                <h2 className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Properties</h2>
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
                                    let webcamAsset = mediaAssets.find(a => a.type === "webcam");
                                    if (!webcamAsset) {
                                        const newId = generateId();
                                        addMediaAsset({
                                            id: newId,
                                            name: "Webcam Input",
                                            type: "webcam",
                                        });
                                        updateSurface(selectedSurface.id, { mediaId: newId });
                                    } else {
                                        updateSurface(selectedSurface.id, { mediaId: webcamAsset.id });
                                    }
                                } else {
                                    updateSurface(selectedSurface.id, {
                                        mediaId: val || null
                                    });
                                }
                            }}
                            className="flex-1 px-3 py-2 bg-dark-800 border border-white/10 rounded-md text-sm focus:outline-none focus:border-electric-cyan"
                        >
                            <option value="">None</option>
                            <option value="webcam-builtin">📷 Webcam</option>
                            <optgroup label="Assets">
                                {mediaAssets
                                    .filter((asset) => asset.type !== "shader" && asset.type !== "webcam")
                                    .map((asset) => (
                                        <option key={asset.id} value={asset.id}>
                                            {asset.type === "image" && "🖼️ "}
                                            {asset.type === "video" && "🎬 "}
                                            {asset.type === "color" && "🎨 "}
                                            {asset.type === "text" && "📝 "}
                                            {asset.name}
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

                {/* Fit to Media */}
                <button
                    onClick={() => {
                        const media = mediaAssets.find(m => m.id === selectedSurface.mediaId);
                        if (media && media.width && media.height) {
                            const aspect = media.width / media.height;
                            let nextScaleX = 1;
                            let nextScaleY = 1;

                            if (aspect >= 1) {
                                // Landscape or square
                                nextScaleX = aspect;
                                nextScaleY = 1;
                            } else {
                                // Portrait
                                nextScaleX = 1;
                                nextScaleY = 1 / aspect;
                            }

                            updateSurface(selectedSurface.id, {
                                scale: { x: nextScaleX, y: nextScaleY }
                            });
                        }
                    }}
                    disabled={!selectedSurface.mediaId}
                    className="w-full px-3 py-2 text-xs glass glass-hover rounded-md flex items-center justify-center gap-2 disabled:opacity-30"
                >
                    <Settings2 className="w-3 h-3" />
                    Fit to Media
                </button>

                {/* Transform Deck */}
                <div className="bg-zinc-950/50 border border-white/5 rounded p-3">
                    <div className="flex items-center justify-between mb-4 border-b border-white/5 pb-2">
                        <h3 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Transformation</h3>
                        <div className="w-2 h-2 rounded-full bg-electric-cyan shadow-[0_0_5px_rgba(0,240,255,0.5)]"></div>
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
                                formatValue={(v) => `${Math.round(v * (180 / Math.PI))}°`}
                                onChange={(val) => updateSurface(selectedSurface.id, { rotation: val })}
                            />
                        </div>
                    </div>

                    <div className="mt-4 space-y-3 border-t border-white/5 pt-4">
                        {/* Horizontal Alignment */}
                        <div className="grid grid-cols-3 gap-1 bg-zinc-900/50 border border-white/5 rounded p-0.5">
                            <button
                                onClick={() => {
                                    const canvasW = useProjectStore.getState().projectSettings.resolution.width / 100;
                                    updateSurface(selectedSurface.id, { position: { ...selectedSurface.position, x: -(canvasW / 2) + (selectedSurface.scale.x / 2) } });
                                }}
                                className="p-1.5 rounded hover:bg-white/5 text-zinc-500 hover:text-electric-cyan transition-all flex items-center justify-center"
                                title="Align Left"
                            >
                                <AlignStartHorizontal className="w-3.5 h-3.5" />
                            </button>
                            <button
                                onClick={() => updateSurface(selectedSurface.id, { position: { ...selectedSurface.position, x: 0 } })}
                                className="p-1.5 rounded hover:bg-white/5 text-zinc-500 hover:text-electric-cyan transition-all flex items-center justify-center"
                                title="Align Center"
                            >
                                <AlignCenterHorizontal className="w-3.5 h-3.5" />
                            </button>
                            <button
                                onClick={() => {
                                    const canvasW = useProjectStore.getState().projectSettings.resolution.width / 100;
                                    updateSurface(selectedSurface.id, { position: { ...selectedSurface.position, x: (canvasW / 2) - (selectedSurface.scale.x / 2) } });
                                }}
                                className="p-1.5 rounded hover:bg-white/5 text-zinc-500 hover:text-electric-cyan transition-all flex items-center justify-center"
                                title="Align Right"
                            >
                                <AlignEndHorizontal className="w-3.5 h-3.5" />
                            </button>
                        </div>

                        {/* Vertical Alignment */}
                        <div className="grid grid-cols-3 gap-1 bg-zinc-900/50 border border-white/5 rounded p-0.5">
                            <button
                                onClick={() => {
                                    const canvasH = useProjectStore.getState().projectSettings.resolution.height / 100;
                                    updateSurface(selectedSurface.id, { position: { ...selectedSurface.position, y: (canvasH / 2) - (selectedSurface.scale.y / 2) } });
                                }}
                                className="p-1.5 rounded hover:bg-white/5 text-zinc-500 hover:text-electric-cyan transition-all flex items-center justify-center"
                                title="Align Top"
                            >
                                <AlignStartVertical className="w-3.5 h-3.5" />
                            </button>
                            <button
                                onClick={() => updateSurface(selectedSurface.id, { position: { ...selectedSurface.position, y: 0 } })}
                                className="p-1.5 rounded hover:bg-white/5 text-zinc-500 hover:text-electric-cyan transition-all flex items-center justify-center"
                                title="Align Middle"
                            >
                                <AlignCenterVertical className="w-3.5 h-3.5" />
                            </button>
                            <button
                                onClick={() => {
                                    const canvasH = useProjectStore.getState().projectSettings.resolution.height / 100;
                                    updateSurface(selectedSurface.id, { position: { ...selectedSurface.position, y: -(canvasH / 2) + (selectedSurface.scale.y / 2) } });
                                }}
                                className="p-1.5 rounded hover:bg-white/5 text-zinc-500 hover:text-electric-cyan transition-all flex items-center justify-center"
                                title="Align Bottom"
                            >
                                <AlignEndVertical className="w-3.5 h-3.5" />
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
                <div className="bg-zinc-950/50 border border-white/5 rounded p-3">
                    <div className="flex items-center justify-between mb-4 border-b border-white/5 pb-2">
                        <h3 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Appearance</h3>
                        <div className="w-2 h-2 rounded-full bg-electric-purple shadow-[0_0_5px_rgba(180,0,255,0.5)]"></div>
                    </div>

                    <div className="flex gap-4 justify-center">
                        <RotaryKnob
                            label="Opacity"
                            value={selectedSurface.opacity}
                            min={0}
                            max={1}
                            step={0.01}
                            color="#b400ff"
                            formatValue={(v) => `${Math.round(v * 100)}%`}
                            onChange={(val) => updateSurface(selectedSurface.id, { opacity: val })}
                        />

                        <div className="flex-1 flex flex-col justify-end gap-2">
                            <div>
                                <label className="text-[9px] text-zinc-600 font-bold uppercase mb-1 block">Blend Mode</label>
                                <select
                                    value={selectedSurface.blendMode}
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
                {/* Blend Mode */}
                {/* Polygon Mapping */}
                <div className="border-t border-white/5 pt-4">
                    <div className="flex items-center justify-between mb-3">
                        <h3 className="text-sm font-semibold">Polygon Mapping</h3>
                        <div className="flex gap-1">
                            <button
                                onClick={() => {
                                    const sumX = selectedSurface.corners.reduce((sum, p) => sum + p.x, 0);
                                    const sumY = selectedSurface.corners.reduce((sum, p) => sum + p.y, 0);
                                    const avgX = sumX / selectedSurface.corners.length;
                                    const avgY = sumY / selectedSurface.corners.length;
                                    addCorner(selectedSurface.id, selectedSurface.corners.length, { x: avgX, y: avgY });
                                }}
                                className="p-1.5 rounded bg-white/5 hover:bg-electric-purple/20 text-white/60 hover:text-electric-purple transition-all"
                                title="Add Corner"
                            >
                                <Plus className="w-3.5 h-3.5" />
                            </button>
                            <button
                                onClick={() => removeCorner(selectedSurface.id, selectedSurface.corners.length - 1)}
                                disabled={selectedSurface.corners.length <= 3}
                                className="p-1.5 rounded bg-white/5 hover:bg-red-500/20 text-white/60 hover:text-red-500 transition-all disabled:opacity-30 disabled:hover:bg-white/5"
                                title="Remove Last Corner"
                            >
                                <Minus className="w-3.5 h-3.5" />
                            </button>
                            <button
                                onClick={() => resetCorners(selectedSurface.id)}
                                className="p-1.5 rounded bg-white/5 hover:bg-electric-cyan/20 text-white/60 hover:text-electric-cyan transition-all"
                                title="Reset to Quad"
                            >
                                <RotateCcw className="w-3.5 h-3.5" />
                            </button>
                        </div>
                    </div>

                    <div className="space-y-2 max-h-40 overflow-y-auto pr-1 custom-scrollbar">
                        {selectedSurface.corners.map((corner, idx) => (
                            <div key={idx} className="flex items-center gap-2 group">
                                <span className="text-[10px] text-muted-foreground w-4 font-mono">{idx}</span>
                                <div className="grid grid-cols-2 gap-2 flex-1">
                                    <div className="flex items-center gap-1.5 px-2 py-1 bg-dark-800 border border-white/5 rounded">
                                        <span className="text-[10px] text-white/30 font-mono">X</span>
                                        <input
                                            type="number"
                                            value={corner.x.toFixed(3)}
                                            onChange={(e) => {
                                                const val = parseFloat(e.target.value) || 0;
                                                const newCorners = [...selectedSurface.corners];
                                                newCorners[idx] = { ...newCorners[idx], x: val };
                                                updateSurface(selectedSurface.id, { corners: newCorners });
                                            }}
                                            step="0.001"
                                            className="w-full bg-transparent border-none text-[10px] font-mono focus:outline-none p-0"
                                        />
                                    </div>
                                    <div className="flex items-center gap-1.5 px-2 py-1 bg-dark-800 border border-white/5 rounded">
                                        <span className="text-[10px] text-white/30 font-mono">Y</span>
                                        <input
                                            type="number"
                                            value={corner.y.toFixed(3)}
                                            onChange={(e) => {
                                                const val = parseFloat(e.target.value) || 0;
                                                const newCorners = [...selectedSurface.corners];
                                                newCorners[idx] = { ...newCorners[idx], y: val };
                                                updateSurface(selectedSurface.id, { corners: newCorners });
                                            }}
                                            step="0.001"
                                            className="w-full bg-transparent border-none text-[10px] font-mono focus:outline-none p-0"
                                        />
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <EdgeBlendingControls surfaceId={selectedSurface.id} />
                <EffectsPanel />
                <AudioReactivity />
            </div>

            {/* Global Master Controls */}
            <div className="border-t border-white/10">
                <MasterControls />
            </div>
        </aside >
    );
}
