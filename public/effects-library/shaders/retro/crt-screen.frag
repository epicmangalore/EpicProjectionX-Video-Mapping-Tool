// CRT Screen - Full CRT monitor simulation with curvature
uniform sampler2D tDiffuse;
uniform float uCurvature;
uniform float uVignette;
uniform vec2 uResolution;
varying vec2 vUv;

vec2 crtCurve(vec2 uv) {
    uv = uv * 2.0 - 1.0;
    vec2 offset = abs(uv.yx) / vec2(uCurvature);
    uv = uv + uv * offset * offset;
    uv = uv * 0.5 + 0.5;
    return uv;
}

void main() {
    vec2 uv = crtCurve(vUv);

    if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) {
        gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);
        return;
    }

    vec4 color = texture2D(tDiffuse, uv);

    // RGB sub-pixel pattern
    float px = mod(uv.x * uResolution.x, 3.0);
    if (px < 1.0) color.gb *= 0.85;
    else if (px < 2.0) color.rb *= 0.85;
    else color.rg *= 0.85;

    // Scan lines
    float scanline = sin(uv.y * uResolution.y * 3.14159) * 0.08;
    color.rgb -= scanline;

    // Vignette
    vec2 vigUv = uv * (1.0 - uv.yx);
    float vig = vigUv.x * vigUv.y * 15.0;
    vig = pow(vig, uVignette);
    color.rgb *= vig;

    gl_FragColor = color;
}
