// This function takes the translation and two rotation angles (in radians) as input arguments.
// The two rotations are applied around x and y axes.
// It returns the combined 4x4 transformation matrix as an array in column-major order.
// You can use the MatrixMult function defined in project5.html to multiply two 4x4 matrices in the same format.
function GetModelViewMatrix( translationX, translationY, translationZ, rotationX, rotationY )
{
	// Rotation around X axis
	var cosX = Math.cos(rotationX);
	var sinX = Math.sin(rotationX);
	var rotX = [
		1,    0,     0,    0,
		0,  cosX,  sinX,  0,
		0, -sinX,  cosX,  0,
		0,    0,     0,    1
	];

	// Rotation around Y axis
	var cosY = Math.cos(rotationY);
	var sinY = Math.sin(rotationY);
	var rotY = [
		cosY, 0, -sinY, 0,
		0,    1,  0,    0,
		sinY, 0,  cosY, 0,
		0,    0,  0,    1
	];

	// Translation matrix
	var trans = [
		1, 0, 0, 0,
		0, 1, 0, 0,
		0, 0, 1, 0,
		translationX, translationY, translationZ, 1
	];

	// Combine transformations: MV = Translation * RotationY * RotationX
	var mv = MatrixMult(rotY, rotX);      // rotY * rotX
	mv = MatrixMult(trans, mv);           // trans * (rotY * rotX)
	
	return mv;
}



const meshVS = `
attribute vec3 a_position;
attribute vec2 a_texcoord;
attribute vec3 a_normal;

uniform mat4 u_matrixMVP;
uniform mat4 u_matrixMV;
uniform mat3 u_normalMatrix;
uniform bool swapYZ;

varying vec3 v_normal;
varying vec2 vTex;
varying vec3 v_positionCamera;

void main() {
    vec3 position = a_position;
    vec3 normal = a_normal;

    // Inversione YZ se richiesto
    if (swapYZ) {
        position = vec3(position.x, position.z, position.y);
        normal = vec3(normal.x, normal.z, normal.y);
    }

    // Calcolo coordinate nello spazio camera
    vec4 positionCamera = u_matrixMV * vec4(position, 1.0);
    v_positionCamera = positionCamera.xyz;

    // Normale trasformata correttamente nello spazio camera
    v_normal = normalize(u_normalMatrix * normal);

    // Proiezione finale
    gl_Position = u_matrixMVP * vec4(position, 1.0);

    // Coordinate texture
    vTex = a_texcoord;
}
`;

		
const meshFS = `
precision mediump float;

varying vec3 v_normal;
varying vec3 v_positionCamera;
varying vec2 vTex;

uniform bool showTexture;
uniform sampler2D texture;
uniform vec3 lightDir;   // direzione della luce (spazio camera)
uniform float shininess;

void main() {
    vec3 N = normalize(v_normal);       // normale interpolata
    vec3 L = normalize(lightDir);       // direzione luce (verso la superficie)
    vec3 V = normalize(-v_positionCamera); // direzione verso la camera
    vec3 H = normalize(L + V);          // half-vector per Blinn

    float diff = max(dot(N, L), 0.0);
    float spec = 0.0;
    if (diff > 0.0) {
        spec = pow(max(dot(N, H), 0.0), shininess);
    }

    // Colore base dalla texture o bianco
    vec4 baseColor = showTexture ? texture2D(texture, vTex) : vec4(1.0);

    // Componenti di luce
    vec3 ambient = vec3(0.1);
    vec3 diffuse = baseColor.rgb * diff;
    vec3 specular = vec3(1.0) * spec;

    vec3 finalColor = ambient + diffuse + specular;

    gl_FragColor = vec4(finalColor, baseColor.a);
}
`;


class MeshDrawer {
	constructor() {
	
		this.textureReady = false;
		

	

		this.prog = InitShaderProgram(meshVS, meshFS);
		
		gl.useProgram(this.prog);
		
		this.lightDirLoc = gl.getUniformLocation(this.prog, "lightDir");
		this.shininessLoc = gl.getUniformLocation(this.prog, "shininess");

		// Get attribute and uniform locations
		this.mvp = gl.getUniformLocation(this.prog, "mvp");
		this.swapYZLoc = gl.getUniformLocation(this.prog, "swapYZ");
		this.showTextureLoc = gl.getUniformLocation(this.prog, "showTexture");

		this.posLoc = gl.getAttribLocation(this.prog, "pos");
		this.texLoc = gl.getAttribLocation(this.prog, "tex");
		gl.uniform1f(gl.getUniformLocation(this.prog, "shininess"), 32.0);


		// Create buffers
		this.vertBuffer = gl.createBuffer();
		this.texBuffer = gl.createBuffer();

		// Create texture
		this.texture = gl.createTexture();

		// Default states
		this.swap = document.getElementById("swap-yz")?.checked ?? false;
		this.showTex = document.getElementById("show-texture")?.checked ?? false;
		
		this.normalBuffer = gl.createBuffer();
		this.normalLoc = gl.getAttribLocation(this.prog, "normal");

	}

