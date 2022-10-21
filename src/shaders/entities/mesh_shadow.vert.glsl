
in vec3 position;
in vec2 uv;

out vec2 textureUV;

void main() {
    textureUV = uv;
    gl_Position = transformVertex(vec4(position, 1.0));
}
