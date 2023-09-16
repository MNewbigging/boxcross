import * as THREE from "three";
import { gsap } from "gsap";

import { EventListener } from "../listeners/event-listener";
import { GameStore } from "./game-store";
import { KeyboardListener } from "../listeners/keyboard-listener";
import { ModelNames } from "../loaders/model-loader";
import { Road } from "./road-builder";
import { disposeObject, randomRange, randomRangeInt } from "../utils/utils";

interface Manhole {
  cover: THREE.Object3D;
  patch: THREE.Object3D;
}

export class ManholeManager {
  private inManhole?: THREE.Object3D;
  private canInteract = true; // False when manhole is animating, prevents layered/dupe animations
  private manholes = new Map<string, Manhole[]>(); // road id to manhole objects array
  private readonly minEnterDistance = 1;
  private readonly manholePosY = 0.02;
  private readonly minManholeCount = 1;
  private readonly maxManholeCount = 2;

  constructor(
    private gameStore: GameStore,
    private events: EventListener,
    private keyboardListener: KeyboardListener
  ) {
    // Listeners
    this.events.on("road-created", this.onRoadCreated);
    this.events.on("road-removed", this.onRoadRemoved);
  }

  reset() {
    this.inManhole = undefined;
    this.canInteract = true;

    this.manholes.forEach((manholes: Manhole[]) =>
      manholes.forEach((manhole) => this.removeManhole(manhole))
    );
    this.manholes.clear();
  }

  private getRandomManholePosition(zOffset: number) {
    const { world } = this.gameStore;

    return new THREE.Vector3(
      randomRange(world.xMinPlayer + 2.5, world.xMaxPlayer - 2.5), // well within player area to allow exiting towards edge
      this.manholePosY,
      zOffset + randomRange(-5.8, -14.2) // keeps it on the road, not gutter/pavements
    );
  }

  private overlapsOthers(pos: THREE.Vector3, others: THREE.Vector3[]) {
    return others.some((otherPos) => otherPos.distanceTo(pos) < 2);
  }

  private onRoadCreated = (road: Road) => {
    const { loader, scene, world } = this.gameStore;
    const { modelLoader } = loader;

    // Decide how many manholes to create
    const toCreate = randomRangeInt(this.minManholeCount, this.maxManholeCount);

    // Randomly generate manhole positions, ensuring no overlaps
    const roadPosition = road.objects.position;
    const manholePositions: THREE.Vector3[] = [];
    for (let i = 0; i < toCreate; i++) {
      let position = this.getRandomManholePosition(roadPosition.z);

      // No overlap
      while (this.overlapsOthers(position, manholePositions)) {
        position = this.getRandomManholePosition(roadPosition.z);
      }

      manholePositions.push(position);
    }

    // Create manholes at these positions
    const manholes: Manhole[] = [];
    manholePositions.forEach((manholePosition) => {
      // Manhole cover
      const cover = modelLoader.get(ModelNames.MANHOLE_COVER);
      cover.position.copy(manholePosition);
      scene.add(cover);

      // Manhole patch (the shadow / hole underneath the cover)
      const patch = modelLoader.get(ModelNames.MANHOLE_PATCH);
      patch.position.copy(manholePosition);
      scene.add(patch);

      // Track all manholes made for later removal
      manholes.push({
        cover,
        patch,
      });
    });

    // Keep track of all manhole covers added so we can animate them
    this.manholes.set(road.id, manholes);
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
        manhole.cover.position.distanceTo(player.object.position) <
        this.minEnterDistance
      ) {
        this.enterManhole(manhole.cover);
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

  private onRoadRemoved = (road: Road) => {
    // If there were manholes on this road, remove them
    const manholes = this.manholes.get(road.id) ?? [];
    manholes.forEach((manhole) => this.removeManhole(manhole));
    this.manholes.delete(road.id);
  };

  private removeManhole(manhole: Manhole) {
    disposeObject(manhole.cover);
    disposeObject(manhole.patch);
    this.gameStore.scene.remove(manhole.cover, manhole.patch);
  }
}
