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
    addMediaAsset: (asset: MediaAsset) => string
): Promise<string> => {
    const thumbnail = await generateThumbnail(file);
    const mediaId = generateId();
    const url = URL.createObjectURL(file);

    const assetData: any = {
        id: mediaId,
        name: file.name,
        size: file.size,
        thumbnail,
        url,
    };

    return new Promise((resolve, reject) => {
        if (file.type.startsWith("image/")) {
            const img = new window.Image();
            img.onload = async () => {
                const finalId = addMediaAsset({
                    ...assetData,
                    type: "image",
                    width: img.naturalWidth,
                    height: img.naturalHeight,
                });

                // Always ensure blob is in DB, even if asset metadata was a duplicate.
                // Use .put() instead of .add() to refresh/repair the blob.
                try {
                    await db.files.put({
                        id: finalId,
                        blob: file,
                        timestamp: Date.now()
                    });

                    // If it was a duplicate, update its URL in the store to the new valid blob URL
                    if (finalId !== mediaId) {
                        const { useProjectStore } = await import("@/store/project-store");
                        useProjectStore.getState().updateMediaAsset(finalId, { url });
                    }
                } catch (error: any) {
                    console.error("Failed to store file in DB:", error);
                    if (error.name === 'QuotaExceededError' || error.message?.includes('quota')) {
                        const { useToastStore } = await import("@/store/toast-store");
                        useToastStore.getState().addToast(
                            "Storage quota exceeded! Please clear site data in your browser or delete some assets.",
                            "error",
                            10000
                        );
                        throw new Error('Storage quota exceeded');
                    }
                    throw error;
                }

                resolve(finalId);
            };
            img.onerror = () => reject(new Error("Image load failed"));
            img.src = url;
        } else if (file.type.startsWith("video/")) {
            const video = document.createElement("video");

            // Timeout to prevent hanging on large/corrupt files
            const metadataPromise = new Promise<{ width: number, height: number, duration: number }>((resolveMetadata, rejectMetadata) => {
                let resolved = false;

                const safeResolve = (data: { width: number, height: number, duration: number }) => {
                    if (!resolved) {
                        resolved = true;
                        resolveMetadata(data);
                    }
                };

                const safeReject = (error: Error) => {
                    if (!resolved) {
                        resolved = true;
                        rejectMetadata(error);
                    }
                };

                const timeoutId = setTimeout(() => {
                    console.warn(`Video metadata detection timed out for ${file.name}`);
                    safeReject(new Error(`Video codec validation timed out. This file may use an unsupported codec.`));
                }, 3000); // 3 second timeout

                video.onloadedmetadata = () => {
                    clearTimeout(timeoutId);
                    // Check if video dimensions are valid (codec is supported)
                    if (video.videoWidth > 0 && video.videoHeight > 0) {
                        safeResolve({
                            width: video.videoWidth,
                            height: video.videoHeight,
                            duration: video.duration || 10
                        });
                    } else {
                        safeReject(new Error(`Video codec not supported. Please convert to H.264/MP4 format.`));
                    }
                };

                video.onerror = (e: Event | string) => {
                    clearTimeout(timeoutId);
                    const mediaError = e instanceof Event ? (e.target as HTMLVideoElement)?.error : null;
                    let errorMsg = `Video codec not supported`;
                    
                    if (mediaError) {
                        switch (mediaError.code) {
                            case 4: // MEDIA_ERR_SRC_NOT_SUPPORTED
                                errorMsg = `Video codec not supported. This file likely uses ProRes, DNxHD, or another professional codec. Please convert to H.264/MP4 format using FFmpeg, HandBrake, or Adobe Media Encoder.`;
                                break;
                            case 3: // MEDIA_ERR_DECODE
                                errorMsg = `Video decode error. The codec may not be supported by your browser.`;
                                break;
                            case 2: // MEDIA_ERR_NETWORK
                                errorMsg = `Network error loading video.`;
                                break;
                            case 1: // MEDIA_ERR_ABORTED
                                errorMsg = `Video loading was aborted.`;
                                break;
                        }
                    }
                    
                    console.error(`Video load error for ${file.name}:`, mediaError);
                    safeReject(new Error(errorMsg));
                };

                video.src = url;
            });

            metadataPromise
                .then(async (metadata) => {
                    const finalId = addMediaAsset({
                        ...assetData,
                        type: "video",
                        width: metadata.width,
                        height: metadata.height,
                        duration: metadata.duration,
                    });

                    // Always ensure blob is in DB, even if asset metadata was a duplicate.
                    // Use .put() instead of .add() to refresh/repair the blob.
                    try {
                        await db.files.put({
                            id: finalId,
                            blob: file,
                            timestamp: Date.now()
                        });

                        // If it was a duplicate, update its URL in the store to the new valid blob URL
                        if (finalId !== mediaId) {
                            const { useProjectStore } = await import("@/store/project-store");
                            useProjectStore.getState().updateMediaAsset(finalId, { url });
                        }
                    } catch (error: any) {
                        console.error("Failed to store file in DB:", error);
                        if (error.name === 'QuotaExceededError' || error.message?.includes('quota')) {
                            const { useToastStore } = await import("@/store/toast-store");
                            useToastStore.getState().addToast(
                                "Storage quota exceeded! Your browser has run out of space. Try clearing site data or deleting old assets.",
                                "error",
                                10000
                            );
                            throw new Error('Storage quota exceeded');
                        }
                        throw error;
                    }

                    video.remove();
                    resolve(finalId);
                })
                .catch((error) => {
                    video.remove();
                    URL.revokeObjectURL(url);
                    reject(error);
                });
        }
    });
};
