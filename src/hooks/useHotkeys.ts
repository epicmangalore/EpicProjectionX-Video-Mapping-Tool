import { useEffect } from "react";

interface HotkeyConfig {
    key: string;
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
                const keyMatch = e.key.toLowerCase() === hotkey.key.toLowerCase();
                const ctrlMatch = hotkey.ctrl ? e.ctrlKey || e.metaKey : !e.ctrlKey && !e.metaKey;
                const shiftMatch = hotkey.shift ? e.shiftKey : !e.shiftKey;
                const altMatch = hotkey.alt ? e.altKey : !e.altKey;

                if (keyMatch && ctrlMatch && shiftMatch && altMatch) {
                    e.preventDefault();
                    hotkey.callback();
                    break;
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

    // Actions
    DELETE: "Delete",
    DUPLICATE: { key: "d", ctrl: true },
    SAVE: { key: "s", ctrl: true },
    UNDO: { key: "z", ctrl: true },
    REDO: { key: "z", ctrl: true, shift: true },

    // Playback
    PLAY_PAUSE: " ", // Spacebar
    STOP: "Escape",

    // View
    FULLSCREEN: "f11",
    TOGGLE_UI: "h",

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
