precision mediump float;
uniform mat4 uViewProj;
attribute vec3 aPos;
attribute vec2 aUV;
attribute vec4 aColor;
varying vec2 vUV;
varying vec4 vColor;

void main() { 
	vUV = aUV;
	vColor = aColor;
	gl_Position = uViewProj * vec4(aPos, 1); 
}