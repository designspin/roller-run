uniform float uTime;
uniform float uScale;
uniform float uSpeed;
uniform float uScroll;

out vec4 finalColor;

void main() {
    float t = uTime * uSpeed;
    vec2 pos = gl_FragCoord.xy / uScale;
    float sx1 = sin(t * 0.31); sx1 = sx1 * sx1 * sx1;
    float cx1 = cos(t * 0.17); cx1 = cx1 * cx1 * cx1;
    float cy1 = cos(t * 0.23); cy1 = cy1 * cy1 * cy1;
    float sy1 = sin(t * 0.13); sy1 = sy1 * sy1 * sy1;

    pos.x += sx1 * 2.0 + cx1 * 1.4;
    pos.y += cy1 * 2.0 + sy1 * 1.8 + uScroll / uScale;

    float checker = mod(floor(pos.x) + floor(pos.y), 2.0);

    vec3 colorA = vec3(0.1, 0.1, 0.15);
    vec3 colorB = vec3(0.18, 0.18, 0.25);

    finalColor = vec4(mix(colorA, colorB, checker), 1.0);
}
