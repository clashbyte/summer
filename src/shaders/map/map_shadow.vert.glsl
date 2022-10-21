in vec3 position;
out float dist;

void main() {
    gl_Position = transformVertex(vec4(position, 1.0));
}
