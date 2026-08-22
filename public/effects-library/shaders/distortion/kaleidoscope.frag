// Kaleidoscope - Multi-segment mirror symmetry
uniform sampler2D tDiffuse;
uniform float uSegments;
uniform float uRotation;
varying vec2 vUv;

#define PI 3.14159265359

void main() {
    vec2 uv = vUv - 0.5;
    float angle = atan(uv.y, uv.x) + uRotation;
    float radius = length(uv);

    float segAngle = 2.0 * PI / uSegments;
    angle = mod(angle, segAngle);
    if (mod(floor((atan(uv.y, uv.x) + uRotation) / segAngle), 2.0) >= 1.0) {
        angle = segAngle - angle;
    }

    uv = vec2(cos(angle), sin(angle)) * radius + 0.5;
    gl_FragColor = texture2D(tDiffuse, uv);
}
