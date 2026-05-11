precision mediump float;
uniform sampler2D uTexture;
varying vec2 vUV;
varying vec4 vColor;

void main() { 
	gl_FragColor = texture2D(uTexture, vUV) * vColor;
	
	// probably never gonna use this
#ifdef ALPHA_CLIP
	if (gl_FragColor.a < .5) discard;
#endif
}