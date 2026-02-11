// RGB Split - Classic RGB channel separation
uniform sampler2D tDiffuse;
uniform float uAmount;
uniform float uAngle;
uniform vec2 uResolution;
varying vec2 vUv;

void main() {
    vec2 dir = vec2(cos(uAngle), sin(uAngle));
    vec2 offset = dir * uAmount / uResolution;

    float r = texture2D(tDiffuse, vUv + offset).r;
    float g = texture2D(tDiffuse, vUv).g;
    float b = texture2D(tDiffuse, vUv - offset).b;
    float a = texture2D(tDiffuse, vUv).a;

    gl_FragColor = vec4(r, g, b, a);
}
