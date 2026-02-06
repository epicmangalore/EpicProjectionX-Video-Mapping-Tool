"use client";

import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { Surface as SurfaceType } from "@/store/project-store";
import { useProjectStore } from "@/store/project-store";

interface SurfaceProps {
    surface: SurfaceType;
}

export function Surface({ surface }: SurfaceProps) {
    const meshRef = useRef<THREE.Mesh>(null);
    const selectSurface = useProjectStore((state) => state.selectSurface);
    const selectedIds = useProjectStore((state) => state.selectedSurfaceIds);
    const mediaAssets = useProjectStore((state) => state.mediaAssets);

    const isSelected = selectedIds.includes(surface.id);

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

    // Update mesh transform
    useFrame(() => {
        if (!meshRef.current) return;

        meshRef.current.position.set(surface.position.x, surface.position.y, surface.zIndex * 0.01);
        meshRef.current.rotation.z = surface.rotation;
        meshRef.current.scale.set(surface.scale.x, surface.scale.y, 1);
    });

    const handleClick = (e: any) => {
        e.stopPropagation();
        selectSurface(surface.id, e.nativeEvent?.shiftKey || false);
    };

    return (
        <mesh ref={meshRef} onClick={handleClick}>
            <planeGeometry args={[1, 1, 1, 1]} />
            <meshBasicMaterial
                map={texture}
                transparent
                opacity={surface.opacity}
                side={THREE.DoubleSide}
                color={isSelected ? "#7c3aed" : "#ffffff"}
            />

            {/* Selection outline */}
            {isSelected && (
                <lineSegments>
                    <edgesGeometry args={[new THREE.PlaneGeometry(1, 1)]} />
                    <lineBasicMaterial color="#7c3aed" linewidth={2} />
                </lineSegments>
            )}
        </mesh>
    );
}
