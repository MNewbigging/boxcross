import * as THREE from "three";

export interface CircleProp {
  id: string;
  roadId: string;
  position: THREE.Vector3;
  radius: number;
}

/**
 * When creating street lights:
 * - create a prop object for it, give to game store
 * - add prop id to light interface
 *
 * When removing street lights:
 * - get prop id for each light, remove from game store array
 *
 * Player manager:
 * - can look at prop arrays and do col det from it
 */
