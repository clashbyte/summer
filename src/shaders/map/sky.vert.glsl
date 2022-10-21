uniform vec3 camera;

in vec3 position;
in vec2 uv;

out vec2 textureUV;

void main() {
    textureUV = uv;
    //projMat * viewMat * modelMat * pos
    gl_Position = projMat * viewMat * (modelMat * vec4(position, 1.0) + vec4(camera, 0.0));
}
