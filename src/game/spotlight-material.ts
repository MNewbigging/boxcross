import { GLSL3, IUniform, ShaderMaterial, Vector3 } from "three";

export class SpotlightMaterial extends ShaderMaterial {
  readonly spotlightColor: IUniform<Vector3> = { value: new Vector3(1, 1, 1) };
  readonly spotlightAngleScaling: IUniform<number> = { value: 1.0 };

  vertexShader = `
  uniform float spotlightScaling;

  out vec3 vNormal;
  out vec4 vPosition;
  out vec3 localPosition;

    void main() {
      vec3 scaledPosition = position;
      scaledPosition.xz *= spotlightScaling;


      localPosition = scaledPosition;
      vNormal = normalMatrix * normal;
      vPosition = modelViewMatrix * vec4(scaledPosition, 1.0);
      gl_Position = projectionMatrix * vPosition;
    }
  `;

  fragmentShader = `
  uniform vec3 spotlightColor;
  uniform float opacity;

  in vec3 vNormal;
  in vec4 vPosition;
  in vec3 localPosition;

  out vec4 color;

    void main() {
      vec3 eyeDir = normalize(vPosition.xyz);
      float eyeDot = 1.0 * -dot(eyeDir, normalize(vNormal));
      eyeDot = pow(eyeDot, 1.5);
      //eyeDot = clamp(eyeDot, 0.0, 1.0);

      float heightFalloff = smoothstep(0.0, 1.0, localPosition.y);

      color = vec4(spotlightColor, eyeDot * opacity * heightFalloff);
    }
  `;

  constructor(spotlight: THREE.SpotLight) {
    super();

    this.glslVersion = GLSL3;

    this.spotlightColor.value.set(
      spotlight.color.r,
      spotlight.color.g,
      spotlight.color.b
    );
    this.uniforms.spotlightColor = this.spotlightColor;

    this.opacity = 0;
    this.uniforms.opacity = { value: this.opacity };
    this.uniforms.spotlightScaling = this.spotlightAngleScaling;

    this.transparent = true;
  }
}
