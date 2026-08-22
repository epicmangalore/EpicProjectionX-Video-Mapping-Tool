// Digital Glitch - Block displacement with color artifacts
uniform sampler2D tDiffuse;
uniform float uIntensity;
uniform float uBlockSize;
uniform float uTime;
varying vec2 vUv;

float hash(vec2 p) {
    return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
}

void main() {
    vec2 uv = vUv;
    vec2 block = floor(uv * uBlockSize);
    float t = floor(uTime * 10.0);
    float r = hash(block + t);

    if (r < uIntensity) {
        float shift = (hash(block + t * 0.7) - 0.5) * 0.15 * uIntensity;
        uv.x += shift;

        float cr = texture2D(tDiffuse, uv + vec2(0.01 * uIntensity, 0.0)).r;
        float cg = texture2D(tDiffuse, uv).g;
        float cb = texture2D(tDiffuse, uv - vec2(0.01 * uIntensity, 0.0)).b;
        gl_FragColor = vec4(cr, cg, cb, 1.0);
    } else {
        gl_FragColor = texture2D(tDiffuse, uv);
    }
}
