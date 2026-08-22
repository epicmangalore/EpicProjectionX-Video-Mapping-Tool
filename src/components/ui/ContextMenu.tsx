"use client";

import React, { useState, useEffect, useRef } from "react";

interface ContextMenuItem {
    label: string;
    icon?: React.ReactNode;
    shortcut?: string;
    onClick: () => void;
    danger?: boolean;
    disabled?: boolean;
}

interface ContextMenuProps {
    children: React.ReactNode;
    items: (ContextMenuItem | "separator")[];
}

export function ContextMenu({ children, items }: ContextMenuProps) {
    const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
    const menuRef = useRef<HTMLDivElement>(null);

    const handleContextMenu = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();

        // Ensure menu stays within viewport
        const x = Math.min(e.clientX, window.innerWidth - 180);
        const y = Math.min(e.clientY, window.innerHeight - 300);

        setPos({ x, y });
    };

    const close = () => setPos(null);

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
                close();
            }
        };

        if (pos) {
            window.addEventListener("mousedown", handleClickOutside);
            window.addEventListener("scroll", close, true);
        }

        return () => {
            window.removeEventListener("mousedown", handleClickOutside);
            window.removeEventListener("scroll", close, true);
        };
    }, [pos]);

    return (
        <div onContextMenu={handleContextMenu} className="w-full h-full">
            {children}

            {pos && (
                <div
                    ref={menuRef}
                    className="fixed z-[1000] w-48 bg-zinc-900/95 border border-white/10 rounded-lg shadow-2xl backdrop-blur-md py-1.5 overflow-hidden animate-in fade-in zoom-in-95 duration-100"
                    style={{ left: pos.x, top: pos.y }}
                >
                    {items.map((item, idx) => {
                        if (item === "separator") {
                            return <div key={`sep-${idx}`} className="h-px bg-white/5 my-1.5 mx-2" />;
                        }

                        return (
                            <button
                                key={item.label}
                                disabled={item.disabled}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    item.onClick();
                                    close();
                                }}
                                className={`w-full flex items-center justify-between px-3 py-1.5 text-xs transition-colors
                                    ${item.disabled
                                        ? "opacity-30 cursor-not-allowed"
                                        : item.danger
                                            ? "text-red-400 hover:bg-red-500/20 hover:text-red-300"
                                            : "text-zinc-300 hover:bg-white/10 hover:text-white"
                                    }`}
                            >
                                <div className="flex items-center gap-2.5">
                                    <span className="opacity-70 group-hover:opacity-100">{item.icon}</span>
                                    <span>{item.label}</span>
                                </div>
                                {item.shortcut && (
                                    <span className="text-[9px] opacity-40 font-mono tracking-tighter">
                                        {item.shortcut}
                                    </span>
                                )}
                            </button>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
