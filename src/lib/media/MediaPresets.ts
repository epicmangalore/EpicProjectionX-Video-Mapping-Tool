import { MediaAsset } from "@/store/project-store";
import { generateId } from "@/lib/utils";

// Helper function to format readable names from filenames
function formatPresetName(filename: string): string {
    let name = filename.replace(/\.(mp4|mov|img|png|jpg)$/i, '');
    // Remove "VJ Loop", "LOOP", "BPM" etc for cleaner names
    name = name.replace(/_LOOP/gi, '');
    name = name.replace(/_NOBPM/gi, '');
    name = name.replace(/_\d+BPM/gi, '');
    name = name.replace(/ VJ Loop \d+/gi, '');
    name = name.replace(/_/g, ' ');
    // Handle specific prefixes like 001_
    name = name.replace(/^\d{3}\s+/, '');

    // Title case it somewhat
    return name.split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(' ');
}

export const AOK_PRESET_FILES = [
    "001_AOKV_SECURITY_STATUS_PINK.mp4",
    "002_AOKV_SECURITY_STATUS_PURPLE.mp4",
    "003_AOKV_SECURITY_STATUS_PURPLE.mp4",
    "004_AOKV_SECURITY_STATUS_RED.mp4",
    "ALWAYSWATCHING_NOBPM_LOOP.mp4",
    "ANGELSOFDEATH_150BPM_LOOP.mp4",
    "CATWALKGRAPHIC_128BPM_LOOP.mp4",
    "CENSORED_B&W_GLITCH_NOBPM_LOOP.mp4",
    "CENSORED_NOBPM_LOOP.mp4",
    "DEATHMACHINE_NOBPM_LOOP.mp4",
    "DRONECIRCLE_NOBPM_LOOP.mp4",
    "Damaged Goods VJ Loop 001.mp4",
    "Dopamine VJ Loop 003.mp4",
    "EYEINFECTION_CRAWL_002_150BPM_LOOP.mp4",
    "EYEINFECTION_ROTATE_001_150BPM_LOOP.mp4",
    "EYEINFECTION_SPIDERS_003_150BPM_LOOP.mp4",
    "EYEINTHESKYGRAPHIC_128BPM_LOOP.mp4",
    "Endorphin VJ Loop 005.mp4",
    "GHOSTLYTRIANGLES_NOBPM_LOOP.mp4",
    "HORNDAWG_NOBPM_LOOP.mp4",
    "LIKES&FOLLOWSGRPAPHIC_128BPM_LOOP.mp4",
    "MIXTAPES_NOBPM_LOOP.mp4",
    "PACKINHEAT_128BPM_LOOP.mp4",
    "Terrible Fate VJ Loop 031.mp4",
    "WARNING_NOBPM_LOOP.mp4",
    "What Sorcery Is This VJ Loop 005.mp4"
];

// Generate consistent IDs for presets based on their names so they don't duplicate on reloads
function generatePresetId(filename: string): string {
    let hash = 0;
    for (let i = 0; i < filename.length; i++) {
        const char = filename.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
    }
    return `preset_aok_${Math.abs(hash).toString(16)}`;
}

export const PRESET_MEDIA: MediaAsset[] = AOK_PRESET_FILES.map(filename => ({
    id: generatePresetId(filename),
    name: formatPresetName(filename),
    type: "video" as const,
    url: `/presets/AOK/${encodeURIComponent(filename)}`,
    // Optional: We don't have true thumbnails for videos without processing them,
    // so we rely on the video itself or no thumbnail initially
}));
