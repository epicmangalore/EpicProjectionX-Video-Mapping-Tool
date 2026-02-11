// Fisheye - Barrel/pincushion lens distortion
uniform sampler2D tDiffuse;
uniform float uStrength;
varying vec2 vUv;

void main() {
    vec2 uv = vUv * 2.0 - 1.0; // -1 to 1
    float r = length(uv);
    float theta = atan(uv.y, uv.x);

    // Barrel distortion
    float distorted = pow(r, 1.0 + uStrength * 0.5) / pow(1.0, 1.0 + uStrength * 0.5);
    vec2 nuv = vec2(cos(theta), sin(theta)) * distorted;
    nuv = (nuv + 1.0) * 0.5; // back to 0-1

    if (nuv.x < 0.0 || nuv.x > 1.0 || nuv.y < 0.0 || nuv.y > 1.0) {
        gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);
    } else {
        gl_FragColor = texture2D(tDiffuse, nuv);
    }
}
