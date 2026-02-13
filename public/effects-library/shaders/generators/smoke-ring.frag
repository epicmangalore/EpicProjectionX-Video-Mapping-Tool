precision highp float;

uniform float uTime;
uniform vec2 uResolution;
uniform vec3 uSmokeColor;
uniform float uNoiseScale;
uniform float uNoiseDetail;
uniform float uRingRadius;
uniform float uRingThickness;
uniform float uInnerShape;
uniform float uAnimationSpeed;
uniform float uOverallScale;

varying vec2 vUv;

// Fractional Brownian Motion for procedural smoke/noise
float hash(vec2 p) {
    return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
}

float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    float a = hash(i);
    float b = hash(i + vec2(1.0, 0.0));
    float c = hash(i + vec2(0.0, 1.0));
    float d = hash(i + vec2(1.0, 1.0));
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
}

float fbm(vec2 p) {
    float v = 0.0;
    float a = 0.5;
    vec2 shift = vec2(100.0);
    mat2 rot = mat2(cos(0.5), sin(0.5), -sin(0.5), cos(0.5));
    for (int i = 0; i < 8; i++) {
        if (float(i) >= uNoiseDetail) break;
        v += a * noise(p);
        p = rot * p * 2.0 + shift;
        a *= 0.5;
    }
    return v;
}

void main() {
    float time = uTime * uAnimationSpeed;
    vec2 uv = (vUv - 0.5) * 2.0 / uOverallScale;
    
    float dist = length(uv);
    
    // Smoke displacement
    vec2 noiseUV = uv * uNoiseScale + time * 0.2;
    float n = fbm(noiseUV);
    
    float ringMask = smoothstep(uRingRadius + uRingThickness, uRingRadius, dist + n * 0.2);
    float innerMask = smoothstep(uRingRadius - uRingThickness, uRingRadius - uRingThickness + 0.1, dist - n * 0.2);
    
    float finalMask = ringMask * innerMask;
    
    // Inner shape definition (0: Pure Circle, 1: More jagged)
    finalMask *= mix(1.0, n, uInnerShape);
    
    vec3 color = uSmokeColor * finalMask;
    
    gl_FragColor = vec4(color, finalMask);
}
