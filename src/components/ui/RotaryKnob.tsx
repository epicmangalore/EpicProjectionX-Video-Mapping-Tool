import React, { useState, useEffect, useRef } from 'react';

interface RotaryKnobProps {
    value: number;
    min: number;
    max: number;
    step?: number;
    label?: string;
    onChange: (value: number) => void;
    size?: number;
    color?: string;
    formatValue?: (val: number) => string;
    defaultValue?: number;
}

export function RotaryKnob({
    value,
    min,
    max,
    step = 1,
    label,
    onChange,
    size = 64,
    color = "#00f0ff", // electric-cyan default
    formatValue,
    defaultValue
}: RotaryKnobProps) {
    const [isDragging, setIsDragging] = useState(false);
    const startY = useRef<number>(0);
    const startValue = useRef<number>(0);

    // Calculate rotation (-135 to 135 degrees)
    const percentage = (value - min) / (max - min);
    const rotation = -135 + (percentage * 270);

    const handleMouseDown = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(true);
        startY.current = e.clientY;
        startValue.current = value;
        document.body.style.cursor = 'ns-resize';
        document.body.style.userSelect = 'none';
    };

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (!isDragging) return;

            e.preventDefault();
            e.stopPropagation();

            const deltaY = startY.current - e.clientY;
            // Sensitivity: full range in 200px drag
            const range = max - min;
            const deltaValue = (deltaY / 200) * range;

            let newValue = startValue.current + deltaValue;

            // Snap to step
            if (step) {
                newValue = Math.round(newValue / step) * step;
            }

            newValue = Math.max(min, Math.min(max, newValue));

            // Only call onChange if value actually changed
            if (newValue !== value) {
                onChange(newValue);
            }
        };

        const handleMouseUp = (e: MouseEvent) => {
            e.preventDefault();
            setIsDragging(false);
            document.body.style.cursor = 'default';
            document.body.style.userSelect = '';
        };

        if (isDragging) {
            window.addEventListener('mousemove', handleMouseMove, { passive: false });
            window.addEventListener('mouseup', handleMouseUp);
        }

        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
            document.body.style.cursor = 'default';
            document.body.style.userSelect = '';
        };
    }, [isDragging, min, max, onChange, step, value]);

    // SVG Geometry
    const radius = size * 0.4;
    const center = size / 2;
    const strokeWidth = size * 0.1;

    // Background Arc
    const startAngle = -135 * (Math.PI / 180);
    const endAngle = 135 * (Math.PI / 180);

    const describeArc = (x: number, y: number, radius: number, startAngle: number, endAngle: number) => {
        const start = {
            x: x + (radius * Math.cos(endAngle)),
            y: y + (radius * Math.sin(endAngle))
        };
        const end = {
            x: x + (radius * Math.cos(startAngle)),
            y: y + (radius * Math.sin(startAngle))
        };
        const largeArcFlag = endAngle - startAngle <= Math.PI ? "0" : "1";
        return [
            "M", start.x, start.y,
            "A", radius, radius, 0, largeArcFlag, 0, end.x, end.y
        ].join(" ");
    };

    return (
        <div className="flex flex-col items-center gap-1 select-none group">
            <div
                className="relative cursor-ns-resize"
                style={{ width: size, height: size }}
                onMouseDown={handleMouseDown}
                onDoubleClick={() => {
                    if (defaultValue !== undefined) onChange(defaultValue);
                }}
            >
                <svg width={size} height={size} className="overflow-visible">
                    {/* Tick Marks Ring (Decorative) */}
                    {Array.from({ length: 11 }).map((_, i) => {
                        const angle = -135 + (i * 27);
                        const rad = angle * (Math.PI / 180);
                        const innerR = size * 0.55;
                        const outerR = size * 0.65;
                        return (
                            <line
                                key={i}
                                x1={center + innerR * Math.cos(rad)}
                                y1={center + innerR * Math.sin(rad)}
                                x2={center + outerR * Math.cos(rad)}
                                y2={center + outerR * Math.sin(rad)}
                                stroke={i % 5 === 0 ? "rgba(255,255,255,0.4)" : "rgba(255,255,255,0.1)"}
                                strokeWidth={1}
                            />
                        );
                    })}

                    {/* Background Track */}
                    <path
                        d={describeArc(center, center, radius, startAngle, endAngle)}
                        fill="none"
                        stroke="#1a1a1a"
                        strokeWidth={strokeWidth}
                        strokeLinecap="round"
                    />

                    {/* Knob Body */}
                    <circle cx={center} cy={center} r={radius * 0.7} fill="#27272a" className="group-hover:fill-zinc-700 transition-colors" />

                    {/* Indicator Line on Knob */}
                    <g transform={`rotate(${rotation}, ${center}, ${center})`} className="transition-transform duration-75">
                        <line
                            x1={center}
                            y1={center - (radius * 0.3)}
                            x2={center}
                            y2={center - (radius * 0.7)}
                            stroke="white"
                            strokeWidth="2"
                            strokeLinecap="round"
                        />
                    </g>
                </svg>
            </div>

            {/* Label and Value */}
            <div className="text-center flex flex-col items-center">
                {label && <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">{label}</span>}
                <span className="text-xs font-mono text-zinc-300">
                    {formatValue ? formatValue(value) : value.toFixed(1)}
                </span>
            </div>
        </div>
    );
}
