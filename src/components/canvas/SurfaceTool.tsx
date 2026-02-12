"use client";

import { useRef, useState } from "react";
import { useThree } from "@react-three/fiber";
import * as THREE from "three";
import { useProjectStore } from "@/store/project-store";
import { useUIStore } from "@/store/ui-store";
import { generateId } from "@/lib/utils";

export function SurfaceTool() {
    const { camera, gl } = useThree();
    const addSurface = useProjectStore((state) => state.addSurface);
    const addMediaAsset = useProjectStore((state) => state.addMediaAsset);
    const updateSurface = useProjectStore((state) => state.updateSurface);
    const setToolMode = useUIStore((state) => state.setToolMode);
    const toolMode = useUIStore((state) => state.toolMode);

    const [dragStart, setDragStart] = useState<THREE.Vector3 | null>(null);
    const [dragEnd, setDragEnd] = useState<THREE.Vector3 | null>(null);
    const dragStartRef = useRef<THREE.Vector3 | null>(null);
    const dragEndRef = useRef<THREE.Vector3 | null>(null);

    const handlePointerDown = (e: any) => {
        if (toolMode !== "surface" || e.button !== 0) return;
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

            // Unproject from screen to world space
            const endVec = new THREE.Vector3(mx, my, 0).unproject(camera);

            // Constrain to square if Shift is pressed
            if (moveEvent.shiftKey && dragStartRef.current) {
                const dx = endVec.x - dragStartRef.current.x;
                const dy = endVec.y - dragStartRef.current.y;
                const size = Math.max(Math.abs(dx), Math.abs(dy));
                endVec.x = dragStartRef.current.x + Math.sign(dx) * size;
                endVec.y = dragStartRef.current.y + Math.sign(dy) * size;
            }

            setDragEnd(endVec);
            dragEndRef.current = endVec;
        };

        const handlePointerUp = (upEvent: PointerEvent) => {
            const finalStart = dragStartRef.current;
            const finalEnd = dragEndRef.current;

            setDragStart(null);
            setDragEnd(null);
            dragStartRef.current = null;
            dragEndRef.current = null;

            window.removeEventListener("pointermove", handlePointerMove);
            window.removeEventListener("pointerup", handlePointerUp);

            if (finalStart && finalEnd) {
                const width = Math.abs(finalEnd.x - finalStart.x);
                const height = Math.abs(finalEnd.y - finalStart.y);

                // Photoshop behavior: don't create tiny rectangles from accidental clicks
                if (width < 0.05 && height < 0.05) return;

                let centerX = (finalStart.x + finalEnd.x) / 2;
                let centerY = (finalStart.y + finalEnd.y) / 2;
                let finalWidth = width;
                let finalHeight = height;

                // Alternate behavior: Draw from center if Alt is pressed
                if (upEvent.altKey) {
                    finalWidth = width * 2;
                    finalHeight = height * 2;
                    centerX = finalStart.x;
                    centerY = finalStart.y;
                }

                // Create the surface
                const mediaId = generateId();
                addMediaAsset({
                    id: mediaId,
                    name: "Gray Fill",
                    type: "color",
                    color: "#808080",
                });

                // We use addSurface which creates a default surface, 
                // then we update its position and scale.
                // Note: projectStore.addSurface automatically selects the new surface.
                addSurface(mediaId);

                // Need a small timeout to ensure the surface is in the store 
                // Alternatively, we could modify addSurface to accept position/scale
                // but for now we'll find the last added surface and update it.
                // A better way would be to get the ID from addSurface if it returned it.
                // Since addSurface is async-ish (zustand), we'll use a hack or 
                // just wait for the next frame.
                setTimeout(() => {
                    const state = useProjectStore.getState();
                    const activeSurfaces = state.getActiveSurfaces();
                    const newSurface = activeSurfaces[activeSurfaces.length - 1];
                    if (newSurface) {
                        updateSurface(newSurface.id, {
                            position: { x: centerX, y: centerY },
                            scale: { x: finalWidth, y: finalHeight },
                            corners: [
                                { x: -0.5, y: 0.5 },
                                { x: 0.5, y: 0.5 },
                                { x: 0.5, y: -0.5 },
                                { x: -0.5, y: -0.5 },
                            ]
                        });
                    }
                }, 0);

                // Switch back to select tool
                setToolMode("select");
            }
        };

        window.addEventListener("pointermove", handlePointerMove);
        window.addEventListener("pointerup", handlePointerUp);
    };

    return (
        <>
            {/* Background plane to catch drawing start */}
            <mesh
                position={[0, 0, -0.5]}
                onPointerDown={handlePointerDown}
                visible={toolMode === "surface"}
            >
                <planeGeometry args={[1000, 1000]} />
                <meshBasicMaterial transparent opacity={0} depthWrite={false} />
            </mesh>

            {dragStart && dragEnd && (
                <mesh position={[
                    (dragStart.x + dragEnd.x) / 2,
                    (dragStart.y + dragEnd.y) / 2,
                    0.2
                ]}>
                    <planeGeometry args={[
                        Math.abs(dragEnd.x - dragStart.x),
                        Math.abs(dragEnd.y - dragStart.y)
                    ]} />
                    <meshBasicMaterial color="#00f3ff" transparent opacity={0.2} side={THREE.DoubleSide} />
                    <lineSegments>
                        <edgesGeometry args={[new THREE.PlaneGeometry(
                            Math.abs(dragEnd.x - dragStart.x),
                            Math.abs(dragEnd.y - dragStart.y)
                        )]} />
                        <lineBasicMaterial color="#00f3ff" transparent opacity={0.8} />
                    </lineSegments>
                </mesh>
            )}
        </>
    );
}
