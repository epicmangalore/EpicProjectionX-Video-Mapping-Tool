"use client";

import { generateId } from "@/lib/utils";
import { MediaAsset } from "@/store/project-store";

import { db } from "@/lib/db";

const MAX_THUMBNAIL_SIZE = 250 * 1024 * 1024; // 250MB
const THUMBNAIL_TIMEOUT = 5000; // 5 seconds

export const generateThumbnail = (file: File): Promise<string> => {
    return new Promise((resolve) => {
        if (file.type.startsWith("image/")) {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target?.result as string);
            reader.onerror = () => resolve("");
            reader.readAsDataURL(file);
        } else if (file.type.startsWith("video/")) {
            // Skip thumbnail for large video files to prevent crashes
            if (file.size > MAX_THUMBNAIL_SIZE) {
                console.warn(`Skipping thumbnail generation for heavy video: ${file.name} (${(file.size / 1024 / 1024).toFixed(2)}MB)`);
                resolve("");
                return;
            }

            const video = document.createElement("video");
            let isResolved = false;

            const cleanup = () => {
                if (video.src) {
                    URL.revokeObjectURL(video.src);
                    video.removeAttribute('src');
                }
                video.remove();
            };

            const safeResolve = (value: string) => {
                if (!isResolved) {
                    isResolved = true;
                    resolve(value);
                    cleanup();
                }
            };

            // Timeout safety
            const timeoutId = setTimeout(() => {
                if (!isResolved) {
                    console.warn("Thumbnail generation timed out for:", file.name);
                    safeResolve("");
                }
            }, THUMBNAIL_TIMEOUT);

            video.preload = "metadata";
            video.muted = true;
            video.playsInline = true;

            video.onloadedmetadata = () => {
                video.currentTime = 1; // Seek to 1 second
            };

            video.onseeked = () => {
                try {
                    const canvas = document.createElement("canvas");
                    canvas.width = 320;
                    canvas.height = 180;
                    const ctx = canvas.getContext("2d");
                    ctx?.drawImage(video, 0, 0, 320, 180);
                    const dataUrl = canvas.toDataURL("image/jpeg", 0.7);
                    clearTimeout(timeoutId);
                    safeResolve(dataUrl);
                } catch (e) {
                    console.warn("Failed to generate video thumbnail frame:", e);
                    clearTimeout(timeoutId);
                    safeResolve("");
                }
            };

            video.onerror = () => {
                console.warn("Video load error for thumbnail:", file.name);
                clearTimeout(timeoutId);
                safeResolve("");
            };

            try {
                video.src = URL.createObjectURL(file);
            } catch (e) {
                console.error("Failed to create object URL:", e);
                clearTimeout(timeoutId);
                safeResolve("");
            }
        } else {
            resolve("");
        }
    });
};

export const processFile = async (
    file: File,
    addMediaAsset: (asset: MediaAsset) => void
): Promise<string> => {
    const thumbnail = await generateThumbnail(file);
    const mediaId = generateId();

    // Store file in IndexedDB
    try {
        await db.files.add({
            id: mediaId,
            blob: file,
            timestamp: Date.now()
        });
    } catch (error) {
        console.error("Failed to store file in DB:", error);
    }

    const url = URL.createObjectURL(file);

    return new Promise((resolve) => {
        if (file.type.startsWith("image/")) {
            const img = new window.Image();
            img.onload = () => {
                addMediaAsset({
                    id: mediaId,
                    name: file.name,
                    type: "image",
                    url,
                    size: file.size,
                    thumbnail,
                    width: img.naturalWidth,
                    height: img.naturalHeight,
                });
                resolve(mediaId);
            };
            img.src = url;
        } else if (file.type.startsWith("video/")) {
            const video = document.createElement("video");
            video.onloadedmetadata = () => {
                addMediaAsset({
                    id: mediaId,
                    name: file.name,
                    type: "video",
                    url,
                    size: file.size,
                    thumbnail,
                    width: video.videoWidth,
                    height: video.videoHeight,
                    duration: video.duration,
                });
                video.remove(); // We don't revoke URL here as it's needed for the app
                resolve(mediaId);
            };
            video.src = url;
        }
    });
};
