"use client";

import { Canvas } from "@react-three/fiber";
import { OrthographicCamera, OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import { useProjectStore } from "@/store/project-store";
import { Surface } from "./Surface";
import { CornerPin } from "./CornerPin";
import { MeshWarp } from "./MeshWarp";
import { PenTool } from "./PenTool";
import { CanvasFrame } from "./CanvasFrame";

export function ProjectionCanvas() {
    const surfaces = useProjectStore((state) => state.surfaces);
    const selectedIds = useProjectStore((state) => state.selectedSurfaceIds);
    const projectSettings = useProjectStore((state) => state.projectSettings);

    return (
        <Canvas
            frameloop={projectSettings.paused ? "never" : "always"}
            gl={{
                antialias: true,
                alpha: true,
                preserveDrawingBuffer: true,
            }}
            style={{
                width: "100%",
                height: "100%",
                background: projectSettings.backgroundColor,
            }}
        >
            {/* Orthographic camera for 2D projection mapping */}
            <OrthographicCamera
                makeDefault
                position={[0, 0, 5]}
                zoom={100}
                near={0.1}
                far={1000}
            />

            {/* Ambient light for visibility */}
            <ambientLight intensity={1} />

            {/* Canvas frame indicator */}
            <CanvasFrame />

            {/* Render all surfaces */}
            {surfaces.map((surface) => (
                <Surface key={surface.id} surface={surface} />
            ))}

            {/* Render corner-pin or mesh-warp controls for selected surfaces */}
            {surfaces
                .filter((surface) => selectedIds.includes(surface.id))
                .map((surface) => (
                    <group key={`controls-${surface.id}`}>
                        <CornerPin surface={surface} />
                        <MeshWarp surface={surface} />
                        <PenTool surface={surface} />
                    </group>
                ))}
            {/* Orbit Controls for Pan/Zoom */}
            <OrbitControls
                makeDefault
                enableRotate={false}
                enablePan={true}
                enableZoom={true}
                mouseButtons={{
                    LEFT: undefined, // Create/Select logic handles left click
                    MIDDLE: THREE.MOUSE.PAN,
                    RIGHT: THREE.MOUSE.PAN
                }}
            />
        </Canvas>
    );
}
