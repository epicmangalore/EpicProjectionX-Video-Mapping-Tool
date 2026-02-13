precision highp float;

uniform float uTime;
uniform vec2 uResolution;
uniform vec3 uDotFillColor;
uniform vec3 uDotStrokeColor;
uniform float uDotSize;
uniform float uHorizontalGap;
uniform float uVerticalGap;
uniform float uStrokeWidth;
uniform float uSizeVariation;
uniform float uOpacityVariation;
uniform float uDotShape; // 0: Circle, 1: Square
uniform float uAnimationSpeed;

varying vec2 vUv;

float hash(vec2 p) {
    return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
}

void main() {
    float time = uTime * uAnimationSpeed;
    
    // Scale gaps to pixels (roughly)
    float hGap = max(uHorizontalGap, 1.0);
    float vGap = max(uVerticalGap, 1.0);
    
    // Grid coordinates
    vec2 gridUV = vUv * vec2(uResolution.x / hGap, uResolution.y / vGap);
    vec2 cellID = floor(gridUV);
    vec2 f = fract(gridUV);
    
    // Variation based on cell ID
    float h = hash(cellID);
    float sizeVar = mix(1.0, 0.5 + 0.5 * sin(time + h * 6.28), uSizeVariation);
    float opacityVar = mix(1.0, 0.2 + 0.8 * hash(cellID + 1.0), uOpacityVariation);
    
    // Shape logic (0 to 1 range in cell)
    vec2 p = (f - 0.5) * 2.0; // -1 to 1
    float d;
    
    if (uDotShape < 0.5) {
        // Circle
        d = length(p);
    } else {
        // Square
        d = max(abs(p.x), abs(p.y));
    }
    
    float radius = uDotSize * sizeVar * 0.1;
    float stroke = uStrokeWidth * 0.05;
    
    // Antialiasing
    float edge = 0.02;
    float fillMask = smoothstep(radius, radius - edge, d);
    float strokeMask = smoothstep(radius + stroke, radius + stroke - edge, d) - fillMask;
    
    vec3 color = uDotFillColor * fillMask + uDotStrokeColor * strokeMask;
    float alpha = (fillMask + strokeMask) * opacityVar;
    
    gl_FragColor = vec4(color, alpha);
}
