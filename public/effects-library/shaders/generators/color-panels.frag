precision highp float;

uniform float uTime;
uniform vec2 uResolution;
uniform vec3 uColor1;
uniform vec3 uColor2;
uniform vec3 uColor3;
uniform vec3 uColor4;
uniform vec3 uColor5;
uniform vec3 uColor6;
uniform vec3 uColor7;
uniform float uPanelDensity;
uniform float uPrimaryAngle;
uniform float uSecondaryAngle;
uniform float uPanelLength;
uniform float uEdgeDefinition;
uniform float uBlur;
uniform float uFadeIn;
uniform float uFadeOut;
uniform float uGradient;
uniform float uAnimationSpeed;
uniform float uOverallScale;

varying vec2 vUv;

mat2 rotate2d(float angle) {
    return mat2(cos(angle), -sin(angle), sin(angle), cos(angle));
}

void main() {
    float time = uTime * uAnimationSpeed;
    vec2 uv = (vUv - 0.5) * 2.0 / uOverallScale;
    
    // Primary orientation
    uv *= rotate2d(uPrimaryAngle * 0.0174533);
    
    vec3 finalColor = vec3(0.0);
    float totalAlpha = 0.0;
    
    float density = floor(uPanelDensity * 3.0) + 1.0;
    
    for (float i = 0.0; i < 7.0; i++) {
        if (i >= density * 2.0) break;
        
        float t = time + i * 0.5;
        vec2 p = uv;
        
        // Secondary movement/tilt
        p *= rotate2d(uSecondaryAngle * 0.0174533 * sin(t * 0.2));
        
        // Panel position (oscillation)
        float pos = sin(t * 0.5 + p.x * 0.5) * uPanelLength;
        
        // Panel shape (box-like slice)
        float width = 0.2;
        float dist = abs(p.y - pos);
        
        float mask = smoothstep(width + uBlur, width, dist);
        
        // Fading
        mask *= smoothstep(-1.0, -1.0 + uFadeIn, p.x);
        mask *= smoothstep(1.0, 1.0 - uFadeOut, p.x);
        
        // Edge sharpening
        mask = pow(mask, mix(1.0, 5.0, uEdgeDefinition));
        
        // Color selection
        vec3 col;
        float colorIdx = mod(i, 7.0);
        if (colorIdx < 1.0) col = uColor1;
        else if (colorIdx < 2.0) col = uColor2;
        else if (colorIdx < 3.0) col = uColor3;
        else if (colorIdx < 4.0) col = uColor4;
        else if (colorIdx < 5.0) col = uColor5;
        else if (colorIdx < 6.0) col = uColor6;
        else col = uColor7;
        
        // Gradient effect
        if (uGradient > 0.0) {
            col *= mix(1.0, 0.5 + 0.5 * sin(p.x * 5.0 + t), uGradient);
        }
        
        // Additive blending for "glowy" panel look
        finalColor += col * mask;
        totalAlpha = max(totalAlpha, mask);
    }
    
    gl_FragColor = vec4(finalColor, totalAlpha);
}
