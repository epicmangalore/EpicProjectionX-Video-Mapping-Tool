// ASCII Art - Character-based image rendering
uniform sampler2D tDiffuse;
uniform float uCharSize;
uniform vec2 uResolution;
varying vec2 vUv;

float character(int n, vec2 p) {
    p = floor(p * vec2(4.0, -4.0) + 2.5);
    if (clamp(p.x, 0.0, 4.0) == p.x && clamp(p.y, 0.0, 4.0) == p.y) {
        int idx = int(p.x) + int(p.y) * 5;
        if (((n >> idx) & 1) == 1) return 1.0;
    }
    return 0.0;
}

void main() {
    vec2 pixels = uResolution / max(uCharSize, 4.0);
    vec2 cellUv = mod(vUv * pixels, 1.0);
    vec2 blockUv = floor(vUv * pixels) / pixels;

    vec4 color = texture2D(tDiffuse, blockUv);
    float lum = dot(color.rgb, vec3(0.299, 0.587, 0.114));

    // Map luminance to character density
    int c = 32; // space
    if (lum > 0.1) c = 46;       // .
    if (lum > 0.25) c = 4329764;  // :
    if (lum > 0.4) c = 15255086;  // o
    if (lum > 0.55) c = 13105133; // &
    if (lum > 0.7) c = 15252014;  // 8
    if (lum > 0.85) c = 32294446; // @

    float ch = character(c, cellUv - 0.5);
    gl_FragColor = vec4(color.rgb * ch, 1.0);
}
