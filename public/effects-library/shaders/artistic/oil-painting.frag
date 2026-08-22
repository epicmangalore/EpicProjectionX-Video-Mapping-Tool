// Oil Painting - Kuwahara filter for painterly look
uniform sampler2D tDiffuse;
uniform float uRadius;
uniform vec2 uResolution;
varying vec2 vUv;

void main() {
    vec2 texel = 1.0 / uResolution;
    int r = int(uRadius);

    vec3 m0 = vec3(0.0), m1 = vec3(0.0), m2 = vec3(0.0), m3 = vec3(0.0);
    vec3 s0 = vec3(0.0), s1 = vec3(0.0), s2 = vec3(0.0), s3 = vec3(0.0);
    float n = 0.0;

    // Four quadrants
    for (int j = -r; j <= 0; j++) {
        for (int i = -r; i <= 0; i++) {
            vec3 c = texture2D(tDiffuse, vUv + vec2(float(i), float(j)) * texel).rgb;
            m0 += c; s0 += c * c; n += 1.0;
        }
    }
    m0 /= n; s0 = abs(s0 / n - m0 * m0);

    n = 0.0;
    for (int j = -r; j <= 0; j++) {
        for (int i = 0; i <= r; i++) {
            vec3 c = texture2D(tDiffuse, vUv + vec2(float(i), float(j)) * texel).rgb;
            m1 += c; s1 += c * c; n += 1.0;
        }
    }
    m1 /= n; s1 = abs(s1 / n - m1 * m1);

    n = 0.0;
    for (int j = 0; j <= r; j++) {
        for (int i = 0; i <= r; i++) {
            vec3 c = texture2D(tDiffuse, vUv + vec2(float(i), float(j)) * texel).rgb;
            m2 += c; s2 += c * c; n += 1.0;
        }
    }
    m2 /= n; s2 = abs(s2 / n - m2 * m2);

    n = 0.0;
    for (int j = 0; j <= r; j++) {
        for (int i = -r; i <= 0; i++) {
            vec3 c = texture2D(tDiffuse, vUv + vec2(float(i), float(j)) * texel).rgb;
            m3 += c; s3 += c * c; n += 1.0;
        }
    }
    m3 /= n; s3 = abs(s3 / n - m3 * m3);

    // Pick quadrant with lowest variance
    float minVar = dot(s0, vec3(1.0));
    vec3 result = m0;
    float v;

    v = dot(s1, vec3(1.0)); if (v < minVar) { minVar = v; result = m1; }
    v = dot(s2, vec3(1.0)); if (v < minVar) { minVar = v; result = m2; }
    v = dot(s3, vec3(1.0)); if (v < minVar) { result = m3; }

    gl_FragColor = vec4(result, 1.0);
}
