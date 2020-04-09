#version 410 core

in vec3 normal;
in vec4 fragPosEye;
in vec4 fragPosLightSpace;
in vec2 fragTexCoords;
in vec4 fragPos;

out vec4 fColor;

//lighting
uniform vec3 posLightPos;
uniform vec3 viewPos;

uniform	mat3 normalMatrix;
uniform mat3 lightDirMatrix;
uniform	vec3 lightColor;
uniform	vec3 lightDir;
uniform sampler2D diffuseTexture;
uniform sampler2D specularTexture;
uniform sampler2D shadowMap;

uniform	vec3 startFog;
float constant = 1.0f;
float pointLinear = 10.0f;
float pointQuadratic = 3.0f;
float pointSpecularStrenght = 10.0f;
float diff, spec, attenuation;

vec3 ambient;
float ambientStrength = 0.8f;
vec3 diffuse;
vec3 specular;
float specularStrength = 0.5f;
float shininess = 64.0f;

vec3 o;

void computeLightComponents()
{		
	vec3 cameraPosEye = vec3(0.0f);//in eye coordinates, the viewer is situated at the origin
	
	//transform normal
	vec3 normalEye = normalize(normalMatrix * normal);	
	
	//compute light direction
	vec3 lightDirN = normalize(lightDirMatrix * lightDir);	

	//compute view direction 
	vec3 viewDirN = normalize(cameraPosEye - fragPosEye.xyz);
	
	//compute half vector
	vec3 halfVector = normalize(lightDirN + viewDirN);
		
	//compute ambient light
	ambient = ambientStrength * lightColor;
	
	//compute diffuse light
	diffuse = max(dot(normalEye, lightDirN), 0.0f) * lightColor;
	
	//compute specular light
	float specCoeff = pow(max(dot(halfVector, normalEye), 0.0f), shininess);
	specular = specularStrength * specCoeff * lightColor;
}

float computeShadow()
{	
	// perform perspective divide
    vec3 normalizedCoords = fragPosLightSpace.xyz / fragPosLightSpace.w;
    if(normalizedCoords.z > 1.0f)
        return 0.0f;
    // Transform to [0,1] range
    normalizedCoords = normalizedCoords * 0.5f + 0.5f;
    // Get closest depth value from light's perspective (using [0,1] range fragPosLight as coords)
    float closestDepth = texture(shadowMap, normalizedCoords.xy).r;    
    // Get depth of current fragment from light's perspective
    float currentDepth = normalizedCoords.z;
    // Check whether current frag pos is in shadow
    float bias = 0.005f;
    float shadow = currentDepth - bias> closestDepth  ? 1.0f : 0.0f;

    return shadow;	
}

float computeFog() { 
	float fogDensity = 0.01f;
	float fragmentDistance = length(fragPosEye);
	float fogFactor = exp(-pow(fragmentDistance * fogDensity, 2)); 
	return clamp(fogFactor, 0.0f, 1.0f);
}

vec3 computePointLight()
{
	vec3 cameraPosEye = vec3(0.0f);
	vec3 norm = normalize(normalMatrix * normal);
	vec3 lightDir = normalize(posLightPos - fragPosEye.xyz);
	vec3 viewDir = normalize(cameraPosEye - fragPosEye.xyz);

	ambient = ambientStrength * lightColor;
    diffuse = max(dot(norm, lightDir), 0.0) * lightColor;
	vec3 halfVector = normalize(lightDir + viewDir);
    vec3 reflectDir = reflect(-lightDir, norm);
    spec = pow(max(dot(norm, halfVector), 0.0), shininess);
	specular = pointSpecularStrenght * spec * lightColor;
	
    float distance    = length(posLightPos - fragPosEye.xyz);
    attenuation = 1.0f / (constant + pointLinear * distance + pointQuadratic * (distance * distance));    

    // combine results
	//modulate with diffuse map
	//ambient *= vec3(texture(diffuseTexture, fragTexCoords));
	//diffuse *= vec3(texture(diffuseTexture, fragTexCoords));
	//modulate woth specular map
	//specular *= vec3(texture(specularTexture, fragTexCoords));
    
	return (ambient + diffuse + specular) * attenuation;
	
}

void main() 
{
	computeLightComponents();
	vec3 secPointLight = computePointLight();
	float shadow = computeShadow();
	
	//modulate with diffuse map
	ambient *= vec3(texture(diffuseTexture, fragTexCoords));
	diffuse *= vec3(texture(diffuseTexture, fragTexCoords));
	//modulate woth specular map
	specular *= vec3(texture(specularTexture, fragTexCoords));
	
	//modulate with shadow
	vec3 color = min((ambient + (1.0f - shadow)*diffuse) + (1.0f - shadow)*specular, 1.0f);
	vec3 colorFinal = min(color, 1.0f);

	vec3 viewDir = vec3(0.0f);
	vec3 viewDirN = normalize(viewDir - fragPosEye.xyz);
	vec3 normalN = normalize(normal);
	vec3 reflection = reflect(viewDirN, normalN);
	
	vec4 colorFromTexture = texture(diffuseTexture, fragTexCoords);
		if(colorFromTexture.a < 0.1)
		discard;
	
	
	float fogFactor = computeFog();
	vec4 fogColor = vec4(0.5f, 0.5f, 0.5f, 1.0f);
	
	if (startFog.x==1.0f){

		fColor = fogColor * (1 - fogFactor) + vec4(color, 1.0f) * fogFactor;
	}else{
		//fColor = mix(fogColor, colour, fogFactor);
		//fColor = colour;
		fColor = vec4(colorFinal, 1.0f);
	}
    
}
