/**
 * The waters a voyage passes through. Each is a place with its own light, its own land on the horizon and its own shore
 * in port. The boat, the day's progress and the weather work the same way in all of them.
 */
export type WaterId = 'home' | 'coral' | 'fjords' | 'ice';

/** In the order they are reached. */
export const WATER_ORDER: readonly WaterId[] = ['home', 'coral', 'fjords', 'ice'];

/** The colours and amounts of a sky by day, before the night's own values are added. */
export interface Sky {
  skyTop: string; skyMid: string; skyHorizon: string;
  waterHorizon: string; waterDeep: string;
  sun: string; haze: string; land: string;
  sunAmount: number; hazeAmount: number; glitter: number;
}

/** A distant island: where it sits across the frame, how wide and tall, how hazy, and how fast it drifts astern. */
export interface Island {
  kind: 'peaks' | 'hills' | 'mesa' | 'stacks';
  x: number; w: number; h: number; haze: number; drift: number;
  trees?: boolean; beach?: boolean;
  /** Where along the island a lighthouse stands, 0 to 1. */
  light?: number;
}

/** The shore behind the pier on a day in port. */
export interface Shore { sand: string; ground: string; hill: string; rock: string; trees: 'palm' | 'pine' | 'none' }

/** A ridge in the still image: where it starts and ends across the frame, how tall, and how far into the haze. */
export type Ridge = readonly [x0: number, x1: number, h: number, haze: number];

export interface Water {
  id: WaterId;
  /** "Coral shallows", as a label. */
  name: string;
  /** "the coral shallows", inside a sentence. */
  phrase: string;
  /** "in the coral shallows", after a description of the boat. */
  where: string;
  /** Dawn, clear day and golden hour. Left out, the light table's own. */
  day?: readonly [Sky, Sky, Sky];
  /** What the night keeps of the place: its water and its land, each mixed into the night by a share. */
  night?: { waterHorizon?: [string, number]; waterDeep?: [string, number]; land?: [string, number] };
  /** No more than six, and no more than one lighthouse: each island is a draw call. */
  islands: readonly Island[];
  /** What grows on the nearer land, or the snow on it. */
  growth: string;
  sand: string;
  shore: Shore;
  ridges: readonly Ridge[];
  /** Drift ice on the water around the boat. */
  floes?: boolean;
}

const sky = (skyTop: string, skyMid: string, skyHorizon: string, waterHorizon: string, waterDeep: string, sun: string, haze: string, land: string, sunAmount: number, hazeAmount: number, glitter: number): Sky =>
  ({ skyTop, skyMid, skyHorizon, waterHorizon, waterDeep, sun, haze, land, sunAmount, hazeAmount, glitter });
const isle = (kind: Island['kind'], x: number, w: number, h: number, haze: number, drift: number, more: Partial<Island> = {}): Island => ({ kind, x, w, h, haze, drift, ...more });

