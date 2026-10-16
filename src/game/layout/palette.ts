/**
 * Shared colour palette.
 *
 * The Kenney kits ship fairly desaturated, weathered textures (grass averages
 * 28%/31%/23%, asphalt 24%…). The LOCO reference art is bright and saturated, so
 * every kit material gets multiplied with one of these tints. Keeping them in one
 * file means the browser build, the offline preview and the HUD all agree.
 */
import type { Vec3 } from "./types";

export const PAINT = {
  grass: [1.85, 2.3, 1.75] as Vec3,
  grassAlt: [1.6, 2.05, 1.6] as Vec3,
  grassDark: [1.4, 1.75, 1.45] as Vec3,
  dirt: [1.8, 1.55, 1.28] as Vec3,
  asphalt: [1.12, 1.18, 1.3] as Vec3,
  pavement: [1.2, 1.16, 1.05] as Vec3,
  white: [2.15, 2.15, 2.2] as Vec3,
  brick: [1.8, 1.36, 1.28] as Vec3,
  brickWarm: [1.45, 1.28, 1.05] as Vec3,
  // the roof texture is dark (33% average) so roof tints are scaled up ~3x
  roofTile: [1.9, 1.7, 1.6] as Vec3,
  roofRed: [2.5, 1.15, 1.0] as Vec3,
  roofBlue: [1.35, 1.8, 2.7] as Vec3,
  roofGrey: [1.85, 1.8, 1.75] as Vec3,
  roofGreen: [1.5, 2.4, 1.5] as Vec3,
  // treeA is an autumn-orange texture; tint it towards summer green
  tree: [0.55, 1.5, 0.8] as Vec3,
  treePine: [0.6, 1.55, 0.75] as Vec3,
  blue: [1.0, 1.45, 2.35] as Vec3,
  blueSoft: [1.15, 1.5, 2.1] as Vec3,
  cyan: [0.85, 1.9, 2.2] as Vec3,
  red: [2.1, 0.62, 0.6] as Vec3,
  yellow: [2.1, 1.75, 0.6] as Vec3,
  metal: [1.8, 1.85, 1.92] as Vec3,
  wood: [1.85, 1.5, 1.1] as Vec3,
  glass: [1.1, 1.7, 2.1] as Vec3,
} satisfies Record<string, Vec3>;

export type PaintKey = keyof typeof PAINT;
