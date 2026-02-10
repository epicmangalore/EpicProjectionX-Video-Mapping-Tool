// Scan Lines - CRT-style horizontal scan lines
uniform sampler2D tDiffuse;
uniform float uCount;
uniform float uIntensity;
uniform float uTime;
uniform vec2 uResolution;
varying vec2 vUv;

void main() {
    vec4 color = texture2D(tDiffuse, vUv);
    float scanline = sin((vUv.y * uCount + uTime * 2.0) * 3.14159) * 0.5 + 0.5;
    color.rgb *= 1.0 - (scanline * uIntensity);

    // Slight horizontal jitter
    float jitter = (fract(sin(floor(vUv.y * uResolution.y) + uTime * 50.0) * 43758.5) - 0.5) * 0.002 * uIntensity;
    color.rgb = mix(color.rgb, texture2D(tDiffuse, vUv + vec2(jitter, 0.0)).rgb, uIntensity * 0.3);

    gl_FragColor = color;
}
