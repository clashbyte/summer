
uniform sampler2D diffuse;
uniform sampler2D shadow;
uniform vec3 sunlight;
uniform vec3 ambient;

in vec2 textureUV;
in float fogDist;
in vec4 shadowPos;
in float lightDot;

void main() {
    outColor = texture(diffuse, textureUV);
    if (outColor.a < 0.8) discard;

    float light = lightDot;
    vec3 shadowData = shadowPos.xyz;
    shadowData = shadowData * 0.5 + 0.5;
    float shadowMapValue = texture(shadow, shadowData.xy).r;
    if (shadowData.z - 0.001 > shadowMapValue) {
        light = 0.0;
    }
    outColor.rgb = outColor.rgb * mix(ambient, sunlight, light);
    outColor.rgb = mix(outColor.rgb, vec3(0.91, 0.66, 0.48), fogDist);
}
