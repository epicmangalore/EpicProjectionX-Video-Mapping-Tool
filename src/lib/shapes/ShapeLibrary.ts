import { Vector2 } from "@/store/project-store";

export interface ShapePreset {
    id: string;
    name: string;
    category: "basic" | "arrows" | "stars" | "polygons" | "symbols";
    description: string;
    thumbnail?: string; // SVG path data for preview
    corners: Vector2[]; // Normalized coordinates (-0.5 to 0.5)
    defaultScale: Vector2;
}

/**
 * Generate a regular polygon with N sides
 */
function generateRegularPolygon(sides: number): Vector2[] {
    const corners: Vector2[] = [];
    for (let i = 0; i < sides; i++) {
        const angle = (i * 2 * Math.PI / sides) - Math.PI / 2;
        corners.push({
            x: Math.cos(angle) * 0.5,
            y: Math.sin(angle) * 0.5
        });
    }
    return corners;
}

/**
 * Generate a star shape with N points
 */
function generateStar(points: number, innerRadius: number): Vector2[] {
    const corners: Vector2[] = [];
    for (let i = 0; i < points * 2; i++) {
        const angle = (i * Math.PI / points) - Math.PI / 2;
        const radius = i % 2 === 0 ? 0.5 : innerRadius;
        corners.push({
            x: Math.cos(angle) * radius,
            y: Math.sin(angle) * radius
        });
    }
    return corners;
}

/**
 * Library of shape presets
 */
