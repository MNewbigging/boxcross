import * as THREE from "three";

export interface Player {
  object: THREE.Object3D;
  moveSpeed: number;
  cameraDistance: number;
  canMove: boolean;
}
