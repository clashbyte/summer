
uniform sampler2D diffuse;

in vec2 textureUV;

void main() {
    outColor = vec4(texture(diffuse, textureUV).rgb, 1.0);
}
