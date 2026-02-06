"use client";

import { useRef, useMemo, useEffect, useState } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { Surface as SurfaceType } from "@/store/project-store";
import { useProjectStore } from "@/store/project-store";
import { useEffectsStore, defaultEffectSettings } from "@/store/effects-store";
import { usePlaybackStore } from "@/store/playback-store";

// Import shaders
import vertexShader from "@/shaders/surface.vert.glsl";
import fragmentShader from "@/shaders/surface.frag.glsl";

interface SurfaceProps {
    surface: SurfaceType;
}

export function Surface({ surface }: SurfaceProps) {
    const meshRef = useRef<THREE.Mesh>(null);
    const videoRef = useRef<HTMLVideoElement | null>(null);
    const streamRef = useRef<MediaStream | null>(null);

    const selectSurface = useProjectStore((state) => state.selectSurface);
    const selectedIds = useProjectStore((state) => state.selectedSurfaceIds);
    const mediaAssets = useProjectStore((state) => state.mediaAssets);
    const surfaceEffects = useEffectsStore((state) => state.surfaceEffects);
    const isPlayingGlobal = usePlaybackStore((state) => state.isPlaying);

    const isSelected = selectedIds.includes(surface.id);
    const effects = surfaceEffects[surface.id] || defaultEffectSettings;

    // Get media asset
    const mediaAsset = useMemo(() => {
        if (!surface.mediaId) return null;
        return mediaAssets.find((a) => a.id === surface.mediaId);
    }, [surface.mediaId, mediaAssets]);

    // Manage Video/Webcam elements
    const [videoElement, setVideoElement] = useState<HTMLVideoElement | null>(null);

    useEffect(() => {
        if (!mediaAsset) return;

        if (mediaAsset.type === "video" && mediaAsset.url) {
            const video = document.createElement("video");
            video.src = mediaAsset.url;
            video.crossOrigin = "anonymous";
            video.loop = true;
            video.muted = true;
            video.playsInline = true;
            if (isPlayingGlobal) video.play().catch(() => { });
            setVideoElement(video);
            videoRef.current = video;

            return () => {
                video.pause();
                video.src = "";
                setVideoElement(null);
            };
        }

        if (mediaAsset.type === "webcam") {
            let stream: MediaStream | null = null;
            const startWebcam = async () => {
                try {
                    stream = await navigator.mediaDevices.getUserMedia({ video: true });
                    const video = document.createElement("video");
                    video.srcObject = stream;
                    video.autoplay = true;
                    video.playsInline = true;
                    video.muted = true;
                    setVideoElement(video);
                    videoRef.current = video;
                    streamRef.current = stream;
                } catch (e) {
                    console.error("Webcam failed", e);
                }
            };
            startWebcam();
            return () => {
                if (stream) stream.getTracks().forEach(t => t.stop());
                setVideoElement(null);
            };
        }
    }, [mediaAsset, isPlayingGlobal]);

    // Create texture from media
    const texture = useMemo(() => {
        if (!mediaAsset) return null;

        if (mediaAsset.type === "color") {
            const canvas = document.createElement("canvas");
            canvas.width = 64;
            canvas.height = 64;
            const ctx = canvas.getContext("2d");
            if (ctx && mediaAsset.color) {
                ctx.fillStyle = mediaAsset.color;
                ctx.fillRect(0, 0, 64, 64);
            }
            return new THREE.CanvasTexture(canvas);
        }

        if (mediaAsset.type === "image" && mediaAsset.url) {
            const loader = new THREE.TextureLoader();
            return loader.load(mediaAsset.url);
        }

        if ((mediaAsset.type === "video" || mediaAsset.type === "webcam") && videoElement) {
            const tex = new THREE.VideoTexture(videoElement);
            tex.minFilter = THREE.LinearFilter;
            tex.magFilter = THREE.LinearFilter;
            return tex;
        }

        if (mediaAsset.type === "text") {
            const canvas = document.createElement("canvas");
            canvas.width = 1024;
            canvas.height = 512;
            const ctx = canvas.getContext("2d");
            if (ctx) {
                ctx.fillStyle = mediaAsset.color || "#ffffff";
                ctx.font = "bold 80px sans-serif";
                ctx.textAlign = "center";
                ctx.textBaseline = "middle";
                ctx.fillText(mediaAsset.name || "Text", 512, 256);
            }
            return new THREE.CanvasTexture(canvas);
        }

        return null;
    }, [mediaAsset, videoElement]);

    // Create shader material with uniforms
    const shaderMaterial = useMemo(() => {
        if (!texture) return null;

        return new THREE.ShaderMaterial({
            vertexShader,
            fragmentShader,
            uniforms: {
                uTexture: { value: texture },
                uOpacity: { value: surface.opacity },
                uBrightness: { value: effects.brightness },
                uContrast: { value: effects.contrast },
                uSaturation: { value: effects.saturation },
                uHue: { value: effects.hue },
                uColorTint: {
                    value: new THREE.Vector3(
                        effects.colorTint.r,
                        effects.colorTint.g,
                        effects.colorTint.b
                    )
                },
                uBlurAmount: { value: effects.blur },
                uChromaticAberration: { value: effects.chromaticAberration },
                uRGBShift: { value: effects.rgbShift },
            },
            transparent: true,
            side: THREE.DoubleSide,
        });
    }, [texture, surface.opacity, effects]);

    // Update mesh transform and uniforms
    useFrame(() => {
        if (!meshRef.current) return;

        meshRef.current.position.set(
            surface.position.x,
            surface.position.y,
            surface.zIndex * 0.01
        );
        meshRef.current.rotation.z = surface.rotation;
        meshRef.current.scale.set(surface.scale.x, surface.scale.y, 1);

        if (shaderMaterial) {
            shaderMaterial.uniforms.uOpacity.value = surface.opacity;
            shaderMaterial.uniforms.uBrightness.value = effects.brightness;
            shaderMaterial.uniforms.uContrast.value = effects.contrast;
            shaderMaterial.uniforms.uSaturation.value = effects.saturation;
            shaderMaterial.uniforms.uHue.value = effects.hue;
            shaderMaterial.uniforms.uColorTint.value.set(
                effects.colorTint.r,
                effects.colorTint.g,
                effects.colorTint.b
            );
            shaderMaterial.uniforms.uBlurAmount.value = effects.blur;
            shaderMaterial.uniforms.uChromaticAberration.value = effects.chromaticAberration;
            shaderMaterial.uniforms.uRGBShift.value = effects.rgbShift;
        }
    });

    const handleClick = (e: any) => {
        e.stopPropagation();
        selectSurface(surface.id, e.nativeEvent?.shiftKey || false);
    };

    if (!shaderMaterial) return null;

    return (
        <>
            <mesh ref={meshRef} onClick={handleClick}>
                <planeGeometry args={[1, 1, 1, 1]} />
                <primitive object={shaderMaterial} attach="material" />
            </mesh>
            {isSelected && (
                <mesh position={[surface.position.x, surface.position.y, surface.zIndex * 0.01 + 0.01]}>
                    <lineSegments>
                        <edgesGeometry args={[new THREE.PlaneGeometry(surface.scale.x, surface.scale.y)]} />
                        <lineBasicMaterial color="#7c3aed" linewidth={2} />
                    </lineSegments>
                </mesh>
            )}
        </>
    );
}
