in vec3 position;

void main() {
    gl_Position = projMat * viewMat * modelMat * vec4(position, 1.0);
}
