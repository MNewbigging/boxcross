import { EventListener } from "../listeners/event-listener";
import { GameStore } from "./game-store";
import { KeyboardListener } from "../listeners/keyboard-listener";

export class PlayerManager {
  private playerCameraDistance = 0;
  private outOfViewTimer = 0;
  private readonly outOfViewLimit = 3;

  constructor(
    private gameStore: GameStore,
    private keyboardListener: KeyboardListener,
    private events: EventListener
  ) {}

  update(dt: number) {
    const { player } = this.gameStore;

    // Track whether player is on screen
    this.checkCameraDistance(dt);

    if (!player.canMove) {
      return;
    }

    // Move per input
    this.inputMovement(dt);
  }

  private checkCameraDistance(dt: number) {
    const { camera, player } = this.gameStore;

    // Assign new distance value
    this.playerCameraDistance = camera.position.z - player.object.position.z;

    // If player is behind camera by too much,
    if (this.playerCameraDistance < -3) {
      // Start countdown timer
      this.outOfViewTimer += dt;

      if (this.outOfViewTimer >= this.outOfViewLimit) {
        // Player has been out of view too long, notify
        this.events.fire("out-of-view", null);
      }
    } else {
      // Reset timer
      this.outOfViewTimer = 0;
    }
  }

  private inputMovement(dt: number) {
    const { player, world } = this.gameStore;

    if (this.keyboardListener.isKeyPressed("a")) {
      const newPos = player.object.position.x - player.moveSpeed * dt;
      player.object.position.x = Math.max(newPos, world.xMinPlayer);
    }
    if (this.keyboardListener.isKeyPressed("d")) {
      const newPos = player.object.position.x + player.moveSpeed * dt;
      player.object.position.x = Math.min(newPos, world.xMaxPlayer);
    }
    if (this.keyboardListener.isKeyPressed("w")) {
      // Prevent moving beyond camera view
      if (this.playerCameraDistance < 24) {
        player.object.position.z -= player.moveSpeed * dt;
      }
    }
    if (this.keyboardListener.isKeyPressed("s")) {
      const newPos = player.object.position.z + player.moveSpeed * dt;
      player.object.position.z = Math.min(newPos, world.zMin);
    }
  }
}
