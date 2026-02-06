"use client";

import { useRef } from "react";
import { useProjectStore } from "@/store/project-store";
import { generateId } from "@/lib/utils";
import { Image, Video, Palette, Type, Webcam } from "lucide-react";

export function MediaLibrary() {
    const mediaAssets = useProjectStore((state) => state.mediaAssets);
    const addMediaAsset = useProjectStore((state) => state.addMediaAsset);
    const addSurface = useProjectStore((state) => state.addSurface);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files) return;

        Array.from(files).forEach((file) => {
            const reader = new FileReader();
            reader.onload = (event) => {
                const url = event.target?.result as string;
                const mediaId = generateId();

                const asset = {
                    id: mediaId,
                    name: file.name,
                    type: file.type.startsWith("image/") ? ("image" as const) : ("video" as const),
                    url,
                    size: file.size,
                    thumbnail: url,
                };

                addMediaAsset(asset);
            };
            reader.readAsDataURL(file);
        });
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

    const handleAssetClick = (assetId: string) => {
        addSurface(assetId);
    };

    return (
        <aside className="w-80 glass border-r border-white/10 flex flex-col">
            <div className="p-4 border-b border-white/10">
                <h2 className="text-lg font-semibold text-electric-purple mb-3">Media Library</h2>

                {/* Action buttons */}
                <div className="grid grid-cols-2 gap-2">
                    <button
                        onClick={() => fileInputRef.current?.click()}
                        className="px-3 py-2 text-xs glass glass-hover rounded-md flex items-center justify-center gap-2"
                    >
                        <Image className="w-4 h-4" />
                        Import
                    </button>
                    <button
                        onClick={handleAddColor}
                        className="px-3 py-2 text-xs glass glass-hover rounded-md flex items-center justify-center gap-2"
                    >
                        <Palette className="w-4 h-4" />
                        Color
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

            {/* Asset grid */}
            <div className="flex-1 overflow-y-auto p-4">
                {mediaAssets.length === 0 ? (
                    <div className="text-center py-8">
                        <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-electric-purple/20 flex items-center justify-center">
                            <Image className="w-6 h-6 text-electric-purple" />
                        </div>
                        <p className="text-sm text-muted-foreground">No media assets yet</p>
                        <p className="text-xs text-muted-foreground mt-1">Import images or add colors</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-2 gap-3">
                        {mediaAssets.map((asset) => (
                            <button
                                key={asset.id}
                                onClick={() => handleAssetClick(asset.id)}
                                className="aspect-square rounded-lg glass glass-hover overflow-hidden group relative"
                            >
                                {asset.type === "color" && asset.color && (
                                    <div
                                        className="w-full h-full"
                                        style={{ backgroundColor: asset.color }}
                                    />
                                )}
                                {asset.type === "image" && asset.thumbnail && (
                                    <img
                                        src={asset.thumbnail}
                                        alt={asset.name}
                                        className="w-full h-full object-cover"
                                    />
                                )}
                                {asset.type === "video" && asset.thumbnail && (
                                    <div className="relative w-full h-full">
                                        <img
                                            src={asset.thumbnail}
                                            alt={asset.name}
                                            className="w-full h-full object-cover"
                                        />
                                        <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                                            <Video className="w-6 h-6 text-white" />
                                        </div>
                                    </div>
                                )}

                                {/* Hover overlay */}
                                <div className="absolute inset-0 bg-electric-purple/0 group-hover:bg-electric-purple/20 transition-colors flex items-end">
                                    <div className="w-full p-2 bg-gradient-to-t from-black/60 to-transparent">
                                        <p className="text-xs text-white truncate">{asset.name}</p>
                                    </div>
                                </div>
                            </button>
                        ))}
                    </div>
                )}
            </div>
        </aside>
    );
}
