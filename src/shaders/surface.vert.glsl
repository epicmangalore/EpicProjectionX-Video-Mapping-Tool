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
  
  // Perspective divide is required for homography transformations
  vec3 finalPosition = warpedPosition.xyz / warpedPosition.w;
  
  vec4 worldPos = modelMatrix * vec4(finalPosition, 1.0);
  vWorldPosition = worldPos.xyz;
  
  gl_Position = projectionMatrix * viewMatrix * worldPos;
}
