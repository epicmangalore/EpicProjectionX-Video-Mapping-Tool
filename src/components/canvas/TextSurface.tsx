"use client";

import { useRef, useEffect, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { Surface } from "@/store/project-store";
import { useProjectStore } from "@/store/project-store";

interface TextSurfaceProps {
    surface: Surface;
}

export function TextSurface({ surface }: TextSurfaceProps) {
    const meshRef = useRef<THREE.Mesh>(null);
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const textureRef = useRef<THREE.CanvasTexture | null>(null);

    const selectSurface = useProjectStore((state) => state.selectSurface);
    const selectedIds = useProjectStore((state) => state.selectedSurfaceIds);
    const mediaAssets = useProjectStore((state) => state.mediaAssets);

    const isSelected = selectedIds.includes(surface.id);
    const mediaAsset = mediaAssets.find((a) => a.id === surface.mediaId);

    // Create text texture
    const texture = useMemo(() => {
        if (!mediaAsset || mediaAsset.type !== "text") return null;

        const canvas = document.createElement("canvas");
        canvas.width = 1024;
        canvas.height = 512;
        const ctx = canvas.getContext("2d");

        if (!ctx) return null;

        // Clear canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Set text properties
        const fontSize = mediaAsset.fontSize || 48;
        const fontFamily = mediaAsset.fontFamily || "Inter";
        const textColor = mediaAsset.textColor || "#ffffff";
        const textAlign = mediaAsset.textAlign || "center";
        const text = mediaAsset.text || "Text";

        ctx.font = `${fontSize}px ${fontFamily}`;
        ctx.fillStyle = textColor;
        ctx.textAlign = textAlign as CanvasTextAlign;
        ctx.textBaseline = "middle";

        // Draw text
        const x = textAlign === "center" ? canvas.width / 2 : textAlign === "right" ? canvas.width - 20 : 20;
        const y = canvas.height / 2;

        // Word wrap
        const words = text.split(" ");
        const lines: string[] = [];
        let currentLine = "";

        words.forEach((word) => {
            const testLine = currentLine + word + " ";
            const metrics = ctx.measureText(testLine);

            if (metrics.width > canvas.width - 40 && currentLine.length > 0) {
                lines.push(currentLine);
                currentLine = word + " ";
            } else {
                currentLine = testLine;
            }
        });
        lines.push(currentLine);

        // Draw lines
        const lineHeight = fontSize * 1.2;
        const startY = y - ((lines.length - 1) * lineHeight) / 2;

        lines.forEach((line, i) => {
            ctx.fillText(line, x, startY + i * lineHeight);
        });

        canvasRef.current = canvas;
        const tex = new THREE.CanvasTexture(canvas);
        tex.needsUpdate = true;
        textureRef.current = tex;

        return tex;
    }, [mediaAsset]);

    // Update texture when media asset changes
    useEffect(() => {
        if (textureRef.current) {
            textureRef.current.needsUpdate = true;
        }
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

    if (!texture) return null;

    return (
        <>
            <mesh ref={meshRef} onClick={handleClick}>
                <planeGeometry args={[1, 1]} />
                <meshBasicMaterial
                    map={texture}
                    transparent
                    opacity={surface.opacity}
                    side={THREE.DoubleSide}
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
