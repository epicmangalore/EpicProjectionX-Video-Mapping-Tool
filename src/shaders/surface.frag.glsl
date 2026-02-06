// Fragment shader with color adjustments and effects
uniform sampler2D uTexture;
uniform float uOpacity;
uniform float uBrightness;
uniform float uContrast;
uniform float uSaturation;
uniform float uHue;
uniform vec3 uColorTint;
uniform float uBlurAmount;
uniform float uChromaticAberration;
uniform float uRGBShift;

varying vec2 vUv;
varying vec3 vPosition;

// Convert RGB to HSV
vec3 rgb2hsv(vec3 c) {
  vec4 K = vec4(0.0, -1.0 / 3.0, 2.0 / 3.0, -1.0);
  vec4 p = mix(vec4(c.bg, K.wz), vec4(c.gb, K.xy), step(c.b, c.g));
  vec4 q = mix(vec4(p.xyw, c.r), vec4(c.r, p.yzx), step(p.x, c.r));
  float d = q.x - min(q.w, q.y);
  float e = 1.0e-10;
  return vec3(abs(q.z + (q.w - q.y) / (6.0 * d + e)), d / (q.x + e), q.x);
}

// Convert HSV to RGB
vec3 hsv2rgb(vec3 c) {
  vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
  vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
  return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
}

// Simple blur (box blur)
vec4 blur(sampler2D tex, vec2 uv, float amount) {
  vec4 color = vec4(0.0);
  float total = 0.0;
  
  for (float x = -2.0; x <= 2.0; x += 1.0) {
    for (float y = -2.0; y <= 2.0; y += 1.0) {
      vec2 offset = vec2(x, y) * amount * 0.01;
      color += texture2D(tex, uv + offset);
      total += 1.0;
    }
  }
  
  return color / total;
}

// Chromatic aberration
vec4 chromaticAberration(sampler2D tex, vec2 uv, float amount) {
  vec2 direction = uv - vec2(0.5);
  
  float r = texture2D(tex, uv + direction * amount * 0.01).r;
  float g = texture2D(tex, uv).g;
  float b = texture2D(tex, uv - direction * amount * 0.01).b;
  
  return vec4(r, g, b, 1.0);
}

// RGB shift
vec4 rgbShift(sampler2D tex, vec2 uv, float amount) {
  float r = texture2D(tex, uv + vec2(amount * 0.01, 0.0)).r;
  float g = texture2D(tex, uv).g;
  float b = texture2D(tex, uv - vec2(amount * 0.01, 0.0)).b;
  
  return vec4(r, g, b, 1.0);
}

void main() {
  vec4 texColor;
  
  // Apply effects
  if (uBlurAmount > 0.0) {
    texColor = blur(uTexture, vUv, uBlurAmount);
  } else if (uChromaticAberration > 0.0) {
    texColor = chromaticAberration(uTexture, vUv, uChromaticAberration);
  } else if (uRGBShift > 0.0) {
    texColor = rgbShift(uTexture, vUv, uRGBShift);
  } else {
    texColor = texture2D(uTexture, vUv);
  }
  
  // Apply brightness
  texColor.rgb += uBrightness;
  
  // Apply contrast
  texColor.rgb = (texColor.rgb - 0.5) * (1.0 + uContrast) + 0.5;
  
  // Apply saturation
  vec3 hsv = rgb2hsv(texColor.rgb);
  hsv.y *= (1.0 + uSaturation);
  
  // Apply hue shift
  hsv.x += uHue;
  
  texColor.rgb = hsv2rgb(hsv);
  
  // Apply color tint
  texColor.rgb *= uColorTint;
  
  // Apply opacity
  texColor.a *= uOpacity;
  
  gl_FragColor = texColor;
}
