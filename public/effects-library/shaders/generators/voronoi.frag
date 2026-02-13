precision highp float;

uniform float uTime;
uniform vec2 uResolution;
uniform vec3 uColor1;
uniform vec3 uColor2;
uniform vec3 uGlowColor;
uniform vec3 uGapColor;
uniform float uStepsPerColor;
uniform float uCellDistortion;
uniform float uGapSize;
uniform float uGlowIntensity;
uniform float uAnimationSpeed;
uniform float uOverallScale;

varying vec2 vUv;

// Hash functions for Voronoi
vec2 hash22(vec2 p) {
    p = vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)));
    return fract(sin(p) * 43758.5453);
}

void main() {
    float time = uTime * uAnimationSpeed;
    vec2 uv = vUv * 10.0 * uOverallScale;
    
    vec2 i_uv = floor(uv);
    vec2 f_uv = fract(uv);
    
    // Voronoi search
    float m_dist = 1.0;
    vec2 m_id;
    
    for (int y = -1; y <= 1; y++) {
        for (int x = -1; x <= 1; x++) {
            vec2 neighbor = vec2(float(x), float(y));
            vec2 point = hash22(i_uv + neighbor);
            
            // Animate points
            point = 0.5 + 0.5 * sin(time + 6.2831 * point);
            
            vec2 diff = neighbor + point - f_uv;
            float dist = length(diff);
            
            if (dist < m_dist) {
                m_dist = dist;
                m_id = i_uv + neighbor;
            }
        }
    }
    
    // Cell color logic
    float r = hash22(m_id).x;
    float colorIdx = floor(r * uStepsPerColor) / uStepsPerColor;
    vec3 cellColor = mix(uColor1, uColor2, colorIdx);
    
    // Gap/Border logic (using second-order like distance for sharp edges)
    float border = smoothstep(1.0 - uGapSize, 1.0, m_dist * 2.0);
    vec3 color = mix(cellColor, uGapColor, border);
    
    // Glow/Highlight logic
    float glow = (1.0 - m_dist) * uGlowIntensity;
    if (length(uGlowColor) > 0.01) {
        color += uGlowColor * pow(glow, 3.0);
    } else {
        color += vec3(0.5, 0.4, 0.2) * glow * 0.5; // Subtle warm glow default
    }
    
    // Apply distortion based on distance
    color += sin(m_dist * 10.0 + time) * 0.05 * uCellDistortion;
    
    gl_FragColor = vec4(color, 1.0);
}
