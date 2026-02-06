"use client";

import { Canvas } from "@react-three/fiber";
import { OrthographicCamera } from "@react-three/drei";
import { useProjectStore } from "@/store/project-store";
import { Surface } from "./Surface";

export function ProjectionCanvas() {
    const surfaces = useProjectStore((state) => state.surfaces);
    const projectSettings = useProjectStore((state) => state.projectSettings);

    return (
        <Canvas
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

            {/* Render all surfaces */}
            {surfaces.map((surface) => (
                <Surface key={surface.id} surface={surface} />
            ))}
        </Canvas>
    );
}