export const SHAPE_PRESETS: ShapePreset[] = [
    // BASIC SHAPES
    {
        id: "triangle",
        name: "Triangle",
        category: "basic",
        description: "Equilateral triangle",
        corners: [
            { x: 0, y: -0.5 },
            { x: 0.433, y: 0.25 },
            { x: -0.433, y: 0.25 }
        ],
        defaultScale: { x: 200, y: 200 }
    },
    {
        id: "square",
        name: "Square",
        category: "basic",
        description: "Perfect square",
        corners: [
            { x: -0.5, y: 0.5 },  // TL
            { x: 0.5, y: 0.5 },   // TR
            { x: -0.5, y: -0.5 }, // BL
            { x: 0.5, y: -0.5 }   // BR
        ],
        defaultScale: { x: 200, y: 200 }
    },
    {
        id: "circle",
        name: "Circle",
        category: "basic",
        description: "Smooth circle (32 sides)",
        corners: generateRegularPolygon(32),
        defaultScale: { x: 200, y: 200 }
    },
    {
        id: "hexagon",
        name: "Hexagon",
        category: "basic",
        description: "Regular hexagon",
        corners: generateRegularPolygon(6),
        defaultScale: { x: 200, y: 200 }
    },
    {
        id: "octagon",
        name: "Octagon",
        category: "basic",
        description: "Regular octagon",
        corners: generateRegularPolygon(8),
        defaultScale: { x: 200, y: 200 }
    },

    // POLYGONS
    {
        id: "pentagon",
        name: "Pentagon",
        category: "polygons",
        description: "Regular pentagon",
        corners: generateRegularPolygon(5),
        defaultScale: { x: 200, y: 200 }
    },
    {
        id: "heptagon",
        name: "Heptagon",
        category: "polygons",
        description: "7-sided polygon",
        corners: generateRegularPolygon(7),
        defaultScale: { x: 200, y: 200 }
    },
    {
        id: "nonagon",
        name: "Nonagon",
        category: "polygons",
        description: "9-sided polygon",
        corners: generateRegularPolygon(9),
        defaultScale: { x: 200, y: 200 }
    },
    {
        id: "dodecagon",
        name: "Dodecagon",
        category: "polygons",
        description: "12-sided polygon",
        corners: generateRegularPolygon(12),
        defaultScale: { x: 200, y: 200 }
    },

    // STARS
    {
        id: "star-3",
        name: "3-Point Star",
        category: "stars",
        description: "Three-pointed star",
        corners: generateStar(3, 0.3),
        defaultScale: { x: 200, y: 200 }
    },
    {
        id: "star-4",
        name: "4-Point Star",
        category: "stars",
        description: "Four-pointed star",
        corners: generateStar(4, 0.35),
        defaultScale: { x: 200, y: 200 }
    },
    {
        id: "star-5",
        name: "5-Point Star",
        category: "stars",
        description: "Classic five-pointed star",
        corners: generateStar(5, 0.38),
        defaultScale: { x: 200, y: 200 }
    },
    {
        id: "star-6",
        name: "6-Point Star",
        category: "stars",
        description: "Six-pointed star (Star of David)",
        corners: generateStar(6, 0.4),
        defaultScale: { x: 200, y: 200 }
    },
    {
        id: "star-8",
        name: "8-Point Star",
        category: "stars",
        description: "Eight-pointed star",
        corners: generateStar(8, 0.4),
        defaultScale: { x: 200, y: 200 }
    },

    // ARROWS
    {
        id: "arrow-right",
        name: "Arrow Right",
        category: "arrows",
        description: "Right-pointing arrow",
        corners: [
            { x: -0.5, y: -0.15 },
            { x: 0.2, y: -0.15 },
            { x: 0.2, y: -0.35 },
            { x: 0.5, y: 0 },
            { x: 0.2, y: 0.35 },
            { x: 0.2, y: 0.15 },
            { x: -0.5, y: 0.15 }
        ],
        defaultScale: { x: 300, y: 150 }
    },
    {
        id: "arrow-left",
        name: "Arrow Left",
        category: "arrows",
        description: "Left-pointing arrow",
        corners: [
            { x: 0.5, y: -0.15 },
            { x: -0.2, y: -0.15 },
            { x: -0.2, y: -0.35 },
            { x: -0.5, y: 0 },
            { x: -0.2, y: 0.35 },
            { x: -0.2, y: 0.15 },
            { x: 0.5, y: 0.15 }
        ],
        defaultScale: { x: 300, y: 150 }
    },
    {
        id: "arrow-up",
        name: "Arrow Up",
        category: "arrows",
        description: "Upward-pointing arrow",
        corners: [
            { x: -0.15, y: 0.5 },
            { x: -0.15, y: -0.2 },
            { x: -0.35, y: -0.2 },
            { x: 0, y: -0.5 },
            { x: 0.35, y: -0.2 },
            { x: 0.15, y: -0.2 },
            { x: 0.15, y: 0.5 }
        ],
        defaultScale: { x: 150, y: 300 }
    },
    {
        id: "arrow-down",
        name: "Arrow Down",
        category: "arrows",
        description: "Downward-pointing arrow",
        corners: [
            { x: -0.15, y: -0.5 },
            { x: -0.15, y: 0.2 },
            { x: -0.35, y: 0.2 },
            { x: 0, y: 0.5 },
            { x: 0.35, y: 0.2 },
            { x: 0.15, y: 0.2 },
            { x: 0.15, y: -0.5 }
        ],
        defaultScale: { x: 150, y: 300 }
    },

    // SYMBOLS
    {
        id: "heart",
        name: "Heart",
        category: "symbols",
        description: "Heart shape",
        corners: [
            { x: 0, y: 0.4 },
            { x: -0.15, y: 0.35 },
            { x: -0.25, y: 0.2 },
            { x: -0.35, y: 0 },
            { x: -0.35, y: -0.2 },
            { x: -0.25, y: -0.35 },
            { x: -0.15, y: -0.4 },
            { x: 0, y: -0.3 },
            { x: 0.15, y: -0.4 },
            { x: 0.25, y: -0.35 },
            { x: 0.35, y: -0.2 },
            { x: 0.35, y: 0 },
            { x: 0.25, y: 0.2 },
            { x: 0.15, y: 0.35 }
        ],
        defaultScale: { x: 200, y: 200 }
    },
    {
        id: "diamond",
        name: "Diamond",
        category: "symbols",
        description: "Diamond/rhombus shape",
        corners: [
            { x: 0, y: -0.5 },
            { x: 0.3, y: 0 },
            { x: 0, y: 0.5 },
            { x: -0.3, y: 0 }
        ],
        defaultScale: { x: 200, y: 250 }
    },
    {
        id: "cross",
        name: "Cross",
        category: "symbols",
        description: "Plus/cross shape",
        corners: [
            { x: -0.15, y: -0.5 },
            { x: 0.15, y: -0.5 },
            { x: 0.15, y: -0.15 },
            { x: 0.5, y: -0.15 },
            { x: 0.5, y: 0.15 },
            { x: 0.15, y: 0.15 },
            { x: 0.15, y: 0.5 },
            { x: -0.15, y: 0.5 },
            { x: -0.15, y: 0.15 },
            { x: -0.5, y: 0.15 },
            { x: -0.5, y: -0.15 },
            { x: -0.15, y: -0.15 }
        ],
        defaultScale: { x: 200, y: 200 }
    },
];

/**
 * Get all unique categories
 */
export function getShapeCategories(): string[] {
    const categories = new Set(SHAPE_PRESETS.map(p => p.category));
    return Array.from(categories);
}

/**
 * Get shapes by category
 */
export function getShapesByCategory(category: string): ShapePreset[] {
    return SHAPE_PRESETS.filter(p => p.category === category);
}

/**
 * Search shapes by name or description
 */
export function searchShapes(query: string): ShapePreset[] {
    const lowerQuery = query.toLowerCase();
    return SHAPE_PRESETS.filter(p =>
        p.name.toLowerCase().includes(lowerQuery) ||
        p.description.toLowerCase().includes(lowerQuery)
    );
}

/**
 * Get shape preset by ID
 */
export function getShapePreset(id: string): ShapePreset | undefined {
    return SHAPE_PRESETS.find(p => p.id === id);
}
