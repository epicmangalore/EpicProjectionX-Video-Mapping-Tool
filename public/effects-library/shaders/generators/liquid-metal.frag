precision highp float;

uniform float uTime;
uniform vec2 uResolution;
uniform vec3 uMetalTintColor;
uniform float uBaseShape; // 0: Diamond, 1: Circle, 2: Square
uniform float uShapeRepetition;
uniform float uEdgeSoftness;
uniform float uRedChannelShift;
uniform float uBlueChannelShift;
uniform float uDistortion;
uniform float uContourDefinition;
uniform float uRotationAngle;
uniform float uAnimationSpeed;
uniform float uOverallScale;

varying vec2 vUv;

// SDF functions
float sdCircle(vec2 p, float r) { return length(p) - r; }
float sdBox(vec2 p, vec2 b) { vec2 d = abs(p) - b; return length(max(d, 0.0)) + min(max(d.x, d.y), 0.0); }
float sdDiamond(vec2 p, float s) {
    float x = abs(p.x); float y = abs(p.y);
    return (x + y - s) * 0.70710678;
}

mat2 rotate2d(float angle) {
    return mat2(cos(angle), -sin(angle), sin(angle), cos(angle));
}

float getShapeD(vec2 p, float shapeType) {
    if (shapeType < 0.5) return sdDiamond(p, 0.5);
    if (shapeType < 1.5) return sdCircle(p, 0.5);
    return sdBox(p, vec2(0.5));
}

void main() {
    float time = uTime * uAnimationSpeed;
    vec2 uv = (vUv - 0.5) * 2.0 / uOverallScale;
    uv *= rotate2d(uRotationAngle * 0.0174533);
    
    // Repetition/Grid
    if (uShapeRepetition > 1.0) {
        uv = (fract(uv * uShapeRepetition * 0.5) - 0.5) * (2.0 / uShapeRepetition);
    }
    
    // Distortion
    uv += vec2(sin(uv.y * 5.0 + time), cos(uv.x * 5.0 + time)) * 0.1 * uDistortion;
    
    // Chromatic Aberration
    float dr = getShapeD(uv + vec2(uRedChannelShift * 0.1, 0.0), uBaseShape);
    float dg = getShapeD(uv, uBaseShape);
    float db = getShapeD(uv - vec2(uBlueChannelShift * 0.1, 0.0), uBaseShape);
    
    // Contour/Liquid effect
    float rim = uContourDefinition * 0.5;
    float colR = smoothstep(rim + uEdgeSoftness, rim, abs(dr));
    float colG = smoothstep(rim + uEdgeSoftness, rim, abs(dg));
    float colB = smoothstep(rim + uEdgeSoftness, rim, abs(db));
    
    vec3 color = vec3(colR, colG, colB);
    
    // Tinting
    if (length(uMetalTintColor) > 0.01) {
        color *= uMetalTintColor;
    } else {
        color = mix(color, vec3(colG), 0.2);
    }
    
    float alpha = max(colR, max(colG, colB));
    gl_FragColor = vec4(color, alpha);
}
