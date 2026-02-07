"use client";

import { useRef, useState, useMemo } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import type { Surface } from "@/store/project-store";
import { useProjectStore } from "@/store/project-store";
import { useUIStore } from "@/store/ui-store";

interface CornerPinProps {
    surface: Surface;
}

export function CornerPin({ surface }: CornerPinProps) {
    const updateSurface = useProjectStore((state) => state.updateSurface);
    const settings = useProjectStore((state) => state.projectSettings);
    const toolMode = useUIStore((state) => state.toolMode);
    const mappingMode = useUIStore((state) => state.mappingMode);

    const [draggingCorner, setDraggingCorner] = useState<number | null>(null);
    const { camera, gl } = useThree();

    const activeCorners = mappingMode === "output" ? surface.corners : surface.sourceCorners;

    const linePoints = useMemo(() => {
        if (!activeCorners) return new Float32Array(0);
        const pts: number[] = [];
        activeCorners.forEach(p => pts.push(p.x, p.y, 0));
        // Always close the loop for lines
        if (activeCorners.length > 0) {
            pts.push(activeCorners[0].x, activeCorners[0].y, 0);
        }
        return new Float32Array(pts);
    }, [activeCorners]);

    if (toolMode !== "corner-pin" || surface.locked) return null;

    const handleCornerDrag = (cornerIndex: number, event: any) => {
        event.stopPropagation();
        setDraggingCorner(cornerIndex);

        const rect = gl.domElement.getBoundingClientRect();

        const onPointerMove = (e: PointerEvent) => {
            const mx = ((e.clientX - rect.left) / rect.width) * 2 - 1;
            const my = -((e.clientY - rect.top) / rect.height) * 2 + 1;

            const currentMouse = new THREE.Vector3(mx, my, 0.5).unproject(camera);

            // Convert world mouse to local space relative to surface position
            const dx = currentMouse.x - surface.position.x;
            const dy = currentMouse.y - surface.position.y;

            // Rotate back by -rotation to get un-rotated local coords
            const cos = Math.cos(-surface.rotation);
            const sin = Math.sin(-surface.rotation);
            let rdx = dx * cos - dy * sin;
            let rdy = dx * sin + dy * cos;

            // Divide by scale to get -0.5 to 0.5 normalized coords
            let targetX = rdx / surface.scale.x;
            let targetY = rdy / surface.scale.y;

            // Apply Snapping (in normalized local space)
            if (settings.snapToGrid) {
                const gridSize = 0.05; // Finer snapping for pin mode
                targetX = Math.round(targetX / gridSize) * gridSize;
                targetY = Math.round(targetY / gridSize) * gridSize;
            }

            if (mappingMode === "output") {
                const newCorners = [...surface.corners];
                newCorners[cornerIndex] = { x: targetX, y: targetY };
                updateSurface(surface.id, { corners: newCorners });
            } else {
                // For input (UV), we map -0.5..0.5 back to 0..1
                // But UV Y is usually flipped in mapping logic
                const newSourceCorners = [...surface.sourceCorners];
                newSourceCorners[cornerIndex] = {
                    x: Math.max(0, Math.min(1, targetX + 0.5)),
                    y: Math.max(0, Math.min(1, targetY + 0.5))
                };
                updateSurface(surface.id, { sourceCorners: newSourceCorners });
            }
        };

        const onPointerUp = () => {
            setDraggingCorner(null);
            window.removeEventListener("pointermove", onPointerMove);
            window.removeEventListener("pointerup", onPointerUp);
        };

        window.addEventListener("pointermove", onPointerMove);
        window.addEventListener("pointerup", onPointerUp);
    };

    const handleColor = mappingMode === "output" ? "#22d3ee" : "#f472b6"; // Cyan vs Pink
    const baseColor = mappingMode === "output" ? "#7c3aed" : "#f97316"; // Purple vs Orange

    return (
        <group position={[0, 0, 0.1]}>
            {activeCorners.map((corner, index) => {
                // For input mode, we preview the Source Corners in the same local space
                // by mapping 0..1 to -0.5..0.5
                const displayX = mappingMode === "output" ? corner.x : corner.x - 0.5;
                const displayY = mappingMode === "output" ? corner.y : corner.y - 0.5;

                return (
                    <mesh
                        key={`${surface.id}-corner-${index}`}
                        position={[displayX, displayY, 0]}
                        onPointerDown={(e) => handleCornerDrag(index, e)}
                        onPointerOver={() => gl.domElement.style.cursor = 'move'}
                        onPointerOut={() => gl.domElement.style.cursor = 'auto'}
                        scale={[1 / surface.scale.x, 1 / surface.scale.y, 1]}
                    >
                        <circleGeometry args={[0.035, 32]} />
                        <meshBasicMaterial
                            color={draggingCorner === index ? handleColor : (index < 4 ? baseColor : "#ec4899")}
                            transparent
                            opacity={0.9}
                            depthTest={false}
                        />
                        <mesh scale={[1.2, 1.2, 1]}>
                            <ringGeometry args={[0.035, 0.045, 32]} />
                            <meshBasicMaterial color="#ffffff" transparent opacity={0.3} depthTest={false} />
                        </mesh>
                    </mesh>
                );
            })}

            <line>
                <bufferGeometry>
                    <bufferAttribute
                        attach="attributes-position"
                        count={activeCorners.length + 1}
                        array={linePoints}
                        itemSize={3}
                    />
                </bufferGeometry>
                <lineBasicMaterial
                    color={baseColor}
                    linewidth={2}
                    transparent
                    opacity={0.4}
                    depthTest={false}
                />
            </line>
        </group>
    );
}
