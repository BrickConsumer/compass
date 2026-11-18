import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import {
  BackSide, Color, DirectionalLight, Group, HemisphereLight, Mesh, type MeshBasicMaterial, type PerspectiveCamera, Plane, PlaneGeometry, ShaderMaterial,
  SphereGeometry, Vector3,
} from 'three';
import { type BoatColours, sheer, STAGES, type StageId, tallOf } from '../boat/specs';
import { type DayContext, lightFor, mixHex, sceneState } from '../light';
import { buildBoat } from './boat/buildBoat';
import { buildGull, buildPort, flat, lighthouseParts, seeded, skyline, treeLine } from './scenery';
import { WAVES_GLSL, waveHeight } from './waves';

/**
 * Composition. The camera is raised 10 degrees so the deck and cockpit show; the horizon sits a third of the way down.
 * In port the camera stands further back to take in the pier and the shore.
 */
const FOV = 22, HORIZON = 0.34, ELEV = (10 * Math.PI) / 180, SUN_X = 0.8, YAW = -0.3;
const TAN = Math.tan((FOV * Math.PI) / 360);
const FRAMING = { sea: { boatHeight: 0.7, boatX: 0.42 }, port: { boatHeight: 0.56, boatX: 0.47 } };
/** Boat speed through the water at full progress, metres a second. */
const KNOTS = 2.4;

const SKY_FRAG = `
uniform vec3 uTop; uniform vec3 uMid; uniform vec3 uHz; uniform vec3 uSun; uniform vec3 uHaze; uniform vec3 uSunDir;
uniform float uSunAmt; uniform float uHazeAmt; uniform float uTopElev; uniform float uSunSize; uniform float uDrift; uniform float uStorm;
varying vec3 vDir;
float streak(float a, float e, float az, float el, float w, float h) {
  float da = a - az, de = e - el;
  return exp(-(da * da) / (w * w) - (de * de) / (h * h));
}
void main() {
  vec3 d = normalize(vDir);
  float el = asin(clamp(d.y, -1.0, 1.0)), t = clamp(el / uTopElev, 0.0, 1.0);
  vec3 col = t < 0.4 ? mix(uHz, uMid, t / 0.4) : mix(uMid, uTop, (t - 0.4) / 0.6);
  float az = atan(d.x, -d.z) + uDrift, T = uTopElev;
  float cloud = 0.44 * streak(az, el, -0.34, T * 0.56, 0.12, T * 0.045) + 0.38 * streak(az, el, 0.16, T * 0.34, 0.16, T * 0.04)
    + 0.32 * streak(az, el, 0.42, T * 0.68, 0.1, T * 0.04) + 0.34 * streak(az, el, -0.1, T * 0.18, 0.2, T * 0.03)
    + 0.28 * streak(az, el, -0.56, T * 0.3, 0.09, T * 0.035) + 0.3 * streak(az, el, 0.7, T * 0.48, 0.14, T * 0.04);
  col = mix(col, mix(uHz, vec3(1.0), 0.45), clamp(cloud, 0.0, 1.0) * 0.75 * (1.0 - uStorm));
  // storm: low, heavy cloud in rolling bands
  float bank = 0.5 + 0.5 * sin(az * 7.0 + sin(el * 60.0 + az * 3.0) * 1.3);
  col = mix(col, uTop * 0.72, uStorm * (0.22 + 0.5 * bank * smoothstep(0.05, 0.7, t)));
  float ang = acos(clamp(dot(d, uSunDir), -1.0, 1.0));
  col = mix(col, uSun, uSunAmt * 0.62 * exp(-ang * 9.0));
  col = mix(col, uSun, uSunAmt * smoothstep(uSunSize * 1.12, uSunSize, ang));
  col = mix(col, uHaze, uHazeAmt * exp(-t * 9.0));
  gl_FragColor = vec4(col, 1.0);
  #include <colorspace_fragment>
}`;

