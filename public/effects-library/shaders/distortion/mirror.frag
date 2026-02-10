// Mirror - Horizontal/vertical axis mirroring
uniform sampler2D tDiffuse;
uniform float uMode; // 0=horizontal, 1=vertical, 2=quad
varying vec2 vUv;

void main() {
    vec2 uv = vUv;

    if (uMode < 0.5) {
        // Horizontal mirror (left half reflected to right)
        uv.x = uv.x < 0.5 ? uv.x : 1.0 - uv.x;
    } else if (uMode < 1.5) {
        // Vertical mirror (top half reflected to bottom)
        uv.y = uv.y < 0.5 ? uv.y : 1.0 - uv.y;
    } else {
        // Quad mirror
        uv.x = uv.x < 0.5 ? uv.x : 1.0 - uv.x;
        uv.y = uv.y < 0.5 ? uv.y : 1.0 - uv.y;
    }

    // Scale to fill
    uv *= 2.0;
    uv = clamp(uv, 0.0, 1.0);

    gl_FragColor = texture2D(tDiffuse, uv);
}
