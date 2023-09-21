import * as THREE from "three";

export enum PlayerEffect {
  IN_MANHOLE = "in-manhole",
  ON_CROSSING = "on-crossing",
  IN_BEAM = "in-beam",
}

export class Player {
  cameraDistance = 0;

  private activeEffects: PlayerEffect[] = [];

  constructor(public object: THREE.Object3D) {}

  getActiveEffects() {
    return this.activeEffects;
  }

  addActiveEffect(effect: PlayerEffect) {
    // Cannot have duplicate effects
    if (!this.activeEffects.includes(effect)) {
      this.activeEffects.push(effect);
    }
  }

  removeActiveEffect(effect: PlayerEffect) {
    this.activeEffects = this.activeEffects.filter(
      (activeEffect) => activeEffect !== effect
    );
  }

  hasActiveEffect(effect: PlayerEffect) {
    return this.activeEffects.includes(effect);
  }
}
