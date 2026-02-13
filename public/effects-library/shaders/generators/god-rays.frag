precision highp float;

uniform float uTime;
uniform vec2 uResolution;
uniform vec3 uColor1;
uniform vec3 uColor2;
uniform vec3 uColor3;
uniform vec3 uColor4;
uniform vec3 uBloomColor;
uniform float uBloomIntensity;
uniform float uRayIntensity;
uniform float uRayDensity;
uniform float uSpottyEffect;
uniform float uMidSize;
uniform float uMidIntensity;
uniform float uAnimationSpeed;
uniform float uVerticalOffset;

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
    vec2 uv = vUv;
    
    // Central point for rays (top center with offset)
    vec2 rayOrigin = vec2(0.5, 1.0 + uVerticalOffset);
    vec2 diff = uv - rayOrigin;
    
    // Convert to polar
    float dist = length(diff);
    float angle = atan(diff.y, diff.x);
    
    // Create rays using sinusoids and noise
    float rays = 0.5 + 0.5 * sin(angle * 15.0 * uRayDensity + time * 0.5);
    rays *= 0.5 + 0.5 * sin(angle * 35.0 * uRayDensity - time * 0.2);
    
    // Add "spotty" noise effect
    float spotty = snoise(vec2(angle * 5.0, dist * 2.0 - time * 0.1)) * uSpottyEffect;
    rays = clamp(rays + spotty, 0.0, 1.0);
    
    // Add volumetric fade
    rays *= smoothstep(2.0, 0.2, dist);
    
    // Mid intensity (core brightness)
    float core = smoothstep(uMidSize + 0.5, 0.0, dist) * uMidIntensity;
    
    // Ray intensity
    rays *= uRayIntensity;
    
    // Color mapping
    float colorIdx = mod(angle * 2.5 + time * 0.1, 4.0);
    vec3 rayColor = uColor1;
    if (colorIdx < 1.0) rayColor = uColor1;
    else if (colorIdx < 2.0) rayColor = uColor2;
    else if (colorIdx < 3.0) rayColor = uColor3;
    else rayColor = uColor4;
    
    // Final composition
    vec3 color = rayColor * rays;
    color += vec3(core);
    
    // Bloom (additive wash)
    if (length(uBloomColor) > 0.01) {
        color += uBloomColor * uBloomIntensity * smoothstep(1.5, 0.0, dist);
    } else {
        color += rays * uBloomIntensity * 0.5;
    }
    
    gl_FragColor = vec4(color, 1.0);
}
