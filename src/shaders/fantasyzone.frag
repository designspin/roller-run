uniform float uTime;
uniform float uScroll;
uniform vec2 uResolution;

out vec4 finalColor;

// Simple pseudo-noise from 2D input
float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);

    float a = hash(i);
    float b = hash(i + vec2(1.0, 0.0));
    float c = hash(i + vec2(0.0, 1.0));
    float d = hash(i + vec2(1.0, 1.0));

    return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}

float fbm(vec2 p) {
    float v = 0.0;
    float a = 0.5;
    vec2 shift = vec2(100.0);
    for (int i = 0; i < 3; i++) {
        v += a * noise(p);
        p = p * 2.0 + shift;
        a *= 0.5;
    }
    return v;
}

void main() {
    vec2 uv = gl_FragCoord.xy / uResolution;

    float t = uTime * 0.15;

    // Pastel sky gradient
    vec3 skyTop = vec3(
        0.55 + 0.1 * sin(t),
        0.75 + 0.1 * sin(t * 1.3 + 1.0),
        1.0
    );
    vec3 skyBot = vec3(
        1.0,
        0.65 + 0.1 * sin(t * 0.7 + 2.0),
        0.75 + 0.1 * cos(t * 0.9)
    );
    vec3 color = mix(skyBot, skyTop, uv.y);

    // Clouds drifting downward — tied to game speed + gentle idle drift
    float drift = uScroll * 0.002 + uTime * 0.02;

    // Far clouds — slow, faint, small
    float c1 = fbm(vec2(uv.x * 3.0, uv.y * 2.0 + drift * 0.5));
    c1 = smoothstep(0.4, 0.7, c1) * 0.3;

    // Mid clouds
    float c2 = fbm(vec2(uv.x * 2.0 + 50.0, uv.y * 1.5 + drift * 0.8));
    c2 = smoothstep(0.35, 0.65, c2) * 0.45;

    // Near clouds — fast, bright, large
    float c3 = fbm(vec2(uv.x * 1.5 + 100.0, uv.y * 1.0 + drift));
    c3 = smoothstep(0.3, 0.6, c3) * 0.6;

    float cloud = max(c1, max(c2, c3));
    vec3 cloudColor = vec3(1.0, 1.0, 1.0);
    color = mix(color, cloudColor, cloud);

    finalColor = vec4(color, 1.0);
}
