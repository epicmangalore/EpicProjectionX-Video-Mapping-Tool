"use client";

import { useState, useMemo } from "react";
import { useThree } from "@react-three/fiber";
import * as THREE from "three";
import type { Surface } from "@/store/project-store";
import { useProjectStore } from "@/store/project-store";
import { useUIStore } from "@/store/ui-store";

interface PenToolProps {
    surface: Surface;
}

export function PenTool({ surface }: PenToolProps) {
    const updateSurface = useProjectStore((state) => state.updateSurface);
    const addCorner = useProjectStore((state) => state.addCorner);
    const toolMode = useUIStore((state) => state.toolMode);
    const [hoveredEdge, setHoveredEdge] = useState<number | null>(null);
    const [draggingCorner, setDraggingCorner] = useState<number | null>(null);
    const { camera, gl } = useThree();

    const activeCorners = surface.corners;

    // Generate line segments for edge detection
    const edgeSegments = useMemo(() => {
        if (!activeCorners || activeCorners.length < 2) return [];
        const segments: Array<{ start: { x: number; y: number }; end: { x: number; y: number }; index: number }> = [];

        for (let i = 0; i < activeCorners.length; i++) {
            const nextIndex = (i + 1) % activeCorners.length;
            segments.push({
                start: activeCorners[i],
                end: activeCorners[nextIndex],
                index: i,
            });
        }

        return segments;
    }, [activeCorners]);

    // Generate line geometry for rendering
    const linePoints = useMemo(() => {
        if (!activeCorners) return new Float32Array(0);
        const pts: number[] = [];
        activeCorners.forEach(p => {
            pts.push(p.x, p.y, 0);
        });
        if (activeCorners.length > 0) {
            const p = activeCorners[0];
            pts.push(p.x, p.y, 0);
        }
        return new Float32Array(pts);
    }, [activeCorners]);

    if (toolMode !== "pen" || surface.locked) return null;

    // Find nearest edge to a point
    const findNearestEdge = (point: { x: number; y: number }): number | null => {
        let minDist = Infinity;
        let nearestEdge: number | null = null;
        const threshold = 0.1; // Distance threshold for edge detection

        edgeSegments.forEach((segment, idx) => {
            const dist = distanceToLineSegment(point, segment.start, segment.end);
            if (dist < minDist && dist < threshold) {
                minDist = dist;
                nearestEdge = idx;
            }
        });

        return nearestEdge;
    };

    // Calculate distance from point to line segment
    const distanceToLineSegment = (
        point: { x: number; y: number },
        start: { x: number; y: number },
        end: { x: number; y: number }
    ): number => {
        const dx = end.x - start.x;
        const dy = end.y - start.y;
        const lengthSquared = dx * dx + dy * dy;

        if (lengthSquared === 0) {
            return Math.sqrt((point.x - start.x) ** 2 + (point.y - start.y) ** 2);
        }

        let t = ((point.x - start.x) * dx + (point.y - start.y) * dy) / lengthSquared;
        t = Math.max(0, Math.min(1, t));

        const projX = start.x + t * dx;
        const projY = start.y + t * dy;

        return Math.sqrt((point.x - projX) ** 2 + (point.y - projY) ** 2);
    };

    // Handle click on canvas to add corner
    const handleCanvasClick = (event: any) => {
        event.stopPropagation();

        const rect = gl.domElement.getBoundingClientRect();
        const x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        const y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

        const vector = new THREE.Vector3(x, y, 0.5);
        vector.unproject(camera);

        const localX = vector.x - surface.position.x;
        const localY = vector.y - surface.position.y;

        const edgeIndex = findNearestEdge({ x: localX, y: localY });

        if (edgeIndex !== null) {
            // Insert corner after the clicked edge
            // Store handles the addition to both corners and sourceCorners
            addCorner(surface.id, edgeIndex + 1, { x: localX, y: localY });
        }
    };

    // Handle corner dragging
    const handleCornerDrag = (cornerIndex: number, event: any) => {
        event.stopPropagation();
        setDraggingCorner(cornerIndex);

        const onPointerMove = (e: PointerEvent) => {
            const rect = gl.domElement.getBoundingClientRect();
            const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
            const y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

            const vector = new THREE.Vector3(x, y, 0.5);
            vector.unproject(camera);

            const dx = vector.x - surface.position.x;
            const dy = vector.y - surface.position.y;
            const cos = Math.cos(-surface.rotation);
            const sin = Math.sin(-surface.rotation);
            const targetX = (dx * cos - dy * sin) / surface.scale.x;
            const targetY = (dx * sin + dy * cos) / surface.scale.y;

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

    // Handle edge hover
    const handleEdgeHover = (event: any, edgeIndex: number) => {
        event.stopPropagation();
        setHoveredEdge(edgeIndex);
        gl.domElement.style.cursor = 'crosshair';
    };

    const handleEdgeLeave = () => {
        setHoveredEdge(null);
        gl.domElement.style.cursor = 'crosshair';
    };

    const handleColor = "#22d3ee";
    const baseColor = "#7c3aed";

    return (
        <group position={[surface.position.x, surface.position.y, surface.zIndex * 0.01 + 0.1]}>
            {/* Render active corners ... */}
            {activeCorners.map((corner, index) => {
                const displayX = corner.x;
                const displayY = corner.y;

                return (
                    <mesh
                        key={`${surface.id}-corner-${index}`}
                        position={[displayX, displayY, 0]}
                        onPointerDown={(e) => handleCornerDrag(index, e)}
                        onPointerOver={() => gl.domElement.style.cursor = 'move'}
                        onPointerOut={() => gl.domElement.style.cursor = 'crosshair'}
                        scale={[1 / surface.scale.x, 1 / surface.scale.y, 1]}
                    >
                        <circleGeometry args={[0.035, 32]} />
                        <meshBasicMaterial
                            color={draggingCorner === index ? handleColor : baseColor}
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


            {/* Render edge segments for clicking */}
            {edgeSegments.map((segment, idx) => {
                const startX = segment.start.x;
                const startY = segment.start.y;
                const endX = segment.end.x;
                const endY = segment.end.y;

                const midX = (startX + endX) / 2;
                const midY = (startY + endY) / 2;
                const dx = endX - startX;
                const dy = endY - startY;
                const length = Math.sqrt(dx * dx + dy * dy);
                const angle = Math.atan2(dy, dx);

                return (
                    <mesh
                        key={`edge-${idx}`}
                        position={[midX, midY, -0.01]}
                        rotation={[0, 0, angle]}
                        onClick={handleCanvasClick}
                        onPointerOver={(e) => handleEdgeHover(e, idx)}
                        onPointerOut={handleEdgeLeave}
                    >
                        <planeGeometry args={[length, 0.08]} />
                        <meshBasicMaterial
                            color={hoveredEdge === idx ? "#06b6d4" : "#7c3aed"}
                            transparent
                            opacity={hoveredEdge === idx ? 0.3 : 0.05}
                        />
                    </mesh>
                );
            })}

            {/* Render outline */}
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
                />
            </line>
        </group>
    );
}
