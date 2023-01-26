uniform vec3 camera;

in vec3 position;
in vec2 uv;

out vec2 textureUV;

void main() {
    vec3 pos = position * 1.3;
    textureUV = uv;
    gl_Position = projMat * viewMat * (modelMat * vec4(pos, 1.0) + vec4(camera, 0.0));
}
