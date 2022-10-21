
uniform sampler2D atlas;
uniform vec3 sunlight;
uniform vec3 ambient;

in vec2 textureUV;
in float fogDist;

void main() {
//    outColor = vec4(1.0, 0.0, 0.0, 1.0);
    outColor = texture(atlas, textureUV);
    if (outColor.a < 0.8) discard;
    outColor = vec4(mix(outColor.rgb, vec3(0.91, 0.66, 0.48), fogDist), outColor.a);
}