const SEA_FRAG = `
uniform vec3 uDeep; uniform vec3 uHz; uniform vec3 uSun; uniform vec3 uHaze; uniform vec3 uSunDir;
uniform float uTime; uniform float uAmp; uniform float uGlitter; uniform float uWind; uniform float uHazeAmt; uniform float uDownMax; uniform float uStorm;
uniform vec2 uScroll;   // how far the water has slid past the boat
uniform vec2 uHead;     // the boat's heading on the water
uniform vec2 uHull;     // half length and half beam
uniform float uSpeed; uniform float uWakeLen;
varying vec3 vW;
${WAVES_GLSL}
void main() {
  vec3 V = normalize(cameraPosition - vW);
  vec2 p = vW.xz + uScroll;
  vec2 slope = waveSlope(p, uTime, uAmp);
  float rs = 0.012 + 0.085 * uWind;
  slope += rs * vec2(cos(p.x * 2.3 + uTime * 1.7 + sin(p.y * 1.1)), cos(p.y * 3.1 - uTime * 2.1 + sin(p.x * 1.7)));
  slope += rs * 0.6 * vec2(cos(p.x * 6.1 - uTime * 2.6 + p.y * 2.0), cos(p.y * 7.3 + uTime * 3.1 - p.x * 1.3));
  vec3 n = normalize(vec3(-slope.x, 1.0, -slope.y));
  float down = clamp(V.y, 0.0, 1.0);
  float t = pow(smoothstep(0.0, uDownMax, down), 0.8);
  vec3 col = mix(uHz, mix(uHz, uDeep, 0.62), smoothstep(0.0, 0.3, t));
  col = mix(col, uDeep, smoothstep(0.3, 1.0, t));
  float facet = clamp(n.z * 2.4, -1.0, 1.0), ripple = (0.06 + 0.2 * t) * (0.3 + 0.7 * uWind);
  col = mix(col, facet > 0.0 ? uHz : uDeep, abs(facet) * ripple);
  vec3 R = reflect(-V, n);
  float toSun = max(dot(R, uSunDir), 0.0);
  float lane = pow(max(dot(normalize(-V.xz), normalize(uSunDir.xz)), 0.0), mix(900.0, 160.0, t));
  col += uSun * (pow(toSun, 300.0) * 1.6 + pow(toSun, 24.0) * 0.12) * uGlitter * lane;
  col = mix(col, uSun, 0.1 * uGlitter * lane * (1.0 - t));
  // storm: breaking crests
  float swell = sin(p.x * 0.42 + uTime * 1.1 + 1.7 * sin(p.y * 0.23 + uTime * 0.2)) * (0.6 + 0.4 * sin(p.y * 0.61 - p.x * 0.17 + uTime * 0.5));
  float fleck = 0.7 + 0.3 * sin(p.x * 2.3 + p.y * 1.1 + uTime * 1.6);
  float crest = smoothstep(0.84, 1.0, swell) * fleck;
  col = mix(col, vec3(0.86, 0.9, 0.93), crest * uStorm * 0.5 * (0.25 + 0.75 * t));
  col = mix(col, uDeep * 0.8, uStorm * 0.25 * smoothstep(-0.2, -0.9, swell) * t);
  // the boat on the water: a soft shadow under the hull, foam along it, and a wake astern
  vec2 rel = vW.xz;
  float fore = rel.x * uHead.x + rel.y * uHead.y, side = rel.x * uHead.y - rel.y * uHead.x;
  float e = (fore * fore) / (uHull.x * uHull.x) + (side * side) / (uHull.y * uHull.y);
  col *= 1.0 - 0.3 * exp(-e * 0.9);
  float swirl = 0.6 + 0.25 * sin(fore * 1.7 + uTime * 2.2 * uSpeed + side * 3.1) + 0.15 * sin(fore * 4.3 - side * 6.0 + uTime * 3.4);
  float skirt = exp(-pow(sqrt(e) - 1.05, 2.0) * 26.0) * smoothstep(-uHull.x, uHull.x, fore) * uSpeed;
  float astern = -(fore + uHull.x * 0.86), width = 0.4 + astern * 0.22;
  float wake = exp(-(side * side) / (width * width)) * smoothstep(0.0, 0.9, astern) * exp(-astern / uWakeLen) * uSpeed;
  col = mix(col, mix(uHz, vec3(1.0), 0.65), clamp((wake * 0.42 + skirt * 0.6) * swirl, 0.0, 0.5));
  col = mix(col, uHaze, uHazeAmt * exp(-down * 55.0));
  gl_FragColor = vec4(col, 1.0);
  #include <colorspace_fragment>
}`;

