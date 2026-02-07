
export interface Point {
    x: number;
    y: number;
}

export interface Rect {
    x: number;
    y: number;
    width: number;
    height: number;
}

/**
 * Converts ImageData to Grayscale
 */
export function toGrayscale(imageData: ImageData): Uint8Array {
    const { width, height, data } = imageData;
    const gray = new Uint8Array(width * height);
    for (let i = 0; i < width * height; i++) {
        const r = data[i * 4];
        const g = data[i * 4 + 1];
        const b = data[i * 4 + 2];
        // Standard luminance weights
        gray[i] = 0.299 * r + 0.587 * g + 0.114 * b;
    }
    return gray;
}

/**
 * Applies binary thresholding to grayscale data
 */
export function threshold(gray: Uint8Array, width: number, height: number, thresholdVal: number): Uint8Array {
    const binary = new Uint8Array(width * height);
    for (let i = 0; i < width * height; i++) {
        binary[i] = gray[i] >= thresholdVal ? 255 : 0;
    }
    return binary;
}

/**
 * Simple Moore-Neighbor tracing to find contours in binary image
 * Note: This extracts only the external contours.
 */
export function findContours(binary: Uint8Array, width: number, height: number): Point[][] {
    const contours: Point[][] = [];
    const visited = new Uint8Array(width * height); // 0 = unvisited, 1 = visited

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const idx = y * width + x;
            // Found a white pixel that hasn't been visited yet, start of a new contour
            if (binary[idx] === 255 && visited[idx] === 0) {
                const contour = traceContour(binary, width, height, x, y, visited);
                if (contour.length > 3) { // Filter out tiny noise
                    contours.push(contour);
                }
            }
        }
    }
    return contours;
}

function traceContour(binary: Uint8Array, width: number, height: number, startX: number, startY: number, visited: Uint8Array): Point[] {
    const contour: Point[] = [];
    const maxSteps = width * height; // Safety breaker
    let steps = 0;

    let cx = startX;
    let cy = startY;
    let dir = 0; // 0: E, 1: SE, 2: S, 3: SW, 4: W, 5: NW, 6: N, 7: NE

    // Result contour
    contour.push({ x: cx, y: cy });
    visited[cy * width + cx] = 1;

    // Moore-Neighbor tracing
    // Move to the first black pixel in the neighborhood to start tracing the boundary
    // Actually simpler: just follow the boundary.

    // Using a simpler border follower for "islands"
    // Clockwise search from current direction
    const dx = [1, 1, 0, -1, -1, -1, 0, 1];
    const dy = [0, 1, 1, 1, 0, -1, -1, -1];

    let startParams = { x: cx, y: cy, dir: 0 };
    // Backtrack one step to find "outside"
    // Usually we enter from Left (pixel at x-1 is 0)
    // So current pixel is 1. We start checking from direction of entry.

    // Let's use a simpler "Turtle" algorithm or standard Boundary Following
    // For this implementation, let's assume we found a pixel.

    // Helper: isPixel(x,y)
    const isPixel = (x: number, y: number) => {
        if (x < 0 || x >= width || y < 0 || y >= height) return false;
        return binary[y * width + x] === 255;
    };

    // Find first neighbor
    let firstNeighborDir = -1;
    for (let i = 0; i < 8; i++) {
        if (isPixel(cx + dx[i], cy + dy[i])) {
            firstNeighborDir = i;
            break;
        }
    }

    if (firstNeighborDir === -1) {
        // Single pixel isolation
        return contour;
    }

    // Reference: http://www.imageprocessingplace.com/downloads_V3/root_downloads/tutorials/contour_tracing_A4.pdf
    // Moore-Neighbor Tracing
    let backtrack = 4; // Start checking from "West" (relative to entry)
    // Actually, simpler logic:
    // 1. Enter pixel.
    // 2. Scan neighbors clockwise starting from the pixel we came from (backtrack).
    // 3. First non-zero neighbor is next.

    // Let's just use a robust standard loop
    let px = cx;
    let py = cy;
    // Entrance direction: we came from Left (x-1), so we "face" Right (0).
    // So "back" is 4.
    let searchDir = 7; // Start searching from "top-left" relative? No.

    // We scanned lines L->R, T->B. So we hit the LEFTMOST pixel of the component.
    // So (x-1, y) must be 0.
    // Start neighbor search from standard "enter" vector.
    // Let's rely on a simpler "Jacob's stopping criterion" logic.

    // Re-implementation of simple chain code
    let currentX = startX;
    let currentY = startY;

    // Initial search direction: look at neighbors starting from "Backwards"
    // We came from Left, so Back is Left.
    // Neighbors: (x-1, y).

    // We are at S. B is (x-1, y).
    // We traverse clockwise around S until we hit a black pixel -> white pixel transition?

    // Correct Moore Tracing:
    // B = backtrack point (initially x-1, y)
    // C = current point (x, y)
    // 1. Scan neighbors of C in clockwise order, starting from B.
    // 2. First BLACK pixel is the new B? No.
    // 2. The first WHITE pixel found is the next point on contour, P.
    // 3. The neighbor IMMEDIATELY PRECEDING P in the scan is the new "backtrack" for the next step.

    let backX = startX - 1;
    let backY = startY;

    while (steps < maxSteps) {
        // Identify neighbor index of Back relative to Current
        let startIdx = 0;
        for (let i = 0; i < 8; i++) {
            if (backX === currentX + dx[i] && backY === currentY + dy[i]) {
                startIdx = i;
                break;
            }
        }

        let foundNext = false;
        // Scan clockwise
        for (let i = 0; i < 8; i++) {
            const checkIdx = (startIdx + i) % 8; // Clockwise
            const nx = currentX + dx[checkIdx];
            const ny = currentY + dy[checkIdx];

            if (isPixel(nx, ny)) {
                // Found next pixel
                contour.push({ x: nx, y: ny });
                visited[ny * width + nx] = 1; // Mark as visited

                // The pixel *before* this one in the scan was 0 (or we would have picked it)
                // Wait, Moore tracing says start scanning from B.
                // The new B is the neighbor previous to P.
                // previous neighbor index in scan:
                const prevIdx = (checkIdx - 1 + 8) % 8;
                backX = currentX + dx[prevIdx];
                backY = currentY + dy[prevIdx];

                currentX = nx;
                currentY = ny;
                foundNext = true;
                break;
            }
        }

        if (!foundNext) break; // Isolated or error

        if (currentX === startX && currentY === startY) {
            break; // Loop closed
        }
        steps++;
    }

    return contour;
}


