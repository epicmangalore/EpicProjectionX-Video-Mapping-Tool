precision highp float;

uniform float uTime;
uniform vec2 uResolution;
uniform vec3 uHighlightColor;
uniform float uHighlights;
uniform float uLayerDepth;
uniform float uEdgeDefinition;
uniform float uWave;
uniform float uCausticEffect;
uniform float uWaterSize;
uniform float uAnimationSpeed;
uniform float uOverallScale;

varying vec2 vUv;

// Simplex noise helper
vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec3 permute(vec3 x) { return mod289(((x * 34.0) + 1.0) * x); }
float snoise(vec2 v) {
    const vec4 C = vec4(0.211324865405187, 0.366025403784439, -0.577350269189626, 0.024390243902439);
    vec2 i = floor(v + dot(v, C.yy));
    vec2 x0 = v - i + dot(i, C.xx);
    vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
    vec4 x12 = x0.xyxy + C.xxzz;
    x12.xy -= i1;
    i = mod289(i.xyx).xy;
    vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0)) + i.x + vec3(0.0, i1.x, 1.0));
    vec3 m = max(0.5 - vec3(dot(x0, x0), dot(x12.xy, x12.xy), dot(x12.zw, x12.zw)), 0.0);
    m = m * m; m = m * m;
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

void main() {
    float time = uTime * uAnimationSpeed;
    vec2 uv = vUv * uWaterSize * uOverallScale;
    
    // Animate water movement
    vec2 p = uv;
    p.x += snoise(uv * 0.5 + time * 0.1) * uWave;
    p.y += snoise(uv * 0.6 - time * 0.15) * uWave;
    
    // Caustics logic
    float n = snoise(p * 2.5 + time * 0.2);
    n += snoise(p * 5.0 - time * 0.1) * 0.5;
    n = abs(n);
    float caustics = pow(1.0 - n, 8.0) * uCausticEffect;
    
    // Highlights & Depth
    float highlight = smoothstep(1.0 - uHighlights, 1.0, 1.0 - n);
    float depth = smoothstep(0.0, uLayerDepth, n);
    
    // Base color (deep blue to surface highlights)
    vec3 deepWater = vec3(0.0, 0.05, 0.1);
    vec3 shallowWater = vec3(0.0, 0.4, 0.6);
    vec3 baseCol = mix(deepWater, shallowWater, depth);
    
    // Add highlights and caustics
    vec3 color = baseCol + caustics + highlight * uHighlightColor;
    
    // Blend definition
    color *= uEdgeDefinition;

    gl_FragColor = vec4(color, 1.0);
}
