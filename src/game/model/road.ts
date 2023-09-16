import * as THREE from "three";

export interface Road {
  id: string;
  index: number; // out of all total roads
  objects: THREE.Group; // the road and pavement objects
  zMin: number; // Closest z value
  zMax: number; // Farthest z value (will be a smaller number since travelling negatively)
  zLeftLane: number; // Where to spawn cars moving from left-right
  zRightLane: number; // Where to spawn cars moving from right-left
  crossings: THREE.Box3[]; // bounds of any crossings on this road
}
