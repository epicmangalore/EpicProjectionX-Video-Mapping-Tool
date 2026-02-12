"use client";

import { useRef, useEffect } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { Surface } from "@/store/project-store";
import { useProjectStore } from "@/store/project-store";
import { useTimelineStore } from "@/store/timeline-store";

interface VideoSurfaceProps {
    surface: Surface;
}

export function VideoSurface({ surface }: VideoSurfaceProps) {
    const meshRef = useRef<THREE.Mesh>(null);
    const videoRef = useRef<HTMLVideoElement | null>(null);
    const textureRef = useRef<THREE.VideoTexture | null>(null);

    const selectSurface = useProjectStore((state) => state.selectSurface);
    const selectedIds = useProjectStore((state) => state.selectedSurfaceIds);
    const mediaAssets = useProjectStore((state) => state.mediaAssets);
    const isPlaying = useTimelineStore((state) => state.isPlaying);

    const isSelected = selectedIds.includes(surface.id);
    const mediaAsset = mediaAssets.find((a) => a.id === surface.mediaId);

    // Create video element and texture
    useEffect(() => {
        if (!mediaAsset || mediaAsset.type !== "video" || !mediaAsset.url) return;

        const video = document.createElement("video");
        video.src = mediaAsset.url;
        video.crossOrigin = "anonymous";
        video.loop = true;
        video.muted = true; // Start muted for autoplay
        video.playsInline = true;

        const texture = new THREE.VideoTexture(video);
        texture.minFilter = THREE.LinearFilter;
        texture.magFilter = THREE.LinearFilter;
        texture.format = THREE.RGBAFormat;

        videoRef.current = video;
        textureRef.current = texture;

        return () => {
            video.pause();
            video.src = "";
            texture.dispose();
        };
    }, [mediaAsset]);

    // Control playback
    useEffect(() => {
        if (!videoRef.current) return;

        if (isPlaying) {
            videoRef.current.play().catch((err) => {
                console.warn("Video play failed:", err);
            });
        } else {
            videoRef.current.pause();
        }
    }, [isPlaying]);

    // Update mesh transform
    useFrame(() => {
        if (!meshRef.current) return;

        meshRef.current.position.set(
            surface.position.x,
            surface.position.y,
            surface.zIndex * 0.01
        );
        meshRef.current.rotation.z = surface.rotation;
        meshRef.current.scale.set(surface.scale.x, surface.scale.y, 1);
    });

    const handleClick = (e: any) => {
        e.stopPropagation();
        selectSurface(surface.id, e.nativeEvent?.shiftKey || false);
    };

    if (!textureRef.current) return null;

    return (
        <>
            <mesh ref={meshRef} onClick={handleClick}>
                <planeGeometry args={[1, 1]} />
                <meshBasicMaterial
                    map={textureRef.current}
                    transparent
                    opacity={surface.opacity}
                    side={THREE.DoubleSide}
                    toneMapped={false}
                />
            </mesh>

            {/* Selection outline */}
            {isSelected && (
                <mesh
                    position={[
                        surface.position.x,
                        surface.position.y,
                        surface.zIndex * 0.01 + 0.01,
                    ]}
                >
                    <lineSegments>
                        <edgesGeometry
                            args={[new THREE.PlaneGeometry(surface.scale.x, surface.scale.y)]}
                        />
                        <lineBasicMaterial color="#7c3aed" linewidth={2} />
                    </lineSegments>
                </mesh>
            )}
        </>
    );
}
