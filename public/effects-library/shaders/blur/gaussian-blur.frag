// Gaussian Blur - Smooth two-pass gaussian blur
uniform sampler2D tDiffuse;
uniform float uAmount;
uniform vec2 uResolution;
uniform vec2 uDirection; // (1,0) for horizontal, (0,1) for vertical
varying vec2 vUv;

void main() {
    vec4 color = vec4(0.0);
    vec2 off = uDirection / uResolution * uAmount;

    // 9-tap gaussian kernel
    color += texture2D(tDiffuse, vUv - 4.0 * off) * 0.0162;
    color += texture2D(tDiffuse, vUv - 3.0 * off) * 0.0540;
    color += texture2D(tDiffuse, vUv - 2.0 * off) * 0.1216;
    color += texture2D(tDiffuse, vUv - 1.0 * off) * 0.1945;
    color += texture2D(tDiffuse, vUv)              * 0.2274;
    color += texture2D(tDiffuse, vUv + 1.0 * off) * 0.1945;
    color += texture2D(tDiffuse, vUv + 2.0 * off) * 0.1216;
    color += texture2D(tDiffuse, vUv + 3.0 * off) * 0.0540;
    color += texture2D(tDiffuse, vUv + 4.0 * off) * 0.0162;

    gl_FragColor = color;
}
