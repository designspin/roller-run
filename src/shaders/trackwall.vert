#version 300 es
precision mediump float;

in vec2 aPosition;
in vec2 aUV;

uniform mat3 uProjectionMatrix;
uniform mat3 uTransformMatrix;

out vec2 vUV;

void main() {
    vUV = aUV;
    gl_Position = vec4((uProjectionMatrix * uTransformMatrix * vec3(aPosition, 1.0)).xy, 0.0, 1.0);
}