// Duotone - Map luminance to two-color gradient
uniform sampler2D tDiffuse;
uniform vec3 uShadowColor;
uniform vec3 uHighlightColor;
uniform float uIntensity;
varying vec2 vUv;

void main() {
    vec4 color = texture2D(tDiffuse, vUv);
    float lum = dot(color.rgb, vec3(0.299, 0.587, 0.114));
    vec3 duotone = mix(uShadowColor, uHighlightColor, lum);
    color.rgb = mix(color.rgb, duotone, uIntensity);
    gl_FragColor = color;
}
