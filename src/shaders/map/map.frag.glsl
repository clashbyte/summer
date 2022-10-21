
uniform sampler2D atlas;
uniform sampler2D shadow;
uniform vec3 sunlight;
uniform vec3 ambient;

in vec2 textureUV;
in float fogDist;
in vec4 shadowPos;
in float lightDot;

void main() {
    float light = lightDot;
    vec3 shadowData = shadowPos.xyz;
    shadowData = shadowData * 0.5 + 0.5;
    float shadowMapValue = texture(shadow, shadowData.xy).r;
    if (shadowData.z - 0.0007 > shadowMapValue) {
        light = 0.0;
    }

    vec3 diffuse = texture(atlas, textureUV).rgb;
    diffuse *= mix(ambient, sunlight, light);
    diffuse = mix(diffuse, vec3(0.91, 0.66, 0.48), fogDist);

    outColor = vec4(diffuse, 1.0);
}
