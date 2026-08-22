/**
 * Computer Vision utilities for automatic surface detection
 * Uses OpenCV.js loaded from CDN
 */

export interface Point2D {
    x: number;
    y: number;
}

export interface DetectedSurface {
    id: string;
    type: 'rectangular' | 'curved' | 'irregular';
    corners: Point2D[]; // For rectangular: 4 corners, for others: polygon points
    confidence: number; // 0-1 score
    area: number;
    boundingBox: {
        x: number;
        y: number;
        width: number;
        height: number;
    };
}

export interface DetectionOptions {
    minArea?: number; // Minimum surface area in pixels
    maxSurfaces?: number; // Maximum number of surfaces to detect
    sensitivity?: number; // 0-1, affects edge detection threshold
    detectRectangular?: boolean;
    detectCurved?: boolean;
    detectIrregular?: boolean;
}

// Global OpenCV reference (loaded from CDN)
declare global {
    interface Window {
        cv: any;
    }
}

let cvReady = false;
let cvLoadPromise: Promise<void> | null = null;

/**
 * Load OpenCV.js from CDN
 */
export async function loadOpenCV(): Promise<void> {
    if (cvReady) return;
    if (cvLoadPromise) return cvLoadPromise;

    cvLoadPromise = new Promise((resolve, reject) => {
        if (typeof window === 'undefined') {
            reject(new Error('OpenCV can only be loaded in browser'));
            return;
        }

        // Check if already loaded
        if (window.cv && window.cv.Mat) {
            cvReady = true;
            resolve();
            return;
        }

        const script = document.createElement('script');
        script.src = 'https://docs.opencv.org/4.9.0/opencv.js';
        script.async = true;

        script.onload = () => {
            // OpenCV.js uses a Module pattern, need to wait for it to initialize
            const checkReady = setInterval(() => {
                if (window.cv && window.cv.Mat) {
                    clearInterval(checkReady);
                    cvReady = true;
                    console.log('✅ OpenCV.js loaded successfully');
                    resolve();
                }
            }, 100);

            // Timeout after 10 seconds
            setTimeout(() => {
                clearInterval(checkReady);
                if (!cvReady) {
                    reject(new Error('OpenCV.js failed to initialize'));
                }
            }, 10000);
        };

        script.onerror = () => {
            reject(new Error('Failed to load OpenCV.js from CDN'));
        };

        document.head.appendChild(script);
    });

    return cvLoadPromise;
}

/**
 * Detect rectangular surfaces using edge detection and contour finding
 */
export async function detectRectangularSurfaces(
    image: HTMLImageElement | HTMLCanvasElement,
    options: DetectionOptions = {}
): Promise<DetectedSurface[]> {
    await loadOpenCV();
    const cv = window.cv;

    const {
        minArea = 1000,
        maxSurfaces = 10,
        sensitivity = 0.5
    } = options;

    // Downscale if image is too large (optimization)
    const MAX_DIMENSION = 800;
    let target: HTMLImageElement | HTMLCanvasElement | HTMLCanvasElement = image;

    if (image.width > MAX_DIMENSION || image.height > MAX_DIMENSION) {
        const offscreenCanvas = document.createElement('canvas');
        const scale = MAX_DIMENSION / Math.max(image.width, image.height);
        offscreenCanvas.width = image.width * scale;
        offscreenCanvas.height = image.height * scale;
        const ctx = offscreenCanvas.getContext('2d');
        if (ctx) {
            ctx.drawImage(image, 0, 0, offscreenCanvas.width, offscreenCanvas.height);
            target = offscreenCanvas;
        }
    }

    // Convert image to cv.Mat
    const src = cv.imread(target);
    const gray = new cv.Mat();
    const edges = new cv.Mat();
    const hierarchy = new cv.Mat();
    const contours = new cv.MatVector();

    try {
        // Convert to grayscale
        cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY);

        // Apply Gaussian blur to reduce noise
        cv.GaussianBlur(gray, gray, new cv.Size(5, 5), 0);

        // Canny edge detection (sensitivity affects thresholds)
        const lowThreshold = 50 * sensitivity;
        const highThreshold = 150 * sensitivity;
        cv.Canny(gray, edges, lowThreshold, highThreshold);

        // Find contours
        cv.findContours(
            edges,
            contours,
            hierarchy,
            cv.RETR_EXTERNAL,
            cv.CHAIN_APPROX_SIMPLE
        );

        const surfaces: DetectedSurface[] = [];

        // Process each contour
        for (let i = 0; i < contours.size(); i++) {
            const contour = contours.get(i);
            const area = cv.contourArea(contour);

            // Filter by minimum area
            if (area < minArea) continue;

            // Approximate contour to polygon
            const approx = new cv.Mat();
            const perimeter = cv.arcLength(contour, true);
            cv.approxPolyDP(contour, approx, 0.02 * perimeter, true);

            // Check if it's a quadrilateral (4 corners)
            if (approx.rows === 4) {
                const corners: Point2D[] = [];
                for (let j = 0; j < 4; j++) {
                    corners.push({
                        x: approx.data32S[j * 2],
                        y: approx.data32S[j * 2 + 1]
                    });
                }

                // Order corners: top-left, top-right, bottom-right, bottom-left
                const orderedCorners = orderCorners(corners);

                // Calculate bounding box
                const rect = cv.boundingRect(contour);

                // Calculate confidence based on how "rectangular" it is
                const confidence = calculateRectangularConfidence(orderedCorners, area);

                surfaces.push({
                    id: `rect-${i}-${Date.now()}`,
                    type: 'rectangular',
                    corners: orderedCorners,
                    confidence,
                    area,
                    boundingBox: {
                        x: rect.x,
                        y: rect.y,
                        width: rect.width,
                        height: rect.height
                    }
                });
            }

            approx.delete();
        }

        // Sort by area (largest first) and limit
        surfaces.sort((a, b) => b.area - a.area);
        return surfaces.slice(0, maxSurfaces);

    } finally {
        // Clean up
        src.delete();
        gray.delete();
        edges.delete();
        hierarchy.delete();
        contours.delete();
    }
}

