import * as THREE from "three";
import { gsap, Linear, Power2 } from "gsap";
import { EventListener } from "../listeners/event-listener";
import { GameStore } from "./game-store";

export class CameraManager {
  private readonly outOfViewDistance = -3; // How far behind camera to be considered out of view
  private outOfViewTimer = 0; // How long player has been out of view
  private readonly outOfViewTimeLimit = 3; // Max time player can be out of view
  private cameraMoveSpeed = 5;
  private targetOffsetZ = -10;
  private targetPosition = new THREE.Vector3();

  constructor(private gameStore: GameStore, private events: EventListener) {}

  static createCamera(canvas: HTMLCanvasElement) {
    return new THREE.PerspectiveCamera(
      45, // 85 good for debug,
      canvas.clientWidth / canvas.clientHeight,
      0.1,
      1000
    );
  }

  setup() {
    const { camera, world } = this.gameStore;

    // Starting position // mid, 30, 0
    camera.position.set(world.xMid, 30, 0);

    // Set rotation by looking at target
    camera.lookAt(world.xMid, 0, this.targetOffsetZ);
  }

  zoomToPlayer() {
    const { camera, player } = this.gameStore;

    // Update the target position
    this.targetPosition.set(
      camera.position.x,
      0,
      camera.position.z + this.targetOffsetZ
    );
    camera.lookAt(this.targetPosition);

    // Get stopping point of camera close to player
    const stopPoint = camera.position.clone().lerp(player.object.position, 0.5);

    const duration = 1;

    // Animate target towards player position
    const tl = gsap.timeline();
    tl.to(this.targetPosition, {
      x: player.object.position.x,
      z: player.object.position.z,
      ease: Power2.easeOut,
      duration,
      onUpdate: () => {
        camera.lookAt(this.targetPosition);
      },
    });

    tl.to(
      camera.position,
      {
        x: stopPoint.x,
        z: stopPoint.z,
        ease: Power2.easeOut,
        duration,
      },
      "<"
    );

    tl.to(
      camera,
      {
        zoom: 2,
        ease: Linear.easeInOut,
        duration,
        onUpdate: () => {
          camera.updateProjectionMatrix();
        },
      },
      "<"
    );
  }

  reset() {
    this.outOfViewTimer = 0;
    this.gameStore.camera.zoom = 1;
    this.gameStore.camera.updateProjectionMatrix();
  }

  update(dt: number) {
    this.checkOutOfView(dt);
    this.moveCamera(dt);
  }

  private checkOutOfView(dt: number) {
    const { player, camera } = this.gameStore;

    // Get distance from player to camera
    player.cameraDistance = camera.position.z - player.object.position.z;

    // If player is behind camera by too much,
    if (player.cameraDistance < this.outOfViewDistance) {
      // Incremenet out of view timer
      this.outOfViewTimer += dt;

      // If out of view for too long
      if (this.outOfViewTimer >= this.outOfViewTimeLimit) {
        // Notify
        this.events.fire("player-out-of-view", null);
      }
    } else {
      // Within view, reset timer
      this.outOfViewTimer = 0;
    }
  }

  private moveCamera(dt: number) {
    const { camera } = this.gameStore;

    camera.position.z -= this.cameraMoveSpeed * dt;
  }
}
