precision highp float;

uniform float uTime;
uniform vec2 uResolution;
uniform vec3 uSpiralColor;
uniform float uSpiralDensity;
uniform float uDistortion;
uniform float uStrokeWidth;
uniform float uStrokeTapering;
uniform float uStrokeCapRoundness;
uniform float uNoise;
uniform float uNoiseFrequency;
uniform float uEdgeSoftness;
uniform float uAnimationSpeed;

varying vec2 vUv;

// Simple random/noise helper
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
    
    // Animate spiral rotation
    float rotation = time * 2.0;
    
    // Noise distortion
    float n = hash(p * uNoiseFrequency + time * 0.1) * uNoise;
    r += n * 0.1;
    
    // Spiral math: r depends on angle
    // Archimedean spiral: r = a + b * theta
    // Here we use fract to create repeating bands
    float spiral = fract((angle + rotation) / 6.2831 + r * uSpiralDensity * 5.0 + n * uDistortion);
    
    // Stroke width and tapering
    float width = uStrokeWidth * 0.5;
    if (uStrokeTapering > 0.0) {
        width *= mix(1.0, 0.0, pow(r, uStrokeTapering * 2.0));
    }
    
    // Simple stroke with edge softness
    float d = abs(spiral - 0.5);
    float mask = 1.0 - smoothstep(width - uEdgeSoftness * 0.1, width + uEdgeSoftness * 0.1, d);
    
    // Fade out at extreme center if needed (rounded caps logic simplified)
    if (uStrokeCapRoundness > 0.0) {
        mask *= smoothstep(0.0, 0.1 * uStrokeCapRoundness, r);
    }
    
    vec3 color = uSpiralColor * mask;
    
    gl_FragColor = vec4(color, mask);
}
