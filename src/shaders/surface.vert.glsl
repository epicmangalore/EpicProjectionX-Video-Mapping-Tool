// Vertex shader for surface rendering with warping support
varying vec2 vUv;
varying vec3 vPosition;
varying vec3 vWorldPosition;
uniform mat4 uWarpMatrix;

void main() {
  vUv = uv;
  vPosition = position;
  
  // Apply warping matrix to local vertex position
  vec4 warpedPosition = uWarpMatrix * vec4(position, 1.0);
  
  // High-precision world position for global mapping
  vec4 worldPos = modelMatrix * warpedPosition;
  vWorldPosition = worldPos.xyz;
  
  // Standard gl_Position with perspective support
  gl_Position = projectionMatrix * viewMatrix * worldPos;
}
