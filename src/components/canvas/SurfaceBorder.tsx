import { Line } from "@react-three/drei";
import { useMemo, useRef } from "react";
import type { Surface as SurfaceType } from "@/store/project-store";
import { useFrame } from "@react-three/fiber";

interface SurfaceBorderProps {
    surface: SurfaceType;
}

export function SurfaceBorder({ surface }: SurfaceBorderProps) {
    const lineRef = useRef<any>(null);
    const glowRef = useRef<any>(null);

    const borderPoints = useMemo(() => {
        // Map corners to 3D points
        const points = surface.corners.map(c => [c.x, c.y, 0] as [number, number, number]);

        // Close the loop if we have points
        if (points.length > 0) {
            points.push(points[0]);
        }

        return points;
    }, [surface.corners]);

    useFrame((state) => {
        if (!surface.border?.enabled) return;
        if (!lineRef.current) return;

        const { animation, animationSpeed = 1, width, opacity } = surface.border;
        const speed = animationSpeed * 0.5;
        const time = state.clock.getElapsedTime();

        // 1. Dash Offset Animation (Marching Ants)
        if (animation === "march" && lineRef.current.material) {
            // Uniform assumes the material has dashOffset capability (Line2 usually does via displacement or uniform)
            // standard Line material from drei uses LineMaterial which has dashOffset
            if (lineRef.current.material.uniforms?.dashOffset) {
                lineRef.current.material.uniforms.dashOffset.value -= speed * 0.01;
            }
        }

        // 2. Pulse Animation (Width)
        if (animation === "pulse") {
            const scale = 1 + Math.sin(time * speed * 2) * 0.2; // +/- 20% width
            lineRef.current.material.linewidth = width * scale;
            if (glowRef.current) glowRef.current.material.linewidth = width * 2 * scale;
        } else {
            // Reset defaults if not pulsing
            if (lineRef.current.material.linewidth !== width) {
                lineRef.current.material.linewidth = width;
            }
        }

        // 3. Breathe Animation (Opacity)
        if (animation === "breathe") {
            const breathe = 0.5 + 0.5 * Math.sin(time * speed * 2); // 0 to 1
            const targetOpacity = opacity * (0.3 + 0.7 * breathe); // Min 30% opacity
            lineRef.current.material.opacity = targetOpacity;
            if (glowRef.current) glowRef.current.material.opacity = targetOpacity * 0.3 * surface.border.glow;
        }

        // 4. Flicker Animation
        else if (animation === "flicker") {
            if (Math.random() > 0.8) {
                const flicker = 0.5 + Math.random() * 0.5;
                lineRef.current.material.opacity = opacity * flicker;
            } else {
                lineRef.current.material.opacity = opacity;
            }
        }
        else {
            // Reset opacity
            if (lineRef.current.material.opacity !== opacity) {
                lineRef.current.material.opacity = opacity;
            }
        }
    });

    if (!surface.border?.enabled) return null;

    const { style, width, color, opacity, glow } = surface.border;
    const dashed = style === "dashed" || style === "dotted" || surface.border.animation === "march";
    // For dotted, we use a different dash ratio, or just small dashes
    const dashSize = style === "dotted" ? width * 0.1 : width * 2; // Dotted = small squares roughly
    const gapSize = style === "dotted" ? width * 2 : width;

    return (
        <>
            <Line
                ref={lineRef}
                points={borderPoints}
                color={color}
                lineWidth={width}
                transparent
                opacity={opacity}
                dashed={dashed}
                dashScale={1}
                dashSize={dashSize}
                gapSize={gapSize}
                toneMapped={false}
            />
            {/* Inner Glow Layer */}
            {glow > 0 && (
                <Line
                    ref={glowRef}
                    points={borderPoints}
                    color={color}
                    lineWidth={width * 2}
                    transparent
                    opacity={opacity * 0.3 * glow}
                    dashed={dashed}
                    dashScale={1}
                    dashSize={dashSize}
                    gapSize={gapSize}
                    toneMapped={false}
                    depthTest={false} // Draw on top
                />
            )}
        </>
    );
}
