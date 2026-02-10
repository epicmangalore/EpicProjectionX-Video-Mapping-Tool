// VHS Distortion - Analog tape wobble and noise
uniform sampler2D tDiffuse;
uniform float uIntensity;
uniform float uTime;
uniform vec2 uResolution;
varying vec2 vUv;

float hash(float n) { return fract(sin(n) * 43758.5453); }

void main() {
    vec2 uv = vUv;

    // Vertical wobble
    float wobble = sin(uv.y * 20.0 + uTime * 3.0) * 0.003 * uIntensity;
    wobble += sin(uv.y * 100.0 + uTime * 7.0) * 0.001 * uIntensity;
    uv.x += wobble;

    // Tracking error bands
    float band = step(0.98, hash(floor(uTime * 8.0 + uv.y * 5.0)));
    uv.x += band * 0.05 * uIntensity;

    // Color bleed
    float r = texture2D(tDiffuse, uv + vec2(0.003 * uIntensity, 0.0)).r;
    float g = texture2D(tDiffuse, uv).g;
    float b = texture2D(tDiffuse, uv - vec2(0.003 * uIntensity, 0.0)).b;

    vec3 color = vec3(r, g, b);

    // Static noise
    float noise = hash(uv.x * uResolution.x + uv.y * uResolution.y * uResolution.x + uTime * 1000.0);
    color = mix(color, vec3(noise), 0.05 * uIntensity);

    // Scan lines
    float scanline = sin(uv.y * uResolution.y * 1.5) * 0.04 * uIntensity;
    color -= scanline;

    gl_FragColor = vec4(color, 1.0);
}
