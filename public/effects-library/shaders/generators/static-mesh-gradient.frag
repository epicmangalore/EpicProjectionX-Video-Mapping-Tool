precision highp float;

uniform float uTime;
uniform vec2 uResolution;
uniform vec3 uColor1;
uniform vec3 uColor2;
uniform vec3 uColor3;
uniform vec3 uColor4;
uniform float uColorPositions;
uniform float uHorizontalWave;
uniform float uHWaveShift;
uniform float uVerticalWave;
uniform float uVWaveShift;
uniform float uColorMixing;
uniform float uGrainMix;
uniform float uGrainOverlay;
uniform float uRotationAngle;
uniform float uAnimationSpeed;

varying vec2 vUv;

// Hash for grain
float hash(vec2 p) {
    p = fract(p * vec2(123.34, 456.21));
    p += dot(p, p + 45.32);
    return fract(p.x * p.y);
}

mat2 rotate2d(float angle) {
    return mat2(cos(angle), -sin(angle), sin(angle), cos(angle));
}

void main() {
    float time = uTime * uAnimationSpeed;
    vec2 uv = vUv - 0.5;
    
    // Rotation
    uv *= rotate2d(uRotationAngle * 0.0174533);
    uv += 0.5;
    
    // Wave distortion
    vec2 waveUV = uv;
    waveUV.x += sin(uv.y * uVerticalWave * 5.0 + time + uVWaveShift) * 0.1 * uColorMixing;
    waveUV.y += sin(uv.x * uHorizontalWave * 5.0 + time + uHWaveShift) * 0.1 * uColorMixing;
    
    // Color positions influence
    float p1 = smoothstep(0.0, uColorPositions * 0.5, waveUV.x);
    float p2 = smoothstep(0.0, uColorPositions * 0.5, waveUV.y);
    float p3 = smoothstep(1.0, 1.0 - uColorPositions * 0.5, waveUV.x);
    float p4 = smoothstep(1.0, 1.0 - uColorPositions * 0.5, waveUV.y);
    
    // Mix 4 colors
    vec3 c12 = mix(uColor1, uColor2, p1);
    vec3 c34 = mix(uColor3, uColor4, p3);
    vec3 baseCol = mix(c12, c34, p2);
    
    // Grain
    float grain = hash(uv * 1024.0 + time);
    vec3 grainCol = vec3(grain);
    
    // Grain mix/overlay
    vec3 color = mix(baseCol, baseCol + (grain - 0.5) * uGrainMix, uGrainMix);
    if (uGrainOverlay > 0.0) {
        color = mix(color, color * (0.5 + grain), uGrainOverlay * 0.5);
    }
    
    gl_FragColor = vec4(clamp(color, 0.0, 1.0), 1.0);
}
