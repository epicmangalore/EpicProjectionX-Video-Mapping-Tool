"use client";

import { useRef, useState, useEffect } from "react";
import { useThree, useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { useProjectStore } from "@/store/project-store";
import { useUIStore } from "@/store/ui-store";

export function SelectionBox() {
    const { camera, gl, scene } = useThree();
    const deselectedAll = useProjectStore((state) => state.deselectAll);
    const selectSurface = useProjectStore((state) => state.selectSurface);
    const surfaces = useProjectStore((state) => state.surfaces);
    const toolMode = useUIStore((state) => state.toolMode);

    const [dragStart, setDragStart] = useState<THREE.Vector3 | null>(null);
    const [dragEnd, setDragEnd] = useState<THREE.Vector3 | null>(null);
    const dragStartRef = useRef<THREE.Vector3 | null>(null);
    const dragEndRef = useRef<THREE.Vector3 | null>(null);

    const handlePointerDown = (e: any) => {
        if (toolMode !== "select" || e.button !== 0) return;
        e.stopPropagation();

        const x = e.intersections[0]?.point.x || 0;
        const y = e.intersections[0]?.point.y || 0;
        const startVec = new THREE.Vector3(x, y, 0);

        setDragStart(startVec);
        setDragEnd(startVec);
        dragStartRef.current = startVec;
        dragEndRef.current = startVec;

        const handlePointerMove = (moveEvent: PointerEvent) => {
            const rect = gl.domElement.getBoundingClientRect();
            const mx = ((moveEvent.clientX - rect.left) / rect.width) * 2 - 1;
            const my = -((moveEvent.clientY - rect.top) / rect.height) * 2 + 1;
            const endVec = new THREE.Vector3(mx, my, 0).unproject(camera);
            setDragEnd(endVec);
            dragEndRef.current = endVec;
        };

        const handlePointerUp = () => {
            const finalStart = dragStartRef.current;
            const finalEnd = dragEndRef.current;

            setDragStart(null);
            setDragEnd(null);
            dragStartRef.current = null;
            dragEndRef.current = null;

            window.removeEventListener("pointermove", handlePointerMove);
            window.removeEventListener("pointerup", handlePointerUp);

            if (finalStart && finalEnd) {
                const minX = Math.min(finalStart.x, finalEnd.x);
                const maxX = Math.max(finalStart.x, finalEnd.x);
                const minY = Math.min(finalStart.y, finalEnd.y);
                const maxY = Math.max(finalStart.y, finalEnd.y);

                const newlySelected: string[] = [];
                surfaces.forEach(surface => {
                    const sHalfW = surface.scale.x / 2;
                    const sHalfH = surface.scale.y / 2;
                    const sMinX = surface.position.x - sHalfW;
                    const sMaxX = surface.position.x + sHalfW;
                    const sMinY = surface.position.y - sHalfH;
                    const sMaxY = surface.position.y + sHalfH;

                    const overlaps = !(maxX < sMinX || minX > sMaxX || maxY < sMinY || minY > sMaxY);
                    if (overlaps) newlySelected.push(surface.id);
                });

                if (newlySelected.length > 0) {
                    newlySelected.forEach((id, idx) => selectSurface(id, idx > 0));
                }
            }
        };

        window.addEventListener("pointermove", handlePointerMove);
        window.addEventListener("pointerup", handlePointerUp);
    };

    return (
        <>
            {/* Background plane to catch selection start */}
            <mesh
                position={[0, 0, -0.5]}
                onPointerDown={handlePointerDown}
            >
                <planeGeometry args={[1000, 1000]} />
                <meshBasicMaterial transparent opacity={0} depthWrite={false} />
            </mesh>

            {dragStart && dragEnd && (
                <mesh position={[(dragStart.x + dragEnd.x) / 2, (dragStart.y + dragEnd.y) / 2, 0.1]}>
                    <planeGeometry args={[Math.abs(dragEnd.x - dragStart.x), Math.abs(dragEnd.y - dragStart.y)]} />
                    <meshBasicMaterial color="#7c3aed" transparent opacity={0.15} side={THREE.DoubleSide} />
                    <lineSegments>
                        <edgesGeometry args={[new THREE.PlaneGeometry(Math.abs(dragEnd.x - dragStart.x), Math.abs(dragEnd.y - dragStart.y))]} />
                        <lineBasicMaterial color="#a78bfa" transparent opacity={0.5} />
                    </lineSegments>
                </mesh>
            )}
        </>
    );
}
