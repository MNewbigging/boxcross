import * as THREE from "three";

import { EventListener } from "../listeners/event-listener";
import { GameStore } from "./game-store";
import { ModelNames } from "../loaders/model-loader";
import { Road } from "../utils/road-builder";

export class ManholeManager {
  inManhole?: THREE.Object3D;
  private manholes = new Map<string, THREE.Object3D[]>(); // road it to manhole objects array
  private cooldownTimer = 0;
  private readonly cooldownLimit = 1;

  constructor(private gameStore: GameStore, private events: EventListener) {
    // Listeners
    events.on("road-created", this.onRoadCreated);
    events.on("road-removed", this.onRoadRemoved);
  }

  private onRoadCreated = (road: Road) => {
    const { loader, scene } = this.gameStore;
    const { modelLoader } = loader;

    // Decide how many manholes to create, then create them

    // For now, just test in one place
    // Add manhole models to road objects so they're added/removed to/from scene together
    const manhole = modelLoader.get(ModelNames.MANHOLE_COVER);
    manhole.position.set(30, 0.02, -2.5);
    scene.add(manhole);

    const patch = modelLoader.get(ModelNames.MANHOLE_PATCH);
    patch.position.set(30, 0.02, -2.5);
    scene.add(patch);

    // Keep track of all manhole covers added so we can animate them
    this.manholes.set(road.id, [manhole]);
  };

  private onRoadRemoved = (road: Road) => {
    const { scene } = this.gameStore;

    // If there were manholes on this road, remove their refs
    const manholes = this.manholes.get(road.id) ?? [];
    scene.remove(...manholes);
    this.manholes.delete(road.id);
  };

  update(dt: number) {
    const { player } = this.gameStore;

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
      if (manhole.position.distanceTo(player.object.position) < 1) {
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

/*
 private enterManhole(manhole: THREE.Object3D) {
    // Start the manhole cover flip animation
    const coverStartHeight = manhole.position.y;
    const coverTimeline = gsap.timeline();
    coverTimeline.to(manhole.position, {
      y: coverStartHeight + 1,
      duration: 0.5,
    });
    coverTimeline.to(manhole.position, { y: coverStartHeight, duration: 0.5 });

    // Start player sink animation:
    // Player should be drawn to center of manhole first
    // Then sink into it as the cover moves aside

    const playerTimeline = gsap.timeline();
    playerTimeline.to(this.player.position, {
      x: manhole.position.x,
      z: manhole.position.z,
      duration: 0.2,
    });
    playerTimeline.to(this.player.position, {
      y: -1.2,
      duration: 0.4,
    });

    // Player is now in the manhole
    this.inManhole = manhole;
    this.playerCanMove = false;
  }

  private exitManhole(manhole: THREE.Object3D) {
    // Start the manhole cover anim
    const coverStartHeight = manhole.position.y;
    const coverTimeline = gsap.timeline();
    coverTimeline.to(manhole.position, {
      y: coverStartHeight + 1,
      duration: 0.5,
    });
    coverTimeline.to(manhole.position, {
      y: coverStartHeight,
      duration: 0.5,
    });

    // Player reveal anim
    gsap.to(this.player.position, {
      y: 0.01,
      duration: 0.4,
      onComplete: () => {
        this.playerCanMove = true;
      },
    });

    this.inManhole = undefined;
  }
*/