const RAIN_FRAG = `
uniform float uTime; uniform float uStorm; uniform float uAspect; varying vec2 vUv;
void main() {
  vec2 p = vec2(vUv.x * uAspect + vUv.y * 0.28, vUv.y);
  float col = floor(p.x * 70.0), rnd = fract(sin(col * 12.9898) * 43758.5453);
  float y = fract(p.y * (0.9 + rnd * 0.5) + uTime * (1.5 + rnd * 0.9) + rnd * 7.0);
  float streak = smoothstep(0.0, 0.03, y) * (1.0 - smoothstep(0.03, 0.1 + rnd * 0.08, y));
  float line = 1.0 - smoothstep(0.0, 0.1, abs(fract(p.x * 70.0) - 0.5));
  gl_FragColor = vec4(vec3(0.9, 0.93, 0.96), line * streak * step(0.35, rnd) * 0.34 * uStorm + 0.06 * uStorm);
}`;

const VERT_DIR = `varying vec3 vDir; void main() { vDir = position; vec4 p = projectionMatrix * viewMatrix * vec4(position + cameraPosition, 1.0); gl_Position = p.xyww; }`;
const VERT_WORLD = `varying vec3 vW; void main() { vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`;
const VERT_SCREEN = `varying vec2 vUv; void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`;

/** Distant islands: where each sits across the frame, how wide and tall, how hazy, and how fast it drifts astern. */
const ISLANDS: { kind: 'peaks' | 'hills' | 'mesa' | 'stacks'; x: number; w: number; h: number; haze: number; drift: number; trees?: boolean; beach?: boolean; light?: number }[] = [
  { kind: 'peaks', x: 0.34, w: 0.62, h: 0.2, haze: 0.62, drift: 0.35 },
  { kind: 'mesa', x: -0.62, w: 0.4, h: 0.11, haze: 0.56, drift: 0.45 },
  { kind: 'hills', x: 0.2, w: 0.42, h: 0.085, haze: 0.3, drift: 0.8, trees: true, beach: true, light: 0.36 },
  { kind: 'hills', x: -0.4, w: 0.26, h: 0.07, haze: 0.36, drift: 0.7, trees: true, beach: true },
  { kind: 'stacks', x: -0.12, w: 0.16, h: 0.06, haze: 0.2, drift: 1 },
  { kind: 'hills', x: 0.86, w: 0.3, h: 0.06, haze: 0.28, drift: 0.9, beach: true },
];

export interface SceneProps extends DayContext {
  stage: StageId;
  /** Share of the selected day done, or null when nothing is planned. */
  progress: number | null;
  colours: BoatColours;
  /** Hold a still frame: paused by the user, or reduced motion. */
  still: boolean;
  onReady?: () => void;
}