/**
 * Detect curved surfaces using adaptive contours
 */
export async function detectCurvedSurfaces(
    image: HTMLImageElement | HTMLCanvasElement,
    options: DetectionOptions = {}
): Promise<DetectedSurface[]> {
    await loadOpenCV();
    const cv = window.cv;

    const {
        minArea = 1000,
        maxSurfaces = 10,
        sensitivity = 0.5
    } = options;

    // Downscale if image is too large (optimization)
    const MAX_DIMENSION = 800;
    let target: HTMLImageElement | HTMLCanvasElement = image;

    if (image.width > MAX_DIMENSION || image.height > MAX_DIMENSION) {
        const offscreenCanvas = document.createElement('canvas');
        const scale = MAX_DIMENSION / Math.max(image.width, image.height);
        offscreenCanvas.width = image.width * scale;
        offscreenCanvas.height = image.height * scale;
        const ctx = offscreenCanvas.getContext('2d');
        if (ctx) {
            ctx.drawImage(image, 0, 0, offscreenCanvas.width, offscreenCanvas.height);
            target = offscreenCanvas;
        }
    }

    const src = cv.imread(target);
    const gray = new cv.Mat();
    const binary = new cv.Mat();
    const hierarchy = new cv.Mat();
    const contours = new cv.MatVector();

    try {
        cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY);
        cv.GaussianBlur(gray, gray, new cv.Size(5, 5), 0);

        // Adaptive threshold for better curved surface detection
        cv.adaptiveThreshold(
            gray,
            binary,
            255,
            cv.ADAPTIVE_THRESH_GAUSSIAN_C,
            cv.THRESH_BINARY,
            11,
            2
        );

        cv.findContours(
            binary,
            contours,
            hierarchy,
            cv.RETR_EXTERNAL,
            cv.CHAIN_APPROX_NONE // Keep all points for curves
        );

        const surfaces: DetectedSurface[] = [];

        for (let i = 0; i < contours.size(); i++) {
            const contour = contours.get(i);
            const area = cv.contourArea(contour);

            if (area < minArea) continue;

            // For curved surfaces, keep more points
            const approx = new cv.Mat();
            const perimeter = cv.arcLength(contour, true);
            cv.approxPolyDP(contour, approx, 0.01 * perimeter, true);

            // Curved surfaces typically have more than 4 points
            if (approx.rows > 4 && approx.rows < 20) {
                const corners: Point2D[] = [];
                for (let j = 0; j < approx.rows; j++) {
                    corners.push({
                        x: approx.data32S[j * 2],
                        y: approx.data32S[j * 2 + 1]
                    });
                }

                const rect = cv.boundingRect(contour);
                const confidence = calculateCurvedConfidence(corners, area);

                surfaces.push({
                    id: `curved-${i}-${Date.now()}`,
                    type: 'curved',
                    corners,
                    confidence,
                    area,
                    boundingBox: {
                        x: rect.x,
                        y: rect.y,
                        width: rect.width,
                        height: rect.height
                    }
                });
            }

            approx.delete();
        }

        surfaces.sort((a, b) => b.area - a.area);
        return surfaces.slice(0, maxSurfaces);

    } finally {
        src.delete();
        gray.delete();
        binary.delete();
        hierarchy.delete();
        contours.delete();
    }
}

