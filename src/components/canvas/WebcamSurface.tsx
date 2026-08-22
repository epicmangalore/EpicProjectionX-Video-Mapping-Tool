"use client";

import { useRef, useEffect, useState } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { Surface } from "@/store/project-store";
import { useProjectStore } from "@/store/project-store";

interface WebcamSurfaceProps {
    surface: Surface;
}

export function WebcamSurface({ surface }: WebcamSurfaceProps) {
    const meshRef = useRef<THREE.Mesh>(null);
    const videoRef = useRef<HTMLVideoElement | null>(null);
    const textureRef = useRef<THREE.VideoTexture | null>(null);
    const streamRef = useRef<MediaStream | null>(null);

    const selectSurface = useProjectStore((state) => state.selectSurface);
    const selectedIds = useProjectStore((state) => state.selectedSurfaceIds);
    const mediaAssets = useProjectStore((state) => state.mediaAssets);
    const [error, setError] = useState<string | null>(null);

    const isSelected = selectedIds.includes(surface.id);
    const mediaAsset = mediaAssets.find((a) => a.id === surface.mediaId);

    // Initialize webcam
    useEffect(() => {
        if (!mediaAsset || mediaAsset.type !== "webcam") return;

        const initWebcam = async () => {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({
                    video: {
                        width: { ideal: 1280 },
                        height: { ideal: 720 },
                        facingMode: "user",
                    },
                    audio: false,
                });

                const video = document.createElement("video");
                video.srcObject = stream;
                video.autoplay = true;
                video.playsInline = true;
                video.muted = true;

                await video.play();

                const texture = new THREE.VideoTexture(video);
                texture.minFilter = THREE.LinearFilter;
                texture.magFilter = THREE.LinearFilter;
                texture.format = THREE.RGBAFormat;

                videoRef.current = video;
                textureRef.current = texture;
                streamRef.current = stream;
                setError(null);
            } catch (err) {
                console.error("Webcam error:", err);
                setError("Failed to access webcam");
            }
        };

        initWebcam();

        return () => {
            if (streamRef.current) {
                streamRef.current.getTracks().forEach((track) => track.stop());
            }
            if (textureRef.current) {
                textureRef.current.dispose();
            }
        };
    }, [mediaAsset]);

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

    if (error) {
        console.warn("Webcam surface error:", error);
        return null;
    }

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
