
uniform sampler2D atlas;
uniform vec2 startUV;
uniform vec2 endUV;
uniform vec3 color;

in vec2 textureUV;
in float fogDist;

void main() {
    outColor = texture(atlas, startUV + endUV * textureUV) * vec4(color, 1.0);
    if (outColor.a < 0.8) discard;
    outColor = vec4(mix(outColor.rgb, vec3(0.91, 0.66, 0.48), fogDist), outColor.a);
}
