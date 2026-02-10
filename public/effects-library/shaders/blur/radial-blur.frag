// Radial Blur - Circular motion blur from center
uniform sampler2D tDiffuse;
uniform float uAmount;
uniform vec2 uCenter;
varying vec2 vUv;

#define SAMPLES 16

void main() {
    vec2 dir = vUv - uCenter;
    vec4 color = vec4(0.0);
    float total = 0.0;

    for (int i = 0; i < SAMPLES; i++) {
        float t = float(i) / float(SAMPLES - 1);
        float scale = 1.0 - uAmount * 0.01 * t;
        vec2 sampleUv = uCenter + dir * scale;
        color += texture2D(tDiffuse, sampleUv);
        total += 1.0;
    }

    gl_FragColor = color / total;
}
