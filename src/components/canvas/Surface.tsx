"use client";

import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { Surface } from "@/store/project-store";
import { useProjectStore } from "@/store/project-store";
import { useEffectsStore, defaultEffectSettings } from "@/store/effects-store";

// Import shaders
import vertexShader from "@/shaders/surface.vert.glsl";
import fragmentShader from "@/shaders/surface.frag.glsl";

interface SurfaceProps {
    surface: Surface;
}

export function Surface({ surface }: SurfaceProps) {
    const meshRef = useRef<THREE.Mesh>(null);
    const selectSurface = useProjectStore((state) => state.selectSurface);
    const selectedIds = useProjectStore((state) => state.selectedSurfaceIds);
    const mediaAssets = useProjectStore((state) => state.mediaAssets);
    const surfaceEffects = useEffectsStore((state) => state.surfaceEffects);

    const isSelected = selectedIds.includes(surface.id);
    const effects = surfaceEffects[surface.id] || defaultEffectSettings;

    // Get media asset
    const mediaAsset = useMemo(() => {
        if (!surface.mediaId) return null;
        return mediaAssets.find((a) => a.id === surface.mediaId);
    }, [surface.mediaId, mediaAssets]);

    // Create texture from media
    const texture = useMemo(() => {
        if (!mediaAsset) return null;

        if (mediaAsset.type === "color") {
            // Create a solid color texture
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

        // TODO: Handle video, webcam, text, shader types
        return null;
    }, [mediaAsset]);

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
                    ),
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

        // Update shader uniforms
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

    if (!shaderMaterial) {
        return null;
    }

    return (
        <>
            <mesh ref={meshRef} onClick={handleClick}>
                <planeGeometry args={[1, 1, 1, 1]} />
                <primitive object={shaderMaterial} attach="material" />
            </mesh>

            {/* Selection outline */}
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
