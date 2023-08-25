import * as THREE from "three";

export interface Player {
  object: THREE.Object3D;
  moveSpeed: number;
  canMove: boolean;
}
