import { EventListener } from "../listeners/event-listener";
import { GameStore } from "./game-store";

export class CameraManager {
  private outOfViewDistance = -3; // How far behind camera to be considered out of view
  private outOfViewTimer = 0; // How long player has been out of view
  private outOfViewTimeLimit = 3; // Max time player can be out of view
  private playerCameraDistance = 0; // Current distance from camera
  private cameraMoveSpeed = 5;

  constructor(private gameStore: GameStore, private events: EventListener) {}

  update(dt: number) {
    this.checkOutOfView(dt);
    this.moveCamera(dt);
  }

  private checkOutOfView(dt: number) {
    const { player, camera } = this.gameStore;

    // Get distance from player to camera
    this.playerCameraDistance = camera.position.z - player.object.position.z;

    // If player is behind camera by too much,
    if (this.playerCameraDistance < this.outOfViewDistance) {
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
