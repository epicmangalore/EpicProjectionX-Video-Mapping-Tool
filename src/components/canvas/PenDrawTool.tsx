"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { useThree } from "@react-three/fiber";
import * as THREE from "three";
import { useProjectStore } from "@/store/project-store";
import { useUIStore } from "@/store/ui-store";
import { generateId } from "@/lib/utils";
import type { Vector2 } from "@/store/project-store";

export function PenDrawTool() {
    const { camera, gl } = useThree();
    const addSurface = useProjectStore((state) => state.addSurface);
    const addMediaAsset = useProjectStore((state) => state.addMediaAsset);
    const updateSurface = useProjectStore((state) => state.updateSurface);
    const setToolMode = useUIStore((state) => state.setToolMode);
    const toolMode = useUIStore((state) => state.toolMode);
    const penSubMode = useUIStore((state) => state.penSubMode);

    const [points, setPoints] = useState<THREE.Vector3[]>([]);
    const [cursorPos, setCursorPos] = useState<THREE.Vector3 | null>(null);
    const [hoveringFirst, setHoveringFirst] = useState(false);
    const pointsRef = useRef<THREE.Vector3[]>([]);

    const isActive = toolMode === "pen" && penSubMode === "draw";
    const CLOSE_THRESHOLD = 0.06;

    // Keep ref in sync
    useEffect(() => {
        pointsRef.current = points;
    }, [points]);

    // Clear points when leaving draw mode
    useEffect(() => {
        if (!isActive) {
            setPoints([]);
            setCursorPos(null);
            setHoveringFirst(false);
        }
    }, [isActive]);

    const finishPolygon = useCallback((finalPoints: THREE.Vector3[]) => {
        if (finalPoints.length < 3) return;

        // Compute bounding box
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        finalPoints.forEach(p => {
            minX = Math.min(minX, p.x);
            minY = Math.min(minY, p.y);
            maxX = Math.max(maxX, p.x);
            maxY = Math.max(maxY, p.y);
        });

        const centerX = (minX + maxX) / 2;
        const centerY = (minY + maxY) / 2;
        const width = maxX - minX;
        const height = maxY - minY;

        // Normalize corners to -0.5..0.5 relative to bounding box
        const corners: Vector2[] = finalPoints.map(p => ({
            x: width > 0 ? (p.x - centerX) / width : 0,
            y: height > 0 ? (p.y - centerY) / height : 0,
        }));

        // Compute source corners as 0..1 UV mapping
        const sourceCorners: Vector2[] = finalPoints.map(p => ({
            x: width > 0 ? (p.x - minX) / width : 0.5,
            y: height > 0 ? (p.y - minY) / height : 0.5,
        }));

        // Create media asset
        const mediaId = generateId();
        addMediaAsset({
            id: mediaId,
            name: "Gray Fill",
            type: "color",
            color: "#808080",
        });

        // Create surface then update with polygon data
        addSurface(mediaId);

        setTimeout(() => {
            const state = useProjectStore.getState();
            const newSurface = state.surfaces[state.surfaces.length - 1];
            if (newSurface) {
                updateSurface(newSurface.id, {
                    position: { x: centerX, y: centerY },
                    scale: { x: width || 1, y: height || 1 },
                    corners,
                    sourceCorners,
                });
            }
        }, 0);

        // Reset and switch to select
        setPoints([]);
        setCursorPos(null);
        setHoveringFirst(false);
        setToolMode("select");
    }, [addMediaAsset, addSurface, updateSurface, setToolMode]);

    // Keyboard: Enter to close, Escape to cancel
    useEffect(() => {
        if (!isActive) return;

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Enter" && pointsRef.current.length >= 3) {
                e.preventDefault();
                finishPolygon(pointsRef.current);
            }
            if (e.key === "Escape") {
                e.preventDefault();
                setPoints([]);
                setCursorPos(null);
                setHoveringFirst(false);
            }
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [isActive, finishPolygon]);

    const handlePointerDown = (e: any) => {
        if (!isActive || e.button !== 0) return;
        e.stopPropagation();

        const point = e.intersections[0]?.point;
        if (!point) return;

        const worldPoint = new THREE.Vector3(point.x, point.y, 0);

        // Check if clicking near first point to close
        if (points.length >= 3) {
            const first = points[0];
            const dist = Math.sqrt(
                (worldPoint.x - first.x) ** 2 + (worldPoint.y - first.y) ** 2
            );
            if (dist < CLOSE_THRESHOLD) {
                finishPolygon(points);
                return;
            }
        }

        setPoints(prev => [...prev, worldPoint]);
    };

    const handlePointerMove = (e: any) => {
        if (!isActive) return;
        const point = e.intersections[0]?.point;
        if (!point) return;

        const worldPoint = new THREE.Vector3(point.x, point.y, 0);
        setCursorPos(worldPoint);

        // Proximity check to first point
        if (points.length >= 3) {
            const first = points[0];
            const dist = Math.sqrt(
                (worldPoint.x - first.x) ** 2 + (worldPoint.y - first.y) ** 2
            );
            setHoveringFirst(dist < CLOSE_THRESHOLD);
        } else {
            setHoveringFirst(false);
        }
    };

    if (!isActive) return null;

    // Line geometry for placed points
    const placedLinePoints = points.length > 0
        ? new Float32Array(points.flatMap(p => [p.x, p.y, 0.1]))
        : new Float32Array(0);

    // Rubber band: last point -> cursor
    const rubberBandPoints = points.length > 0 && cursorPos
        ? new Float32Array([
            points[points.length - 1].x, points[points.length - 1].y, 0.1,
            cursorPos.x, cursorPos.y, 0.1,
        ])
        : new Float32Array(0);

    // Close preview: cursor -> first point (when >= 3 points)
    const closePreviewPoints = points.length >= 3 && cursorPos
        ? new Float32Array([
            cursorPos.x, cursorPos.y, 0.1,
            points[0].x, points[0].y, 0.1,
        ])
        : new Float32Array(0);

    const accentColor = "#22d3ee";
    const dimColor = "#7c3aed";

    return (
        <>
            {/* Large invisible plane to catch clicks */}
            <mesh
                position={[0, 0, -0.4]}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
            >
                <planeGeometry args={[1000, 1000]} />
                <meshBasicMaterial transparent opacity={0} depthWrite={false} />
            </mesh>

            {/* Placed vertex handles */}
            {points.map((point, index) => (
                <mesh
                    key={`draw-point-${index}`}
                    position={[point.x, point.y, 0.15]}
                >
                    <circleGeometry args={[
                        index === 0 && hoveringFirst ? 0.05 : 0.035,
                        32
                    ]} />
                    <meshBasicMaterial
                        color={index === 0 ? accentColor : dimColor}
                        transparent
                        opacity={0.9}
                        depthTest={false}
                    />
                    <mesh scale={[1.2, 1.2, 1]}>
                        <ringGeometry args={[
                            index === 0 && hoveringFirst ? 0.05 : 0.035,
                            index === 0 && hoveringFirst ? 0.065 : 0.045,
                            32
                        ]} />
                        <meshBasicMaterial color="#ffffff" transparent opacity={0.3} depthTest={false} />
                    </mesh>
                </mesh>
            ))}

            {/* Lines connecting placed points */}
            {placedLinePoints.length > 0 && (
                <line>
                    <bufferGeometry>
                        <bufferAttribute
                            attach="attributes-position"
                            count={points.length}
                            array={placedLinePoints}
                            itemSize={3}
                        />
                    </bufferGeometry>
                    <lineBasicMaterial color={dimColor} linewidth={2} transparent opacity={0.6} />
                </line>
            )}

            {/* Rubber band line (last point -> cursor) */}
            {rubberBandPoints.length > 0 && (
                <line>
                    <bufferGeometry>
                        <bufferAttribute
                            attach="attributes-position"
                            count={2}
                            array={rubberBandPoints}
                            itemSize={3}
                        />
                    </bufferGeometry>
                    <lineBasicMaterial color={accentColor} linewidth={1} transparent opacity={0.4} />
                </line>
            )}

            {/* Close preview line (cursor -> first point) */}
            {closePreviewPoints.length > 0 && (
                <line>
                    <bufferGeometry>
                        <bufferAttribute
                            attach="attributes-position"
                            count={2}
                            array={closePreviewPoints}
                            itemSize={3}
                        />
                    </bufferGeometry>
                    <lineBasicMaterial
                        color={accentColor}
                        linewidth={1}
                        transparent
                        opacity={hoveringFirst ? 0.6 : 0.2}
                    />
                </line>
            )}
        </>
    );
}
