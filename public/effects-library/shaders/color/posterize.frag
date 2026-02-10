// Posterize - Reduce color levels for flat poster look
uniform sampler2D tDiffuse;
uniform float uLevels;
varying vec2 vUv;

void main() {
    vec4 color = texture2D(tDiffuse, vUv);
    float levels = max(uLevels, 2.0);
    color.rgb = floor(color.rgb * levels + 0.5) / levels;
    gl_FragColor = color;
}
