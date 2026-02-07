"use client";

import { useRef, useState } from "react";
import { useProjectStore } from "@/store/project-store";
import { generateId } from "@/lib/utils";
import { Image, Video, Palette, Type, Webcam } from "lucide-react";

export function MediaLibrary() {
    const mediaAssets = useProjectStore((state) => state.mediaAssets);
    const addMediaAsset = useProjectStore((state) => state.addMediaAsset);
    const addSurface = useProjectStore((state) => state.addSurface);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const generateThumbnail = (file: File): Promise<string> => {
        return new Promise((resolve) => {
            if (file.type.startsWith("image/")) {
                const reader = new FileReader();
                reader.onload = (e) => resolve(e.target?.result as string);
                reader.readAsDataURL(file);
            } else if (file.type.startsWith("video/")) {
                const video = document.createElement("video");
                video.preload = "metadata";
                video.onloadedmetadata = () => {
                    video.currentTime = 1; // Seek to 1 second
                };
                video.onseeked = () => {
                    const canvas = document.createElement("canvas");
                    canvas.width = 320;
                    canvas.height = 180;
                    const ctx = canvas.getContext("2d");
                    ctx?.drawImage(video, 0, 0, 320, 180);
                    resolve(canvas.toDataURL("image/jpeg"));
                    video.remove(); // Cleanup
                };
                video.onerror = () => {
                    resolve(""); // Fallback or empty
                };
                video.src = URL.createObjectURL(file);
            } else {
                resolve("");
            }
        });
    };

    const processFiles = async (files: FileList | File[]) => {
        for (const file of Array.from(files)) {
            const thumbnail = await generateThumbnail(file);
            const mediaId = generateId();

            const reader = new FileReader();
            reader.onload = (event) => {
                const url = event.target?.result as string;

                const asset = {
                    id: mediaId,
                    name: file.name,
                    type: file.type.startsWith("image/") ? ("image" as const) : ("video" as const),
                    url,
                    size: file.size,
                    thumbnail,
                };

                addMediaAsset(asset);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            await processFiles(e.target.files);
        }
    };

    // Drag and Drop Handlers
    const [isDragging, setIsDragging] = useState(false);
    const dragCounter = useRef(0);

    const handleDragEnter = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        dragCounter.current++;
        if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
            setIsDragging(true);
        }
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        // console.log("Drag Over"); 
    };

    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        dragCounter.current--;
        if (dragCounter.current === 0) {
            setIsDragging(false);
        }
    };

    const handleDrop = async (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();

        setIsDragging(false);
        dragCounter.current = 0;

        const files = e.dataTransfer.files;

        if (files && files.length > 0) {
            await processFiles(files);
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

    const handleAssetClick = (assetId: string) => {
        addSurface(assetId);
    };

    return (
        <aside
            className="w-full h-full flex flex-col bg-transparent relative"
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
        >
            {/* Drag Overlay */}
            {isDragging && (
                <div className="absolute inset-0 z-50 bg-electric-purple/20 border-2 border-electric-purple border-dashed m-2 rounded-lg flex items-center justify-center backdrop-blur-sm pointer-events-none">
                    <div className="bg-zinc-900 p-4 rounded-xl shadow-xl flex flex-col items-center gap-2 animate-bounce">
                        <Image className="w-8 h-8 text-electric-purple" />
                        <p className="text-electric-purple font-bold">Drop Media Here</p>
                    </div>
                </div>
            )}

            <div className="p-4 border-b border-white/10">
                <h2 className="text-lg font-semibold text-electric-purple mb-3">Media Library</h2>

                {/* Action buttons */}
                <div className="grid grid-cols-2 gap-2">
                    <button
                        onClick={() => fileInputRef.current?.click()}
                        className="px-3 py-2 text-xs glass glass-hover rounded-md flex items-center justify-center gap-2 hover:bg-white/5 active:scale-95 transition-all"
                    >
                        <Image className="w-4 h-4" />
                        Import
                    </button>
                    <button
                        onClick={handleAddColor}
                        className="px-3 py-2 text-xs glass glass-hover rounded-md flex items-center justify-center gap-2 hover:bg-white/5 active:scale-95 transition-all"
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
            <div className="flex-1 overflow-y-auto p-4 content-start">
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
                                className="aspect-square rounded-lg glass glass-hover overflow-hidden group relative bg-neutral-900 border border-white/5 hover:border-electric-purple/50 transition-all"
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
                                        className="w-full h-full object-contain"
                                    />
                                )}
                                {asset.type === "video" && (
                                    <div className="relative w-full h-full flex items-center justify-center">
                                        {asset.thumbnail ? (
                                            <img
                                                src={asset.thumbnail}
                                                alt={asset.name}
                                                className="w-full h-full object-contain"
                                                onError={(e) => {
                                                    e.currentTarget.style.display = 'none';
                                                }}
                                            />
                                        ) : null}
                                        <div className="absolute inset-0 flex items-center justify-center bg-black/20 pointer-events-none">
                                            <Video className="w-8 h-8 text-white/80 drop-shadow-md" />
                                        </div>
                                    </div>
                                )}

                                {/* Hover overlay */}
                                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-100 transition-opacity flex items-end">
                                    <div className="w-full p-2">
                                        <p className="text-[10px] text-white/90 truncate font-medium leading-tight text-center">
                                            {asset.name}
                                        </p>
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
