"use client";

import { useState, useRef } from "react";
import { useThree } from "@react-three/fiber";
import * as THREE from "three";
import type { Surface, Vector2 } from "@/store/project-store";
import { useProjectStore } from "@/store/project-store";
import { useUIStore } from "@/store/ui-store";

import { Line } from "@react-three/drei";

interface MeshWarpProps {
    surface: Surface;
}

export function MeshWarp({ surface }: MeshWarpProps) {
    const updateSurface = useProjectStore((state) => state.updateSurface);
    const saveHistory = useProjectStore((state) => state.saveHistory);
    const toolMode = useUIStore((state) => state.toolMode);
    const [draggingPoint, setDraggingPoint] = useState<{ row: number; col: number; type: "pos" | "handleLeft" | "handleRight" | "handleTop" | "handleBottom" } | null>(null);
    const { camera, gl } = useThree();

    if (toolMode !== "mesh-warp") return null;
    if (!surface.meshWarp) return null;

    const { gridSize, controlPoints } = surface.meshWarp;

    const groupRef = useRef<THREE.Group>(null);

    const handleDrag = (row: number, col: number, type: "pos" | "handleLeft" | "handleRight" | "handleTop" | "handleBottom", event: any) => {
        event.stopPropagation();
        saveHistory();
        setDraggingPoint({ row, col, type });

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
                    rowPoints.map((cp, c) => {
                        if (r === row && c === col) {
                            if (type === "pos") {
                                return { ...cp, position: { x: localPos.x, y: localPos.y } };
                            } else {
                                // Update handle relative to position
                                const dx = localPos.x - cp.position.x;
                                const dy = localPos.y - cp.position.y;
                                const updatedCp = { ...cp, [type]: { x: dx, y: dy } };

                                // Symmetric update for horizontal handles
                                if (type === "handleLeft") updatedCp.handleRight = { x: -dx, y: -dy };
                                if (type === "handleRight") updatedCp.handleLeft = { x: -dx, y: -dy };
                                // Symmetric update for vertical handles
                                if (type === "handleTop") updatedCp.handleBottom = { x: -dx, y: -dy };
                                if (type === "handleBottom") updatedCp.handleTop = { x: -dx, y: -dy };

                                return updatedCp;
                            }
                        }
                        return cp;
                    })
                );

                updateSurface(surface.id, {
                    meshWarp: { gridSize, controlPoints: newControlPoints as any },
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

    const getBezierPoints = (p0: Vector2, h0: Vector2, h1: Vector2, p1: Vector2) => {
        const points = [];
        const segments = 20;
        for (let i = 0; i <= segments; i++) {
            const t = i / segments;
            const t2 = t * t;
            const t3 = t2 * t;
            const mt = 1 - t;
            const mt2 = mt * mt;
            const mt3 = mt2 * mt;
            points.push([
                mt3 * p0.x + 3 * mt2 * t * (p0.x + h0.x) + 3 * mt * t2 * (p1.x + h1.x) + t3 * p1.x,
                mt3 * p0.y + 3 * mt2 * t * (p0.y + h0.y) + 3 * mt * t2 * (p1.y + h1.y) + t3 * p1.y,
                0
            ]);
        }
        return points;
    };

    return (
        <group ref={groupRef} position={[0, 0, 0.1]}>
            {/* Draw grid curves */}
            {controlPoints.map((rowPoints, row) =>
                rowPoints.map((cp, col) => (
                    <group key={`curves-${row}-${col}`}>
                        {/* Horizontal curve */}
                        {col < gridSize && (
                            <Line
                                points={getBezierPoints(cp.position, cp.handleRight || { x: 0, y: 0 }, rowPoints[col + 1].handleLeft || { x: 0, y: 0 }, rowPoints[col + 1].position) as any}
                                color="#06b6d4"
                                lineWidth={1}
                                transparent
                                opacity={0.5}
                            />
                        )}
                        {/* Vertical curve */}
                        {row < gridSize && (
                            <Line
                                points={getBezierPoints(cp.position, cp.handleBottom || { x: 0, y: 0 }, controlPoints[row + 1][col].handleTop || { x: 0, y: 0 }, controlPoints[row + 1][col].position) as any}
                                color="#06b6d4"
                                lineWidth={1}
                                transparent
                                opacity={0.5}
                            />
                        )}
                    </group>
                ))
            )}

            {/* Draw control points and tangent handles */}
            {controlPoints.map((rowPoints, row) =>
                rowPoints.map((cp, col) => {
                    const isSelected = draggingPoint?.row === row && draggingPoint?.col === col;

                    return (
                        <group key={`point-${row}-${col}`}>
                            {/* Main Pos Handle */}
                            <mesh
                                position={[cp.position.x, cp.position.y, 0]}
                                onPointerDown={(e) => handleDrag(row, col, "pos", e)}
                                scale={[1 / surface.scale.x, 1 / surface.scale.y, 1]}
                            >
                                <circleGeometry args={[0.03, 16]} />
                                <meshBasicMaterial color={isSelected && draggingPoint.type === "pos" ? "#ffffff" : "#06b6d4"} depthTest={false} />
                            </mesh>

                            {/* Tangent Handles (only if point is selected or being dragged) */}
                            {isSelected && (
                                <>
                                    {["handleLeft", "handleRight", "handleTop", "handleBottom"].map((type) => {
                                        const h = (cp as any)[type];
                                        if (!h) return null;
                                        const hx = cp.position.x + h.x;
                                        const hy = cp.position.y + h.y;
                                        return (
                                            <group key={type}>
                                                <Line
                                                    points={[[cp.position.x, cp.position.y, 0], [hx, hy, 0]]}
                                                    color="#06b6d4"
                                                    lineWidth={0.5}
                                                    transparent
                                                    opacity={0.6}
                                                />
                                                <mesh
                                                    position={[hx, hy, 0]}
                                                    onPointerDown={(e) => handleDrag(row, col, type as any, e)}
                                                    scale={[1 / surface.scale.x, 1 / surface.scale.y, 1]}
                                                >
                                                    <circleGeometry args={[0.02, 16]} />
                                                    <meshBasicMaterial color={draggingPoint.type === type ? "#ffffff" : "#06b6d4"} depthTest={false} />
                                                </mesh>
                                            </group>
                                        );
                                    })}
                                </>
                            )}
                        </group>
                    );
                })
            )}
        </group>
    );
}
