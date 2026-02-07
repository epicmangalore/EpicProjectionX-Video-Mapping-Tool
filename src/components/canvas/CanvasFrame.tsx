"use client";

import { useMemo } from "react";
import { Html } from "@react-three/drei";
import { useProjectStore } from "@/store/project-store";

export function CanvasFrame() {
    const settings = useProjectStore((state) => state.projectSettings);
    const showFrame = settings.showCanvasFrame;
    const showSafeArea = settings.showSafeArea;

    // Convert resolution to canvas units (divide by 100 for scaling)
    const width = settings.resolution.width / 100;
    const height = settings.resolution.height / 100;

    // Calculate safe area (90% of frame)
    const safeWidth = width * 0.9;
    const safeHeight = height * 0.9;

    // Generate frame outline points
    const framePoints = useMemo(() => {
        const halfW = width / 2;
        const halfH = height / 2;
        return new Float32Array([
            -halfW, -halfH, 0,  // Top-left
            halfW, -halfH, 0,   // Top-right
            halfW, halfH, 0,    // Bottom-right
            -halfW, halfH, 0,   // Bottom-left
            -halfW, -halfH, 0,  // Close the loop
        ]);
    }, [width, height]);

    // Generate safe area outline points
    const safeAreaPoints = useMemo(() => {
        const halfW = safeWidth / 2;
        const halfH = safeHeight / 2;
        return new Float32Array([
            -halfW, -halfH, 0,
            halfW, -halfH, 0,
            halfW, halfH, 0,
            -halfW, halfH, 0,
            -halfW, -halfH, 0,
        ]);
    }, [safeWidth, safeHeight]);

    if (!showFrame) return null;

    return (
        <group position={[0, 0, -0.1]}>
            {/* Main frame outline */}
            <line>
                <bufferGeometry>
                    <bufferAttribute
                        attach="attributes-position"
                        count={5}
                        array={framePoints}
                        itemSize={3}
                    />
                </bufferGeometry>
                <lineBasicMaterial
                    color="#00f0ff"
                    linewidth={2}
                    transparent
                    opacity={0.6}
                    depthTest={false}
                />
            </line>

            {/* Safe area outline (optional) */}
            {showSafeArea && (
                <line>
                    <bufferGeometry>
                        <bufferAttribute
                            attach="attributes-position"
                            count={5}
                            array={safeAreaPoints}
                            itemSize={3}
                        />
                    </bufferGeometry>
                    <lineDashedMaterial
                        color="#00f0ff"
                        linewidth={1}
                        transparent
                        opacity={0.3}
                        dashSize={0.1}
                        gapSize={0.1}
                        depthTest={false}
                    />
                </line>
            )}

            {/* Resolution label at top */}
            <Html
                position={[0, height / 2 + 0.3, 0]}
                center
                style={{
                    pointerEvents: 'none',
                    userSelect: 'none',
                }}
            >
                <div className="text-xs font-mono text-cyan-400 bg-zinc-900/80 px-2 py-1 rounded border border-cyan-400/30 shadow-lg backdrop-blur-sm">
                    {settings.resolution.width} × {settings.resolution.height}
                </div>
            </Html>

            {/* Corner labels (optional) */}
            <Html
                position={[-width / 2 - 0.2, height / 2 + 0.2, 0]}
                style={{
                    pointerEvents: 'none',
                    userSelect: 'none',
                }}
            >
                <div className="text-[10px] font-mono text-cyan-400/50">
                    0,0
                </div>
            </Html>
        </group>
    );
}
