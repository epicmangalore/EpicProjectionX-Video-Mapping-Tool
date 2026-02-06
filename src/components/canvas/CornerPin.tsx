"use client";

import { useRef, useState } from "react";
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
    const toolMode = useUIStore((state) => state.toolMode);
    const [draggingCorner, setDraggingCorner] = useState<number | null>(null);
    const { camera, gl } = useThree();

    if (toolMode !== "corner-pin") return null;

    const handleCornerDrag = (cornerIndex: number, event: any) => {
        event.stopPropagation();
        setDraggingCorner(cornerIndex);

        const onPointerMove = (e: PointerEvent) => {
            // Convert screen coordinates to world coordinates
            const rect = gl.domElement.getBoundingClientRect();
            const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
            const y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

            const vector = new THREE.Vector3(x, y, 0.5);
            vector.unproject(camera);

            const newCorners = [...surface.corners] as [
                typeof surface.corners[0],
                typeof surface.corners[1],
                typeof surface.corners[2],
                typeof surface.corners[3]
            ];
            newCorners[cornerIndex] = {
                x: vector.x - surface.position.x,
                y: vector.y - surface.position.y,
            };

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

    return (
        <group position={[surface.position.x, surface.position.y, surface.zIndex * 0.01 + 0.1]}>
            {surface.corners.map((corner, index) => (
                <mesh
                    key={index}
                    position={[corner.x, corner.y, 0]}
                    onPointerDown={(e) => handleCornerDrag(index, e)}
                >
                    <circleGeometry args={[0.05, 16]} />
                    <meshBasicMaterial
                        color={draggingCorner === index ? "#06b6d4" : "#7c3aed"}
                        transparent
                        opacity={0.9}
                    />
                    {/* Outer ring */}
                    <mesh>
                        <ringGeometry args={[0.05, 0.07, 16]} />
                        <meshBasicMaterial
                            color="#ffffff"
                            transparent
                            opacity={0.5}
                        />
                    </mesh>
                </mesh>
            ))}

            {/* Draw lines between corners */}
            <line>
                <bufferGeometry>
                    <bufferAttribute
                        attach="attributes-position"
                        count={5}
                        array={new Float32Array([
                            surface.corners[0].x, surface.corners[0].y, 0,
                            surface.corners[1].x, surface.corners[1].y, 0,
                            surface.corners[2].x, surface.corners[2].y, 0,
                            surface.corners[3].x, surface.corners[3].y, 0,
                            surface.corners[0].x, surface.corners[0].y, 0,
                        ])}
                        itemSize={3}
                    />
                </bufferGeometry>
                <lineBasicMaterial color="#7c3aed" linewidth={2} transparent opacity={0.6} />
            </line>
        </group>
    );
}