export const WATERS: Record<WaterId, Water> = {
  home: {
    id: 'home', name: 'Home waters', phrase: 'home waters', where: 'in home waters',
    islands: [
      isle('peaks', 0.34, 0.62, 0.2, 0.62, 0.35),
      isle('mesa', -0.62, 0.4, 0.11, 0.56, 0.45),
      isle('hills', 0.2, 0.42, 0.085, 0.3, 0.8, { trees: true, beach: true, light: 0.36 }),
      isle('hills', -0.4, 0.26, 0.07, 0.36, 0.7, { trees: true, beach: true }),
      isle('stacks', -0.12, 0.16, 0.06, 0.2, 1),
      isle('hills', 0.86, 0.3, 0.06, 0.28, 0.9, { beach: true }),
    ],
    growth: '#6c8b5a', sand: '#e8d3a0',
    shore: { sand: '#E8D3A0', ground: '#7E9A62', hill: '#6C8B5A', rock: '#8F9499', trees: 'palm' },
    ridges: [[0.56, 1.04, 0.075, 0.5], [0.7, 1.02, 0.05, 0.28], [-0.03, 0.17, 0.045, 0.4]],
  },
  // low sand islands with palms, and bright shallow water over the reef
  coral: {
    id: 'coral', name: 'Coral shallows', phrase: 'the coral shallows', where: 'in the coral shallows',
    day: [
      sky('#a8c4d8', '#dbe6e2', '#f5e8d6', '#cfe4dc', '#4f9aa6', '#fff3df', '#f4eee0', '#8fb5a8', 0.6, 0.55, 0.3),
      sky('#5aa6da', '#b2def0', '#ebf7f1', '#8fe3d6', '#0d8098', '#fffcee', '#eef7f2', '#57a37f', 0, 0.2, 0.4),
      sky('#6a8fb8', '#e2c5a4', '#fde0a8', '#f0cf96', '#126a82', '#ffe4a6', '#f8dba9', '#4f8a6e', 1, 0.38, 1),
    ],
    night: { waterHorizon: ['#2f7f86', 0.4], waterDeep: ['#0a4250', 0.5], land: ['#12332f', 0.5] },
    islands: [
      isle('hills', 0.26, 0.3, 0.05, 0.3, 0.8, { trees: true, beach: true }),
      isle('hills', -0.36, 0.22, 0.045, 0.34, 0.7, { trees: true, beach: true }),
      isle('hills', 0.7, 0.26, 0.04, 0.26, 0.9, { trees: true, beach: true }),
      isle('hills', -0.78, 0.3, 0.05, 0.42, 0.6, { trees: true, beach: true }),
      isle('hills', 0.02, 0.14, 0.03, 0.2, 1, { beach: true }),
      isle('mesa', 0.48, 0.5, 0.07, 0.68, 0.35),
    ],
    growth: '#63a06a', sand: '#f6e9c4',
    shore: { sand: '#F6E9C4', ground: '#7FA868', hill: '#5F9A62', rock: '#B9B3A2', trees: 'palm' },
    ridges: [[0.5, 0.86, 0.032, 0.3], [0.74, 1.04, 0.026, 0.2], [-0.04, 0.22, 0.03, 0.34], [0.26, 0.4, 0.02, 0.24]],
  },
  // steep green mountains close on both sides, and dark deep water between them
  fjords: {
    id: 'fjords', name: 'Northern fjords', phrase: 'the northern fjords', where: 'in the northern fjords',
    day: [
      sky('#9fb3c4', '#cfd9dc', '#eee6d8', '#b9c9c9', '#3d6470', '#fff3df', '#ece6da', '#6f8a86', 0.6, 0.6, 0.28),
      sky('#6f93b8', '#b3c9d8', '#e3ebea', '#7fa3aa', '#11404c', '#fffcee', '#e6eeee', '#3f5d57', 0, 0.3, 0.28),
      sky('#62799c', '#d2b79e', '#f6d6a4', '#dcbb8c', '#12323f', '#ffe4a6', '#f1d5a6', '#34493f', 1, 0.42, 1),
    ],
    night: { waterHorizon: ['#1f3f4a', 0.45], waterDeep: ['#04161c', 0.5], land: ['#08161a', 0.5] },
    islands: [
      isle('peaks', 0.3, 0.78, 0.5, 0.6, 0.3),
      isle('peaks', -0.58, 0.6, 0.42, 0.66, 0.34),
      isle('peaks', 0.92, 0.5, 0.34, 0.44, 0.55, { trees: true }),
      isle('hills', -0.2, 0.34, 0.12, 0.26, 0.8, { trees: true, light: 0.7 }),
      isle('stacks', 0.12, 0.12, 0.07, 0.2, 1),
      isle('hills', -0.9, 0.3, 0.16, 0.34, 0.7, { trees: true }),
    ],
    growth: '#557a58', sand: '#b9b7a8',
    shore: { sand: '#B9B7A8', ground: '#5F7F5C', hill: '#4C6B50', rock: '#7C8388', trees: 'pine' },
    ridges: [[0.5, 1.08, 0.3, 0.55], [-0.12, 0.3, 0.26, 0.6], [0.72, 1.04, 0.13, 0.3], [0.2, 0.46, 0.07, 0.24]],
  },
  // pale shelves and bergs under a cold, bright haze
  ice: {
    id: 'ice', name: 'The ice', phrase: 'the ice', where: 'among the ice',
    day: [
      sky('#b5c4d4', '#dfe5e6', '#f4ebe0', '#d6dfe0', '#6f8b9a', '#fff3df', '#f3eee6', '#d4dee4', 0.6, 0.62, 0.28),
      sky('#9cb6cf', '#d6e3ec', '#f3f7f8', '#b5ccd6', '#2c5e79', '#fffcee', '#eef3f5', '#dde8ee', 0, 0.35, 0.35),
      sky('#8a9cba', '#e0cbb6', '#fbe2b6', '#e6cfa6', '#27506c', '#ffe4a6', '#f6dfb6', '#cbd6de', 1, 0.42, 1),
    ],
    // the ice holds what light there is, so the land stays pale against the night
    night: { waterHorizon: ['#4c6686', 0.35], waterDeep: ['#0b2238', 0.4], land: ['#8ea2bb', 0.7] },
    islands: [
      isle('mesa', 0.32, 0.34, 0.16, 0.34, 0.7),
      isle('stacks', -0.3, 0.3, 0.2, 0.3, 0.8),
      isle('mesa', -0.72, 0.42, 0.11, 0.5, 0.5),
      isle('stacks', 0.74, 0.22, 0.13, 0.24, 0.95),
      isle('peaks', 0.05, 0.9, 0.24, 0.72, 0.28),
      isle('mesa', 0.08, 0.14, 0.06, 0.18, 1),
    ],
    growth: '#e6eef2', sand: '#eef3f5',
    shore: { sand: '#EEF3F5', ground: '#E3EBEF', hill: '#D5E0E6', rock: '#AEBBC4', trees: 'none' },
    ridges: [[0.4, 1.06, 0.16, 0.5], [0.66, 0.92, 0.1, 0.22], [-0.05, 0.24, 0.09, 0.3], [0.2, 0.34, 0.12, 0.18]],
    floes: true,
  },
};

/** A saved value that names a water, or home waters if it does not. */
export const storedWater = (value: unknown): WaterId => (WATER_ORDER.includes(value as WaterId) ? (value as WaterId) : 'home');
