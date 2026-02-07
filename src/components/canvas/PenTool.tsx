"use client";

import { useState, useMemo, useRef } from "react";
import { useThree } from "@react-three/fiber";
import * as THREE from "three";
import type { Surface, Vector2 } from "@/store/project-store";
import { useProjectStore } from "@/store/project-store";
import { useUIStore } from "@/store/ui-store";

interface PenToolProps {
    surface: Surface;
}

export function PenTool({ surface }: PenToolProps) {
    const updateSurface = useProjectStore((state) => state.updateSurface);
    const addCorner = useProjectStore((state) => state.addCorner);
    const saveHistory = useProjectStore((state) => state.saveHistory);
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

    const groupRef = useRef<THREE.Group>(null);

    // Handle click on canvas to add corner
    const handleCanvasClick = (event: any) => {
        event.stopPropagation();

        if (!groupRef.current) return;

        // Convert click point to local space
        // We use the groupRef which represents the surface's local space (unscaled if we put it before scale? No, Surface group handles scale)
        // Wait, Surface structure is: Group(Pos, Rot, Scale) -> PenTool Group
        // So PenTool is in Scaled Local Space.
        // But corners are stored in "Unit" Local Space (before scale?)
        // Let's check Surface.tsx:
        // <group scale={[surface.scale.x, surface.scale.y, 1]}> ... <PenTool /> ... </group>
        // Yes.
        // So `worldToLocal` on the PenTool group will give us coordinates in the Scaled space ?
        // Actually Three.js `worldToLocal` accounts for all parent transforms.
        // So if we have Group(Scale) -> Child, `Child.worldToLocal` converts world to Child's local (which includes the effect of parent scale).
        // BUT `surface.corners` are defined such that they are multiplied by scale to get final size?
        // Let's see `handleCornerDrag` in original code:
        // const targetX = (dx * cos ... ) / surface.scale.x;
        // It divides by scale.
        // This implies corners are stored in "Unscaled" space (e.g. -0.5 to 0.5 for a 1x1 unit).
        // So if `groupRef` is inside the scaled group, `worldToLocal` gives us coords in that scaled space.
        // e.g. if Scale=2, clicking at X=1 (World) -> Local=0.5.
        // So we DON'T need to manually divide by scale if we use worldToLocal on the group?
        // Let's test:
        // World 0 -> Local 0
        // World 1, Scale 2 -> Local 0.5.
        // Yes, worldToLocal handles the scale division implicitly.

        const localPoint = groupRef.current.worldToLocal(event.point.clone());

        // Find nearest edge in this local space
        const edgeIndex = findNearestEdge({ x: localPoint.x, y: localPoint.y });

        if (edgeIndex !== null) {
            addCorner(surface.id, edgeIndex + 1, { x: localPoint.x, y: localPoint.y } as Vector2);
        }
    };

    // Handle corner dragging
    const handleCornerDrag = (cornerIndex: number, event: any) => {
        event.stopPropagation();
        saveHistory();
        setDraggingCorner(cornerIndex);

        const onPointerMove = (e: PointerEvent) => {
            if (!groupRef.current) return;

            // We need to raycast again because 'e' is a raw DOM event, not R3F event
            // Standard idiom: Project mouse to plane.
            // But simpler: just use the logic we had but corrected?
            // "Poor man's raycast" using unproject works if we do the math right.
            // OR we can rely on the fact that we are dragging on a 2D plane.

            const rect = gl.domElement.getBoundingClientRect();
            const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
            const y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

            const vector = new THREE.Vector3(x, y, 0.5);
            vector.unproject(camera);

            // Now convert this world vector to local space
            const localPoint = groupRef.current.worldToLocal(vector);

            // Correction: unproject puts it at z=0.5 NDC -> ?? World Z.
            // This is NOT accurate intersection with the surface plane.
            // It only works if the camera is orthographic or we are lucky.
            // Better: Raycast against the group's plane.

            const raycaster = new THREE.Raycaster();
            raycaster.setFromCamera(new THREE.Vector2(x, y), camera);

            // Intersect with an infinite plane defined by the group's transform?
            // Or just intersect a virtual plane mesh.
            // We can intersect the groupRef itself? No, it's a group.
            // We can intersect the edgeSegments meshes? No, we might drag outside them.

            // Plan B: Plane intersection math.
            const planeNormal = new THREE.Vector3(0, 0, 1).applyQuaternion(groupRef.current.getWorldQuaternion(new THREE.Quaternion()));
            const planePoint = groupRef.current.getWorldPosition(new THREE.Vector3());
            const plane = new THREE.Plane().setFromNormalAndCoplanarPoint(planeNormal, planePoint);

            const target = new THREE.Vector3();
            raycaster.ray.intersectPlane(plane, target);

            if (target) {
                const localPos = groupRef.current.worldToLocal(target);
                const newCorners = [...surface.corners];
                newCorners[cornerIndex] = { x: localPos.x, y: localPos.y } as Vector2;
                updateSurface(surface.id, { corners: newCorners });
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

    // IMPORTANT: Remove position from here, as parent handles it.
    // Keep local Z offset for visibility.
    return (
        <group ref={groupRef} position={[0, 0, 0.1]}>
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
