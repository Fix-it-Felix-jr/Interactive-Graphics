// This function takes the projection matrix, the translation, and two rotation angles (in radians) as input arguments.
// The two rotations are applied around x and y axes.
// It returns the combined 4x4 transformation matrix as an array in column-major order.
// The given projection matrix is also a 4x4 matrix stored as an array in column-major order.
// You can use the MatrixMult function defined in project4.html to multiply two 4x4 matrices in the same format.
function GetModelViewProjection(projectionMatrix, translationX, translationY, translationZ, rotationX, rotationY) {
	// Rotation around X axis
	var cosX = Math.cos(rotationX);
	var sinX = Math.sin(rotationX);
	var rotX = [
		1, 0,     0,    0,
		0, cosX, sinX, 0,
		0, -sinX, cosX, 0,
		0, 0,     0,    1
	];

	// Rotation around Y axis
	var cosY = Math.cos(rotationY);
	var sinY = Math.sin(rotationY);
	var rotY = [
		cosY, 0, -sinY, 0,
		0,    1, 0,     0,
		sinY, 0, cosY,  0,
		0,    0, 0,     1
	];

	// Translation matrix
	var trans = [
		1, 0, 0, 0,
		0, 1, 0, 0,
		0, 0, 1, 0,
		translationX, translationY, translationZ, 1
	];

	// Combine transformations: MVP = projection * translation * rotY * rotX
	var modelView = MatrixMult(rotY, rotX);         // rotY * rotX
	modelView = MatrixMult(trans, modelView);       // trans * (rotY * rotX)
	var mvp = MatrixMult(projectionMatrix, modelView); // projection * (trans * rotY * rotX)

	return mvp;
}



class MeshDrawer {
	constructor() {
	
		this.textureReady = false;
	
		const meshVS = `
		attribute vec3 pos;
		attribute vec2 tex;
		uniform mat4 mvp;
		uniform bool swapYZ;
		varying vec2 vTex;

		void main() {
			vec3 position = pos;
			if (swapYZ) {
				position = vec3(position.x, position.z, position.y);
			}
			gl_Position = mvp * vec4(position, 1.0);
			vTex = tex;
		}
		`;
		
		const meshFS = `
		precision mediump float;
		uniform bool showTexture;
		uniform sampler2D texture;
		varying vec2 vTex;

		void main() {
			if (showTexture) {
				gl_FragColor = texture2D(texture, vTex);
			} else {
				gl_FragColor = vec4(1,gl_FragCoord.z*gl_FragCoord.z,0,1);
			}
		}
		`;


		this.prog = InitShaderProgram(meshVS, meshFS);

		// Get attribute and uniform locations
		this.mvp = gl.getUniformLocation(this.prog, "mvp");
		this.swapYZLoc = gl.getUniformLocation(this.prog, "swapYZ");
		this.showTextureLoc = gl.getUniformLocation(this.prog, "showTexture");

		this.posLoc = gl.getAttribLocation(this.prog, "pos");
		this.texLoc = gl.getAttribLocation(this.prog, "tex");

		// Create buffers
		this.vertBuffer = gl.createBuffer();
		this.texBuffer = gl.createBuffer();

		// Create texture
		this.texture = gl.createTexture();

		// Default states
		this.swap = document.getElementById("swap-yz")?.checked ?? false;
		this.showTex = document.getElementById("show-texture")?.checked ?? false;
	}

	setMesh(vertPos, texCoords) {
		this.numTriangles = vertPos.length / 3;

		// Vertex buffer
		gl.bindBuffer(gl.ARRAY_BUFFER, this.vertBuffer);
		gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertPos), gl.STATIC_DRAW);

		// Texture coordinate buffer
		gl.bindBuffer(gl.ARRAY_BUFFER, this.texBuffer);
		gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(texCoords), gl.STATIC_DRAW);
	}

	swapYZ(swap) {
		this.swap = swap;
	}

	showTexture(show) {
		this.showTex = show;
	}

	setTexture(img) {
		gl.bindTexture(gl.TEXTURE_2D, this.texture);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
		gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, img);


		if (this.showTex) {
			gl.useProgram(this.prog);
			gl.uniform1i(this.showTextureLoc, true);

			// E anche il bind del texture sampler
			const textureLoc = gl.getUniformLocation(this.prog, "texture");
			gl.uniform1i(textureLoc, 0); // unit 0
		}
		
		this.textureReady = true;
	}


	draw(trans) {
		gl.useProgram(this.prog);

		const useTexture = this.showTex && this.textureReady;

		// Uniforms
		gl.uniformMatrix4fv(this.mvp, false, trans);
		gl.uniform1i(this.swapYZLoc, this.swap);
		gl.uniform1i(this.showTextureLoc, useTexture);

		// Attribs
		gl.bindBuffer(gl.ARRAY_BUFFER, this.vertBuffer);
		gl.enableVertexAttribArray(this.posLoc);
		gl.vertexAttribPointer(this.posLoc, 3, gl.FLOAT, false, 0, 0);

		gl.bindBuffer(gl.ARRAY_BUFFER, this.texBuffer);
		gl.enableVertexAttribArray(this.texLoc);
		gl.vertexAttribPointer(this.texLoc, 2, gl.FLOAT, false, 0, 0);

		// Texture
		gl.activeTexture(gl.TEXTURE0);
		gl.bindTexture(gl.TEXTURE_2D, this.texture);
		const textureLoc = gl.getUniformLocation(this.prog, "texture");
		gl.uniform1i(textureLoc, 0); // bind sampler to unit 0

		// Draw call
		gl.drawArrays(gl.TRIANGLES, 0, this.numTriangles);
	}

}

