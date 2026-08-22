precision highp float;

uniform float uTime;
uniform vec2 uResolution;
uniform vec3 uColor1;
uniform vec3 uColor2;
uniform vec3 uColor3;
uniform float uAnimationSpeed;
uniform float uOverallScale;
uniform float uPulseIntensity;
uniform float uCornerRoundness;
uniform float uBorderThickness;
uniform float uEdgeSoftness;
uniform float uAspectRatio; // 0: Auto, 1: 1:1, 2: 4:3, 3: 16:9
uniform float uBloom;
uniform float uNumSpots;
uniform float uSpotSize;
uniform float uPulse;
uniform float uSmoke;
uniform float uSmokeSize;
uniform float uLeftMargin;
uniform float uRightMargin;
uniform float uTopMargin;
uniform float uBottomMargin;

varying vec2 vUv;

// SDF for Rounded Box
float sdRoundedBox(vec2 p, vec2 b, vec4 r) {
    r.xy = (p.x > 0.0) ? r.xy : r.zw;
    r.x  = (p.y > 0.0) ? r.x  : r.y;
    vec2 q = abs(p) - b + r.x;
    return min(max(q.x, q.y), 0.0) + length(max(q, 0.0)) - r.x;
}

float hash(vec2 p) {
    return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
}

void main() {
    float time = uTime * uAnimationSpeed;
    vec2 uv = vUv;
    
    // Apply margins
    uv.x = (uv.x - uLeftMargin) / (1.0 - uLeftMargin - uRightMargin);
    uv.y = (uv.y - uBottomMargin) / (1.0 - uTopMargin - uBottomMargin);
    
    vec2 p = (uv - 0.5) * 2.0 / uOverallScale;
    
    // Aspect ratio adjustment
    float aspect = uResolution.x / uResolution.y;
    if (uAspectRatio > 0.5 && uAspectRatio < 1.5) aspect = 1.0;
    else if (uAspectRatio > 1.5 && uAspectRatio < 2.5) aspect = 4.0/3.0;
    else if (uAspectRatio > 2.5) aspect = 16.0/9.0;
    
    p.x *= aspect;
    vec2 size = vec2(aspect, 1.0);
    
    float d = sdRoundedBox(p, size - 0.1, vec4(uCornerRoundness));
    
    // Border mask
    float border = smoothstep(uBorderThickness, uBorderThickness - uEdgeSoftness, abs(d));
    
    // Pulsing/Spots logic
    float spots = 0.0;
    for (float i = 0.0; i < 8.0; i++) {
        if (i >= uNumSpots) break;
        float t = time + i * 1.5;
        vec2 spotPos = vec2(sin(t), cos(t)) * (size - 0.1);
        float spotDist = length(p - spotPos);
        spots += smoothstep(uSpotSize, 0.0, spotDist) * uPulseIntensity;
    }
    
    // Smoke effect on border
    float smoke = 0.0;
    if (uSmoke > 0.0) {
        smoke = hash(p * uSmokeSize + time) * uSmoke;
    }
    
    // Color composition
    vec3 color = mix(uColor1, uColor2, sin(time + p.x) * 0.5 + 0.5);
    color = mix(color, uColor3, spots);
    
    float finalAlpha = border + spots + smoke * border;
    
    // Pulse animation
    finalAlpha *= 1.0 + sin(time * 5.0) * uPulse * 0.2;
    
    // Bloom
    vec3 finalColor = color * finalAlpha;
    if (uBloom > 0.0) {
        finalColor += color * uBloom * smoothstep(0.2, 0.0, abs(d));
    }
    
    gl_FragColor = vec4(finalColor, finalAlpha);
}
