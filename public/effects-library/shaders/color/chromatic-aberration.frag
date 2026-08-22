// Chromatic Aberration - Lens fringe color separation
uniform sampler2D tDiffuse;
uniform float uAmount;
uniform vec2 uResolution;
varying vec2 vUv;

void main() {
    vec2 center = vec2(0.5);
    vec2 dir = vUv - center;
    float dist = length(dir);

    float offset = uAmount * dist * 0.01;

    float r = texture2D(tDiffuse, vUv + dir * offset).r;
    float g = texture2D(tDiffuse, vUv).g;
    float b = texture2D(tDiffuse, vUv - dir * offset).b;

    gl_FragColor = vec4(r, g, b, texture2D(tDiffuse, vUv).a);
}
