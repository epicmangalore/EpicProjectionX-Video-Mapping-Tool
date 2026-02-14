"use client";

import { useMemo, useRef, useEffect, useState } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { useProjectStore } from "@/store/project-store";

/**
 * GlobalStageMixer renders a background media layer into a shared texture (window.compositionTexture).
 * This texture is used by surfaces with "Use Mixed Composition" enabled.
 */
export function GlobalStageMixer() {
    const gl = useThree((state) => state.gl);
    const projectSettings = useProjectStore((state) => state.projectSettings);
    const mediaAssets = useProjectStore((state) => state.mediaAssets);

    // Find the media asset selected for global composition
    const compositionMedia = useMemo(() => {
        if (!projectSettings.compositionMediaId) return null;
        return mediaAssets.find(a => a.id === projectSettings.compositionMediaId);
    }, [projectSettings.compositionMediaId, mediaAssets]);

    // Create a local video element/texture for the background
    const videoRef = useRef<HTMLVideoElement | null>(null);
    const textureRef = useRef<THREE.Texture | null>(null);
    const localUrl = useRef<string | undefined>(undefined);
    const [, forceUpdate] = useState({});

    // Proactive hydration logic
    useEffect(() => {
        if (!compositionMedia) {
            localUrl.current = undefined;
            forceUpdate({});
            return;
        }

        const url = compositionMedia.url;

        const hydrateFromDb = async () => {
            if (!compositionMedia.id) return;
            try {
                const { db } = await import("@/lib/db");
                const fileRecord = await db.files.get(compositionMedia.id);
                if (fileRecord?.blob) {
                    const localUrlVal = URL.createObjectURL(fileRecord.blob);
                    console.log("↺ Mixer: Hydrated local URL from IndexedDB:", compositionMedia.name);
                    localUrl.current = localUrlVal;
                    forceUpdate({});
                }
            } catch (err) {
                console.warn("Mixer: Proactive hydration failed", err);
            }
        };

        const checkAndHydrate = async () => {
            if (url?.startsWith("blob:")) {
                try {
                    const resp = await fetch(url, { method: 'HEAD' });
                    if (resp.ok) {
                        localUrl.current = url;
                        forceUpdate({});
                    } else {
                        await hydrateFromDb();
                    }
                } catch {
                    await hydrateFromDb();
                }
            } else {
                localUrl.current = url;
                forceUpdate({});
            }
        };

        checkAndHydrate();
    }, [compositionMedia?.id, compositionMedia?.url]);

    useEffect(() => {
        const urlToUse = localUrl.current;
        if (!compositionMedia || compositionMedia.type !== "video" || !urlToUse) {
            // Placeholder: Clear global texture if no video
            (window as any).compositionTexture = null;
            return;
        }

        const createCompositionVideo = () => {
            const video = document.createElement("video");
            video.src = urlToUse;
            video.crossOrigin = "anonymous";
            video.loop = true;
            video.muted = true;
            video.playsInline = true;
            video.autoplay = false;
            video.preload = "auto";

            const onCanPlay = () => {
                console.log("✓ Composition video can play");
                video.play().catch(e => console.warn("Global background video play failed:", e));
            };

            const onLoadedData = () => {
                console.log("✓ Composition video loaded data");
            };

            video.addEventListener("canplay", onCanPlay);
            video.addEventListener("loadeddata", onLoadedData);

            const texture = new THREE.VideoTexture(video);
            texture.minFilter = THREE.LinearFilter;
            texture.magFilter = THREE.LinearFilter;
            texture.format = THREE.RGBAFormat;
            texture.colorSpace = THREE.SRGBColorSpace;

            // Append to global container
            const container = (window as any).globalVideoContainer;
            if (container) {
                container.appendChild(video);
                console.log("✓ Composition video appended to global container");
            } else {
                console.warn("⚠ Global video container not found for composition video!");
            }

            video.load();

            // CRITICAL: Check readyState immediately in case it's already loaded/cached
            if (video.readyState >= 1) { // HAVE_METADATA
                console.log("→ Mixer: Video already has metadata");
            }
            if (video.readyState >= 2) { // HAVE_CURRENT_DATA
                console.log("→ Mixer: Video already has data");
            }
            if (video.readyState >= 3) { // HAVE_FUTURE_DATA
                console.log("→ Mixer: Video already can play");
                onCanPlay();
            }

            videoRef.current = video;
            textureRef.current = texture;
            (window as any).compositionTexture = texture;

            return () => {
                video.pause();
                video.removeEventListener("canplay", onCanPlay);
                video.removeEventListener("loadeddata", onLoadedData);
                if (video.parentNode) {
                    video.parentNode.removeChild(video);
                }
                video.src = "";
                texture.dispose();
                (window as any).compositionTexture = null;
                videoRef.current = null;
                textureRef.current = null;
            };
        };

        // Wait for container to be ready
        if ((window as any).globalVideoContainerReady) {
            return createCompositionVideo();
        } else {
            console.log("⏳ Waiting for global video container for composition video...");
            const handleContainerReady = () => {
                createCompositionVideo();
            };
            window.addEventListener("video-container-ready", handleContainerReady, { once: true });

            const timeoutId = setTimeout(() => {
                if ((window as any).globalVideoContainer) {
                    createCompositionVideo();
                }
            }, 100);

            return () => {
                window.removeEventListener("video-container-ready", handleContainerReady);
                clearTimeout(timeoutId);
            };
        }
    }, [compositionMedia?.id, localUrl.current]);

    // Secondary implementation: Handle images, colors, etc. for background
    useEffect(() => {
        if (!compositionMedia || compositionMedia.type === "video") return;

        let texture: THREE.Texture | null = null;
        const urlToUse = localUrl.current;

        if (compositionMedia.type === "image" && urlToUse) {
            texture = new THREE.TextureLoader().load(urlToUse);
        } else if (compositionMedia.type === "color" && compositionMedia.color) {
            const data = new Uint8Array([
                parseInt(compositionMedia.color.substring(1, 3), 16),
                parseInt(compositionMedia.color.substring(3, 5), 16),
                parseInt(compositionMedia.color.substring(5, 7), 16),
                255
            ]);
            texture = new THREE.DataTexture(data, 1, 1, THREE.RGBAFormat);
            texture.needsUpdate = true;
        }

        if (texture) {
            texture.colorSpace = THREE.SRGBColorSpace;
            (window as any).compositionTexture = texture;
            textureRef.current = texture;

            return () => {
                texture?.dispose();
                (window as any).compositionTexture = null;
            };
        }
    }, [compositionMedia]);

    // Ensure the texture is available on every frame (useful if external code clears it)
    useFrame(() => {
        if (textureRef.current && !(window as any).compositionTexture) {
            (window as any).compositionTexture = textureRef.current;
        }
    });

    return null; // This is a logic-only component
}
