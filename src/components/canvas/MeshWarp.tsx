"use client";

import { useState, useRef } from "react";
import { useThree } from "@react-three/fiber";
import * as THREE from "three";
import type { Surface, Vector2 } from "@/store/project-store";
import { useProjectStore } from "@/store/project-store";
import { useUIStore } from "@/store/ui-store";

interface MeshWarpProps {
    surface: Surface;
}

export function MeshWarp({ surface }: MeshWarpProps) {
    const updateSurface = useProjectStore((state) => state.updateSurface);
    const saveHistory = useProjectStore((state) => state.saveHistory);
    const toolMode = useUIStore((state) => state.toolMode);
    const [draggingPoint, setDraggingPoint] = useState<{ row: number; col: number } | null>(null);
    const { camera, gl } = useThree();

    if (toolMode !== "mesh-warp") return null;
    if (!surface.meshWarp) return null;

    const { gridSize, controlPoints } = surface.meshWarp;

    const groupRef = useRef<THREE.Group>(null);

    const handlePointDrag = (row: number, col: number, event: any) => {
        event.stopPropagation();
        saveHistory();
        setDraggingPoint({ row, col });

        const onPointerMove = (e: PointerEvent) => {
            if (!groupRef.current) return;

            const rect = gl.domElement.getBoundingClientRect();
            const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
            const y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

            const raycaster = new THREE.Raycaster();
            raycaster.setFromCamera(new THREE.Vector2(x, y), camera);

            const planeNormal = new THREE.Vector3(0, 0, 1).applyQuaternion(groupRef.current.getWorldQuaternion(new THREE.Quaternion()));
            const planePoint = groupRef.current.getWorldPosition(new THREE.Vector3());
            const plane = new THREE.Plane().setFromNormalAndCoplanarPoint(planeNormal, planePoint);

            const target = new THREE.Vector3();
            raycaster.ray.intersectPlane(plane, target);

            if (target) {
                const localPos = groupRef.current.worldToLocal(target);

                const newControlPoints = controlPoints.map((rowPoints, r) =>
                    rowPoints.map((point, c) => {
                        if (r === row && c === col) {
                            return { x: localPos.x, y: localPos.y } as Vector2;
                        }
                        return point;
                    })
                );

                updateSurface(surface.id, {
                    meshWarp: { gridSize, controlPoints: newControlPoints },
                });
            }
        };

        const onPointerUp = () => {
            setDraggingPoint(null);
            window.removeEventListener("pointermove", onPointerMove);
            window.removeEventListener("pointerup", onPointerUp);
        };

        window.addEventListener("pointermove", onPointerMove);
        window.addEventListener("pointerup", onPointerUp);
    };

    return (
        <group ref={groupRef} position={[0, 0, 0.1]}>
            {/* Draw grid lines */}
            {controlPoints.map((rowPoints, row) => {
                if (row < gridSize) {
                    return rowPoints.map((point, col) => {
                        if (col < gridSize) {
                            const nextRow = controlPoints[row + 1];
                            const nextCol = rowPoints[col + 1];

                            return (
                                <group key={`grid-${row}-${col}`}>
                                    {/* Horizontal line */}
                                    {nextCol && (
                                        <line>
                                            <bufferGeometry>
                                                <bufferAttribute
                                                    attach="attributes-position"
                                                    count={2}
                                                    array={
                                                        new Float32Array([
                                                            point.x,
                                                            point.y,
                                                            0,
                                                            nextCol.x,
                                                            nextCol.y,
                                                            0,
                                                        ])
                                                    }
                                                    itemSize={3}
                                                />
                                            </bufferGeometry>
                                            <lineBasicMaterial
                                                color="#7c3aed"
                                                linewidth={1}
                                                transparent
                                                opacity={0.4}
                                            />
                                        </line>
                                    )}

                                    {/* Vertical line */}
                                    {nextRow && (
                                        <line>
                                            <bufferGeometry>
                                                <bufferAttribute
                                                    attach="attributes-position"
                                                    count={2}
                                                    array={
                                                        new Float32Array([
                                                            point.x,
                                                            point.y,
                                                            0,
                                                            nextRow[col].x,
                                                            nextRow[col].y,
                                                            0,
                                                        ])
                                                    }
                                                    itemSize={3}
                                                />
                                            </bufferGeometry>
                                            <lineBasicMaterial
                                                color="#7c3aed"
                                                linewidth={1}
                                                transparent
                                                opacity={0.4}
                                            />
                                        </line>
                                    )}
                                </group>
                            );
                        }
                        return null;
                    });
                }
                return null;
            })}

            {/* Draw control points */}
            {controlPoints.map((rowPoints, row) =>
                rowPoints.map((point, col) => (
                    <mesh
                        key={`point-${row}-${col}`}
                        position={[point.x, point.y, 0]}
                        onPointerDown={(e) => handlePointDrag(row, col, e)}
                        scale={[1 / surface.scale.x, 1 / surface.scale.y, 1]}
                    >
                        <circleGeometry args={[0.03, 16]} />
                        <meshBasicMaterial
                            color={
                                draggingPoint?.row === row && draggingPoint?.col === col
                                    ? "#06b6d4"
                                    : "#7c3aed"
                            }
                            transparent
                            opacity={0.9}
                            depthTest={false}
                        />
                    </mesh>
                ))
            )}
        </group>
    );
}
