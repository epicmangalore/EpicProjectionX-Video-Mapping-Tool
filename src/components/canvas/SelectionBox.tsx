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
    const boxRef = useRef<THREE.Mesh>(null);

    useEffect(() => {
        if (toolMode !== "select") return;

        const handlePointerDown = (e: PointerEvent) => {
            // Only left click on the actual canvas (background)
            if (e.button !== 0 || (e.target as HTMLElement).tagName !== "CANVAS") return;

            // We need to check if we hit a surface first. 
            // In Three.js, we can use raycaster, but since we are in R3F, 
            // the background catch-all plane in ProjectionCanvas will handle deselection.
            // This component just handles the marquee.

            const rect = gl.domElement.getBoundingClientRect();
            const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
            const y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

            const startVec = new THREE.Vector3(x, y, 0).unproject(camera);
            setDragStart(startVec);
            setDragEnd(startVec);
        };

        const handlePointerMove = (e: PointerEvent) => {
            if (!dragStart) return;

            const rect = gl.domElement.getBoundingClientRect();
            const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
            const y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

            const endVec = new THREE.Vector3(x, y, 0).unproject(camera);
            setDragEnd(endVec);
        };

        const handlePointerUp = () => {
            if (dragStart && dragEnd) {
                // Calculate selection
                const minX = Math.min(dragStart.x, dragEnd.x);
                const maxX = Math.max(dragStart.x, dragEnd.x);
                const minY = Math.min(dragStart.y, dragEnd.y);
                const maxY = Math.max(dragStart.y, dragEnd.y);

                // Simple AABB check for now (ignoring rotation for the marquee itself)
                // In Figma, selection usually hits the bounding box
                const newlySelected: string[] = [];

                surfaces.forEach(surface => {
                    // Primitive check: surface center is inside marquee
                    // Better check: surface bounding box overlaps marquee
                    const sHalfW = surface.scale.x / 2;
                    const sHalfH = surface.scale.y / 2;

                    const sMinX = surface.position.x - sHalfW;
                    const sMaxX = surface.position.x + sHalfW;
                    const sMinY = surface.position.y - sHalfH;
                    const sMaxY = surface.position.y + sHalfH;

                    const overlaps = !(maxX < sMinX || minX > sMaxX || maxY < sMinY || minY > sMaxY);

                    if (overlaps) {
                        newlySelected.push(surface.id);
                    }
                });

                if (newlySelected.length > 0) {
                    newlySelected.forEach((id, idx) => {
                        selectSurface(id, idx > 0);
                    });
                } else if (Math.abs(dragStart.x - dragEnd.x) < 0.01 && Math.abs(dragStart.y - dragEnd.y) < 0.01) {
                    // It was a click on background, handled by ProjectionCanvas
                }
            }
            setDragStart(null);
            setDragEnd(null);
        };

        gl.domElement.addEventListener("pointerdown", handlePointerDown);
        window.addEventListener("pointermove", handlePointerMove);
        window.addEventListener("pointerup", handlePointerUp);

        return () => {
            gl.domElement.removeEventListener("pointerdown", handlePointerDown);
            window.removeEventListener("pointermove", handlePointerMove);
            window.removeEventListener("pointerup", handlePointerUp);
        };
    }, [dragStart, dragEnd, camera, gl, surfaces, selectSurface, toolMode]);

    if (!dragStart || !dragEnd) return null;

    const width = Math.abs(dragEnd.x - dragStart.x);
    const height = Math.abs(dragEnd.y - dragStart.y);
    const centerX = (dragStart.x + dragEnd.x) / 2;
    const centerY = (dragStart.y + dragEnd.y) / 2;

    return (
        <mesh position={[centerX, centerY, 10]}>
            <planeGeometry args={[width, height]} />
            <meshBasicMaterial
                color="#7c3aed"
                transparent
                opacity={0.15}
                side={THREE.DoubleSide}
            />
            <lineSegments>
                <edgesGeometry args={[new THREE.PlaneGeometry(width, height)]} />
                <lineBasicMaterial color="#a78bfa" transparent opacity={0.5} />
            </lineSegments>
        </mesh>
    );
}