/**
 * Ramer-Douglas-Peucker algorithm for polygon approximation
 */
export function approxPolyDP(contour: Point[], epsilon: number): Point[] {
    if (contour.length < 3) return contour;

    let dmax = 0;
    let index = 0;
    const end = contour.length - 1;

    // Find the point with the maximum distance
    for (let i = 1; i < end; i++) {
        const d = perpendicularDistance(contour[i], contour[0], contour[end]);
        if (d > dmax) {
            index = i;
            dmax = d;
        }
    }

    // If max distance is greater than epsilon, recursively simplify
    if (dmax > epsilon) {
        const recResults1 = approxPolyDP(contour.slice(0, index + 1), epsilon);
        const recResults2 = approxPolyDP(contour.slice(index), epsilon);

        // Build the result list
        return recResults1.slice(0, recResults1.length - 1).concat(recResults2);
    } else {
        return [contour[0], contour[end]];
    }
}

function perpendicularDistance(idx: Point, p1: Point, p2: Point): number {
    let dx = p2.x - p1.x;
    let dy = p2.y - p1.y;

    // Normalize
    const mag = Math.sqrt(dx * dx + dy * dy);
    if (mag > 0) {
        dx /= mag;
        dy /= mag;
    }

    const pvx = idx.x - p1.x;
    const pvy = idx.y - p1.y;

    // Project pv onto line
    const pv_dot = pvx * dx + pvy * dy;

    // Scale line direction
    const dsx = pv_dot * dx;
    const dsy = pv_dot * dy;

    // Subtract projected point from vector
    const ax = pvx - dsx;
    const ay = pvy - dsy;

    return Math.sqrt(ax * ax + ay * ay);
}

/**
 * Calculates polygon area
 */
export function getArea(points: Point[]): number {
    let area = 0;
    const j = points.length - 1;
    let p1, p2;

    for (let i = 0; i < points.length; i++) {
        p1 = points[i];
        p2 = points[(i + 1) % points.length];
        area += (p1.x * p2.y) - (p2.x * p1.y);
    }

    return Math.abs(area / 2);
}

export function sortCorners(minX: number, minY: number, maxX: number, maxY: number, points: Point[]): Point[] {
    if (points.length !== 4) return points;

    // Simple robust sorter: top-left, top-right, bottom-left, bottom-right?
    // Project store expects: TL, TR, BL, BR

    // Sort by Y first
    const sortedY = [...points].sort((a, b) => a.y - b.y);
    const top = sortedY.slice(0, 2).sort((a, b) => a.x - b.x); // TL, TR
    const bottom = sortedY.slice(2, 4).sort((a, b) => a.x - b.x); // BL, BR

    return [top[0], top[1], bottom[0], bottom[1]];
}
