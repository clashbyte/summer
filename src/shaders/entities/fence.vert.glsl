
in vec3 position;
in vec2 uv;

out vec2 textureUV;
out float fogDist;

void main() {
    textureUV = uv;
    vec4 fogPos = viewMat * modelMat * vec4(position, 1.0);
    fogDist = smoothstep(5.0, 70.0, -fogPos.z / fogPos.w);

    gl_Position = projMat * fogPos;
}
