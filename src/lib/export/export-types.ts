export interface ExportOptions {
    format: "aftereffects" | "premiere" | "fcpx";
    includeMedia: boolean;
    mediaFormat: "reference" | "embed";
    frameRate: number;
    resolution: { width: number; height: number };
    selectedScenes?: string[]; // Export specific scenes only
    projectName?: string;
}

export interface AEComposition {
    name: string;
    width: number;
    height: number;
    frameRate: number;
    duration: number;
    layers: AELayer[];
    footage: AEFootageItem[];
}

export interface AELayer {
    name: string;
    index: number;
    startTime: number;
    duration: number;
    source?: string; // Footage item reference
    transform: {
        position: [number, number];
        rotation: number; // degrees
        scale: [number, number]; // percentage
        opacity: number; // 0-100
    };
    effects: AEEffect[];
    keyframes: Record<string, AEKeyframe[]>;
    blendMode: string;
    cornerPin?: {
        upperLeft: [number, number];
        upperRight: [number, number];
        lowerLeft: [number, number];
        lowerRight: [number, number];
    };
}

export interface AEEffect {
    name: string;
    matchName: string;
    properties: Record<string, number | string | [number, number]>;
}

export interface AEKeyframe {
    time: number; // in seconds
    value: number | [number, number];
    easing?: {
        inInfluence: number;
        outInfluence: number;
        inSpeed: number;
        outSpeed: number;
    };
}

export interface AEFootageItem {
    name: string;
    path: string;
    width: number;
    height: number;
    duration?: number;
    frameRate?: number;
}

/**
 * GSAP to After Effects easing conversion
 */
export const EASING_MAP: Record<string, { inInfluence: number; outInfluence: number; inSpeed: number; outSpeed: number }> = {
    "linear": { inInfluence: 0, outInfluence: 0, inSpeed: 0, outSpeed: 0 },
    "power1.in": { inInfluence: 0.33, outInfluence: 0, inSpeed: 0, outSpeed: 0 },
    "power1.out": { inInfluence: 0, outInfluence: 0.33, inSpeed: 0, outSpeed: 0 },
    "power1.inOut": { inInfluence: 0.33, outInfluence: 0.33, inSpeed: 0, outSpeed: 0 },
    "power2.in": { inInfluence: 0.5, outInfluence: 0, inSpeed: 0, outSpeed: 0 },
    "power2.out": { inInfluence: 0, outInfluence: 0.5, inSpeed: 0, outSpeed: 0 },
    "power2.inOut": { inInfluence: 0.5, outInfluence: 0.5, inSpeed: 0, outSpeed: 0 },
    "power3.in": { inInfluence: 0.66, outInfluence: 0, inSpeed: 0, outSpeed: 0 },
    "power3.out": { inInfluence: 0, outInfluence: 0.66, inSpeed: 0, outSpeed: 0 },
    "power3.inOut": { inInfluence: 0.66, outInfluence: 0.66, inSpeed: 0, outSpeed: 0 },
    "back.in": { inInfluence: 0.7, outInfluence: 0, inSpeed: -20, outSpeed: 0 },
    "back.out": { inInfluence: 0, outInfluence: 0.7, inSpeed: 0, outSpeed: -20 },
    "back.inOut": { inInfluence: 0.7, outInfluence: 0.7, inSpeed: -20, outSpeed: -20 },
};

/**
 * Blend mode mapping from ProjectX to After Effects
 */
export const BLEND_MODE_MAP: Record<string, string> = {
    "normal": "NORMAL",
    "multiply": "MULTIPLY",
    "screen": "SCREEN",
    "overlay": "OVERLAY",
    "additive": "ADD",
    "darken": "DARKEN",
    "lighten": "LIGHTEN",
    "color-dodge": "COLOR_DODGE",
    "color-burn": "COLOR_BURN",
    "hard-light": "HARD_LIGHT",
    "soft-light": "SOFT_LIGHT",
    "difference": "DIFFERENCE",
    "exclusion": "EXCLUSION",
};
