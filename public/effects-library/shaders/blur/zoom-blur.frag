// Zoom Blur - Explosive radial zoom blur
uniform sampler2D tDiffuse;
uniform float uStrength;
uniform vec2 uCenter;
varying vec2 vUv;

#define SAMPLES 20

void main() {
    vec2 dir = vUv - uCenter;
    float dist = length(dir);
    vec4 color = vec4(0.0);
    float total = 0.0;

    for (int i = 0; i < SAMPLES; i++) {
        float t = float(i) / float(SAMPLES - 1);
        float offset = t * uStrength * dist * 0.1;
        vec2 sampleUv = vUv - normalize(dir) * offset;
        color += texture2D(tDiffuse, sampleUv);
        total += 1.0;
    }

    gl_FragColor = color / total;
}
