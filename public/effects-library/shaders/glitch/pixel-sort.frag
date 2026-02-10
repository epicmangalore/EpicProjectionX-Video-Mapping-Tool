// Pixel Sort - Threshold-based horizontal pixel sorting effect
uniform sampler2D tDiffuse;
uniform float uThreshold;
uniform float uIntensity;
uniform float uTime;
varying vec2 vUv;

float luminance(vec3 c) {
    return dot(c, vec3(0.299, 0.587, 0.114));
}

void main() {
    vec4 color = texture2D(tDiffuse, vUv);
    float lum = luminance(color.rgb);

    if (lum > uThreshold) {
        // Shift bright pixels horizontally based on luminance
        float shift = (lum - uThreshold) * uIntensity * 0.1;
        shift *= sin(uTime * 2.0 + vUv.y * 10.0) * 0.5 + 0.5;
        vec2 sortedUv = vUv + vec2(shift, 0.0);
        sortedUv.x = clamp(sortedUv.x, 0.0, 1.0);
        color = texture2D(tDiffuse, sortedUv);
    }

    gl_FragColor = color;
}
