
#define POINT_RANGE 3.0

uniform sampler2D atlas;
uniform sampler2D shadow;
uniform vec3 sunlight;
uniform vec3 ambient;
uniform int pointCount;
uniform vec3 pointLights[8];
uniform float pointFactor;

in vec2 textureUV;
in vec4 fragPos;
in float fogDist;
in vec4 shadowPos;
in float lightDot;
in vec3 fragNormal;

void main() {
    float light = lightDot;
    vec3 shadowData = shadowPos.xyz;
    shadowData = shadowData * 0.5 + 0.5;
    float shadowMapValue = texture(shadow, shadowData.xy).r;
    if (shadowData.z - 0.0007 > shadowMapValue) {
        light = 0.0;
    }

    float pointValue = 0.0;
    for (int i = 0; i < pointCount; i++) {
        vec3 ldir = fragPos.xyz - pointLights[i];
        float ldist = length(ldir) / POINT_RANGE;
        pointValue += clamp(1.0 - pow(ldist, 2.0), 0.0, 1.0) * clamp(-dot(ldir, fragNormal), 0.0, 1.0);
    }
    light = clamp(light + pointValue * pointFactor, 0.0, 1.0);

    vec3 diffuse = texture(atlas, textureUV).rgb;
    diffuse *= mix(ambient, sunlight, light);
    diffuse = mix(diffuse, vec3(0.91, 0.66, 0.48), fogDist);

    outColor = vec4(diffuse, 1.0);
}