	setMesh(vertPos, texCoords, normals) {
		this.numTriangles = vertPos.length / 3;

		gl.bindBuffer(gl.ARRAY_BUFFER, this.vertBuffer);
		gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertPos), gl.STATIC_DRAW);

		gl.bindBuffer(gl.ARRAY_BUFFER, this.texBuffer);
		gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(texCoords), gl.STATIC_DRAW);

		gl.bindBuffer(gl.ARRAY_BUFFER, this.normalBuffer);
		gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(normals), gl.STATIC_DRAW);
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


	draw(matrixMVP, matrixMV, matrixNormal) {
		gl.useProgram(this.prog);
		
		// Imposta uniform swapYZ e showTexture
		gl.uniform1i(this.swapYZLoc, this.swap);
		gl.uniform1i(this.showTextureLoc, this.showTex && this.textureReady);


		// === Matrici uniformi ===
		let locMVP     = gl.getUniformLocation(this.prog, "u_matrixMVP");
		let locMV      = gl.getUniformLocation(this.prog, "u_matrixMV"); // opzionale se lo usi
		let locNormal  = gl.getUniformLocation(this.prog, "u_normalMatrix");

		if (locMVP)    gl.uniformMatrix4fv(locMVP, false, matrixMVP);
		if (locMV)     gl.uniformMatrix4fv(locMV, false, matrixMV);
		if (locNormal) gl.uniformMatrix3fv(locNormal, false, matrixNormal);

		// === Posizioni ===
		gl.bindBuffer(gl.ARRAY_BUFFER, this.vertBuffer);
		let locPos = gl.getAttribLocation(this.prog, "a_position");
		if (locPos !== -1) {
			gl.enableVertexAttribArray(locPos);
			gl.vertexAttribPointer(locPos, 3, gl.FLOAT, false, 0, 0);
		}

		// === Coordinate texture (opzionale) ===
		gl.bindBuffer(gl.ARRAY_BUFFER, this.texBuffer);
		let locTex = gl.getAttribLocation(this.prog, "a_texcoord");
		if (locTex !== -1) {
			gl.enableVertexAttribArray(locTex);
			gl.vertexAttribPointer(locTex, 2, gl.FLOAT, false, 0, 0);
		}

		// === Normali ===
		gl.bindBuffer(gl.ARRAY_BUFFER, this.normalBuffer);
		let locNormalAttrib = gl.getAttribLocation(this.prog, "a_normal");
		if (locNormalAttrib !== -1) {
			gl.enableVertexAttribArray(locNormalAttrib);
			gl.vertexAttribPointer(locNormalAttrib, 3, gl.FLOAT, false, 0, 0);
		}

		// === Draw ===
		gl.drawArrays(gl.TRIANGLES, 0, this.numTriangles);
	}

		// This method is called to set the incoming light direction
	setLightDir(x, y, z)
	{
		gl.useProgram(this.prog);
		gl.uniform3f(this.lightDirLoc, x, y, z);
	}

	setShininess(shininess)
	{
		gl.useProgram(this.prog);
		gl.uniform1f(this.shininessLoc, shininess);
	}


}


