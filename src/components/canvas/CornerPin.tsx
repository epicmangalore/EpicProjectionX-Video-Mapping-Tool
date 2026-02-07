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
    const surfaces = useProjectStore((state) => state.surfaces);
    const settings = useProjectStore((state) => state.projectSettings);
    const toolMode = useUIStore((state) => state.toolMode);
    const [draggingCorner, setDraggingCorner] = useState<number | null>(null);
    const { camera, gl } = useThree();

    if (toolMode !== "corner-pin" || surface.locked) return null;

    const handleCornerDrag = (cornerIndex: number, event: any) => {
        event.stopPropagation();
        setDraggingCorner(cornerIndex);

        const onPointerMove = (e: PointerEvent) => {
            const rect = gl.domElement.getBoundingClientRect();
            const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
            const y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

            const vector = new THREE.Vector3(x, y, 0.5);
            vector.unproject(camera);

            let targetX = vector.x - surface.position.x;
            let targetY = vector.y - surface.position.y;

            // Apply Snapping
            if (settings.snapToGrid) {
                const gridSize = 0.5;
                const snappedX = Math.round(targetX / gridSize) * gridSize;
                const snappedY = Math.round(targetY / gridSize) * gridSize;

                if (Math.abs(targetX - snappedX) < settings.snapThreshold) targetX = snappedX;
                if (Math.abs(targetY - snappedY) < settings.snapThreshold) targetY = snappedY;
            }

            if (settings.snapToSurfaces) {
                surfaces.forEach(s => {
                    if (s.id === surface.id || !s.visible) return;
                    s.corners.forEach(p => {
                        const worldX = p.x + s.position.x;
                        const worldY = p.y + s.position.y;
                        const localX = worldX - surface.position.x;
                        const localY = worldY - surface.position.y;

                        if (Math.abs(targetX - localX) < settings.snapThreshold &&
                            Math.abs(targetY - localY) < settings.snapThreshold) {
                            targetX = localX;
                            targetY = localY;
                        }
                    });
                });
            }

            const newCorners = [...surface.corners];
            newCorners[cornerIndex] = { x: targetX, y: targetY };

            updateSurface(surface.id, { corners: newCorners });
        };

        const onPointerUp = () => {
            setDraggingCorner(null);
            window.removeEventListener("pointermove", onPointerMove);
            window.removeEventListener("pointerup", onPointerUp);
        };

        window.addEventListener("pointermove", onPointerMove);
        window.addEventListener("pointerup", onPointerUp);
    };

    const linePoints = useMemo(() => {
        const pts: number[] = [];
        surface.corners.forEach(p => pts.push(p.x, p.y, 0));
        // Always close the loop for lines
        if (surface.corners.length > 0) {
            pts.push(surface.corners[0].x, surface.corners[0].y, 0);
        }
        return new Float32Array(pts);
    }, [surface.corners]);

    return (
        <group position={[surface.position.x, surface.position.y, surface.zIndex * 0.01 + 0.1]}>
            {surface.corners.map((corner, index) => (
                <mesh
                    key={`${surface.id}-corner-${index}`}
                    position={[corner.x, corner.y, 0]}
                    onPointerDown={(e) => handleCornerDrag(index, e)}
                    onPointerOver={() => gl.domElement.style.cursor = 'move'}
                    onPointerOut={() => gl.domElement.style.cursor = 'auto'}
                >
                    <circleGeometry args={[0.035, 32]} />
                    <meshBasicMaterial
                        color={draggingCorner === index ? "#22d3ee" : (index < 4 ? "#7c3aed" : "#ec4899")}
                        transparent
                        opacity={0.9}
                    />
                    <mesh scale={[1.2, 1.2, 1]}>
                        <ringGeometry args={[0.035, 0.045, 32]} />
                        <meshBasicMaterial color="#ffffff" transparent opacity={0.3} />
                    </mesh>
                </mesh>
            ))}

            <line>
                <bufferGeometry>
                    <bufferAttribute
                        attach="attributes-position"
                        count={surface.corners.length + 1}
                        array={linePoints}
                        itemSize={3}
                    />
                </bufferGeometry>
                <lineBasicMaterial
                    color="#7c3aed"
                    linewidth={2}
                    transparent
                    opacity={0.4}
                    depthTest={false}
                />
            </line>
        </group>
    );
}
