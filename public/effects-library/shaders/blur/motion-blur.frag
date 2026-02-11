// Motion Blur - Directional streak blur
uniform sampler2D tDiffuse;
uniform float uAmount;
uniform float uAngle;
uniform vec2 uResolution;
varying vec2 vUv;

#define SAMPLES 12

void main() {
    vec2 dir = vec2(cos(uAngle), sin(uAngle)) * uAmount / uResolution;
    vec4 color = vec4(0.0);
    float total = 0.0;

    for (int i = -SAMPLES / 2; i <= SAMPLES / 2; i++) {
        float t = float(i) / float(SAMPLES);
        color += texture2D(tDiffuse, vUv + dir * t);
        total += 1.0;
    }

    gl_FragColor = color / total;
}