function World({ stage, progress, colours, still, missedYesterday, onReady }: SceneProps) {
  const { camera, size, gl, invalidate } = useThree();
  const spec = STAGES[stage], target = useMemo(() => sceneState(progress, { missedYesterday }), [progress, missedYesterday]);
  const cur = useRef({ p: target.progress, wind: target.wind, fill: target.sailFill, amp: target.waveHeight, speed: target.speed, storm: target.storm, time: 2, travel: 0 });
  const ready = useRef(false);
  const waterline = useMemo(() => new Plane(new Vector3(0, 1, 0), 0), []);
  useEffect(() => { gl.localClippingEnabled = true; }, [gl]);

  const world = useMemo(() => {
    const sky = new Mesh(new SphereGeometry(1, 48, 24), new ShaderMaterial({
      side: BackSide, depthWrite: false, vertexShader: VERT_DIR, fragmentShader: SKY_FRAG,
      uniforms: { uTop: { value: new Color() }, uMid: { value: new Color() }, uHz: { value: new Color() }, uSun: { value: new Color() }, uHaze: { value: new Color() },
        uSunDir: { value: new Vector3(0, 0, -1) }, uSunAmt: { value: 0 }, uHazeAmt: { value: 0 }, uTopElev: { value: 0.2 }, uSunSize: { value: 0.012 }, uDrift: { value: 0 }, uStorm: { value: 0 } },
    }));
    sky.frustumCulled = false; sky.renderOrder = -10;
    // the sea does not write depth, so the boat's reflection (drawn under it) can show; anything else below the surface is clipped at the waterline
    const sea = new Mesh(new PlaneGeometry(9000, 9000).rotateX(-Math.PI / 2), new ShaderMaterial({
      vertexShader: VERT_WORLD, fragmentShader: SEA_FRAG, depthWrite: false,
      uniforms: { uDeep: { value: new Color() }, uHz: { value: new Color() }, uSun: { value: new Color() }, uHaze: { value: new Color() }, uSunDir: { value: new Vector3(0, 0, -1) },
        uTime: { value: 0 }, uAmp: { value: 0.1 }, uGlitter: { value: 0 }, uWind: { value: 0 }, uHazeAmt: { value: 0 }, uDownMax: { value: 0.2 }, uStorm: { value: 0 },
        uScroll: { value: [0, 0] }, uHead: { value: [1, 0] }, uHull: { value: [3, 1] }, uSpeed: { value: 0 }, uWakeLen: { value: 8 } },
    }));
    sea.renderOrder = -1;
    const rain = new Mesh(new PlaneGeometry(2, 2), new ShaderMaterial({
      vertexShader: VERT_SCREEN, fragmentShader: RAIN_FRAG, transparent: true, depthTest: false, depthWrite: false,
      uniforms: { uTime: { value: 0 }, uStorm: { value: 0 }, uAspect: { value: 4 } },
    }));
    rain.frustumCulled = false; rain.renderOrder = 100;

    // distant islands, each a few flat layers; they sit on the horizon and drift astern when the boat is under way
    const parts = lighthouseParts();
    const islands = ISLANDS.map((def, i) => {
      const group = new Group(), hill = new Mesh(skyline(def.kind, 11 + i * 7), flat());
      group.add(hill);
      const layers: { mesh: Mesh; role: 'hill' | 'trees' | 'sand' | 'tower' | 'band' | 'cap' | 'lamp' }[] = [{ mesh: hill, role: 'hill' }];
      if (def.trees) { const m = new Mesh(treeLine(31 + i), flat()); m.scale.set(0.7, 0.16, 1); m.position.set(0.02, 0.36, 0.001); group.add(m); layers.push({ mesh: m, role: 'trees' }); }
      if (def.beach) { const m = new Mesh(new PlaneGeometry(1, 1), flat()); m.scale.set(0.86, 0.07, 1); m.position.set(0, 0.035, 0.002); group.add(m); layers.push({ mesh: m, role: 'sand' }); }
      const tower = new Group();
      if (def.light !== undefined) {
        for (const [role, geo] of [['tower', parts.tower], ['band', parts.band], ['cap', parts.top], ['lamp', parts.lamp]] as const) { const m = new Mesh(geo, flat()); m.position.z = 0.003 + layers.length * 0.001; tower.add(m); layers.push({ mesh: m, role }); }
      }
      // order is set on the meshes: a Group's own renderOrder would outrank the sky's and put the islands behind it
      for (const m of group.children) m.renderOrder = -5;
      for (const m of tower.children) m.renderOrder = -4;
      return { def, group, tower, layers };
    });
    const gullPaint = flat('#22364a');
    const R = seeded(77);
    const gulls = Array.from({ length: 7 }, (_, i) => { const g = buildGull(gullPaint, 5 + i * 3); g.base.set((R() - 0.4) * 1.1, 0.25 + R() * 0.7, -(6 + R() * 70)); g.span = 0.5 + R() * 0.7; return g; });
    const hemi = new HemisphereLight('#ffffff', '#1c5676', 1.15);
    const key = new DirectionalLight('#ffffff', 2.1), back = new DirectionalLight('#ffe4a6', 1.0);
    key.castShadow = true; key.shadow.mapSize.set(2048, 2048); key.shadow.bias = -0.0004; key.shadow.normalBias = 0.04;
    return { sky, sea, rain, islands, gulls, gullPaint, hemi, key, back };
  }, []);

  // the boat and its reflection are rebuilt when the stage, colours or port state change
  const boats = useMemo(() => {
    const rig = new Group(); rig.rotation.y = YAW;
    const solidBoat = buildBoat(spec, colours, { furled: target.inPort, clip: waterline });
    const mirrorBoat = buildBoat(spec, colours, { furled: target.inPort, mirror: true });
    const flip = new Group(); flip.scale.y = -0.94; flip.add(mirrorBoat.group);
    rig.add(flip, solidBoat.group);
    const port = target.inPort ? buildPort(spec.L, spec.beam, sheer(spec, spec.L * 0.45)) : null;
    if (port) {
      port.group.traverse((o) => { const m = (o as Mesh).material as { clippingPlanes?: Plane[] } | undefined; if (m) m.clippingPlanes = [waterline]; });
      rig.add(port.group);
    }
    return { rig, solidBoat, mirrorBoat, port };
  }, [spec, colours, target.inPort, waterline]);
  useEffect(() => () => { boats.solidBoat.dispose(); boats.mirrorBoat.dispose(); boats.port?.dispose(); }, [boats]);

  // frame the boat: raised camera, horizon a third of the way down
  const frame = useRef({ frameH: 10, d: 30, aspect: 4, k: 1 });
  useEffect(() => {
    const cam = camera as PerspectiveCamera, aspect = size.width / Math.max(1, size.height), f = target.inPort ? FRAMING.port : FRAMING.sea;
    const frameH = tallOf(spec) / f.boatHeight, d = frameH / (2 * TAN), D = 2600;
    cam.fov = FOV; cam.near = 1; cam.far = 12000;
    cam.position.set((0.5 - f.boatX) * frameH * aspect, d * Math.tan(ELEV), d);
    cam.rotation.set(-Math.atan((0.5 - HORIZON) * 2 * TAN), 0, 0);
    cam.updateProjectionMatrix();
    frame.current = { frameH, d, aspect, k: (D + d) / d };
    (world.sky.material as ShaderMaterial).uniforms.uTopElev!.value = Math.atan(HORIZON * 2 * TAN);
    (world.sea.material as ShaderMaterial).uniforms.uDownMax!.value = Math.sin(Math.atan((1 - HORIZON) * 2 * TAN));
    (world.rain.material as ShaderMaterial).uniforms.uAspect!.value = aspect;
    const reach = tallOf(spec) * 1.1;
    const sc = world.key.shadow.camera; sc.left = -reach; sc.right = reach; sc.top = reach * 1.2; sc.bottom = -reach * 0.4; sc.near = 1; sc.far = 220; sc.updateProjectionMatrix();
    invalidate();
  }, [camera, size, spec, target.inPort, world, invalidate]);

  useEffect(() => { invalidate(); }, [target, boats, still, invalidate]);

  useFrame((_, delta) => {
    const c = cur.current, dt = Math.min(delta, 0.05), f = frame.current;
    if (still) { c.p = target.progress; c.wind = target.wind; c.fill = target.sailFill; c.amp = target.waveHeight; c.speed = target.speed; c.storm = target.storm; }
    else {
      // ease every value toward its target; a new target simply redirects the ease
      const k = 1 - Math.exp(-dt / 0.45);
      c.p += (target.progress - c.p) * k; c.wind += (target.wind - c.wind) * k; c.fill += (target.sailFill - c.fill) * k; c.amp += (target.waveHeight - c.amp) * k;
      c.speed += (target.speed - c.speed) * k; c.storm += (target.storm - c.storm) * k;
      c.time += dt; c.travel += c.speed * KNOTS * dt;
    }
    const Lt = lightFor(c.p, c.storm), t = c.time;
    const sunElev = Math.atan((c.p < 0.5 ? 0.012 : 0.012 + 0.1 * (c.p - 0.5) * 2) * 2 * TAN), sunAz = Math.atan((SUN_X - 0.5) * 2 * TAN * f.aspect);
    const sunDir = new Vector3(Math.sin(sunAz) * Math.cos(sunElev), Math.sin(sunElev), -Math.cos(sunAz) * Math.cos(sunElev));
    const hx = Math.cos(YAW), hz = -Math.sin(YAW);

    const su = (world.sky.material as ShaderMaterial).uniforms;
    su.uTop!.value.set(Lt.skyTop); su.uMid!.value.set(Lt.skyMid); su.uHz!.value.set(Lt.skyHorizon); su.uSun!.value.set(Lt.sun); su.uHaze!.value.set(Lt.haze);
    su.uSunDir!.value.copy(sunDir); su.uSunAmt!.value = Lt.sunAmount; su.uHazeAmt!.value = Lt.hazeAmount * 0.9; su.uStorm!.value = c.storm;
    su.uSunSize!.value = Math.atan((c.p < 0.5 ? 0.05 : 0.036) * 2 * TAN); su.uDrift!.value = c.travel * 0.0009 + t * 0.0015;
    const wu = (world.sea.material as ShaderMaterial).uniforms;
    wu.uDeep!.value.set(Lt.waterDeep); wu.uHz!.value.set(Lt.waterHorizon); wu.uSun!.value.set(Lt.sun); wu.uHaze!.value.set(Lt.haze); wu.uSunDir!.value.copy(sunDir);
    wu.uTime!.value = t; wu.uAmp!.value = c.amp; wu.uGlitter!.value = Lt.glitter; wu.uWind!.value = c.wind; wu.uHazeAmt!.value = Lt.hazeAmount; wu.uStorm!.value = c.storm;
    wu.uScroll!.value = [hx * c.travel, hz * c.travel]; wu.uHead!.value = [hx, hz]; wu.uHull!.value = [spec.L / 2, spec.beam / 2];
    wu.uSpeed!.value = c.speed; wu.uWakeLen!.value = spec.L * (0.5 + 0.9 * c.speed);
    const ru = (world.rain.material as ShaderMaterial).uniforms; ru.uTime!.value = t; ru.uStorm!.value = c.storm; world.rain.visible = c.storm > 0.02;

    // islands: tinted by the light and the haze, and sliding astern as the boat makes way
    const frameW = f.frameH * f.aspect * f.k, span = frameW * 2.4, camX = (camera as PerspectiveCamera).position.x;
    for (const isle of world.islands) {
      const { def } = isle, w = def.w * frameW, h = def.h * f.frameH * f.k;
      let x = def.x * frameW - c.travel * def.drift * f.k * 0.55;
      x = ((((x + span / 2) % span) + span) % span) - span / 2;
      isle.group.position.set(camX + x, -0.4, -2600 - def.haze * 400); isle.group.scale.set(w, h, 1);
      if (isle.tower.children.length) { const th = Math.max(h * 1.5, f.frameH * f.k * 0.085); isle.tower.position.set(camX + x + (def.light! - 0.5) * w * 0.9, -0.4 + h * 0.25, -2590 - def.haze * 400); isle.tower.scale.set(th * 0.36, th, 1); }
      const tone = mixHex(mixHex(Lt.land, '#6c8b5a', def.haze < 0.4 ? 0.28 : 0.1), Lt.skyHorizon, def.haze);
      for (const { mesh, role } of isle.layers) {
        const m = mesh.material as MeshBasicMaterial;
        m.color.set(role === 'hill' ? tone : role === 'trees' ? mixHex(tone, Lt.land, 0.35) : role === 'sand' ? mixHex('#e8d3a0', Lt.skyHorizon, 0.4 + c.storm * 0.3)
          : role === 'tower' ? mixHex('#fbf7ee', Lt.skyHorizon, 0.25 + c.storm * 0.3) : role === 'band' ? mixHex('#ab3935', Lt.skyHorizon, 0.3) : role === 'cap' ? mixHex('#0e243a', Lt.skyHorizon, 0.35) : '#f2d488');
      }
    }
    // gulls wheel over the water; they keep away in a storm
    world.gullPaint.color.set(mixHex('#1b2d40', Lt.skyTop, 0.3));
    world.gulls.forEach((g, i) => {
      const a = t * 0.12 * g.speed + g.phase, r = f.frameH * 0.5 * g.span;
      g.group.position.set(g.base.x * f.frameH * f.aspect * 0.5 + Math.cos(a) * r, tallOf(spec) * (0.45 + g.base.y * 0.6) + Math.sin(a * 2.3) * 0.6, g.base.z - Math.sin(a) * r * 0.6);
      g.group.rotation.set(0, -a - Math.PI / 2, Math.sin(a * 2.3) * 0.25);
      g.group.scale.setScalar(1.15);
      g.group.visible = c.storm < 0.45 && (i < 4 || c.p > 0.5);
      g.update(t);
    });

    const calm = 1 - 0.35 * c.storm;
    world.hemi.color.set(mixHex(Lt.skyMid, '#ffffff', 0.5)); world.hemi.groundColor.set(mixHex(Lt.waterDeep, Lt.waterHorizon, 0.5)); world.hemi.intensity = 1.15 * calm;
    world.key.color.set(mixHex('#ffffff', Lt.sun, 0.5)); world.key.intensity = 2.1 * calm; world.key.position.set(-26, 58, 44);
    world.back.color.set(Lt.sun); world.back.intensity = 0.3 + 1.4 * Lt.sunAmount * (c.p > 0.5 ? 1 : 0.4); world.back.position.copy(sunDir).multiplyScalar(40).setY(8 + sunDir.y * 40);

    // the boat rides the same wave function the water is shaded with
    const ox = hx * c.travel, oz = hz * c.travel;
    const y = waveHeight(ox, oz, t, c.amp), ax = waveHeight(ox + 1.5, oz, t, c.amp) - waveHeight(ox - 1.5, oz, t, c.amp), az = waveHeight(ox, oz + 0.8, t, c.amp) - waveHeight(ox, oz - 0.8, t, c.amp);
    const heel = target.inPort ? 0 : -(0.015 + 0.075 * c.wind);
    for (const b of [boats.solidBoat, boats.mirrorBoat]) {
      b.group.position.y = y * 0.8 - 0.02;
      b.group.rotation.set(heel + Math.atan2(az, 1.6) * 0.8, 0, Math.atan2(ax, 3) * 0.8 + c.speed * (0.012 + 0.01 * Math.sin(t * 1.3)));
      b.update(t, c.fill, target.inPort ? 0.12 : c.wind);
    }
    boats.mirrorBoat.group.traverse((o) => {
      const mat = (o as Mesh).material as ShaderMaterial | undefined;
      if (mat?.uniforms?.uWater) { mat.uniforms.uWater.value.set(mixHex(Lt.waterHorizon, Lt.waterDeep, 0.7)); mat.uniforms.uOpacity!.value = (0.42 - 0.2 * c.p) * (1 - 0.6 * c.storm); mat.uniforms.uDepth!.value = tallOf(spec) * 0.7; }
    });
    boats.port?.update(t, still);
    if (!ready.current) { ready.current = true; onReady?.(); }
  });

  return (
    <>
      <primitive object={world.sky} />
      <primitive object={world.sea} />
      {world.islands.map((isle, i) => <primitive key={`i${i}`} object={isle.group} />)}
      {world.islands.filter((isle) => isle.tower.children.length).map((isle, i) => <primitive key={`t${i}`} object={isle.tower} />)}
      {world.gulls.map((g, i) => <primitive key={`g${i}`} object={g.group} />)}
      <primitive object={world.hemi} />
      <primitive object={world.key} />
      <primitive object={world.back} />
      <primitive object={boats.rig} />
      <primitive object={world.rain} />
    </>
  );
}

/** The live 3D scene. Loaded lazily; the still image stands in until its first frame. */
export default function Scene(props: SceneProps) {
  const coarse = typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches;
  return (
    <Canvas flat shadows="percentage" dpr={[1, coarse ? 1.5 : 2]} frameloop={props.still ? 'demand' : 'always'} gl={{ antialias: true, powerPreference: 'high-performance' }} camera={{ fov: FOV }}>
      <World {...props} />
    </Canvas>
  );
}
