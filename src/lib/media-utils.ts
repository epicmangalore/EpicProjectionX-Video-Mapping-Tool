"use client";

import { generateId } from "@/lib/utils";
import { MediaAsset } from "@/store/project-store";

export const generateThumbnail = (file: File): Promise<string> => {
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

export const processFile = async (
    file: File,
    addMediaAsset: (asset: MediaAsset) => void
): Promise<string> => {
    const thumbnail = await generateThumbnail(file);
    const mediaId = generateId();

    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (event) => {
            const url = event.target?.result as string;

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
                    video.remove();
                    resolve(mediaId);
                };
                video.src = url;
            }
        };
        reader.readAsDataURL(file);
    });
};
