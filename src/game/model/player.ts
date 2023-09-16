import * as THREE from "three";

/**
 * Player rework:
 * - Remove moveSpeed from player object, put inside player manager instead
 * - Add player effect enum and activeEffects property
 * - Remove canMove, use activeEffects instead
 * -- Need player as a class?
 *
 * Other:
 * - fix: bounds persist between replays, shouldn't (just the helpers not being removed from scene)
 */

export enum PlayerEffect {
  IN_MANHOLE = "in-manhole",
}

export class Player {
  cameraDistance = 0;
  //canMove = true;

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
}
