import * as THREE from "three";
import { EventListener } from "../listeners/event-listener";
import { GameStore } from "./game-store";
import { KeyboardListener } from "../listeners/keyboard-listener";
import { createPlayer } from "./model/game-init-data";
import { disposeObject } from "../utils/utils";
import { PlayerEffect } from "./model/player";

export class PlayerManager {
  private nextMovePos = new THREE.Vector3();
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

    // Reset next move pos to current position
    this.nextMovePos.copy(player.object.position);

    // Change next move pos according to received inputs
    if (this.keyboardListener.isKeyPressed("a")) {
      let nextPosX = player.object.position.x - moveSpeed * dt;
      nextPosX = Math.max(nextPosX, world.xMinPlayer);
      this.nextMovePos.x = nextPosX;
    }
    if (this.keyboardListener.isKeyPressed("d")) {
      let nextPosX = player.object.position.x + moveSpeed * dt;
      nextPosX = Math.min(nextPosX, world.xMaxPlayer);
      this.nextMovePos.x = nextPosX;
    }
    if (this.keyboardListener.isKeyPressed("w")) {
      // Prevent moving beyond camera view
      if (player.cameraDistance < this.maxUpperMovement) {
        const nextPosZ = player.object.position.z - moveSpeed * dt;
        this.nextMovePos.z = nextPosZ;
      }
    }
    if (this.keyboardListener.isKeyPressed("s")) {
      let nextPosZ = player.object.position.z + moveSpeed * dt;
      nextPosZ = Math.min(nextPosZ, world.zMin);
      this.nextMovePos.z = nextPosZ;
    }

    // Collision detection against stationary objects
    const colliding = this.collidesWithProp(this.nextMovePos);

    // Move to the next position
    if (!colliding) {
      player.object.position.copy(this.nextMovePos);
    }
  }

  private collidesWithProp(nextPos: THREE.Vector3) {
    return false;
  }
}