/**
 * Detect irregular surfaces (any polygon)
 */
export async function detectIrregularSurfaces(
    image: HTMLImageElement | HTMLCanvasElement,
    options: DetectionOptions = {}
): Promise<DetectedSurface[]> {
    await loadOpenCV();
    const cv = window.cv;

    const {
        minArea = 1000,
        maxSurfaces = 10,
        sensitivity = 0.5
    } = options;

    // Downscale if image is too large (optimization)
    const MAX_DIMENSION = 800;
    let target: HTMLImageElement | HTMLCanvasElement = image;

    if (image.width > MAX_DIMENSION || image.height > MAX_DIMENSION) {
        const offscreenCanvas = document.createElement('canvas');
        const scale = MAX_DIMENSION / Math.max(image.width, image.height);
        offscreenCanvas.width = image.width * scale;
        offscreenCanvas.height = image.height * scale;
        const ctx = offscreenCanvas.getContext('2d');
        if (ctx) {
            ctx.drawImage(image, 0, 0, offscreenCanvas.width, offscreenCanvas.height);
            target = offscreenCanvas;
        }
    }

    const src = cv.imread(target);
    const gray = new cv.Mat();
    const edges = new cv.Mat();
    const hierarchy = new cv.Mat();
    const contours = new cv.MatVector();

    try {
        cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY);
        cv.GaussianBlur(gray, gray, new cv.Size(5, 5), 0);

        const lowThreshold = 50 * sensitivity;
        const highThreshold = 150 * sensitivity;
        cv.Canny(gray, edges, lowThreshold, highThreshold);

        cv.findContours(
            edges,
            contours,
            hierarchy,
            cv.RETR_EXTERNAL,
            cv.CHAIN_APPROX_SIMPLE
        );

        const surfaces: DetectedSurface[] = [];

        for (let i = 0; i < contours.size(); i++) {
            const contour = contours.get(i);
            const area = cv.contourArea(contour);

            if (area < minArea) continue;

            const approx = new cv.Mat();
            const perimeter = cv.arcLength(contour, true);
            cv.approxPolyDP(contour, approx, 0.02 * perimeter, true);

            // Accept any polygon with 3+ points
            if (approx.rows >= 3) {
                const corners: Point2D[] = [];
                for (let j = 0; j < approx.rows; j++) {
                    corners.push({
                        x: approx.data32S[j * 2],
                        y: approx.data32S[j * 2 + 1]
                    });
                }

                const rect = cv.boundingRect(contour);
                const confidence = 0.7; // Base confidence for irregular shapes

                surfaces.push({
                    id: `irregular-${i}-${Date.now()}`,
                    type: 'irregular',
                    corners,
                    confidence,
                    area,
                    boundingBox: {
                        x: rect.x,
                        y: rect.y,
                        width: rect.width,
                        height: rect.height
                    }
                });
            }

            approx.delete();
        }

        surfaces.sort((a, b) => b.area - a.area);
        return surfaces.slice(0, maxSurfaces);

    } finally {
        src.delete();
        gray.delete();
        edges.delete();
        hierarchy.delete();
        contours.delete();
    }
}

/**
 * Detect all types of surfaces
 */
export async function detectAllSurfaces(
    image: HTMLImageElement | HTMLCanvasElement,
    options: DetectionOptions = {}
): Promise<DetectedSurface[]> {
    const {
        detectRectangular = true,
        detectCurved = true,
        detectIrregular = true,
        maxSurfaces = 10
    } = options;

    const allSurfaces: DetectedSurface[] = [];

    if (detectRectangular) {
        const rectangular = await detectRectangularSurfaces(image, options);
        allSurfaces.push(...rectangular);
    }

    if (detectCurved) {
        const curved = await detectCurvedSurfaces(image, options);
        allSurfaces.push(...curved);
    }

    if (detectIrregular) {
        const irregular = await detectIrregularSurfaces(image, options);
        allSurfaces.push(...irregular);
    }

    // Remove duplicates (surfaces that overlap significantly)
    const uniqueSurfaces = removeDuplicates(allSurfaces);

    // Sort by confidence and area
    uniqueSurfaces.sort((a, b) => {
        const scoreA = a.confidence * Math.sqrt(a.area);
        const scoreB = b.confidence * Math.sqrt(b.area);
        return scoreB - scoreA;
    });

    return uniqueSurfaces.slice(0, maxSurfaces);
}

/**
 * Order corners in clockwise order starting from top-left
 */
