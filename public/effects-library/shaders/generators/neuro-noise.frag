precision highp float;

uniform float uTime;
uniform vec2 uResolution;
uniform vec3 uForegroundColor;
uniform vec3 uMidColor;
uniform float uBrightness;
uniform float uContrast;
uniform float uAnimationSpeed;

varying vec2 vUv;

float hash(vec2 p) {
    return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
}

vec2 hash2(vec2 p) {
    return vec2(hash(p), hash(p + 1.0));
}

void main() {
    float time = uTime * uAnimationSpeed;
    vec2 p = vUv * 8.0;
    
    vec2 i = floor(p);
    vec2 f = fract(p);
    
    float minDist = 1.0;
    
    for (int y = -1; y <= 1; y++) {
        for (int x = -1; x <= 1; x++) {
            vec2 g = vec2(float(x), float(y));
            vec2 o = hash2(i + g);
            o = 0.5 + 0.4 * sin(time + 6.2831 * o);
            vec2 r = g + o - f;
            float d = length(r);
            minDist = min(minDist, d);
        }
    }
    
    // Neuro-network logic: high power distance for "fibers"
    float val = pow(1.0 - minDist, 8.0);
    val = val * (1.0 + uBrightness);
    
    // Contrast adjustment
    val = (val - 0.5) * (1.0 + uContrast) + 0.5;
    val = clamp(val, 0.0, 1.0);
    
    // Color composition
    vec3 color = mix(vec3(0.0), uMidColor, val * 0.5);
    color = mix(color, uForegroundColor, pow(val, 2.0));
    
    // Add pulsing "firings"
    float firings = pow(val, 16.0) * (sin(time * 2.0) * 0.5 + 0.5);
    color += uForegroundColor * firings * 2.0;
    
    gl_FragColor = vec4(color, 1.0);
}
