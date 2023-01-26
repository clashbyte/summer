
uniform float angle;

in vec3 position;
in vec2 uv;
in vec2 uvStart;
in vec2 uvSize;
in float scale;
in vec3 offset;
in float color;

out vec2 textureUV;
out float fogDist;
out float light;

void main() {
    textureUV = uvStart + uv * uvSize;
    light = color;
    float sn = sin(-angle);
    float cs = cos(-angle);

    vec3 pos = position * scale;
    pos = vec3(
        pos.x * cs - pos.z * sn,
        pos.y,
        pos.x * sn + pos.z * cs
    ) + offset;

    vec4 fogPos = viewMat * modelMat * vec4(pos, 1.0);
    fogDist = smoothstep(5.0, 70.0, -fogPos.z / fogPos.w);

    gl_Position = projMat * fogPos;
}
