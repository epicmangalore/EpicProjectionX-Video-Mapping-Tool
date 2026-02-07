/**
 * 4x4 Matrix utilities for corner-pin transformations
 */

export type Matrix4 = number[];
export type Vector2 = { x: number; y: number };
export type Vector3 = { x: number; y: number; z: number };

/**
 * Create an identity matrix
 */
export function identityMatrix(): Matrix4 {
    return [
        1, 0, 0, 0,
        0, 1, 0, 0,
        0, 0, 1, 0,
        0, 0, 0, 1,
    ];
}

/**
 * Multiply two 4x4 matrices
 */
export function multiplyMatrices(a: Matrix4, b: Matrix4): Matrix4 {
    const result: Matrix4 = new Array(16);
    for (let i = 0; i < 4; i++) {
        for (let j = 0; j < 4; j++) {
            result[i * 4 + j] =
                a[i * 4 + 0] * b[0 * 4 + j] +
                a[i * 4 + 1] * b[1 * 4 + j] +
                a[i * 4 + 2] * b[2 * 4 + j] +
                a[i * 4 + 3] * b[3 * 4 + j];
        }
    }
    return result;
}

/**
 * Calculate perspective transform matrix for corner-pin warping
 * Maps a unit square to four arbitrary corner points
 */
export function getPerspectiveTransform(
    corners: [Vector2, Vector2, Vector2, Vector2],
    sourceCorners?: [Vector2, Vector2, Vector2, Vector2]
): Matrix4 {
    const [tl, tr, bl, br] = corners;

    // Source points. Default to unit square [-0.5, 0.5]
    let src = [
        { x: -0.5, y: 0.5 },  // TL
        { x: 0.5, y: 0.5 },   // TR
        { x: -0.5, y: -0.5 }, // BL
        { x: 0.5, y: -0.5 },  // BR
    ];

    if (sourceCorners) {
        // Map UV [0,1] to unit plane [-0.5, 0.5]
        src = sourceCorners.map(uv => ({
            x: uv.x - 0.5,
            y: (1 - uv.y) - 0.5 // UV Y is flipped compared to geometry Y
        }));
    }

    // Destination points
    const dst = [tl, tr, bl, br];

    // Solve for the perspective transform matrix
    // This uses the Direct Linear Transform (DLT) algorithm
    const A: number[][] = [];
    for (let i = 0; i < 4; i++) {
        const sx = src[i].x;
        const sy = src[i].y;
        const dx = dst[i].x;
        const dy = dst[i].y;

        A.push([sx, sy, 1, 0, 0, 0, -dx * sx, -dx * sy, -dx]);
        A.push([0, 0, 0, sx, sy, 1, -dy * sx, -dy * sy, -dy]);
    }

    // Solve using Gaussian elimination (simplified for 3x3 homography)
    const h = solveHomography(A);

    // Convert to 4x4 matrix for Three.js
    return [
        h[0], h[3], 0, h[6],
        h[1], h[4], 0, h[7],
        0, 0, 1, 0,
        h[2], h[5], 0, h[8],
    ];
}

/**
 * Solve homography matrix using DLT and Gaussian elimination
 * Solution for Ah = 0 where A is the 8x9 matrix from getPerspectiveTransform
 */
function solveHomography(A: number[][]): number[] {
    // Add the constraint h9 = 1 to turn it into an 8x8 system Ax = B
    // We solve for h1-h8 and set h9 = 1
    const B = A.map(row => -row[8]);
    const matrix = A.map(row => row.slice(0, 8));

    // Gaussian elimination with pivoting
    const n = 8;
    for (let i = 0; i < n; i++) {
        // Pivot selection
        let max = Math.abs(matrix[i][i]);
        let maxRow = i;
        for (let k = i + 1; k < n; k++) {
            if (Math.abs(matrix[k][i]) > max) {
                max = Math.abs(matrix[k][i]);
                maxRow = k;
            }
        }

        // Swap rows
        [matrix[i], matrix[maxRow]] = [matrix[maxRow], matrix[i]];
        [B[i], B[maxRow]] = [B[maxRow], B[i]];

        // Eliminate
        for (let k = i + 1; k < n; k++) {
            const c = -matrix[k][i] / matrix[i][i];
            for (let j = i; j < n; j++) {
                if (i === j) {
                    matrix[k][j] = 0;
                } else {
                    matrix[k][j] += c * matrix[i][j];
                }
            }
            B[k] += c * B[i];
        }
    }

    // Back substitution
    const x = new Array(n).fill(0);
    for (let i = n - 1; i >= 0; i--) {
        x[i] = B[i] / matrix[i][i];
        for (let k = i - 1; k >= 0; k--) {
            B[k] -= matrix[k][i] * x[i];
        }
    }

    return [...x, 1]; // [h1, h2, h3, h4, h5, h6, h7, h8, 1]
}

/**
 * Calculate UV coordinates for a point given a perspective transform
 */
export function transformUV(point: Vector2, matrix: Matrix4): Vector2 {
    const x = point.x;
    const y = point.y;

    const w =
        matrix[3] * x + matrix[7] * y + matrix[11] * 0 + matrix[15] * 1;

    return {
        x: (matrix[0] * x + matrix[4] * y + matrix[8] * 0 + matrix[12] * 1) / w,
        y: (matrix[1] * x + matrix[5] * y + matrix[9] * 0 + matrix[13] * 1) / w,
    };
}

/**
 * Create a translation matrix
 */
export function translationMatrix(x: number, y: number, z: number): Matrix4 {
    return [
        1, 0, 0, 0,
        0, 1, 0, 0,
        0, 0, 1, 0,
        x, y, z, 1,
    ];
}

/**
 * Create a rotation matrix (Z-axis)
 */
export function rotationMatrix(angle: number): Matrix4 {
    const c = Math.cos(angle);
    const s = Math.sin(angle);
    return [
        c, s, 0, 0,
        -s, c, 0, 0,
        0, 0, 1, 0,
        0, 0, 0, 1,
    ];
}

/**
 * Create a scale matrix
 */
export function scaleMatrix(x: number, y: number, z: number): Matrix4 {
    return [
        x, 0, 0, 0,
        0, y, 0, 0,
        0, 0, z, 0,
        0, 0, 0, 1,
    ];
}
