precision highp float;

uniform float uTime;
uniform vec2 uResolution;
uniform vec3 uColor1;
uniform vec3 uColor2;
uniform vec3 uColor3;
uniform float uNumBands;
uniform float uTwist;
uniform float uCenterSize;
uniform float uColorProportion;
uniform float uEdgeSoftness;
uniform float uNoise;
uniform float uNoiseFrequency;
uniform float uAnimationSpeed;

varying vec2 vUv;

// Simple noise helper
float hash(vec2 p) {
    p = fract(p * vec2(123.34, 456.21));
    p += dot(p, p + 45.32);
    return fract(p.x * p.y);
}

void main() {
    float time = uTime * uAnimationSpeed;
    vec2 p = (vUv - 0.5) * 2.0;
    
    // Polar coordinates
    float r = length(p);
    float angle = atan(p.y, p.x);
    
    // Noise distortion
    float n = hash(p * uNoiseFrequency + time * 0.1) * uNoise;
    r += n * 0.1;
    
    // Swirl math: angle is twisted by radius
    float swirlAngle = angle + r * uTwist * 10.0 + time;
    
    // Create colored bands
    float bands = fract(swirlAngle * uNumBands / 6.2831);
    
    // Color selection based on bands and proportion
    vec3 color;
    float p1 = uColorProportion * 0.33;
    float p2 = uColorProportion * 0.66;
    
    if (bands < p1) color = uColor1;
    else if (bands < p2) color = uColor2;
    else color = uColor3;
    
    // Edge softness between bands (simplified)
    float edge = smoothstep(0.0, uEdgeSoftness * 0.1, abs(fract(bands * 3.0) - 0.5));
    color = mix(color, vec3(0.0), (1.0 - edge) * uEdgeSoftness);
    
    // Center mask
    float centerMask = smoothstep(uCenterSize, uCenterSize + 0.1, r);
    color *= centerMask;
    
    gl_FragColor = vec4(color, 1.0);
}
