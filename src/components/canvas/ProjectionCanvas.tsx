"use client";

import { Canvas } from "@react-three/fiber";
import { OrthographicCamera, OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import { useProjectStore } from "@/store/project-store";
import { useTimelineStore } from "@/store/timeline-store";
import { useUIStore } from "@/store/ui-store";
import { Surface } from "./Surface";
import { CornerPin } from "./CornerPin";
import { MeshWarp } from "./MeshWarp";
import { PenTool } from "./PenTool";
import { CanvasFrame } from "./CanvasFrame";
import { GlobalStageMixer } from "./GlobalStageMixer";
import { useIsClient } from "@/hooks/useIsClient";

import { SurfaceTool } from "./SurfaceTool";
import { PenDrawTool } from "./PenDrawTool";
import { useOutputStore } from "@/store/output-store";
import { useAudioStore } from "@/store/audio-store";
import { useFrame } from "@react-three/fiber";
import { SelectionBox } from "./SelectionBox";
import { SnapLines } from "./SnapLines";
import { SpacebarPan } from "./SpacebarPan";

function AudioManager() {
    const updateLevels = useAudioStore((state) => state.updateLevels);
    const isOutput = useOutputStore((state) => state.isOutput);

    useFrame(() => {
        if (!isOutput) {
            updateLevels();
        }
    });

    return null;
}

export function ProjectionCanvas() {
    const isClient = useIsClient();
    const hasHydrated = useProjectStore((state) => state._hasHydrated);

    const scenes = useProjectStore((state) => state.scenes);
    const activeSceneId = useProjectStore((state) => state.activeSceneId);
    const projectSettings = useProjectStore((state) => state.projectSettings);
    const playingSceneId = projectSettings.playingSceneId;

    const isOutput = useOutputStore((state) => state.isOutput);

    // VJ Workflow Logic: 
    // - Editor window always shows the ACTIVE scene (the one being edited).
    // - Output window shows the PLAYING (LIVE) scene, falling back to active.
    const renderSceneId = isOutput ? (playingSceneId || activeSceneId) : activeSceneId;

    const activeScene = scenes.find(s => s.id === renderSceneId);
    const surfaces = activeScene?.surfaces || [];

    const selectedIds = useProjectStore((state) => state.selectedSurfaceIds);
    const isTimelinePlaying = useTimelineStore((state) => state.isPlaying);
    const deselectAll = useProjectStore((state) => state.deselectAll);
    const setCanvasHovered = useUIStore((state) => state.setCanvasHovered);

    if (!isClient || !hasHydrated) {
        return <div className="w-full h-full bg-black/20 animate-pulse" />;
    }

    return (
        <div
            className="w-full h-full"
            onPointerEnter={() => setCanvasHovered(true)}
            onPointerLeave={() => setCanvasHovered(false)}
        >
            <Canvas
                frameloop={projectSettings.paused && !isTimelinePlaying ? "never" : "always"}
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

                {/* Background plane to catch 'empty' clicks for deselection */}
                {!isOutput && (
                    <mesh
                        position={[0, 0, -1]}
                        onPointerDown={(e) => {
                            if (e.button === 0) deselectAll();
                        }}
                    >
                        <planeGeometry args={[1000, 1000]} />
                        <meshBasicMaterial transparent opacity={0} />
                    </mesh>
                )}

                {/* Ambient light for visibility */}
                <ambientLight intensity={1} />

                {/* Canvas frame indicator */}
                <CanvasFrame />

                {/* Marquee Selection Box */}
                {!isOutput && <SelectionBox />}

                {/* Snap Lines */}
                {!isOutput && <SnapLines />}

                {/* Surface Creation Tool */}
                {!isOutput && <SurfaceTool />}

                {/* Pen Draw Tool (polygon surface creation) */}
                {!isOutput && <PenDrawTool />}

                {/* Render all surfaces */}
                {surfaces.map((surface) => (
                    <Surface key={surface.id} surface={surface} />
                ))}

                {/* Orbit Controls for Pan/Zoom */}
                <OrbitControls
                    makeDefault
                    enableRotate={false}
                    enablePan={!isOutput}
                    enableZoom={!isOutput}
                    mouseButtons={{
                        LEFT: undefined, // Surface selection/dragging handles left click
                        MIDDLE: THREE.MOUSE.PAN,
                        RIGHT: THREE.MOUSE.PAN
                    }}
                />

                {/* Background & Global Mix Logic */}
                <GlobalStageMixer />

                {/* Surfaces rendering */}
                <SpacebarPan />
                <AudioManager />
            </Canvas>
        </div>
    );
}
