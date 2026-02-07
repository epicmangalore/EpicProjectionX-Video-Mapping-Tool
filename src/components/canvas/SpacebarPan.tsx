"use client";

import { useEffect, useRef } from "react";
import { useThree } from "@react-three/fiber";
import { OrbitControls as OrbitControlsImpl } from "three-stdlib";

export function SpacebarPan() {
    const { camera, gl, controls } = useThree();
    const isPanning = useRef(false);
    const spacePressed = useRef(false);
    const lastMouse = useRef({ x: 0, y: 0 });

    useEffect(() => {
        const canvas = gl.domElement;
        const orbitControls = controls as unknown as OrbitControlsImpl;

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.code === "Space" && !spacePressed.current) {
                spacePressed.current = true;
                canvas.style.cursor = "grab";
                e.preventDefault();
            }
        };

        const handleKeyUp = (e: KeyboardEvent) => {
            if (e.code === "Space") {
                spacePressed.current = false;
                isPanning.current = false;
                canvas.style.cursor = "default";
            }
        };

        const handleMouseDown = (e: MouseEvent) => {
            if (spacePressed.current && e.button === 0) {
                isPanning.current = true;
                lastMouse.current = { x: e.clientX, y: e.clientY };
                canvas.style.cursor = "grabbing";
                e.preventDefault();
                e.stopPropagation();
            }
        };

        const handleMouseMove = (e: MouseEvent) => {
            if (isPanning.current && spacePressed.current && orbitControls) {
                const deltaX = e.clientX - lastMouse.current.x;
                const deltaY = e.clientY - lastMouse.current.y;

                // Pan both camera and target together to move the view
                const zoom = (camera as any).zoom || 100;
                const panSpeed = 1 / zoom;

                const panX = -deltaX * panSpeed;
                const panY = deltaY * panSpeed;

                // Move both camera and target
                camera.position.x += panX;
                camera.position.y += panY;
                orbitControls.target.x += panX;
                orbitControls.target.y += panY;

                orbitControls.update();

                lastMouse.current = { x: e.clientX, y: e.clientY };
                e.preventDefault();
                e.stopPropagation();
            }
        };

        const handleMouseUp = (e: MouseEvent) => {
            if (isPanning.current) {
                isPanning.current = false;
                canvas.style.cursor = spacePressed.current ? "grab" : "default";
                e.preventDefault();
                e.stopPropagation();
            }
        };

        window.addEventListener("keydown", handleKeyDown);
        window.addEventListener("keyup", handleKeyUp);
        canvas.addEventListener("mousedown", handleMouseDown, true);
        canvas.addEventListener("mousemove", handleMouseMove, true);
        canvas.addEventListener("mouseup", handleMouseUp, true);

        return () => {
            window.removeEventListener("keydown", handleKeyDown);
            window.removeEventListener("keyup", handleKeyUp);
            canvas.removeEventListener("mousedown", handleMouseDown, true);
            canvas.removeEventListener("mousemove", handleMouseMove, true);
            canvas.removeEventListener("mouseup", handleMouseUp, true);
        };
    }, [camera, gl, controls]);

    return null;
}
