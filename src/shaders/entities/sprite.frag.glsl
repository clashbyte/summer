
uniform sampler2D atlas;
uniform vec3 sun;
uniform vec3 ambient;

in vec2 textureUV;
in float fogDist;
in float light;

void main() {
    outColor = texture(atlas, textureUV);
    if (outColor.a < 0.8) discard;
    outColor = vec4(mix(outColor.rgb * mix(ambient, sun, light), vec3(0.91, 0.66, 0.48), fogDist), outColor.a);
}
