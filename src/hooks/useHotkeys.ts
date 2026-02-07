import { useEffect } from "react";

interface HotkeyConfig {
    key: string | string[];
    ctrl?: boolean;
    shift?: boolean;
    alt?: boolean;
    callback: () => void;
    description?: string;
}

export function useHotkeys(hotkeys: HotkeyConfig[], enabled = true) {
    useEffect(() => {
        if (!enabled) return;

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

            for (const hotkey of hotkeys) {
                // Normalize key to lower case for comparison
                const keys = Array.isArray(hotkey.key) ? hotkey.key : [hotkey.key];
                const keyMatch = keys.some(k => e.key.toLowerCase() === k.toLowerCase());

                // On Mac, Command key triggers metaKey. We treat 'ctrl' config as 'Cmd' on Mac.
                // Robust Mac detection using platform (legacy) and userAgent (modern fallback)
                const isMac = (navigator.platform?.toUpperCase().indexOf('MAC') >= 0) ||
                    (navigator.userAgent?.toUpperCase().indexOf('MAC') >= 0);
                const ctrlPressed = isMac ? e.metaKey : e.ctrlKey;

                const ctrlMatch = hotkey.ctrl ? ctrlPressed : !ctrlPressed;
                const shiftMatch = hotkey.shift ? e.shiftKey : !e.shiftKey;
                const altMatch = hotkey.alt ? e.altKey : !e.altKey;

                if (keyMatch && ctrlMatch && shiftMatch && altMatch) {
                    e.preventDefault();
                    hotkey.callback();
                    return; // Stop processing after first match
                }
            }
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [hotkeys, enabled]);
}

// Predefined hotkeys for the application
export const APP_HOTKEYS = {
    // Tool modes
    SELECT_MODE: "v",
    TRANSFORM_MODE: "t",
    CORNER_PIN_MODE: "c",
    MESH_WARP_MODE: "m",
    PEN_MODE: "p",
    HAND_MODE: "h",

    // Actions
    DELETE: ["Delete", "Backspace"],
    DUPLICATE: { key: "d", ctrl: true }, // Cmd+D
    SAVE: { key: "s", ctrl: true }, // Cmd+S
    UNDO: { key: "z", ctrl: true }, // Cmd+Z
    REDO: { key: "z", ctrl: true, shift: true }, // Cmd+Shift+Z
    COPY: { key: "c", ctrl: true }, // Cmd+C
    PASTE: { key: "v", ctrl: true }, // Cmd+V
    CUT: { key: "x", ctrl: true }, // Cmd+X
    SELECT_ALL: { key: "a", ctrl: true }, // Cmd+A
    GROUP: { key: "g", ctrl: true }, // Cmd+G
    UNGROUP: { key: "g", ctrl: true, shift: true }, // Cmd+Shift+G
    BRING_FORWARD: { key: "]", ctrl: true }, // Cmd+]
    SEND_BACKWARD: { key: "[", ctrl: true }, // Cmd+[

    // Selection
    DESELECT_ALL: "Escape",

    // Playback
    PLAY_PAUSE: " ", // Spacebar
    STOP: "Escape",

    // View
    FULLSCREEN: "f11",
    Recursive_Expand: { key: "Enter", alt: true }, // Alt+Enter to expand/collapse recursive

    // Cues (1-9)
    CUE_1: "1",
    CUE_2: "2",
    CUE_3: "3",
    CUE_4: "4",
    CUE_5: "5",
    CUE_6: "6",
    CUE_7: "7",
    CUE_8: "8",
    CUE_9: "9",
};
