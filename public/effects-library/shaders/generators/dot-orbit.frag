precision highp float;

uniform float uTime;
uniform vec2 uResolution;
uniform vec3 uColor1;
uniform vec3 uColor2;
uniform vec3 uColor3;
uniform vec3 uColor4;
uniform vec3 uColor5;
uniform float uStepsPerColor;
uniform float uDotSize;
uniform float uSizeVariation;
uniform float uDotSpreading;
uniform float uAnimationSpeed;

varying vec2 vUv;

float random(vec2 st) {
    return fract(sin(dot(st.xy, vec2(12.9898, 78.233))) * 43758.5453123);
}

void main() {
    float time = uTime * uAnimationSpeed;
    vec2 uv = vUv * 20.0 * uDotSpreading; // Grid density
    
    vec2 gv = fract(uv) - 0.5; // Grid cell UV
    vec2 id = floor(uv);       // Grid cell ID
    
    // Animate dot position within cell
    float r = random(id);
    float angle = time + r * 6.28;
    vec2 offset = vec2(cos(angle), sin(angle)) * 0.2;
    
    float dist = length(gv - offset);
    
    // Calculate dot size with variation
    float size = uDotSize * (1.0 - uSizeVariation * r);
    float dotAlpha = smoothstep(size, size - 0.05, dist);
    
    // Choose color based on ID and steps per color
    float colorIndex = mod(floor((id.x + id.y + r * 10.0) / uStepsPerColor), 5.0);
    vec3 color = uColor1;
    if (colorIndex < 1.0) color = uColor1;
    else if (colorIndex < 2.0) color = uColor2;
    else if (colorIndex < 3.0) color = uColor3;
    else if (colorIndex < 4.0) color = uColor4;
    else color = uColor5;
    
    gl_FragColor = vec4(color * dotAlpha, dotAlpha);
}
