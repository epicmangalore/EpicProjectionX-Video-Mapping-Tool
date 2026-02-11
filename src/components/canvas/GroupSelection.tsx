"use client";

import { useGroupStore } from "@/store/group-store";
import * as THREE from "three";
import { useUIStore } from "@/store/ui-store";

export function GroupSelection() {
    const selectedGroupId = useGroupStore((state) => state.selectedGroupId);
    const groups = useGroupStore((state) => state.groups);
    const toolMode = useUIStore((state) => state.toolMode);

    const group = groups.find((g) => g.id === selectedGroupId);

    if (!group || !selectedGroupId) return null;

    // Wrap group to look like a surface for ResizeHandles
    // ResizeHandles expects a Surface object and uses updateSurface
    // We can swap the update function or wrap ResizeHandles

    // For now, let's create a specialized GroupResizeHandles or 
    // just use standard ResizeHandles with a shim if possible.

    // Actually, ResizeHandles is tightly coupled with useProjectStore.updateSurface.
    // I should probably have a more generic ResizeHandles or 
    // just copy the logic for groups.

    return (
        <group
            position={[group.position.x, group.position.y, 0.5]} // Render above surfaces
            rotation={[0, 0, group.rotation]}
            scale={[group.scale.x, group.scale.y, 1]}
        >
            {/* Group Outline */}
            <mesh position={[0, 0, 0]}>
                <lineSegments>
                    <edgesGeometry args={[new THREE.PlaneGeometry(1, 1)]} />
                    <lineBasicMaterial color={group.color} linewidth={2} transparent opacity={0.8} />
                </lineSegments>
            </mesh>

            {/* Resize Handles */}
            {(toolMode === "select" || toolMode === "transform") && (
                <GroupHandles group={group} />
            )}
        </group>
    );
}

import { useRef, useState } from "react";
import { useThree, type ThreeEvent } from "@react-three/fiber";
import { Line } from "@react-three/drei";
import { type SurfaceGroup } from "@/store/group-store";
import { type Vector2 } from "@/store/project-store";

function GroupHandles({ group }: { group: SurfaceGroup }) {
    const { camera, gl } = useThree();
    const updateGroup = useGroupStore((state) => state.updateGroup);
    // Note: No snapping for groups yet to keep it simple, or we can add it later
    const [, setDragging] = useState<string | null>(null);
    const startData = useRef<{
        pos: Vector2;
        scale: Vector2;
        rotation: number;
        mouse: THREE.Vector3;
        aspect: number;
    } | null>(null);

    const handleDown = (e: ThreeEvent<PointerEvent>, pos: string) => {
        e.stopPropagation();
        setDragging(pos);

        const rect = gl.domElement.getBoundingClientRect();
        const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        const y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
        const mouseVector = new THREE.Vector3(x, y, 0.5).unproject(camera);

        startData.current = {
            pos: { ...group.position },
            scale: { ...group.scale },
            rotation: group.rotation,
            mouse: mouseVector,
            aspect: group.scale.x / group.scale.y,
        };

        const onPointerMove = (moveEvent: PointerEvent) => {
            if (!startData.current) return;

            const mx = ((moveEvent.clientX - rect.left) / rect.width) * 2 - 1;
            const my = -((moveEvent.clientY - rect.top) / rect.height) * 2 + 1;
            const currentMouse = new THREE.Vector3(mx, my, 0.5).unproject(camera);

            const dx = currentMouse.x - startData.current.mouse.x;
            const dy = currentMouse.y - startData.current.mouse.y;

            if (pos === "rotation") {
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
                const delta = currentAngle - startAngle;

                let nextRotation = startData.current.rotation + delta;
                if (moveEvent.shiftKey) {
                    const step = Math.PI / 12;
                    nextRotation = Math.round(nextRotation / step) * step;
                }

                updateGroup(group.id, { rotation: nextRotation });
                return;
            }

            // Standard Scaling logic (similar to ResizeHandles but for Group)
            const cos = Math.cos(-group.rotation);
            const sin = Math.sin(-group.rotation);
            const rdx = dx * cos - dy * sin;
            const rdy = dx * sin + dy * cos;

            let nextScaleX = startData.current.scale.x;
            let nextScaleY = startData.current.scale.y;

            const shiftPressed = moveEvent.shiftKey;
            const altPressed = moveEvent.altKey;

            if (pos.includes("r")) nextScaleX = startData.current.scale.x + (altPressed ? rdx * 2 : rdx);
            if (pos.includes("l")) nextScaleX = startData.current.scale.x - (altPressed ? rdx * 2 : rdx);
            if (pos.includes("b")) nextScaleY = startData.current.scale.y - (altPressed ? rdy * 2 : rdy);
            if (pos.includes("t")) nextScaleY = startData.current.scale.y + (altPressed ? rdy * 2 : rdy);

            nextScaleX = Math.max(0.01, nextScaleX);
            nextScaleY = Math.max(0.01, nextScaleY);

            const shouldLockAspect = (shiftPressed && (pos === "tl" || pos === "tr" || pos === "bl" || pos === "br")) || group.aspectRatioLocked;

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

                worldOffsetX = localOffsetX * Math.cos(group.rotation) - localOffsetY * Math.sin(group.rotation);
                worldOffsetY = localOffsetX * Math.sin(group.rotation) + localOffsetY * Math.cos(group.rotation);
            }

            updateGroup(group.id, {
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

    const handleSize = 0.07;
    const handlePositions = [
        { pos: "tl", x: -0.5, y: 0.5 },
        { pos: "t", x: 0, y: 0.5 },
        { pos: "tr", x: 0.5, y: 0.5 },
        { pos: "r", x: 0.5, y: 0 },
        { pos: "br", x: 0.5, y: -0.5 },
        { pos: "b", x: 0, y: -0.5 },
        { pos: "bl", x: -0.5, y: -0.5 },
        { pos: "l", x: -0.5, y: 0 },
        { pos: "rotation", x: 0, y: 0.65 },
    ];

    return (
        <group>
            <Line
                points={[[0, 0.5, 0], [0, 0.65, 0]]}
                color={group.color}
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
                        gl.domElement.style.cursor = h.pos === "rotation" ? "crosshair" : "pointer";
                    }}
                    onPointerOut={() => {
                        gl.domElement.style.cursor = "default";
                    }}
                >
                    {h.pos === "rotation" ? (
                        <circleGeometry args={[handleSize / group.scale.x / 1.5, 32]} />
                    ) : (
                        <planeGeometry args={[handleSize / group.scale.x, handleSize / group.scale.y]} />
                    )}
                    <meshBasicMaterial color={h.pos === "rotation" ? group.color : "white"} depthTest={false} />
                    <lineSegments>
                        <edgesGeometry args={[
                            h.pos === "rotation"
                                ? new THREE.CircleGeometry(handleSize / group.scale.x / 1.5, 32)
                                : new THREE.PlaneGeometry(handleSize / group.scale.x, handleSize / group.scale.y)
                        ]} />
                        <lineBasicMaterial color={group.color} depthTest={false} />
                    </lineSegments>
                </mesh>
            ))}
        </group>
    );
}
