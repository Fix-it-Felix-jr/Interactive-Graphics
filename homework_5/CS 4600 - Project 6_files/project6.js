var raytraceFS = `
struct Ray {
	vec3 pos;
	vec3 dir;
};

struct Material {
	vec3  k_d;	// diffuse coefficient
	vec3  k_s;	// specular coefficient
	float n;	// specular exponent
};

struct Sphere {
	vec3     center;
	float    radius;
	Material mtl;
};

struct Light {
	vec3 position;
	vec3 intensity;
};

struct HitInfo {
	float    t;
	vec3     position;
	vec3     normal;
	Material mtl;
};

uniform Sphere spheres[ NUM_SPHERES ];
uniform Light  lights [ NUM_LIGHTS  ];
uniform samplerCube envMap;
uniform int bounceLimit;
const float MIN_RENDER_DISTANCE = 0.001;
const float MAX_RENDER_DISTANCE = 500.0;


bool IntersectRay( inout HitInfo hit, Ray ray );

// Shades the given point and returns the computed color.
vec3 Shade( Material mtl, vec3 position, vec3 normal, vec3 view )
{
	vec3 color = vec3(0,0,0);
	for ( int i=0; i<NUM_LIGHTS; ++i ) {
		// Shadow check
		vec3 lightDir = normalize(lights[i].position - position);
		Ray shadowRay;
		shadowRay.pos = position + normal * 0.001; // avoid self-intersection
		shadowRay.dir = lightDir;

		HitInfo shadowHit;
		bool shadow = IntersectRay(shadowHit, shadowRay);
		if (shadow && shadowHit.t < length(lights[i].position - position)) {
			continue; // point is in shadow
		}

		// Blinn-Phong shading
		vec3 halfVector = normalize(lightDir + view);
		float NdotL = max(dot(normal, lightDir), 0.0);
		float NdotH = max(dot(normal, halfVector), 0.0);

		vec3 diffuse  = mtl.k_d * lights[i].intensity * NdotL;
		vec3 specular = mtl.k_s * lights[i].intensity * pow(NdotH, mtl.n);

		color += diffuse + specular;
	}
	return color;
}


// Intersects the given ray with all spheres in the scene
// and updates the given HitInfo using the information of the sphere
// that first intersects with the ray.
// Returns true if an intersection is found.
bool IntersectRay( inout HitInfo hit, Ray ray )
{
	hit.t = 1e30;
	bool foundHit = false;

	for ( int i=0; i<NUM_SPHERES; ++i ) {
		Sphere sph = spheres[i];
		vec3 oc = ray.pos - sph.center;

		float a = dot(ray.dir, ray.dir);
		float b = 2.0 * dot(oc, ray.dir);
		float c = dot(oc, oc) - sph.radius * sph.radius;
		float discriminant = b * b - 4.0 * a * c;

		if (discriminant >= 0.0) {
			float sqrtD = sqrt(discriminant);
			float t1 = (-b - sqrtD) / (2.0 * a);
			float t2 = (-b + sqrtD) / (2.0 * a);
			float t = (t1 > MIN_RENDER_DISTANCE) ? t1 : ((t2 > MAX_RENDER_DISTANCE) ? t2 : 1e30);

			if (t < hit.t) {
				hit.t = t;
				hit.position = ray.pos + t * ray.dir;
				hit.normal = normalize(hit.position - sph.center);
				hit.mtl = sph.mtl;
				foundHit = true;
			}
		}
	}
	return foundHit;
}

// Given a ray, returns the shaded color where the ray intersects a sphere.
// If the ray does not hit a sphere, returns the environment color.
vec4 RayTracer( Ray ray )
{
	HitInfo hit;
	if ( IntersectRay( hit, ray ) ) {
		vec3 view = normalize( -ray.dir );
		vec3 clr = Shade( hit.mtl, hit.position, hit.normal, view );
		
		// Compute reflections
		vec3 k_s = hit.mtl.k_s;
		for ( int bounce=0; bounce<MAX_BOUNCES; ++bounce ) {
			if ( bounce >= bounceLimit ) break;
			if ( k_s.r + k_s.g + k_s.b <= 0.0 ) break;

			Ray r;
			r.pos = hit.position + hit.normal * 0.05; // avoid acne
			r.dir = reflect(-view, hit.normal);

			HitInfo h;
			if ( IntersectRay( h, r ) ) {
				view = normalize(-r.dir);
				vec3 localColor = Shade(h.mtl, h.position, h.normal, view);
				clr += k_s * localColor;

				k_s *= h.mtl.k_s;
				hit = h;
			} else {
				clr += k_s * textureCube( envMap, r.dir.xzy ).rgb;
				break;
			}
		}
		return vec4( clr, 1 );
	} else {
		return vec4( textureCube( envMap, ray.dir.xzy ).rgb, 0 );
	}
}
`;

