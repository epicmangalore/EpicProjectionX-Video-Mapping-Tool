// Fractal - Animated Julia set fractal
uniform float uTime;
uniform float uScale;
uniform float uSpeed;
uniform vec3 uColor1;
uniform vec3 uColor2;
uniform vec2 uResolution;
varying vec2 vUv;

void main() {
    vec2 uv = (vUv - 0.5) * uScale * 3.0;
    float t = uTime * uSpeed * 0.2;

    // Animated Julia set constant
    vec2 c = vec2(
        0.355 + 0.1 * sin(t * 1.3),
        0.355 + 0.1 * cos(t * 0.9)
    );

    vec2 z = uv;
    float iter = 0.0;
    const float maxIter = 64.0;

    for (float i = 0.0; i < maxIter; i++) {
        if (dot(z, z) > 4.0) break;
        z = vec2(z.x * z.x - z.y * z.y, 2.0 * z.x * z.y) + c;
        iter = i;
    }

    float f = iter / maxIter;
    f = sqrt(f);

    vec3 color = mix(uColor1, uColor2, f);
    // Add some glow near the set boundary
    float glow = 1.0 - smoothstep(0.0, 0.6, f);
    color += glow * 0.3 * mix(uColor1, uColor2, 0.5);

    gl_FragColor = vec4(color, 1.0);
}
