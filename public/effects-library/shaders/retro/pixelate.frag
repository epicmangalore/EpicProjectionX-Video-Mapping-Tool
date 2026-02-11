// Pixelate - Mosaic pixelation effect
uniform sampler2D tDiffuse;
uniform float uPixelSize;
uniform vec2 uResolution;
varying vec2 vUv;

void main() {
    vec2 pixels = uResolution / max(uPixelSize, 1.0);
    vec2 uv = floor(vUv * pixels) / pixels;
    gl_FragColor = texture2D(tDiffuse, uv);
}
