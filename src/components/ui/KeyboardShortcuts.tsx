"use client";

import { useState, useEffect } from "react";
import { X, Keyboard } from "lucide-react";

interface ShortcutGroup {
    title: string;
    shortcuts: { keys: string[]; label: string }[];
}

const isMac =
    typeof navigator !== "undefined" &&
    (/mac/i.test(navigator.platform) || /mac/i.test(navigator.userAgent));

const CMD = isMac ? "⌘" : "Ctrl";

const SHORTCUT_GROUPS: ShortcutGroup[] = [
    {
        title: "Tools",
        shortcuts: [
            { keys: ["V"], label: "Select / Move" },
            { keys: ["C"], label: "Corner Pin" },
            { keys: ["M"], label: "Mesh Warp" },
            { keys: ["P"], label: "Pen Tool" },
            { keys: ["H"], label: "Hand / Pan" },
            { keys: [CMD, "F"], label: "Pen → Draw Mode" },
            { keys: [CMD, "E"], label: "Pen → Edit Mode" },
        ],
    },
    {
        title: "File",
        shortcuts: [
            { keys: [CMD, "S"], label: "Save Project" },
            { keys: [CMD, "O"], label: "Open Project" },
        ],
    },
    {
        title: "Edit",
        shortcuts: [
            { keys: [CMD, "Z"], label: "Undo" },
            { keys: [CMD, "⇧", "Z"], label: "Redo" },
            { keys: [CMD, "C"], label: "Copy" },
            { keys: [CMD, "V"], label: "Paste" },
            { keys: [CMD, "X"], label: "Cut" },
            { keys: [CMD, "D"], label: "Duplicate" },
            { keys: ["Del"], label: "Delete Surface" },
        ],
    },
    {
        title: "Selection",
        shortcuts: [
            { keys: [CMD, "A"], label: "Select All" },
            { keys: ["Esc"], label: "Deselect All" },
        ],
    },
    {
        title: "Arrange",
        shortcuts: [
            { keys: [CMD, "]"], label: "Bring to Front" },
            { keys: [CMD, "["], label: "Send to Back" },
        ],
    },
    {
        title: "Scenes",
        shortcuts: [
            { keys: ["1–9"], label: "Switch to Scene 1–9" },
        ],
    },
    {
        title: "Other",
        shortcuts: [
            { keys: [CMD, "M"], label: "Toggle MIDI Panel" },
            { keys: ["?"], label: "Show Keyboard Shortcuts" },
        ],
    },
];

export function KeyboardShortcuts() {
    const [open, setOpen] = useState(false);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Ignore if typing in input/textarea
            const target = e.target as HTMLElement;
            if (
                target.tagName === "INPUT" ||
                target.tagName === "TEXTAREA" ||
                target.isContentEditable
            ) {
                return;
            }

            if (e.key === "?" || (e.key === "/" && e.shiftKey)) {
                e.preventDefault();
                setOpen((prev) => !prev);
            }

            if (e.key === "Escape" && open) {
                setOpen(false);
            }
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [open]);

    if (!open) return null;

    return (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/70 backdrop-blur-sm">
            <div className="w-[640px] max-w-[90vw] max-h-[80vh] bg-zinc-900 border border-white/10 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-white/5">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-electric-cyan to-blue-500 flex items-center justify-center">
                            <Keyboard className="w-5 h-5 text-white" />
                        </div>
                        <h2 className="text-lg font-bold text-white">
                            Keyboard Shortcuts
                        </h2>
                    </div>
                    <button
                        onClick={() => setOpen(false)}
                        className="p-1.5 rounded-lg text-zinc-500 hover:text-white hover:bg-white/10 transition-colors"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {/* Scrollable content */}
                <div className="overflow-y-auto max-h-[calc(80vh-72px)] p-6">
                    <div className="grid grid-cols-2 gap-6">
                        {SHORTCUT_GROUPS.map((group) => (
                            <div key={group.title}>
                                <h3 className="text-xs font-semibold text-electric-cyan uppercase tracking-wider mb-3">
                                    {group.title}
                                </h3>
                                <div className="space-y-1.5">
                                    {group.shortcuts.map((shortcut, i) => (
                                        <div
                                            key={i}
                                            className="flex items-center justify-between py-1.5 px-2 rounded hover:bg-white/5 transition-colors"
                                        >
                                            <span className="text-sm text-zinc-300">
                                                {shortcut.label}
                                            </span>
                                            <div className="flex items-center gap-1">
                                                {shortcut.keys.map((key, j) => (
                                                    <kbd
                                                        key={j}
                                                        className="min-w-[24px] h-6 px-1.5 flex items-center justify-center text-[11px] font-mono font-medium text-zinc-300 bg-zinc-800 border border-zinc-700 rounded shadow-sm"
                                                    >
                                                        {key}
                                                    </kbd>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Footer */}
                <div className="px-6 py-3 border-t border-white/5 flex items-center justify-between">
                    <p className="text-xs text-zinc-500">
                        Press <kbd className="px-1 py-0.5 text-[10px] font-mono bg-zinc-800 border border-zinc-700 rounded">?</kbd> to toggle this overlay
                    </p>
                    <button
                        onClick={() => setOpen(false)}
                        className="px-4 py-1.5 text-sm font-medium text-zinc-300 hover:text-white bg-zinc-800 hover:bg-zinc-700 rounded-lg transition-colors"
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
}

/** Trigger button for the toolbar — opens the shortcut overlay */
export function KeyboardShortcutsButton() {
    const handleClick = () => {
        // Dispatch a fake ? keydown to toggle the overlay
        window.dispatchEvent(
            new KeyboardEvent("keydown", {
                key: "?",
                shiftKey: true,
                bubbles: true,
            })
        );
    };

    return (
        <button
            onClick={handleClick}
            className="p-1.5 rounded text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 transition-colors"
            title="Keyboard Shortcuts (?)"
        >
            <Keyboard className="w-4 h-4" />
        </button>
    );
}
