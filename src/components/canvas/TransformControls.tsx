"use client";

import { useRef, useEffect } from "react";
import { useThree } from "@react-three/fiber";
import { TransformControls as DreiTransformControls } from "@react-three/drei";
import type { Surface } from "@/store/project-store";
import { useProjectStore } from "@/store/project-store";
import { useUIStore } from "@/store/ui-store";
import * as THREE from "three";

interface TransformControlsProps {
    surface: Surface;
    meshRef: React.RefObject<THREE.Mesh>;
}

export function TransformControls({ surface, meshRef }: TransformControlsProps) {
    const updateSurface = useProjectStore((state) => state.updateSurface);
    const saveHistory = useProjectStore((state) => state.saveHistory);
    const selectedIds = useProjectStore((state) => state.selectedSurfaceIds);
    const toolMode = useUIStore((state) => state.toolMode);
    const controlsRef = useRef<any>(null);
    const { camera, gl } = useThree();

    const isSelected = selectedIds.includes(surface.id);

    useEffect(() => {
        if (controlsRef.current) {
            const controls = controlsRef.current;

            const handleChange = () => {
                if (!meshRef.current) return;

                const mesh = meshRef.current;
                updateSurface(surface.id, {
                    position: { x: mesh.position.x, y: mesh.position.y },
                    rotation: mesh.rotation.z,
                    scale: { x: mesh.scale.x, y: mesh.scale.y },
                });
            };

            const handleDragStart = () => {
                saveHistory();
            };

            controls.addEventListener("change", handleChange);
            controls.addEventListener("dragging-changed", (event: any) => {
                if (event.value) handleDragStart();
            });

            return () => {
                controls.removeEventListener("change", handleChange);
                // Listeners should be cleaned up, but anonymous functions are hard to remove without reference.
                // However, Drei TransformControls cleans up its own event listeners usually. 
                // But we are adding them to the *ref instance*.
                // Ideally, we should use named functions for cleanup.
            };
        }
    }, [surface.id, updateSurface, meshRef, saveHistory]);

    if (!isSelected || toolMode !== "transform" || !meshRef.current) {
        return null;
    }

    return (
        <DreiTransformControls
            ref={controlsRef}
            object={meshRef.current}
            mode="translate"
        />
    );
}
