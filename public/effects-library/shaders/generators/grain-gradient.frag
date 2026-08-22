precision highp float;

uniform float uTime;
uniform vec2 uResolution;
uniform vec3 uColor1;
uniform vec3 uColor2;
uniform vec3 uColor3;
uniform vec3 uColor4;
uniform float uGradientSoftness;
uniform float uGrainIntensity;
uniform float uNoise;
uniform float uGradientShape; // 0: Corners, 1: Center, 2: Linear
uniform float uAnimationSpeed;

varying vec2 vUv;

// Hash function for grain
float hash(vec2 p) {
    p = fract(p * vec2(123.34, 456.21));
    p += dot(p, p + 45.32);
    return fract(p.x * p.y);
}

void main() {
    float time = uTime * uAnimationSpeed;
    vec2 uv = vUv;
    
    // Core gradient logic
    float g = 0.0;
    vec3 color = uColor1;
    
    if (uGradientShape < 0.5) {
        // Corners
        float tl = smoothstep(1.0, uGradientSoftness, length(uv - vec2(0.0, 1.0)));
        float tr = smoothstep(1.0, uGradientSoftness, length(uv - vec2(1.0, 1.0)));
        float bl = smoothstep(1.0, uGradientSoftness, length(uv - vec2(0.0, 0.0)));
        float br = smoothstep(1.0, uGradientSoftness, length(uv - vec2(1.0, 0.0)));
        color = uColor1 * tl + uColor2 * tr + uColor3 * bl + uColor4 * br;
        color /= max(tl + tr + bl + br, 0.001);
    } else if (uGradientShape < 1.5) {
        // Center
        float d = length(uv - 0.5) * 2.0;
        float mask = smoothstep(1.0, uGradientSoftness, d);
        color = mix(uColor1, uColor2, d);
        color = mix(color, uColor3, smoothstep(0.0, 1.0, d));
    } else {
        // Linear
        float d = uv.x;
        color = mix(uColor1, uColor2, d);
        color = mix(color, uColor3, smoothstep(0.0, 1.0, uv.y));
    }
    
    // Animate colors slightly
    color += sin(time + uv.x * 10.0) * 0.02;
    
    // Grain implementation
    float grain = hash(uv * 1024.0 + time);
    float grainMask = (grain - 0.5) * uGrainIntensity;
    
    // Add noise distortion to the gradient itself
    float noise = (hash(uv * 10.0 + time * 0.1) - 0.5) * uNoise;
    color += noise * 0.1;
    
    // Final composite
    color += grainMask;
    
    gl_FragColor = vec4(clamp(color, 0.0, 1.0), 1.0);
}