// This function is called for every step of the simulation.
// Its job is to advance the simulation for the given time step duration dt.
// It updates the given positions and velocities.
function SimTimeStep( dt, positions, velocities, springs, stiffness, damping, particleMass, gravity, restitution )
{
    // positions: array di Vec3 (mutabili)
    // velocities: array di Vec3 (mutabili)
    // springs: array di oggetti { p0: idx, p1: idx, rest: restLength }
    // stiffness, damping: scalari
    // particleMass: scalare (se <= 0 => particella fissa)
    // gravity: Vec3 (direzione/accel)
    // restitution: coef di rimbalzo per collisioni con bounding box [-1,1]^3

    const eps = 1e-8;
    const nParticles = positions.length;

    // 1) inizializza vettore delle forze a zero per ogni particella
    const forces = new Array(nParticles);
    for (let i = 0; i < nParticles; ++i) {
        // assumiamo che Vec3 abbia costruttore e .init
        forces[i] = new Vec3();
        forces[i].init(0,0,0);
    }

    // 2) calcola forze delle molle e damping tra le coppie connesse
    for (let s of springs) {
        const i0 = s.p0, i1 = s.p1;
        // pos e vel correnti
        const p0 = positions[i0];
        const p1 = positions[i1];
        const v0 = velocities[i0];
        const v1 = velocities[i1];

        // delta = p1 - p0
        const delta = p1.sub(p0); // ritorna nuovo Vec3
        const len = delta.len();

        if (len > eps) {
            // direzione unitaria dalla p0 verso p1
            const n = delta.mul(1.0 / len); // oppure delta.unit()

            // Hooke: tensione = k * (len - rest)
            const stretch = len - s.rest;
            const springMag = stiffness * stretch;

            // forza elastica: su p0 aggiungo +springMag * n, su p1 -= ...
            const springForce = n.mul(springMag); // nuovo Vec3
            forces[i0].inc(springForce); // p0 += springForce
            forces[i1].dec(springForce); // p1 -= springForce

            // damping lungo la direzione n (proiezione della velocità relativa)
            const relVel = v1.sub(v0);
            const relAlong = relVel.dot(n); // scalare
            // coefficiente damping (positivo) => forza proporzionale a relAlong
            // applico la forza che tende a ridurre la velocità relativa
            const dampForce = n.mul(damping * relAlong);
            forces[i0].inc(dampForce);
            forces[i1].dec(dampForce);

            // nota: le scelte di segno sopra fanno sì che quando p1 si allontana (relAlong>0)
            // la forza sul p0 lo spinge nella direzione +n e su p1 in -n (resistenza).
        }
        // se len ~ 0 non facciamo nulla (evitiamo divisione per zero)
    }

    // 3) aggiungi gravità (e eventuale altre forze globali) per ogni particella
    if (particleMass > 0) {
        // compute gravity scaled once
        const gravityScaled = gravity.mul(particleMass); // nuovo Vec3
        for (let i = 0; i < nParticles; ++i) {
            forces[i].inc(gravityScaled);
        }
    } else {
        // se particleMass <= 0, tratteremo le particelle come "pinned" (non mosse)
    }

    // 4) integrazione (semi-implicit / symplectic Euler)
    //    v_new = v + (F/m) * dt
    //    x_new = x + v_new * dt
    for (let i = 0; i < nParticles; ++i) {
        // se massa non positiva => particella fissa
        if (particleMass <= 0) continue;

        // a = F / m
        const a = forces[i].div(particleMass); // nuovo Vec3

        // v += a * dt
        velocities[i].inc( a.mul(dt) ); // inc muta velocities[i]

        // x += v * dt (qui usiamo la nuova v per semi-implicit)
        positions[i].inc( velocities[i].mul(dt) );
    }

    // 5) collisioni con la scatola [-1,1]^3 (per ogni asse)
    //    se collide: fissiamo la posizione sul bordo e invertemo la componente
    //    di velocità con il coefficiente di restitution (solo se la normale
    //    punta contro la velocità, per evitare rimbalzi multipli).
    for (let i = 0; i < nParticles; ++i) {
        if (particleMass <= 0) continue; // parziale: fissi non collidono perché non si muovono

        // X
        if (positions[i].x < -1.0) {
            positions[i].x = -1.0;
            if (velocities[i].x < 0) velocities[i].x = - velocities[i].x * restitution;
        } else if (positions[i].x > 1.0) {
            positions[i].x = 1.0;
            if (velocities[i].x > 0) velocities[i].x = - velocities[i].x * restitution;
        }
        // Y
        if (positions[i].y < -1.0) {
            positions[i].y = -1.0;
            if (velocities[i].y < 0) velocities[i].y = - velocities[i].y * restitution;
        } else if (positions[i].y > 1.0) {
            positions[i].y = 1.0;
            if (velocities[i].y > 0) velocities[i].y = - velocities[i].y * restitution;
        }
        // Z
        if (positions[i].z < -1.0) {
            positions[i].z = -1.0;
            if (velocities[i].z < 0) velocities[i].z = - velocities[i].z * restitution;
        } else if (positions[i].z > 1.0) {
            positions[i].z = 1.0;
            if (velocities[i].z > 0) velocities[i].z = - velocities[i].z * restitution;
        }
    }
}


