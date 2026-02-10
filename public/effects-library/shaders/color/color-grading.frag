// Color Grading - Lift/Gamma/Gain color correction
uniform sampler2D tDiffuse;
uniform vec3 uLift;
uniform vec3 uGamma;
uniform vec3 uGain;
varying vec2 vUv;

void main() {
    vec4 color = texture2D(tDiffuse, vUv);

    // Lift (shadows)
    color.rgb += uLift * (1.0 - color.rgb);

    // Gain (highlights)
    color.rgb *= uGain;

    // Gamma (midtones)
    color.rgb = pow(max(color.rgb, vec3(0.0)), 1.0 / max(uGamma, vec3(0.01)));

    color.rgb = clamp(color.rgb, 0.0, 1.0);
    gl_FragColor = color;
}
