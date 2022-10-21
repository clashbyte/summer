uniform mat4 shadowMat;

in vec3 position;
in vec3 normal;
in vec2 uv;

out vec2 textureUV;
out float fogDist;
out vec4 shadowPos;
out float lightDot;

void main() {
    textureUV = uv;
    shadowPos = shadowMat * vec4(position, 1.0);
    shadowPos /= shadowPos.w;
    lightDot = clamp(dot(normal, normalize(vec3(-1.0, 1.5, -1.0))), 0.0, 1.0);
    lightDot = ceil(lightDot);



    vec4 viewPos = viewMat * modelMat * vec4(position, 1.0);
    fogDist = smoothstep(5.0, 70.0, -viewPos.z / viewPos.w);
    gl_Position = projMat * viewPos;
}
