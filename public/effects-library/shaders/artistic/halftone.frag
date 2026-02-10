// Halftone - CMYK-style dot pattern printing
uniform sampler2D tDiffuse;
uniform float uDotSize;
uniform float uAngle;
uniform vec2 uResolution;
varying vec2 vUv;

#define PI 3.14159265359

float pattern(vec2 uv, float angle) {
    float s = sin(angle), c = cos(angle);
    vec2 p = vec2(c * uv.x - s * uv.y, s * uv.x + c * uv.y) * uResolution / uDotSize;
    return (sin(p.x) * sin(p.y)) * 4.0;
}

void main() {
    vec4 color = texture2D(tDiffuse, vUv);

    // CMYK channels with different angles
    float c = 1.0 - color.r;
    float m = 1.0 - color.g;
    float y = 1.0 - color.b;
    float k = min(c, min(m, y));

    c = (c - k) / (1.0 - k + 0.001);
    m = (m - k) / (1.0 - k + 0.001);
    y = (y - k) / (1.0 - k + 0.001);

    c = step(c * 10.0, pattern(vUv, uAngle + 0.26));
    m = step(m * 10.0, pattern(vUv, uAngle + 1.05));
    y = step(y * 10.0, pattern(vUv, uAngle));
    k = step(k * 10.0, pattern(vUv, uAngle + 0.79));

    vec3 result = 1.0 - vec3(c + k, m + k, y + k);
    result = clamp(result, 0.0, 1.0);

    gl_FragColor = vec4(result, 1.0);
}