function orderCorners(corners: Point2D[]): Point2D[] {
    if (corners.length !== 4) return corners;

    // Find center point
    const center = {
        x: corners.reduce((sum, p) => sum + p.x, 0) / 4,
        y: corners.reduce((sum, p) => sum + p.y, 0) / 4
    };

    // Sort by angle from center
    const sorted = corners.slice().sort((a, b) => {
        const angleA = Math.atan2(a.y - center.y, a.x - center.x);
        const angleB = Math.atan2(b.y - center.y, b.x - center.x);
        return angleA - angleB;
    });

    // Find top-left (minimum x + y)
    let minIdx = 0;
    let minSum = sorted[0].x + sorted[0].y;
    for (let i = 1; i < 4; i++) {
        const sum = sorted[i].x + sorted[i].y;
        if (sum < minSum) {
            minSum = sum;
            minIdx = i;
        }
    }

    // Rotate array to start from top-left
    return [...sorted.slice(minIdx), ...sorted.slice(0, minIdx)];
}

/**
 * Calculate confidence score for rectangular detection
 */
function calculateRectangularConfidence(corners: Point2D[], area: number): number {
    if (corners.length !== 4) return 0;

    // Check if angles are close to 90 degrees
    const angles: number[] = [];
    for (let i = 0; i < 4; i++) {
        const p1 = corners[i];
        const p2 = corners[(i + 1) % 4];
        const p3 = corners[(i + 2) % 4];

        const v1 = { x: p1.x - p2.x, y: p1.y - p2.y };
        const v2 = { x: p3.x - p2.x, y: p3.y - p2.y };

        const dot = v1.x * v2.x + v1.y * v2.y;
        const mag1 = Math.sqrt(v1.x * v1.x + v1.y * v1.y);
        const mag2 = Math.sqrt(v2.x * v2.x + v2.y * v2.y);

        const angle = Math.acos(dot / (mag1 * mag2));
        angles.push(Math.abs(angle - Math.PI / 2)); // Deviation from 90 degrees
    }

    // Average deviation from 90 degrees
    const avgDeviation = angles.reduce((sum, a) => sum + a, 0) / 4;
    const angleScore = Math.max(0, 1 - avgDeviation / (Math.PI / 4));

    return angleScore;
}

/**
 * Calculate confidence score for curved detection
 */
function calculateCurvedConfidence(corners: Point2D[], area: number): number {
    // For curved surfaces, check smoothness of the curve
    if (corners.length < 5) return 0.5;

    let totalCurvature = 0;
    for (let i = 1; i < corners.length - 1; i++) {
        const p1 = corners[i - 1];
        const p2 = corners[i];
        const p3 = corners[i + 1];

        // Calculate curvature using three points
        const dx1 = p2.x - p1.x;
        const dy1 = p2.y - p1.y;
        const dx2 = p3.x - p2.x;
        const dy2 = p3.y - p2.y;

        const curvature = Math.abs(dx1 * dy2 - dy1 * dx2);
        totalCurvature += curvature;
    }

    // Normalize by number of points
    const avgCurvature = totalCurvature / (corners.length - 2);

    // Higher curvature = more curved = higher confidence for curved detection
    return Math.min(1, avgCurvature / 1000);
}

/**
 * Remove duplicate detections (overlapping surfaces)
 */
function removeDuplicates(surfaces: DetectedSurface[]): DetectedSurface[] {
    const unique: DetectedSurface[] = [];

    for (const surface of surfaces) {
        let isDuplicate = false;

        for (const existing of unique) {
            // Check if bounding boxes overlap significantly
            const overlapArea = calculateOverlapArea(
                surface.boundingBox,
                existing.boundingBox
            );

            const minArea = Math.min(surface.area, existing.area);
            const overlapRatio = overlapArea / minArea;

            // If more than 70% overlap, consider it a duplicate
            if (overlapRatio > 0.7) {
                isDuplicate = true;
                // Keep the one with higher confidence
                if (surface.confidence > existing.confidence) {
                    const idx = unique.indexOf(existing);
                    unique[idx] = surface;
                }
                break;
            }
        }

        if (!isDuplicate) {
            unique.push(surface);
        }
    }

    return unique;
}

/**
 * Calculate overlap area between two bounding boxes
 */
function calculateOverlapArea(
    box1: { x: number; y: number; width: number; height: number },
    box2: { x: number; y: number; width: number; height: number }
): number {
    const x1 = Math.max(box1.x, box2.x);
    const y1 = Math.max(box1.y, box2.y);
    const x2 = Math.min(box1.x + box1.width, box2.x + box2.width);
    const y2 = Math.min(box1.y + box1.height, box2.y + box2.height);

    if (x2 < x1 || y2 < y1) return 0;

    return (x2 - x1) * (y2 - y1);
}
