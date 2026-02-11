// Plasma - Classic demoscene plasma effect
uniform float uTime;
uniform float uScale;
uniform float uSpeed;
uniform vec2 uResolution;
varying vec2 vUv;

void main() {
    vec2 uv = (vUv - 0.5) * uScale;
    float t = uTime * uSpeed;

    float v1 = sin(uv.x * 10.0 + t);
    float v2 = sin(10.0 * (uv.x * sin(t * 0.5) + uv.y * cos(t * 0.3)) + t);
    float cx = uv.x + 0.5 * sin(t * 0.3);
    float cy = uv.y + 0.5 * cos(t * 0.4);
    float v3 = sin(sqrt(100.0 * (cx * cx + cy * cy) + 1.0) + t);
    float v4 = sin(sqrt(uv.x * uv.x + uv.y * uv.y) * 8.0 - t * 2.0);

    float v = (v1 + v2 + v3 + v4) * 0.25;

    vec3 color;
    color.r = sin(v * 3.14159) * 0.5 + 0.5;
    color.g = sin(v * 3.14159 + 2.094) * 0.5 + 0.5;
    color.b = sin(v * 3.14159 + 4.188) * 0.5 + 0.5;

    gl_FragColor = vec4(color, 1.0);
}
