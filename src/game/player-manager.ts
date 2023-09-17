import { EventListener } from "../listeners/event-listener";
import { GameStore } from "./game-store";
import { KeyboardListener } from "../listeners/keyboard-listener";
import { createPlayer } from "./model/game-init-data";
import { disposeObject } from "../utils/utils";
import { PlayerEffect } from "./model/player";

export class PlayerManager {
  private moveSpeedNormal = 15;
  private moveSpeedCrossingMultiplier = 1.5;
  private readonly maxUpperMovement = 24; // Measured against player.cameraDistance to prevent moving up offscreen

  constructor(
    private gameStore: GameStore,
    private keyboardListener: KeyboardListener,
    private events: EventListener
  ) {}

  setup() {
    const { scene, world } = this.gameStore;

    // Create a new player, add to scene but off-screen for now
    const newPlayer = createPlayer(this.gameStore.loader);
    newPlayer.object.position.set(world.xMid, 0.01, 20);
    this.gameStore.player = newPlayer;
    scene.add(this.gameStore.player.object);
  }

  reset() {
    const { scene } = this.gameStore;

    // Remove the player from the scene
    disposeObject(this.gameStore.player.object);
    scene.remove(this.gameStore.player.object);
  }

  update(dt: number) {
    if (!this.playerCanMove()) {
      return;
    }

    // Move per input
    const moveSpeed = this.getMoveSpeed();
    this.inputMovement(dt, moveSpeed);
  }

  private playerCanMove() {
    const { player } = this.gameStore;

    // Review active effects to determine if player can move at all
    if (player.hasActiveEffect(PlayerEffect.IN_MANHOLE)) {
      return false;
    }

    return true;
  }

  private getMoveSpeed() {
    const { player } = this.gameStore;

    // Active effects determine move speed
    let moveSpeed = this.moveSpeedNormal;

    // Check for crossing effect
    if (player.hasActiveEffect(PlayerEffect.ON_CROSSING)) {
      moveSpeed *= this.moveSpeedCrossingMultiplier;
    }

    return moveSpeed;
  }

  private inputMovement(dt: number, moveSpeed: number) {
    const { player, world } = this.gameStore;

    if (this.keyboardListener.isKeyPressed("a")) {
      const newPos = player.object.position.x - moveSpeed * dt;
      player.object.position.x = Math.max(newPos, world.xMinPlayer);
    }
    if (this.keyboardListener.isKeyPressed("d")) {
      const newPos = player.object.position.x + moveSpeed * dt;
      player.object.position.x = Math.min(newPos, world.xMaxPlayer);
    }
    if (this.keyboardListener.isKeyPressed("w")) {
      // Prevent moving beyond camera view
      if (player.cameraDistance < this.maxUpperMovement) {
        player.object.position.z -= moveSpeed * dt;
      }
    }
    if (this.keyboardListener.isKeyPressed("s")) {
      const newPos = player.object.position.z + moveSpeed * dt;
      player.object.position.z = Math.min(newPos, world.zMin);
    }
  }
}
