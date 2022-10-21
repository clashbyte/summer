#version 300 es
precision highp float;

uniform mat4 projMat;
uniform mat4 viewMat;
uniform mat4 modelMat;

vec4 transformVertex(vec4 pos) {
    return projMat * viewMat * modelMat * pos;
}


