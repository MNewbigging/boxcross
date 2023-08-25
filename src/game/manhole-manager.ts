import * as THREE from "three";

import { ModelLoader, ModelNames } from "../loaders/model-loader";
import { Road } from "../utils/road-builder";

// Handles all the logic to do with the manholes in the game, which the player can hide in
export class ManholeManager {
  inManhole?: THREE.Object3D;
  private manholes = new Map<string, THREE.Object3D[]>(); // road it to manhole objects array
  private cooldownTimer = 0;
  private readonly cooldownLimit = 1;

  constructor(
    private readonly modelLoader: ModelLoader,
    private scene: THREE.Scene
  ) {}

  spawnManholesForRoad(road: Road) {
    // Add manhole models to road objects so they're added/removed to/from scene together
    const manhole = this.modelLoader.get(ModelNames.MANHOLE_COVER);
    manhole.position.set(30, 0.02, -2.5);
    this.scene.add(manhole);

    const patch = this.modelLoader.get(ModelNames.MANHOLE_PATCH);
    patch.position.set(30, 0.02, -2.5);
    this.scene.add(patch);

    // Keep track of all manhole covers added so we can animate them
    this.manholes.set(road.id, [manhole]);
  }

  removeManholesForRoad(road: Road) {
    const manholes = this.manholes.get(road.id) ?? [];
    this.scene.remove(...manholes);
    this.manholes.delete(road.id);
  }

  update(dt: number, player: THREE.Object3D) {
    // Update manhole use cooldown timer
    this.cooldownTimer += dt;

    // Only continue if the player can interact with a manhole again
    if (this.cooldownTimer < this.cooldownLimit) {
      return;
    }

    if (this.inManhole) {
      // Listen for input to detect whether should leave manhole
      return;
    }

    // Check if near enough manhole to enter it
    for (const manhole of this.getAllManholes()) {
      // When the plyer is within a certain distance
      if (manhole.position.distanceTo(player.position) < 1) {
        // Enter the manhole
      }
    }
  }

  private enterManhole(manhole: THREE.Object3D) {
    //
  }

  private getAllManholes() {
    const manholes: THREE.Object3D[] = [];
    this.manholes.forEach((arr: THREE.Object3D[]) => manholes.push(...arr));
    return manholes;
  }
}
