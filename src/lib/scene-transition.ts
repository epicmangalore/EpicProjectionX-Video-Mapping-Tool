const FADE_MS = 260;
const MAX_SNAPSHOT_WIDTH = 1280;

let activeOverlay: HTMLDivElement | null = null;

/**
 * Captures the current projection canvas and fades it out over the incoming
 * scene. Call this synchronously *before* changing the active/playing scene so
 * the overlay is already on top when the new scene first paints.
 */
export function beginSceneTransition(backgroundColor = "#000000") {
    if (typeof document === "undefined") return;

    const canvas = document.querySelector<HTMLCanvasElement>(
        "[data-projection-canvas] canvas"
    );
    if (!canvas || !canvas.width || !canvas.height) return;

    activeOverlay?.remove();
    activeOverlay = null;

    let snapshot: string;
    try {
        const scale = Math.min(1, MAX_SNAPSHOT_WIDTH / canvas.width);
        const snapshotCanvas = document.createElement("canvas");
        snapshotCanvas.width = Math.max(1, Math.round(canvas.width * scale));
        snapshotCanvas.height = Math.max(1, Math.round(canvas.height * scale));

        const context = snapshotCanvas.getContext("2d");
        if (!context) return;

        // The WebGL canvas is transparent; composite it over the project
        // background so transparent regions don't reveal the incoming scene.
        context.fillStyle = backgroundColor || "#000000";
        context.fillRect(0, 0, snapshotCanvas.width, snapshotCanvas.height);
        context.drawImage(canvas, 0, 0, snapshotCanvas.width, snapshotCanvas.height);

        snapshot = snapshotCanvas.toDataURL("image/jpeg", 0.85);
    } catch {
        // Never block a scene switch because a snapshot failed.
        return;
    }

    const rect = canvas.getBoundingClientRect();
    const overlay = document.createElement("div");
    overlay.dataset.sceneTransition = "true";
    overlay.style.position = "fixed";
    overlay.style.left = `${rect.left}px`;
    overlay.style.top = `${rect.top}px`;
    overlay.style.width = `${rect.width}px`;
    overlay.style.height = `${rect.height}px`;
    overlay.style.backgroundImage = `url("${snapshot}")`;
    overlay.style.backgroundSize = "100% 100%";
    overlay.style.backgroundRepeat = "no-repeat";
    overlay.style.pointerEvents = "none";
    overlay.style.zIndex = "9999";
    overlay.style.opacity = "1";
    overlay.style.transition = `opacity ${FADE_MS}ms cubic-bezier(0.4, 0, 0.2, 1)`;
    overlay.style.willChange = "opacity";

    document.body.appendChild(overlay);
    activeOverlay = overlay;

    const remove = () => {
        overlay.remove();
        if (activeOverlay === overlay) activeOverlay = null;
    };

    // Wait for the overlay to be painted before starting the fade, otherwise
    // the browser can collapse both states into one paint.
    requestAnimationFrame(() => {
        requestAnimationFrame(() => {
            overlay.style.opacity = "0";
        });
    });

    window.setTimeout(remove, FADE_MS + 80);
}
