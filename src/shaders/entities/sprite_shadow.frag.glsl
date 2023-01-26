
uniform sampler2D atlas;

in vec2 textureUV;

void main() {
    outColor = texture(atlas, textureUV);
    if (outColor.a < 0.8) discard;
    outColor = vec4(1.0);
}
