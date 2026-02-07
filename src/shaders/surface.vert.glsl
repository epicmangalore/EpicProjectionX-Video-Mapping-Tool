// Vertex shader for surface rendering with warping support
varying vec2 vUv;
varying vec3 vPosition;
uniform mat4 uWarpMatrix;

void main() {
  vUv = uv;
  vPosition = position;
  
  // Apply warping matrix to local vertex position
  vec4 warpedPosition = uWarpMatrix * vec4(position, 1.0);
  
  gl_Position = projectionMatrix * modelViewMatrix * warpedPosition;
}
