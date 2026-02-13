precision highp float;

uniform sampler2D uTexture;
uniform float uTime;
uniform vec2 uResolution;
uniform float uOpacity;

// Border & Glow Uniforms
uniform vec3 uBorderColor;
uniform float uBorderWidth;
uniform float uBorderOpacity;
uniform float uGlowIntensity;
uniform float uAnimationStyle; // 0: none, 1: march, 2: pulse, 3: breathe, 4: flicker
uniform float uAnimationSpeed;

varying vec2 vUv;

void main() {
    vec4 texColor = texture2D(uTexture, vUv);
    
    // Calculate border/glow based on UV
    // Simple rectangular border
    float w = uBorderWidth * 0.01;
    float glow = uGlowIntensity * 0.05;
    
    // Animating properties
    float finalOpacity = uBorderOpacity;
    float finalWidth = w;
    float finalGlow = glow;
    
    if (uAnimationStyle > 0.5) {
        float t = uTime * uAnimationSpeed;
        
        if (uAnimationStyle < 1.5) { // Marching Ants
            // Not easily done with simple rectangle UV without more complex math
            // Fallback to pulse for now or implement if needed
        } else if (uAnimationStyle < 2.5) { // Pulse
            finalWidth = w * (1.0 + sin(t * 5.0) * 0.3);
        } else if (uAnimationStyle < 3.5) { // Breathe
            finalOpacity = uBorderOpacity * (0.5 + 0.5 * sin(t * 3.0));
        } else if (uAnimationStyle < 4.5) { // Flicker
            if (fract(sin(t * 100.0)) > 0.8) finalOpacity *= 0.5;
        }
    }

    // Edge distance (0 at edges, 0.5 at center)
    vec2 dist = min(vUv, 1.0 - vUv);
    float edgeDist = min(dist.x, dist.y);
    
    // Border mask
    float borderMask = smoothstep(finalWidth + 0.001, finalWidth, edgeDist);
    
    // Glow mask
    float glowMask = smoothstep(finalWidth + finalGlow + 0.001, finalWidth, edgeDist);
    glowMask = glowMask - borderMask;
    
    vec3 resultColor = texColor.rgb;
    float resultAlpha = texColor.a;
    
    // Apply border
    resultColor = mix(resultColor, uBorderColor, borderMask * finalOpacity);
    
    // Apply glow
    resultColor += uBorderColor * glowMask * finalOpacity * 0.5;
    
    gl_FragColor = vec4(resultColor, resultAlpha * uOpacity);
}
