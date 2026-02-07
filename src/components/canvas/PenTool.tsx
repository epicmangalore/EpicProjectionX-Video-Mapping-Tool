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

    // Generate line segments for edge detection
    const edgeSegments = useMemo(() => {
        if (!surface?.corners || surface.corners.length < 2) return [];
        const segments: Array<{ start: { x: number; y: number }; end: { x: number; y: number }; index: number }> = [];

        for (let i = 0; i < surface.corners.length; i++) {
            const nextIndex = (i + 1) % surface.corners.length;
            segments.push({
                start: surface.corners[i],
                end: surface.corners[nextIndex],
                index: i,
            });
        }

        return segments;
    }, [surface.corners]);

    // Generate line geometry for rendering
    const linePoints = useMemo(() => {
        if (!surface?.corners) return new Float32Array(0);
        const pts: number[] = [];
        surface.corners.forEach(p => pts.push(p.x, p.y, 0));
        if (surface.corners.length > 0) {
            pts.push(surface.corners[0].x, surface.corners[0].y, 0);
        }
        return new Float32Array(pts);
    }, [surface.corners]);

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

            const targetX = vector.x - surface.position.x;
            const targetY = vector.y - surface.position.y;

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
        gl.domElement.style.cursor = 'auto';
    };

    return (
        <group position={[surface.position.x, surface.position.y, surface.zIndex * 0.01 + 0.1]}>
            {/* Render existing corners */}
            {surface.corners.map((corner, index) => (
                <mesh
                    key={`${surface.id}-corner-${index}`}
                    position={[corner.x, corner.y, 0]}
                    onPointerDown={(e) => handleCornerDrag(index, e)}
                    onPointerOver={() => gl.domElement.style.cursor = 'move'}
                    onPointerOut={() => gl.domElement.style.cursor = 'crosshair'}
                >
                    <circleGeometry args={[0.035, 32]} />
                    <meshBasicMaterial
                        color={draggingCorner === index ? "#22d3ee" : "#7c3aed"}
                        transparent
                        opacity={0.9}
                    />
                    <mesh scale={[1.2, 1.2, 1]}>
                        <ringGeometry args={[0.035, 0.045, 32]} />
                        <meshBasicMaterial color="#ffffff" transparent opacity={0.3} />
                    </mesh>
                </mesh>
            ))}

            {/* Render edge segments for clicking */}
            {edgeSegments.map((segment, idx) => {
                const midX = (segment.start.x + segment.end.x) / 2;
                const midY = (segment.start.y + segment.end.y) / 2;
                const dx = segment.end.x - segment.start.x;
                const dy = segment.end.y - segment.start.y;
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
