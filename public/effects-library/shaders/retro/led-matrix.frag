// LED Matrix - Circular LED pixel grid
uniform sampler2D tDiffuse;
uniform float uPixelSize;
uniform float uBrightness;
uniform vec2 uResolution;
varying vec2 vUv;

void main() {
    vec2 pixelUv = floor(vUv * uResolution / uPixelSize) * uPixelSize / uResolution;
    vec4 color = texture2D(tDiffuse, pixelUv);

    // LED dot shape (circular per pixel)
    vec2 cellUv = fract(vUv * uResolution / uPixelSize);
    float dist = length(cellUv - 0.5);
    float dot = smoothstep(0.45, 0.35, dist);

    // Sub-pixel RGB (side by side in each dot)
    vec3 led;
    if (cellUv.x < 0.33) led = vec3(color.r, 0.0, 0.0);
    else if (cellUv.x < 0.66) led = vec3(0.0, color.g, 0.0);
    else led = vec3(0.0, 0.0, color.b);

    led *= dot * uBrightness * 3.0;
    led += color.rgb * 0.05; // ambient glow

    gl_FragColor = vec4(led, 1.0);
}
