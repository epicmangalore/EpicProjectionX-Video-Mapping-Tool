precision highp float;

uniform sampler2D uTexture;
uniform float uOpacity;
uniform vec4 uBlendZones; // x: left, y: right, z: top, w: bottom (0-1)
uniform float uBlendFeather; // Feathering amount (0-1)
uniform float uBlendGamma; // Gamma correction for blending (default 2.2)

varying vec2 vUv;

void main() {
    vec4 texColor = texture2D(uTexture, vUv);
    
    // Calculate edge blend factors
    float leftBlend = 1.0;
    float rightBlend = 1.0;
    float topBlend = 1.0;
    float bottomBlend = 1.0;
    
    // Left edge
    if (uBlendZones.x > 0.0 && vUv.x < uBlendZones.x) {
        float t = vUv.x / uBlendZones.x;
        leftBlend = pow(smoothstep(0.0, 1.0, t), uBlendGamma);
    }
    
    // Right edge
    if (uBlendZones.y > 0.0 && vUv.x > (1.0 - uBlendZones.y)) {
        float t = (1.0 - vUv.x) / uBlendZones.y;
        rightBlend = pow(smoothstep(0.0, 1.0, t), uBlendGamma);
    }
    
    // Top edge
    if (uBlendZones.z > 0.0 && vUv.y > (1.0 - uBlendZones.z)) {
        float t = (1.0 - vUv.y) / uBlendZones.z;
        topBlend = pow(smoothstep(0.0, 1.0, t), uBlendGamma);
    }
    
    // Bottom edge
    if (uBlendZones.w > 0.0 && vUv.y < uBlendZones.w) {
        float t = vUv.y / uBlendZones.w;
        bottomBlend = pow(smoothstep(0.0, 1.0, t), uBlendGamma);
    }
    
    // Combine all blend factors
    float blendFactor = leftBlend * rightBlend * topBlend * bottomBlend;
    
    // Apply feathering
    blendFactor = mix(1.0, blendFactor, uBlendFeather);
    
    // Apply blend and opacity
    gl_FragColor = vec4(texColor.rgb, texColor.a * blendFactor * uOpacity);
}
