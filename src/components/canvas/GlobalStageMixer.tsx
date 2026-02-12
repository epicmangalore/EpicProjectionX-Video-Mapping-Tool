"use client";

import { useMemo, useRef, useEffect } from "react";
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

    useEffect(() => {
        if (!compositionMedia || compositionMedia.type !== "video" || !compositionMedia.url) {
            // Placeholder: Clear global texture if no video
            (window as any).compositionTexture = null;
            return;
        }

        const video = document.createElement("video");
        video.src = compositionMedia.url;
        video.crossOrigin = "anonymous";
        video.loop = true;
        video.muted = true;
        video.playsInline = true;
        video.play().catch(e => console.warn("Global background video play failed:", e));

        const texture = new THREE.VideoTexture(video);
        texture.minFilter = THREE.LinearFilter;
        texture.magFilter = THREE.LinearFilter;
        texture.format = THREE.RGBAFormat;
        texture.colorSpace = THREE.SRGBColorSpace;

        videoRef.current = video;
        textureRef.current = texture;
        (window as any).compositionTexture = texture;

        return () => {
            video.pause();
            video.src = "";
            texture.dispose();
            (window as any).compositionTexture = null;
            videoRef.current = null;
            textureRef.current = null;
        };
    }, [compositionMedia]);

    // Secondary implementation: Handle images, colors, etc. for background
    useEffect(() => {
        if (!compositionMedia || compositionMedia.type === "video") return;

        let texture: THREE.Texture | null = null;

        if (compositionMedia.type === "image" && compositionMedia.url) {
            texture = new THREE.TextureLoader().load(compositionMedia.url);
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
