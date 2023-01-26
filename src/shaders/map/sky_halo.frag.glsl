
uniform vec3 color;

in vec2 textureUV;

void main() {
    float range = clamp(1.0 - length(textureUV * 2.0 - 1.0), 0.0, 1.0);

    outColor = vec4(color * range * 0.25, 0.8);
}
