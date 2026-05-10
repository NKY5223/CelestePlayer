precision mediump float;
attribute vec3 aPos;
attribute vec2 aUV;
varying vec2 vUV;
uniform mat4 uViewProj;

void main() { 
	vUV = aUV;
	gl_Position = uViewProj * vec4(aPos, 1); 
}