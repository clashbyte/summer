
uniform float angle;
uniform vec2 uvStart;
uniform vec2 uvSize;
uniform float scale;
uniform vec3 offset;

in vec3 position;
in vec2 uv;

out vec2 textureUV;

void main() {
    textureUV = uvStart + uv * uvSize;
    float sn = sin(-angle);
    float cs = cos(-angle);

    vec3 pos = position * scale + offset;
//    pos = vec3(
//        pos.x * cs - pos.z * sn,
//        pos.y,
//        pos.x * sn + pos.z * cs
//    ) + offset;

    gl_Position = projMat * viewMat * modelMat * vec4(pos, 1.0);
}
