import { CanvasTexture, Color, LinearFilter, LinearMipmapLinearFilter, NoColorSpace, type Texture, Vector4 } from 'three';
import { type BoatSpec, nameBox } from '../../boat/specs';
import { PAINT } from './materials';

/** The voyage's italic, as on the plate: the chart rule sets the boat's name in it. */
const FACE = 'italic 500 96px "Brygada 1918 Variable", "Iowan Old Style", Palatino, Georgia, serif';
const SIZE = 96, PAD = 14;

/** What the hull's shader needs to paint the name: the lettering as a texture, where it sits, and its colour. */
export interface LetteringUniforms {
  uName: { value: Texture | null };
  /** x from the stern at each end of the lettering, then the drop below the sheer at its top and bottom. */
  uNameBox: { value: Vector4 };
  uNameInk: { value: Color };
  uNameOn: { value: number };
}

export interface Lettering {
  uniforms: LetteringUniforms;
  /** Letter this name. `changed` is called when the picture is ready, and again if the proper typeface arrives later. */
  set: (name: string, changed?: () => void) => void;
  dispose: () => void;
}

/** Gold leaf on a dark hull, navy on a light one. */
function inkFor(hull: string): string {
  const c = new Color(hull);
  return 0.2126 * c.r + 0.7152 * c.g + 0.0722 * c.b > 0.25 ? '#0E243A' : PAINT.cove;
}

/**
 * The boat's name, lettered on the quarter. The name is drawn once into a small picture and the hull's own
 * paint lays it on, so it follows the curve of the hull, reads the right way round on both sides, and costs no extra draw call.
 */
export function createLettering(spec: BoatSpec, hull: string): Lettering {
  const uniforms: LetteringUniforms = { uName: { value: null }, uNameBox: { value: new Vector4(0, 1, 0, 1) }, uNameInk: { value: new Color(inkFor(hull)) }, uNameOn: { value: 0 } };
  let current = '';
  const draw = (name: string) => {
    const canvas = document.createElement('canvas'), ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.font = FACE;
    canvas.width = Math.ceil(ctx.measureText(name).width) + PAD * 2; canvas.height = Math.round(SIZE * 1.25);
    // sizing a canvas clears its state, so the face is set again
    ctx.font = FACE; ctx.fillStyle = '#ffffff'; ctx.textBaseline = 'alphabetic';
    ctx.fillText(name, PAD, SIZE * 0.92);
    uniforms.uName.value?.dispose();
    const texture = new CanvasTexture(canvas);
    // only the coverage is read, and at window size the lettering is a few pixels tall, so it needs its smaller copies
    texture.colorSpace = NoColorSpace; texture.minFilter = LinearMipmapLinearFilter; texture.magFilter = LinearFilter; texture.anisotropy = 4;
    uniforms.uName.value = texture;
    const box = nameBox(spec, canvas.width / canvas.height);
    uniforms.uNameBox.value.set(box.x0, box.x1, box.d0, box.d1);
    uniforms.uNameOn.value = 1;
  };
  return {
    uniforms,
    set: (name, changed) => {
      const text = name.trim();
      current = text;
      // no document means no canvas to draw on (the unit tests); the hull is then simply left plain
      if (!text || typeof document === 'undefined') { uniforms.uNameOn.value = 0; changed?.(); return; }
      draw(text); changed?.();
      // the first drawing may have used a stand-in typeface; letter it again once the real one is in
      document.fonts?.load(FACE, text).then(() => { if (current === text) { draw(text); changed?.(); } }).catch(() => undefined);
    },
    dispose: () => { uniforms.uName.value?.dispose(); uniforms.uName.value = null; },
  };
}
