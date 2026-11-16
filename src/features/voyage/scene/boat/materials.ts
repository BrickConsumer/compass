import { Color, DoubleSide, MeshStandardMaterial, ShaderMaterial } from 'three';

/** Fixed paint and fittings. User-chosen colours are passed in separately. */
export const PAINT = {
  boot: '#F6F0E4', cove: '#D8B768', bottom: '#7A2F2B', deck: '#E4D6BA', well: '#BFA57A', rail: '#A8733D', cabin: '#EFE6D3', roof: '#8B5E36',
  glass: '#16344F', brass: '#C9A552', spar: '#B88A55', rig: '#3A4A5C', lantern: '#F2D488', ensign: '#1A619B',
} as const;

/** Hull paint with a boot stripe at the waterline and a cove stripe under the sheer, drawn in the shader so the bands stay crisp. */
export function hullMaterial(hull: string): MeshStandardMaterial {
  const m = new MeshStandardMaterial({ color: hull, roughness: 0.5, metalness: 0.05, side: DoubleSide });
  m.onBeforeCompile = (shader) => {
    shader.uniforms.uBoot = { value: new Color(PAINT.boot) };
    shader.uniforms.uCove = { value: new Color(PAINT.cove) };
    shader.uniforms.uBottom = { value: new Color(PAINT.bottom) };
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nattribute vec2 aHull;\nvarying vec2 vHull;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvHull = aHull;');
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying vec2 vHull;\nuniform vec3 uBoot;\nuniform vec3 uCove;\nuniform vec3 uBottom;')
      .replace('#include <color_fragment>', `#include <color_fragment>
        float aa = fwidth(vHull.x) + 0.0005;
        float boot = smoothstep(0.035 - aa, 0.035 + aa, vHull.x) * (1.0 - smoothstep(0.14 - aa, 0.14 + aa, vHull.x));
        float below = 1.0 - smoothstep(0.035 - aa, 0.035 + aa, vHull.x);
        float ab = fwidth(vHull.y) + 0.0005;
        float cove = smoothstep(0.095 - ab, 0.095 + ab, vHull.y) * (1.0 - smoothstep(0.13 - ab, 0.13 + ab, vHull.y));
        diffuseColor.rgb = mix(diffuseColor.rgb, uBottom, below);
        diffuseColor.rgb = mix(diffuseColor.rgb, uBoot, boot);
        diffuseColor.rgb = mix(diffuseColor.rgb, uCove, cove);
        // a lighter band where the topsides catch the sky
        diffuseColor.rgb += 0.05 * (1.0 - smoothstep(0.0, 0.45, vHull.y)) * (1.0 - boot) * (1.0 - below);`);
  };
  return m;
}

/** Sailcloth: matte, lit from both sides, with faint panel seams and a little light coming through. */
export function sailMaterial(sail: string): MeshStandardMaterial {
  const c = new Color(sail);
  const m = new MeshStandardMaterial({ color: c, roughness: 0.92, metalness: 0, side: DoubleSide, emissive: c.clone().multiplyScalar(0.2) });
  m.onBeforeCompile = (shader) => {
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec2 vSail;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvSail = uv;');
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying vec2 vSail;')
      .replace('#include <color_fragment>', `#include <color_fragment>
        float panel = abs(fract(vSail.y * 6.0) - 0.5);
        float seam = 1.0 - smoothstep(0.0, fwidth(vSail.y * 6.0) * 1.5, 0.5 - panel);
        diffuseColor.rgb *= 1.0 - 0.07 * seam;
        diffuseColor.rgb *= 0.9 + 0.1 * vSail.x;`);
  };
  return m;
}

/** Plain paint. Marked so that parts which never move can be baked into one mesh (see batch.ts). */
export function solid(color: string, roughness = 0.7, metalness = 0, glow = 0): MeshStandardMaterial {
  const m = new MeshStandardMaterial({ color, roughness, metalness, ...(glow ? { emissive: color, emissiveIntensity: glow } : {}) });
  m.userData.paint = true;
  return m;
}

/**
 * One material for every baked part in plain paint. Colour comes from the vertex colour, and roughness,
 * metalness and glow from the `aSurf` attribute, so it looks exactly like the separate materials it replaces.
 */
export function paintMaterial(): MeshStandardMaterial {
  const m = new MeshStandardMaterial({ vertexColors: true });
  m.onBeforeCompile = (shader) => {
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nattribute vec3 aSurf;\nvarying vec3 vSurf;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvSurf = aSurf;');
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vSurf;')
      .replace('#include <roughnessmap_fragment>', 'float roughnessFactor = vSurf.x;')
      .replace('#include <metalnessmap_fragment>', 'float metalnessFactor = vSurf.y;')
      .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\ntotalEmissiveRadiance += diffuseColor.rgb * vSurf.z;');
  };
  return m;
}

/**
 * The boat's reflection: a flat tint that wavers gently and fades with depth.
 * It writes depth so its own parts sort correctly; the sea does not, so the reflection shows through it.
 * With no colour given it takes each part's colour from the vertex colour, for parts baked into one mesh.
 */
export function reflectionMaterial(color: string | null): ShaderMaterial {
  const m = new ShaderMaterial({
    transparent: true, depthWrite: true, depthTest: true, side: DoubleSide, defines: color === null ? { TINTED: '' } : {},
    uniforms: { uColor: { value: new Color(color ?? '#ffffff') }, uWater: { value: new Color('#1c5676') }, uTime: { value: 0 }, uRipple: { value: 0.3 }, uOpacity: { value: 0.4 }, uDepth: { value: 8 } },
    vertexShader: `uniform float uTime; uniform float uRipple; varying float vDepth; varying vec3 vTint;
      #ifdef TINTED
      attribute vec3 color;
      #endif
      void main() {
        vTint = vec3(1.0);
        #ifdef TINTED
        vTint = color;
        #endif
        vec4 w = modelMatrix * vec4(position, 1.0);
        vDepth = -w.y;
        // one slow sideways waver, growing with depth, so the image holds together
        w.x += sin(w.y * 2.2 + uTime * 1.1) * 0.035 * uRipple * clamp(vDepth, 0.0, 6.0);
        gl_Position = projectionMatrix * viewMatrix * w;
      }`,
    fragmentShader: `uniform vec3 uColor; uniform vec3 uWater; uniform float uOpacity; uniform float uDepth; varying float vDepth; varying vec3 vTint;
      void main() {
        if (vDepth < 0.0) discard;
        float fade = 1.0 - smoothstep(0.0, uDepth, vDepth);
        gl_FragColor = vec4(mix(uWater, uColor * vTint, 0.62), uOpacity * fade);
        #include <colorspace_fragment>
      }`,
  });
  m.userData.reflection = true;
  return m;
}
