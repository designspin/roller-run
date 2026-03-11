#version 300 es
precision mediump float;

in vec2 vUV;
out vec4 fragColor;

uniform vec4 uWallColor;       // wall base color
uniform float uFrequency;  // chevron repeat rate

void main() {
    float chevron = vUV.y + abs(vUV.x - 0.5) * 0.5;
    
    float pattern = fract(chevron * uFrequency);
    
    float stripe = step(0.5, pattern);
    
    vec3 color = uWallColor.rgb * mix(0.6, 1.0, stripe);
    
    fragColor = vec4(color, 1.0);
}