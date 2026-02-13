precision highp float;

uniform float uTime;
uniform vec2 uResolution;
uniform vec3 uWaveColor;
uniform float uWaveFrequency;
uniform float uWaveAmplitude;
uniform float uWaveSpacing;
uniform float uWaveProportion;
uniform float uEdgeSoftness;
uniform float uWaveShape; // 0: Sine, 1: Square, 2: Checks
uniform float uAnimationSpeed;
uniform float uOverallScale;

varying vec2 vUv;

void main() {
    float time = uTime * uAnimationSpeed;
    vec2 uv = vUv * 5.0 * uOverallScale;
    
    // Animation
    uv.y += time;
    
    float wave = 0.0;
    
    if (uWaveShape < 0.5) {
        // Sine
        wave = sin(uv.x * uWaveFrequency * 5.0) * uWaveAmplitude;
    } else if (uWaveShape < 1.5) {
        // Square
        wave = sign(sin(uv.x * uWaveFrequency * 5.0)) * uWaveAmplitude;
    } else {
        // Checks
        wave = sign(sin(uv.x * uWaveFrequency * 5.0)) * sign(sin(uv.y * uWaveFrequency * 5.0)) * uWaveAmplitude;
    }
    
    // Determine if we are on a wave line
    float val = fract(uv.y * uWaveSpacing + wave);
    float mask = smoothstep(uWaveProportion, uWaveProportion - uEdgeSoftness * 0.1, val);
    
    // Add horizontal bands if needed (part of the aesthetic)
    mask *= 1.0 - smoothstep(0.95, 1.0, fract(uv.x * 2.0));
    
    vec3 color = uWaveColor * mask;
    
    gl_FragColor = vec4(color, mask);
}
