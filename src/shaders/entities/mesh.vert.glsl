
uniform mat4 angleMat;
uniform mat4 shadowMat;

in vec3 position;
in vec2 uv;
in vec3 normal;

out vec2 textureUV;
out float fogDist;
out vec4 shadowPos;
out float lightDot;

void main() {

    vec3 vertNorm = normalize((angleMat * vec4(normal, 0.0)).xyz);
    lightDot = clamp(dot(vertNorm, normalize(vec3(-1.0, 1.5, -1.0))), 0.0, 1.0);
    lightDot = 1.0 - pow(1.0 - lightDot, 3.0);
    shadowPos = shadowMat * modelMat * angleMat * vec4(position, 1.0);
    shadowPos /= shadowPos.w;

    textureUV = uv;
    vec4 fogPos = viewMat * modelMat * angleMat * vec4(position, 1.0);
    fogDist = smoothstep(5.0, 70.0, -fogPos.z / fogPos.w);

    gl_Position = projMat * fogPos;
}
