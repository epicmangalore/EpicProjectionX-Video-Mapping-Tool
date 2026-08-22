import React from "react";
import { Line } from "@react-three/drei";
import { useUIStore } from "@/store/ui-store";

export function SnapLines() {
    const activeSnapLines = useUIStore((state) => state.activeSnapLines);

    if (activeSnapLines.length === 0) return null;

    return (
        <group position={[0, 0, 10]}> {/* Render on top */}
            {activeSnapLines.map((line) => {
                if (line.type === "vertical") {
                    return (
                        <Line
                            key={line.id}
                            points={[[line.position, -100, 0], [line.position, 100, 0]]} // Extend far
                            color="#ff0000"
                            lineWidth={1}
                            dashed={false}
                        />
                    );
                } else {
                    return (
                        <Line
                            key={line.id}
                            points={[[-100, line.position, 0], [100, line.position, 0]]} // Extend far
                            color="#ff0000"
                            lineWidth={1}
                            dashed={false}
                        />
                    );
                }
            })}
        </group>
    );
}
