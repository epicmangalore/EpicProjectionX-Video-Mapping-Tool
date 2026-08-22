import { Line } from "@react-three/drei";
import { useMemo, useRef } from "react";
import type { Surface as SurfaceType } from "@/store/project-store";
import { useFrame } from "@react-three/fiber";
import { useGroupStore } from "@/store/group-store";

interface SurfaceBorderProps {
    surface: SurfaceType;
}

export function SurfaceBorder({ surface }: SurfaceBorderProps) {
    const lineRef = useRef<any>(null);
    const glowRef = useRef<any>(null);

    // Group visual indicator
    const group = useGroupStore((state) =>
        surface.groupId
            ? state.groups.find((g) => g.id === surface.groupId)
            : undefined
    );

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

    if (!surface.border?.enabled && !group) return null;

    const hasBorder = surface.border?.enabled;
    const borderStyle = hasBorder ? surface.border!.style : "solid";
    const borderWidth = hasBorder ? surface.border!.width : 0;
    const borderColor = hasBorder ? surface.border!.color : "#ffffff";
    const borderOpacity = hasBorder ? surface.border!.opacity : 1;
    const borderGlow = hasBorder ? surface.border!.glow : 0;
    const dashed = borderStyle === "dashed" || borderStyle === "dotted" || (hasBorder && surface.border!.animation === "march");
    const dashSize = borderStyle === "dotted" ? borderWidth * 0.1 : borderWidth * 2;
    const gapSize = borderStyle === "dotted" ? borderWidth * 2 : borderWidth;

    return (
        <>
            {/* User-defined border */}
            {hasBorder && (
                <>
                    <Line
                        ref={lineRef}
                        points={borderPoints}
                        color={borderColor}
                        lineWidth={borderWidth}
                        transparent
                        opacity={borderOpacity}
                        dashed={dashed}
                        dashScale={1}
                        dashSize={dashSize}
                        gapSize={gapSize}
                        toneMapped={false}
                    />
                    {/* Inner Glow Layer */}
                    {borderGlow > 0 && (
                        <Line
                            ref={glowRef}
                            points={borderPoints}
                            color={borderColor}
                            lineWidth={borderWidth * 2}
                            transparent
                            opacity={borderOpacity * 0.3 * borderGlow}
                            dashed={dashed}
                            dashScale={1}
                            dashSize={dashSize}
                            gapSize={gapSize}
                            toneMapped={false}
                            depthTest={false}
                        />
                    )}
                </>
            )}

            {/* Group color outline */}
            {group && (
                <Line
                    points={borderPoints}
                    color={group.color}
                    lineWidth={1.5}
                    transparent
                    opacity={0.6}
                    toneMapped={false}
                    depthTest={false}
                />
            )}
        </>
    );
}
