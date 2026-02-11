import JSZip from "jszip";
import { Scene, Surface, MediaAsset } from "@/store/project-store";
import { ExportOptions } from "./export-types";

/**
 * Export ProjectionX project to Premiere Pro Motion Graphics Template (MOGRT)
 */
export async function exportToPremiere(
    scenes: Scene[],
    mediaAssets: MediaAsset[],
    options: ExportOptions
): Promise<Blob> {
    const zip = new JSZip();

    // Generate MOGRT XML
    const mogrtXml = generateMOGRTXml(scenes[0] || scenes[0], mediaAssets, options); // Use first scene
    zip.file("mogrt.xml", mogrtXml);

    // Add thumbnail (placeholder)
    const thumbnailSvg = generateThumbnailSVG();
    zip.file("thumbnail.png", thumbnailSvg);

    // Add media files if requested
    if (options.includeMedia) {
        // Note: In a real implementation, we would add actual media files here
        // For now, we'll just document the expected structure
        const mediaFolder = zip.folder("media");
        if (mediaFolder) {
            // mediaFolder.file("example.png", mediaBlob);
        }
    }

    return await zip.generateAsync({ type: "blob" });
}

/**
 * Generate MOGRT XML structure
 */
function generateMOGRTXml(scene: Scene, mediaAssets: MediaAsset[], options: ExportOptions): string {
    const { width, height } = options.resolution;
    const { frameRate } = options;
    const duration = scene.timelineDuration || 30;
    const durationFrames = Math.floor(duration * frameRate);

    let xml = `<?xml version="1.0" encoding="UTF-8"?>
<MotionGraphicsTemplate version="1.0">
    <Metadata>
        <Property name="name" value="${scene.name}" />
        <Property name="author" value="ProjectionX" />
        <Property name="description" value="Exported from ProjectionX" />
    </Metadata>

    <Composition>
        <Property name="width" value="${width}" />
        <Property name="height" value="${height}" />
        <Property name="frameRate" value="${frameRate}" />
        <Property name="duration" value="${durationFrames}" />
    </Composition>

    <Layers>
`;

    // Add layers for each surface
    scene.surfaces.forEach((surface, index) => {
        xml += generateSurfaceLayerXml(surface, mediaAssets, index, options);
    });

    xml += `    </Layers>

    <Controls>
        <!-- Editable controls for Premiere Pro users -->
        <Control type="slider" name="Master Opacity" property="opacity" min="0" max="100" default="100" />
    </Controls>
</MotionGraphicsTemplate>
`;

    return xml;
}

/**
 * Generate XML for a surface layer
 */
function generateSurfaceLayerXml(
    surface: Surface,
    mediaAssets: MediaAsset[],
    index: number,
    options: ExportOptions
): string {
    const media = surface.mediaId ? mediaAssets.find(m => m.id === surface.mediaId) : null;
    const mediaType = media?.type || "solid";

    const posX = options.resolution.width / 2 + surface.position.x;
    const posY = options.resolution.height / 2 - surface.position.y;
    const rotationDeg = (surface.rotation * 180 / Math.PI);
    const scaleX = surface.scale.x * 100;
    const scaleY = surface.scale.y * 100;
    const opacity = surface.opacity * 100;

    return `        <Layer id="${index}" name="${surface.name}">
            <Property name="type" value="${mediaType}" />
            <Transform>
                <Property name="position" value="${posX},${posY}" />
                <Property name="rotation" value="${rotationDeg}" />
                <Property name="scale" value="${scaleX},${scaleY}" />
                <Property name="opacity" value="${opacity}" />
            </Transform>
            <Timing>
                <Property name="startTime" value="${surface.startTime}" />
                <Property name="duration" value="${surface.duration}" />
            </Timing>
        </Layer>
`;
}

/**
 * Generate a simple thumbnail SVG
 */
function generateThumbnailSVG(): string {
    return `<svg width="256" height="144" xmlns="http://www.w3.org/2000/svg">
  <rect width="256" height="144" fill="#1a1a1a"/>
  <text x="128" y="72" font-family="Arial" font-size="16" fill="#00f0ff" text-anchor="middle">
    ProjectionX
  </text>
</svg>`;
}
