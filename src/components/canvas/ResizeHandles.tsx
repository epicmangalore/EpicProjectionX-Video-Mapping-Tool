"use client";

import { useRef, useState, useEffect } from "react";
import { useThree } from "@react-three/fiber";
import * as THREE from "three";
import { useProjectStore, type Surface, type Vector2 } from "@/store/project-store";

interface ResizeHandlesProps {
    surface: Surface;
}

type HandlePosition = "tl" | "t" | "tr" | "r" | "br" | "b" | "bl" | "l";

export function ResizeHandles({ surface }: ResizeHandlesProps) {
    const { camera, gl } = useThree();
    const updateSurface = useProjectStore((state) => state.updateSurface);
    const saveHistory = useProjectStore((state) => state.saveHistory);
    const [dragging, setDragging] = useState<HandlePosition | null>(null);
    const startData = useRef<{
        pos: Vector2;
        scale: Vector2;
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
            mouse: mouseVector,
            aspect: surface.scale.x / surface.scale.y,
        };

        const onPointerMove = (moveEvent: PointerEvent) => {
            if (!startData.current) return;

            const mx = ((moveEvent.clientX - rect.left) / rect.width) * 2 - 1;
            const my = -((moveEvent.clientY - rect.top) / rect.height) * 2 + 1;
            const currentMouse = new THREE.Vector3(mx, my, 0.5).unproject(camera);

            const dx = currentMouse.x - startData.current.mouse.x;
            const dy = currentMouse.y - startData.current.mouse.y;

            // Rotate delta to match surface rotation
            const cos = Math.cos(-surface.rotation);
            const sin = Math.sin(-surface.rotation);
            const rdx = dx * cos - dy * sin;
            const rdy = dx * sin + dy * cos;

            let nextScaleX = startData.current.scale.x;
            let nextScaleY = startData.current.scale.y;
            let nextPosX = startData.current.pos.x;
            let nextPosY = startData.current.pos.y;

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

            // Shift key or Aspect Lock: Proportionate scaling
            // Aspect lock acts as a permanent Shift key for corner handles
            // AND forces proportionate scaling for side handles
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
                    // Side handle X axis: adjust Y to match aspect
                    nextScaleY = nextScaleX / startData.current.aspect;
                } else if (pos === "t" || pos === "b") {
                    // Side handle Y axis: adjust X to match aspect
                    nextScaleX = nextScaleY * startData.current.aspect;
                }
            }

            // Calculate position offset to keep opposite side fixed (or keep center if Alt)
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

                // Rotate local offset back to world space
                worldOffsetX = localOffsetX * Math.cos(surface.rotation) - localOffsetY * Math.sin(surface.rotation);
                worldOffsetY = localOffsetX * Math.sin(surface.rotation) + localOffsetY * Math.cos(surface.rotation);
            }

            updateSurface(surface.id, {
                scale: { x: nextScaleX, y: nextScaleY },
                position: { x: startData.current.pos.x + worldOffsetX, y: startData.current.pos.y + worldOffsetY }
            });
        };

        const onPointerUp = () => {
            setDragging(null);
            window.removeEventListener("pointermove", onPointerMove);
            window.removeEventListener("pointerup", onPointerUp);
        };

        window.addEventListener("pointermove", onPointerMove);
        window.addEventListener("pointerup", onPointerUp);
    };

    const handleSize = 0.08;
    const handlePositions: { pos: HandlePosition; x: number; y: number }[] = [
        { pos: "tl", x: -0.5, y: 0.5 },
        { pos: "t", x: 0, y: 0.5 },
        { pos: "tr", x: 0.5, y: 0.5 },
        { pos: "r", x: 0.5, y: 0 },
        { pos: "br", x: 0.5, y: -0.5 },
        { pos: "b", x: 0, y: -0.5 },
        { pos: "bl", x: -0.5, y: -0.5 },
        { pos: "l", x: -0.5, y: 0 },
    ];

    return (
        <group position={[0, 0, 0.05]}>
            {handlePositions.map((h) => (
                <mesh
                    key={h.pos}
                    position={[h.x, h.y, 0]}
                    onPointerDown={(e) => handleDown(e, h.pos)}
                    onPointerOver={(e) => {
                        e.stopPropagation();
                        gl.domElement.style.cursor = "pointer";
                    }}
                    onPointerOut={() => {
                        gl.domElement.style.cursor = "default";
                    }}
                >
                    <planeGeometry args={[handleSize / surface.scale.x, handleSize / surface.scale.y]} />
                    <meshBasicMaterial color="white" depthTest={false} />
                    {/* Border for handles */}
                    <lineSegments>
                        <edgesGeometry args={[new THREE.PlaneGeometry(handleSize / surface.scale.x, handleSize / surface.scale.y)]} />
                        <lineBasicMaterial color="#7c3aed" depthTest={false} />
                    </lineSegments>
                </mesh>
            ))}
        </group>
    );
}
