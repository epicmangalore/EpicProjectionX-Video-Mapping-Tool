// Edge Detection - Sobel operator for line art look
uniform sampler2D tDiffuse;
uniform float uThreshold;
uniform vec3 uEdgeColor;
uniform vec3 uBgColor;
uniform vec2 uResolution;
varying vec2 vUv;

float luminance(vec3 c) {
    return dot(c, vec3(0.299, 0.587, 0.114));
}

void main() {
    vec2 texel = 1.0 / uResolution;

    float tl = luminance(texture2D(tDiffuse, vUv + vec2(-texel.x, texel.y)).rgb);
    float t  = luminance(texture2D(tDiffuse, vUv + vec2(0.0, texel.y)).rgb);
    float tr = luminance(texture2D(tDiffuse, vUv + vec2(texel.x, texel.y)).rgb);
    float l  = luminance(texture2D(tDiffuse, vUv + vec2(-texel.x, 0.0)).rgb);
    float r  = luminance(texture2D(tDiffuse, vUv + vec2(texel.x, 0.0)).rgb);
    float bl = luminance(texture2D(tDiffuse, vUv + vec2(-texel.x, -texel.y)).rgb);
    float b  = luminance(texture2D(tDiffuse, vUv + vec2(0.0, -texel.y)).rgb);
    float br = luminance(texture2D(tDiffuse, vUv + vec2(texel.x, -texel.y)).rgb);

    float gx = -tl - 2.0*l - bl + tr + 2.0*r + br;
    float gy = -tl - 2.0*t - tr + bl + 2.0*b + br;
    float edge = sqrt(gx * gx + gy * gy);

    vec3 color = edge > uThreshold ? uEdgeColor : uBgColor;
    gl_FragColor = vec4(color, 1.0);
}
