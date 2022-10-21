
uniform sampler2D diffuse;

in vec2 textureUV;

void main() {
    if (texture(diffuse, textureUV).a < 0.8) discard;
    outColor = vec4(1.0);
}
