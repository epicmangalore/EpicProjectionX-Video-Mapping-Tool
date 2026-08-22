"use client";

import { useRef, useState, useEffect } from "react";
import { useThree } from "@react-three/fiber";
import { Line } from "@react-three/drei";
import * as THREE from "three";
import { useProjectStore, type Surface, type Vector2 } from "@/store/project-store";
import { useSnapping } from "@/hooks/useSnapping";

interface ResizeHandlesProps {
    surface: Surface;
}

type HandlePosition = "tl" | "t" | "tr" | "r" | "br" | "b" | "bl" | "l" | "rotation";

export function ResizeHandles({ surface }: ResizeHandlesProps) {
    const { camera, gl } = useThree();
    const updateSurface = useProjectStore((state) => state.updateSurface);
    const saveHistory = useProjectStore((state) => state.saveHistory);
    const { prepareSnap, checkSnap, clearSnap } = useSnapping();
    const [dragging, setDragging] = useState<HandlePosition | null>(null);
    const startData = useRef<{
        pos: Vector2;
        scale: Vector2;
        rotation: number;
        corners: Vector2[];
        mouse: THREE.Vector3;
        aspect: number;
    } | null>(null);

    const handleDown = (e: any, pos: HandlePosition) => {
        e.stopPropagation();
        saveHistory();
        setDragging(pos);

        const rect = gl.domElement.getBoundingClientRect();
        const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        const y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
        const mouseVector = new THREE.Vector3(x, y, 0.5).unproject(camera);

        startData.current = {
            pos: { ...surface.position },
            scale: { ...surface.scale },
            rotation: surface.rotation,
            corners: JSON.parse(JSON.stringify(surface.corners)),
            mouse: mouseVector,
            aspect: surface.scale.x / surface.scale.y,
        };

        // Prepare snap lines (exclude current surface)
        prepareSnap([surface.id]);

        const onPointerMove = (moveEvent: PointerEvent) => {
            if (!startData.current) return;

            const mx = ((moveEvent.clientX - rect.left) / rect.width) * 2 - 1;
            const my = -((moveEvent.clientY - rect.top) / rect.height) * 2 + 1;
            const currentMouse = new THREE.Vector3(mx, my, 0.5).unproject(camera);

            const dx = currentMouse.x - startData.current.mouse.x;
            const dy = currentMouse.y - startData.current.mouse.y;

            if (pos === "rotation") {
                // Rotation logic
                const centerX = startData.current.pos.x;
                const centerY = startData.current.pos.y;
                const startAngle = Math.atan2(
                    startData.current.mouse.y - centerY,
                    startData.current.mouse.x - centerX
                );
                const currentAngle = Math.atan2(
                    currentMouse.y - centerY,
                    currentMouse.x - centerX
                );
                let delta = currentAngle - startAngle;

                // Snap to 15 degrees if shift is pressed
                let nextRotation = startData.current.rotation + delta;
                if (moveEvent.shiftKey) {
                    const step = Math.PI / 12; // 15 degrees
                    nextRotation = Math.round(nextRotation / step) * step;
                }

                updateSurface(surface.id, { rotation: nextRotation });
                return;
            }

            // Distort logic (Cmd/Meta key)
            if (moveEvent.metaKey || moveEvent.ctrlKey) {
                // Only corners can distort easily in this UI
                const cornerMap: Record<string, number> = { "tl": 0, "tr": 1, "br": 2, "bl": 3 };
                const index = cornerMap[pos];

                if (index !== undefined) {
                    // Rotate mouse delta to local space
                    const cos = Math.cos(-surface.rotation);
                    const sin = Math.sin(-surface.rotation);
                    const ldx = dx * cos - dy * sin;
                    const ldy = dx * sin + dy * cos;

                    const newCorners = [...startData.current.corners];
                    newCorners[index] = {
                        x: startData.current.corners[index].x + ldx / surface.scale.x,
                        y: startData.current.corners[index].y + ldy / surface.scale.y
                    };
                    updateSurface(surface.id, { corners: newCorners });
                    return;
                }
            }

            // Standard Scaling logic
            // Rotate delta to match surface rotation
            const cos = Math.cos(-surface.rotation);
            const sin = Math.sin(-surface.rotation);
            const rdx = dx * cos - dy * sin;
            const rdy = dx * sin + dy * cos;

            let nextScaleX = startData.current.scale.x;
            let nextScaleY = startData.current.scale.y;

            const shiftPressed = moveEvent.shiftKey;
            const altPressed = moveEvent.altKey;

            // Calculate scale changes based on handle
            if (pos.includes("r")) nextScaleX = startData.current.scale.x + (altPressed ? rdx * 2 : rdx);
            if (pos.includes("l")) nextScaleX = startData.current.scale.x - (altPressed ? rdx * 2 : rdx);
            if (pos.includes("b")) nextScaleY = startData.current.scale.y - (altPressed ? rdy * 2 : rdy);
            if (pos.includes("t")) nextScaleY = startData.current.scale.y + (altPressed ? rdy * 2 : rdy);

            // Constrain minimum scale
            nextScaleX = Math.max(0.01, nextScaleX);
            nextScaleY = Math.max(0.01, nextScaleY);

            const shouldLockAspect = (shiftPressed && (pos === "tl" || pos === "tr" || pos === "bl" || pos === "br")) || surface.aspectRatioLocked;

            if (shouldLockAspect) {
                if (pos === "tl" || pos === "tr" || pos === "bl" || pos === "br") {
                    const absDX = Math.abs(nextScaleX - startData.current.scale.x);
                    const absDY = Math.abs(nextScaleY - startData.current.scale.y);

                    if (absDX > absDY) {
                        nextScaleY = nextScaleX / startData.current.aspect;
                    } else {
                        nextScaleX = nextScaleY * startData.current.aspect;
                    }
                } else if (pos === "l" || pos === "r") {
                    nextScaleY = nextScaleX / startData.current.aspect;
                } else if (pos === "t" || pos === "b") {
                    nextScaleX = nextScaleY * startData.current.aspect;
                }
            }

            let worldOffsetX = 0;
            let worldOffsetY = 0;

            if (!altPressed) {
                const dsx = nextScaleX - startData.current.scale.x;
                const dsy = nextScaleY - startData.current.scale.y;

                let localOffsetX = 0;
                let localOffsetY = 0;

                if (pos.includes("r")) localOffsetX = dsx / 2;
                if (pos.includes("l")) localOffsetX = -dsx / 2;
                if (pos.includes("b")) localOffsetY = -dsy / 2;
                if (pos.includes("t")) localOffsetY = dsy / 2;

                worldOffsetX = localOffsetX * Math.cos(surface.rotation) - localOffsetY * Math.sin(surface.rotation);
                worldOffsetY = localOffsetX * Math.sin(surface.rotation) + localOffsetY * Math.cos(surface.rotation);
            }


            // Define activeSnap - for now always true, or we can add a toggle later
            const activeSnap = true;

            // --- SNAPPING INTEGRATION START ---
            // Only snap if not rotating, not distorting, and not holding Shift (maybe?)
            // For now, let's keep it simple: Snap only if no modifier keys (or maybe just Alt allowed?)
            // And mostly for non-rotated surfaces for best UX initially.
            // But let's try to support it generally.

            // We need to know which edge is moving.
            // Construct the proposed AABB of the surface
            // This is actually hard because we only know scale/pos.
            // If rotation is 0:
            // MinX = pos.x - scale.x/2
            // MaxX = pos.x + scale.x/2
            // etc.

            if (activeSnap && Math.abs(surface.rotation) < 0.1) { // Only snap if roughly axis aligned for now
                const halfW = nextScaleX / 2;
                const halfH = nextScaleY / 2;
                const nextX = startData.current.pos.x + worldOffsetX;
                const nextY = startData.current.pos.y + worldOffsetY;

                // Check snapping
                const snap = checkSnap({
                    center: { x: nextX, y: nextY },
                    min: { x: nextX - halfW, y: nextY - halfH },
                    max: { x: nextX + halfW, y: nextY + halfH }
                });

                // Apply Snap Offset
                // If we snap X, we need to adjust Scale X and Position X
                // This depends on WHICH handle we are holding.
                // If 'r' handle: 
                //   newRight = currentRight + offset
                //   position changes by offset/2
                //   scale changes by offset

                // This is getting complicated to back-calculate standard logic.
                // Simpler: Apply snap to the world position offset directly? 
                // No, that moves the whole object. Resizing means moving an edge.

                // Let's rely on visual feedback for now or implement smart logic later?
                // User wants "Snapping System".
                // Let's implement snapping for the HANDLE position.

                // Actually, if we just adjust `worldOffsetX` and `nextScaleX`...
                // If I snap the right edge, `nextScaleX` increases by `snap.x`. `worldOffsetX` increases by `snap.x / 2`.
                // Let's try to apply the snap offset to the dimensions.

                if (snap.offset.x !== 0 || snap.offset.y !== 0) {
                    // We need to know if the snap applies to the edge we are moving.
                    // checkSnap returns offset for ANY matched edge.

                    // If moving 'r', we care about Max X match.
                    // If moving 'l', we care about Min X match.

                    // For now, let's just create the visual lines using checkSnap but NOT force the value
                    // to avoid jumpy resizing until we have robust math?
                    // No, user wants snapping.

                    // Let's try a simple approach: verify which edge snapped in checkSnap?
                    // checkSnap logic is: find closest match.

                    // We can just add the offset to the relevant dimension if it makes sense.

                    // If dragging 'r':
                    if (pos.includes('r')) {
                        nextScaleX += snap.offset.x * (altPressed ? 2 : 1);
                        if (!altPressed) worldOffsetX += snap.offset.x / 2;
                    }
                    if (pos.includes('l')) {
                        nextScaleX -= snap.offset.x * (altPressed ? 2 : 1);
                        if (!altPressed) worldOffsetX += snap.offset.x / 2;
                    }
                    if (pos.includes('t')) {
                        nextScaleY += snap.offset.y * (altPressed ? 2 : 1);
                        if (!altPressed) worldOffsetY += snap.offset.y / 2;
                    }
                    if (pos.includes('b')) {
                        nextScaleY -= snap.offset.y * (altPressed ? 2 : 1);
                        if (!altPressed) worldOffsetY += snap.offset.y / 2;
                    }
                }
            }
            // --- SNAPPING INTEGRATION END ---

            updateSurface(surface.id, {
                scale: { x: nextScaleX, y: nextScaleY },
                position: { x: startData.current.pos.x + worldOffsetX, y: startData.current.pos.y + worldOffsetY }
            });
        };

        const onPointerUp = () => {
            setDragging(null);
            clearSnap();
            window.removeEventListener("pointermove", onPointerMove);
            window.removeEventListener("pointerup", onPointerUp);
        };

        window.addEventListener("pointermove", onPointerMove);
        window.addEventListener("pointerup", onPointerUp);
    };

    const handleSize = 0.07;
    const handlePositions: { pos: HandlePosition; x: number; y: number }[] = [
        { pos: "tl", x: -0.5, y: 0.5 },
        { pos: "t", x: 0, y: 0.5 },
        { pos: "tr", x: 0.5, y: 0.5 },
        { pos: "r", x: 0.5, y: 0 },
        { pos: "br", x: 0.5, y: -0.5 },
        { pos: "b", x: 0, y: -0.5 },
        { pos: "bl", x: -0.5, y: -0.5 },
        { pos: "l", x: -0.5, y: 0 },
        { pos: "rotation", x: 0, y: 0.65 }, // Photoshop style lollipop
    ];

    return (
        <group position={[0, 0, 0.05]}>
            {/* Connection line for rotation handle */}
            <Line
                points={[[0, 0.5, 0], [0, 0.65, 0]]}
                color="#00f3ff"
                lineWidth={1}
                transparent
                opacity={0.5}
            />

            {handlePositions.map((h) => (
                <mesh
                    key={h.pos}
                    position={[h.x, h.y, 0]}
                    onPointerDown={(e) => handleDown(e, h.pos)}
                    onPointerOver={(e) => {
                        e.stopPropagation();
                        if (h.pos === "rotation") gl.domElement.style.cursor = "crosshair";
                        else gl.domElement.style.cursor = "pointer";
                    }}
                    onPointerOut={() => {
                        gl.domElement.style.cursor = "default";
                    }}
                >
                    {h.pos === "rotation" ? (
                        <circleGeometry args={[handleSize / surface.scale.x / 1.5, 32]} />
                    ) : (
                        <planeGeometry args={[handleSize / surface.scale.x, handleSize / surface.scale.y]} />
                    )}
                    <meshBasicMaterial color={h.pos === "rotation" ? "#00f3ff" : "white"} depthTest={false} />
                    <lineSegments>
                        <edgesGeometry args={[
                            h.pos === "rotation"
                                ? new THREE.CircleGeometry(handleSize / surface.scale.x / 1.5, 32)
                                : new THREE.PlaneGeometry(handleSize / surface.scale.x, handleSize / surface.scale.y)
                        ]} />
                        <lineBasicMaterial color="#00f3ff" depthTest={false} />
                    </lineSegments>
                </mesh>
            ))}
        </group>
    );
}
