import { EventListener } from "../listeners/event-listener";
import { GameStore } from "./game-store";
import { KeyboardListener } from "../listeners/keyboard-listener";

export class PlayerManager {
  private readonly maxUpperMovement = 24; // Measured against player.cameraDistance to prevent moving up offscreen

  constructor(
    private gameStore: GameStore,
    private keyboardListener: KeyboardListener,
    private events: EventListener
  ) {}

  update(dt: number) {
    const { player } = this.gameStore;

    if (!player.canMove) {
      return;
    }

    // Move per input
    this.inputMovement(dt);
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
      if (player.cameraDistance < this.maxUpperMovement) {
        player.object.position.z -= player.moveSpeed * dt;
      }
    }
    if (this.keyboardListener.isKeyPressed("s")) {
      const newPos = player.object.position.z + player.moveSpeed * dt;
      player.object.position.z = Math.min(newPos, world.zMin);
    }
  }
}
