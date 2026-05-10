precision mediump float;
varying vec2 vUV;
uniform sampler2D uTexture;

void main() { 
	gl_FragColor = texture2D(uTexture, vUV);
	// gl_FragColor = vec4(vUV, 0, 1);
	// gl_FragColor = vec4(vUV, 0, 1) + texture2D(uTexture, vUV);
}