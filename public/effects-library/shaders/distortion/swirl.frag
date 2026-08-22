// Swirl - Twisting spiral distortion
uniform sampler2D tDiffuse;
uniform float uAngle;
uniform float uRadius;
uniform vec2 uCenter;
varying vec2 vUv;

void main() {
    vec2 uv = vUv - uCenter;
    float dist = length(uv);
    float percent = (uRadius - dist) / uRadius;

    if (percent > 0.0) {
        float theta = percent * percent * uAngle;
        float s = sin(theta);
        float c = cos(theta);
        uv = vec2(uv.x * c - uv.y * s, uv.x * s + uv.y * c);
    }

    gl_FragColor = texture2D(tDiffuse, uv + uCenter);
}
