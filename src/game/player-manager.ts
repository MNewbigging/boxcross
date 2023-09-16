import { EventListener } from "../listeners/event-listener";
import { GameStore } from "./game-store";
import { KeyboardListener } from "../listeners/keyboard-listener";
import { createPlayer } from "./model/game-init-data";
import { disposeObject } from "../utils/utils";
import { PlayerEffect } from "./model/player";

export class PlayerManager {
  private moveSpeed = 15;
  private readonly maxUpperMovement = 24; // Measured against player.cameraDistance to prevent moving up offscreen

  constructor(
    private gameStore: GameStore,
    private keyboardListener: KeyboardListener,
    private events: EventListener
  ) {}

  reset() {
    // Remove the player from the scene
    disposeObject(this.gameStore.player.object);
    this.gameStore.scene.remove(this.gameStore.player.object);

    // Create a new player
    this.gameStore.player = createPlayer(this.gameStore.loader);
  }

  update(dt: number) {
    if (!this.playerCanMove()) {
      return;
    }

    // Move per input
    this.inputMovement(dt);
  }

  private playerCanMove() {
    const { player } = this.gameStore;

    // Review active effects to determine if player can move at all
    if (player.getActiveEffects().includes(PlayerEffect.IN_MANHOLE)) {
      return false;
    }

    return true;
  }

  private inputMovement(dt: number) {
    const { player, world } = this.gameStore;

    if (this.keyboardListener.isKeyPressed("a")) {
      const newPos = player.object.position.x - this.moveSpeed * dt;
      player.object.position.x = Math.max(newPos, world.xMinPlayer);
    }
    if (this.keyboardListener.isKeyPressed("d")) {
      const newPos = player.object.position.x + this.moveSpeed * dt;
      player.object.position.x = Math.min(newPos, world.xMaxPlayer);
    }
    if (this.keyboardListener.isKeyPressed("w")) {
      // Prevent moving beyond camera view
      if (player.cameraDistance < this.maxUpperMovement) {
        player.object.position.z -= this.moveSpeed * dt;
      }
    }
    if (this.keyboardListener.isKeyPressed("s")) {
      const newPos = player.object.position.z + this.moveSpeed * dt;
      player.object.position.z = Math.min(newPos, world.zMin);
    }
  }
}
