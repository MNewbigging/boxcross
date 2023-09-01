import * as THREE from "three";
import { gsap } from "gsap";

import { EventListener } from "../listeners/event-listener";
import { GameStore } from "./game-store";
import { KeyboardListener } from "../listeners/keyboard-listener";
import { ModelNames } from "../loaders/model-loader";
import { Road } from "../utils/road-builder";

export class ManholeManager {
  private inManhole?: THREE.Object3D;
  private canInteract = true; // False when manhole is animating, prevents layered/dupe animations
  private manholes = new Map<string, THREE.Object3D[]>(); // road it to manhole objects array
  private readonly minEnterDistance = 1;
  private readonly manholePosY = 0.02;

  constructor(
    private gameStore: GameStore,
    private events: EventListener,
    private keyboardListener: KeyboardListener
  ) {
    // Listeners
    events.on("road-created", this.onRoadCreated);
    events.on("road-removed", this.onRoadRemoved);
  }

  private onRoadCreated = (road: Road) => {
    const { loader, scene } = this.gameStore;
    const { modelLoader } = loader;

    // Decide how many manholes to create, then create them

    // For now, just test one manhole in the same position on each road
    const manholePosition = road.objects.position
      .clone()
      .add(new THREE.Vector3(30, this.manholePosY, -7.5));

    // Add manhole models to road objects so they're added/removed to/from scene together
    const manhole = modelLoader.get(ModelNames.MANHOLE_COVER);
    manhole.position.copy(manholePosition);
    scene.add(manhole);

    const patch = modelLoader.get(ModelNames.MANHOLE_PATCH);
    patch.position.copy(manholePosition);
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

  update() {
    // Manhole currently animating?
    if (!this.canInteract) {
      return;
    }

    if (this.inManhole) {
      // Listen for input to detect whether should leave manhole
      if (this.keyboardListener.anyKeysPressed(["w", "s", "a", "d"])) {
        this.exitManhole(this.inManhole);
      }

      return;
    }

    // Check if near enough a manhole to enter it
    this.checkShouldEnterManhole();
  }

  private checkShouldEnterManhole() {
    const { player } = this.gameStore;

    const currentRoad = this.gameStore.getCurrentRoad();
    if (!currentRoad) {
      return;
    }

    const roadManholes = this.manholes.get(currentRoad.id);
    if (!roadManholes) {
      return;
    }

    for (const manhole of roadManholes) {
      // When the plyer is within a certain distance
      if (
        manhole.position.distanceTo(player.object.position) <
        this.minEnterDistance
      ) {
        this.enterManhole(manhole);
      }
    }
  }

  private enterManhole(manhole: THREE.Object3D) {
    const { player } = this.gameStore;

    this.canInteract = false;
    this.inManhole = manhole;
    player.canMove = false;

    // Start the manhole cover flip animation
    const coverTimeline = gsap.timeline();
    coverTimeline.to(manhole.position, {
      y: this.manholePosY + 1,
      duration: 0.2,
    });
    coverTimeline.to(manhole.position, {
      y: this.manholePosY,
      duration: 0.5,
      onComplete: () => {
        this.canInteract = true;
      },
    });

    // Start player sink animation:
    // Player should be drawn to center of manhole first
    // Then sink into it as the cover moves aside

    const playerTimeline = gsap.timeline();
    playerTimeline.to(player.object.position, {
      x: manhole.position.x,
      z: manhole.position.z,
      duration: 0.2,
    });
    playerTimeline.to(player.object.position, {
      y: -1.2,
      duration: 0.4,
    });
  }

  private getMoveDirection() {
    const direction = new THREE.Vector3();

    if (this.keyboardListener.isKeyPressed("w")) {
      direction.z = -1;
    } else if (this.keyboardListener.isKeyPressed("s")) {
      direction.z = 1;
    }

    if (this.keyboardListener.isKeyPressed("a")) {
      direction.x = -1;
    } else if (this.keyboardListener.isKeyPressed("d")) {
      direction.x = 1;
    }

    return direction;
  }

  private exitManhole(manhole: THREE.Object3D) {
    const { player } = this.gameStore;

    // Start the manhole cover anim
    this.canInteract = false;
    const coverTimeline = gsap.timeline();
    coverTimeline.to(manhole.position, {
      y: this.manholePosY + 1,
      duration: 0.3,
    });
    coverTimeline.to(manhole.position, {
      y: this.manholePosY,
      duration: 0.5,
      onComplete: () => {
        this.canInteract = true;
      },
    });

    // Player reveal anim - shoots player off manhole cover as it leaves
    const moveDirection = this.getMoveDirection();
    const targetPos = player.object.position
      .clone()
      .add(moveDirection.normalize().multiplyScalar(1.4));
    gsap.to(player.object.position, {
      y: 0.01,
      x: targetPos.x,
      z: targetPos.z,
      duration: 0.3,
      onComplete: () => {
        player.canMove = true;
      },
    });

    this.inManhole = undefined;
  }
}
