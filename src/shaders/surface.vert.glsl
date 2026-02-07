// Vertex shader for surface rendering with warping support
varying vec2 vUv;
varying vec3 vPosition;
uniform mat4 uWarpMatrix;

void main() {
  vUv = uv;
  vPosition = position;
  
  // Apply warping matrix to local vertex position
  vec4 warpedPosition = uWarpMatrix * vec4(position, 1.0);
  
  // Perspective divide is required for homography transformations
  vec3 finalPosition = warpedPosition.xyz / warpedPosition.w;
  
  gl_Position = projectionMatrix * modelViewMatrix * vec4(finalPosition, 1.0);
}
