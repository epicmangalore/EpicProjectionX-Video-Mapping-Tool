// Voronoi - Cell-based procedural pattern
uniform float uTime;
uniform float uScale;
uniform float uSpeed;
uniform vec3 uColor1;
uniform vec3 uColor2;
uniform vec2 uResolution;
varying vec2 vUv;

vec2 hash2(vec2 p) {
    p = vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)));
    return fract(sin(p) * 43758.5453);
}

void main() {
    vec2 uv = vUv * uScale;
    float t = uTime * uSpeed;

    vec2 n = floor(uv);
    vec2 f = fract(uv);

    float minDist = 8.0;
    float secondDist = 8.0;

    for (int j = -1; j <= 1; j++) {
        for (int i = -1; i <= 1; i++) {
            vec2 g = vec2(float(i), float(j));
            vec2 o = hash2(n + g);
            o = 0.5 + 0.5 * sin(t + 6.2831 * o);
            vec2 r = g + o - f;
            float d = dot(r, r);
            if (d < minDist) {
                secondDist = minDist;
                minDist = d;
            } else if (d < secondDist) {
                secondDist = d;
            }
        }
    }

    float edge = secondDist - minDist;
    float cell = sqrt(minDist);

    vec3 color = mix(uColor1, uColor2, cell);
    color = mix(vec3(1.0), color, smoothstep(0.0, 0.05, edge));

    gl_FragColor = vec4(color, 1.0);
}
