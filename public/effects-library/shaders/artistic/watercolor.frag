// Watercolor - Wet paint bleeding and texture
uniform sampler2D tDiffuse;
uniform float uWetness;
uniform float uGranulation;
uniform float uTime;
uniform vec2 uResolution;
varying vec2 vUv;

float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    float a = hash(i);
    float b = hash(i + vec2(1.0, 0.0));
    float c = hash(i + vec2(0.0, 1.0));
    float d = hash(i + vec2(1.0, 1.0));
    return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}

void main() {
    vec2 texel = 1.0 / uResolution;

    // Paper texture distortion
    float n = noise(vUv * uResolution * 0.05 + uTime * 0.1);
    vec2 offset = vec2(n - 0.5, noise(vUv * uResolution * 0.05 + 100.0) - 0.5);
    offset *= uWetness * 5.0 * texel;

    // Sample with bleed
    vec4 color = vec4(0.0);
    float total = 0.0;
    for (float x = -2.0; x <= 2.0; x += 1.0) {
        for (float y = -2.0; y <= 2.0; y += 1.0) {
            vec2 sUv = vUv + offset + vec2(x, y) * texel * uWetness;
            color += texture2D(tDiffuse, sUv);
            total += 1.0;
        }
    }
    color /= total;

    // Granulation (pigment settling into paper grain)
    float grain = noise(vUv * uResolution * 0.2) * uGranulation;
    color.rgb = mix(color.rgb, color.rgb * (0.8 + grain * 0.4), uGranulation);

    // Paper white bleed at edges
    float lum = dot(color.rgb, vec3(0.299, 0.587, 0.114));
    color.rgb = mix(color.rgb, vec3(0.95, 0.93, 0.9), (1.0 - lum) * 0.1 * uWetness);

    gl_FragColor = color;
}
