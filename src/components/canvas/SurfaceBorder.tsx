import { Line } from "@react-three/drei";
import { useMemo } from "react";
import type { Surface as SurfaceType } from "@/store/project-store";
import * as THREE from "three";

interface SurfaceBorderProps {
    surface: SurfaceType;
}

export function SurfaceBorder({ surface }: SurfaceBorderProps) {
    const borderPoints = useMemo(() => {
        // Map corners to 3D points
        const points = surface.corners.map(c => [c.x, c.y, 0] as [number, number, number]);

        // Close the loop if we have points
        if (points.length > 0) {
            points.push(points[0]);
        }

        return points;
    }, [surface.corners]);

    if (!surface.border) return null;

    return (
        <>
            <Line
                points={borderPoints}
                color={surface.border.color}
                lineWidth={surface.border.width}
                transparent
                opacity={surface.border.opacity}
                toneMapped={false} // Crucial for neon glow with bloom
            />
            {/* Inner Glow Layer (Optional, for extra bloom pop) */}
            {surface.border.glow > 0 && (
                <Line
                    points={borderPoints}
                    color={surface.border.color}
                    lineWidth={surface.border.width * 2}
                    transparent
                    opacity={surface.border.opacity * 0.3 * surface.border.glow}
                    toneMapped={false}
                    depthTest={false} // Draw on top
                />
            )}
        </>
    );
}
