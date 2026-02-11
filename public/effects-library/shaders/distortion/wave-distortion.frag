// Wave Distortion - Animated sine wave displacement
uniform sampler2D tDiffuse;
uniform float uAmplitude;
uniform float uFrequency;
uniform float uSpeed;
uniform float uTime;
varying vec2 vUv;

void main() {
    vec2 uv = vUv;
    uv.x += sin(uv.y * uFrequency + uTime * uSpeed) * uAmplitude * 0.01;
    uv.y += cos(uv.x * uFrequency + uTime * uSpeed * 0.7) * uAmplitude * 0.01;
    uv = clamp(uv, 0.0, 1.0);
    gl_FragColor = texture2D(tDiffuse, uv);
}
