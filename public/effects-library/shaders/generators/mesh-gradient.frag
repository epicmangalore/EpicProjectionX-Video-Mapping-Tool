precision highp float;

uniform float uTime;
uniform vec2 uResolution;
uniform float uOpacity;

// Mesh Gradient Uniforms
uniform vec3 uColor1;
uniform vec3 uColor2;
uniform vec3 uColor3;
uniform vec3 uColor4;
uniform float uDistortion;
uniform float uSwirl;
uniform float uGrainMix;
uniform float uGrainOverlay;
uniform float uSpeed;

varying vec2 vUv;

// Simple noise
vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec2 mod289(vec2 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec3 permute(vec3 x) { return mod289(((x * 34.0) + 1.0) * x); }

float snoise(vec2 v) {
    const vec4 C = vec4(0.211324865405187, 0.366025403784439,
                        -0.577350269189626, 0.024390243902439);
    vec2 i = floor(v + dot(v, C.yy));
    vec2 x0 = v - i + dot(i, C.xx);
    vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
    vec4 x12 = x0.xyxy + C.xxzz;
    x12.xy -= i1;
    i = mod289(i);
    vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0)) + i.x + vec3(0.0, i1.x, 1.0));
    vec3 m = max(0.5 - vec3(dot(x0, x0), dot(x12.xy, x12.xy), dot(x12.zw, x12.zw)), 0.0);
    m = m * m;
    m = m * m;
    vec3 x = 2.0 * fract(p * C.www) - 1.0;
    vec3 h = abs(x) - 0.5;
    vec3 ox = floor(x + 0.5);
    vec3 a0 = x - ox;
    m *= 1.79284291400159 - 0.85373472095314 * (a0 * a0 + h * h);
    vec3 g;
    g.x = a0.x * x0.x + h.x * x0.y;
    g.yz = a0.yz * x12.xz + h.yz * x12.yw;
    return 130.0 * dot(m, g);
}

float random(vec2 st) {
    return fract(sin(dot(st.xy, vec2(12.9898, 78.233))) * 43758.5453123);
}

void main() {
    float t = uTime * uSpeed;
    vec2 uv = vUv;
    
    // Apply distortion/swirl based on noise
    if (uDistortion > 0.0 || uSwirl > 0.0) {
        float noiseX = snoise(uv * 2.0 + t * 0.1);
        float noiseY = snoise(uv * 2.0 - t * 0.1 + 10.0);
        
        vec2 offset = vec2(noiseX, noiseY) * uDistortion * 0.5;
        
        if (uSwirl > 0.0) {
            float angle = snoise(uv * 1.5 + t * 0.05) * uSwirl * 3.14;
            float s = sin(angle);
            float c = cos(angle);
            mat2 rotation = mat2(c, -s, s, c);
            uv = (uv - 0.5) * rotation + 0.5;
        }
        
        uv += offset;
    }

    // Four color points influenced by noise
    vec2 p1 = vec2(0.1 + snoise(vec2(t * 0.1, 0.0)) * 0.2, 0.1 + snoise(vec2(0.0, t * 0.1)) * 0.2);
    vec2 p2 = vec2(0.9 + snoise(vec2(t * 0.12, 1.0)) * 0.2, 0.1 + snoise(vec2(1.0, t * 0.12)) * 0.2);
    vec2 p3 = vec2(0.1 + snoise(vec2(t * 0.14, 2.0)) * 0.2, 0.9 + snoise(vec2(2.0, t * 0.14)) * 0.2);
    vec2 p4 = vec2(0.9 + snoise(vec2(t * 0.16, 3.0)) * 0.2, 0.9 + snoise(vec2(3.0, t * 0.16)) * 0.2);

    float d1 = 1.0 / max(0.001, pow(distance(uv, p1), 2.0));
    float d2 = 1.0 / max(0.001, pow(distance(uv, p2), 2.0));
    float d3 = 1.0 / max(0.001, pow(distance(uv, p3), 2.0));
    float d4 = 1.0 / max(0.001, pow(distance(uv, p4), 2.0));

    float total = d1 + d2 + d3 + d4;
    vec3 color = (uColor1 * d1 + uColor2 * d2 + uColor3 * d3 + uColor4 * d4) / total;

    // Add grain
    if (uGrainMix > 0.0 || uGrainOverlay > 0.0) {
        float grain = random(uv * 10.0 + t) * uGrainMix;
        float overlay = random(vUv * uResolution.xy + t) * uGrainOverlay;
        color = mix(color, vec3(grain), uGrainMix * 0.1);
        color += (overlay - 0.5) * 0.1 * uGrainOverlay;
    }

    gl_FragColor = vec4(color, 1.0);
}
