precision highp float;

uniform float uTime;
uniform vec2 uResolution;
uniform vec3 uColor1;
uniform vec3 uColor2;
uniform vec3 uColor3;
uniform vec3 uColor4;
uniform vec3 uColor5;
uniform float uStepsPerColor;
uniform float uEdgeSoftness;
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
    vec2 uv = vUv * 3.0 * uOverallScale;
    
    // Layered noise for organic flow
    float noise = snoise(uv + time * 0.1) * 0.5 + 0.5;
    noise += snoise(uv * 2.0 - time * 0.05) * 0.25;
    noise = noise / 0.75;
    
    // Create sharp/stepped bands
    float bands = floor(noise * uStepsPerColor * 5.0) / (uStepsPerColor * 5.0);
    float smoothBands = mix(bands, noise, uEdgeSoftness);
    
    // Color mapping based on bands
    float colorIndex = floor(smoothBands * 5.0);
    vec3 color = uColor1;
    if (colorIndex < 1.0) color = uColor1;
    else if (colorIndex < 2.0) color = uColor2;
    else if (colorIndex < 3.0) color = uColor3;
    else if (colorIndex < 4.0) color = uColor4;
    else color = uColor5;
    
    gl_FragColor = vec4(color, 1.0);
}
