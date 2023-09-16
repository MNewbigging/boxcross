import * as THREE from "three";

/**
 * Player rework:
 * - Remove moveSpeed from player object, put inside player manager instead
 * - Add player effect enum and activeEffects property
 * - Remove canMove, use activeEffects instead
 * -- Need player as a class?
 *
 * Other:
 * - fix: bounds persist between replays, shouldn't
 */

export enum PlayerEffect {
  IN_MANHOLE = "in-manhole",
}

export interface Player {
  object: THREE.Object3D;
  cameraDistance: number;
  canMove: boolean;
  activeEffects: PlayerEffect[];
}
