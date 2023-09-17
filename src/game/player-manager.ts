import * as THREE from "three";
import { EventListener } from "../listeners/event-listener";
import { GameStore } from "./game-store";
import { KeyboardListener } from "../listeners/keyboard-listener";
import { disposeObject } from "../utils/utils";
import { Player, PlayerEffect } from "./model/player";
import { CircleProp } from "./model/props";
import { GameLoader } from "../loaders/game-loader";
import { ModelNames } from "../loaders/model-loader";

export class PlayerManager {
  private moveSpeedNormal = 15;
  private moveSpeedCrossingMultiplier = 1.5;
  private readonly maxUpperMovement = 24; // Measured against player.cameraDistance to prevent moving up offscreen
  private readonly playerPosY = 0.01;

  constructor(
    private gameStore: GameStore,
    private keyboardListener: KeyboardListener,
    private events: EventListener
  ) {}

  static createPlayer(loader: GameLoader) {
    const object = loader.modelLoader.get(ModelNames.PLAYER);
    object.scale.set(2, 2, 2);

    return new Player(object);
  }

  setup() {
    const { scene, world } = this.gameStore;

    // Create a new player, add to scene but off-screen for now
    const newPlayer = PlayerManager.createPlayer(this.gameStore.loader);
    newPlayer.object.position.set(world.xMid, this.playerPosY, 20);
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
    let nextMovePos = new THREE.Vector3().copy(player.object.position);

    // Change next move pos according to received inputs
    if (this.keyboardListener.isKeyPressed("a")) {
      let nextPosX = player.object.position.x - moveSpeed * dt;
      nextPosX = Math.max(nextPosX, world.xMinPlayer);
      nextMovePos.x = nextPosX;
    }
    if (this.keyboardListener.isKeyPressed("d")) {
      let nextPosX = player.object.position.x + moveSpeed * dt;
      nextPosX = Math.min(nextPosX, world.xMaxPlayer);
      nextMovePos.x = nextPosX;
    }
    if (this.keyboardListener.isKeyPressed("w")) {
      // Prevent moving beyond camera view
      if (player.cameraDistance < this.maxUpperMovement) {
        const nextPosZ = player.object.position.z - moveSpeed * dt;
        nextMovePos.z = nextPosZ;
      }
    }
    if (this.keyboardListener.isKeyPressed("s")) {
      let nextPosZ = player.object.position.z + moveSpeed * dt;
      nextPosZ = Math.min(nextPosZ, world.zMin);
      nextMovePos.z = nextPosZ;
    }

    // Alter next position if colliding
    nextMovePos = this.collisionCheck(nextMovePos);

    // Ensure y is kept at the same level
    nextMovePos.y = this.playerPosY;

    // Move to next position
    player.object.position.copy(nextMovePos);
  }

  private collisionCheck(nextMovePos: THREE.Vector3) {
    // Check against circle props
    const currentRoad = this.gameStore.getCurrentRoad();
    if (!currentRoad) {
      return nextMovePos;
    }

    const roadCircleProps = this.gameStore.getCirclePropsOnRoad(currentRoad.id);
    const movePos = this.checkCollisionCircleProps(
      roadCircleProps,
      nextMovePos
    );

    return movePos;
  }

  private checkCollisionCircleProps(
    props: CircleProp[],
    nextMovePos: THREE.Vector3
  ) {
    for (const prop of props) {
      // Distance from next move pos to prop
      const propDistance = nextMovePos.distanceTo(prop.position);

      // Max allowed distance to prop
      const playerRadius = 0.6;
      const maxDistance = prop.radius + playerRadius;

      // Is it colliding?
      if (propDistance < maxDistance) {
        // Get the intersection depth
        const intersectionDepth = Math.abs(propDistance - maxDistance);

        // Move that far away along collision normal
        const direction = nextMovePos.clone().sub(prop.position).normalize();
        const adjustStep = direction.multiplyScalar(intersectionDepth);

        nextMovePos.add(adjustStep);

        // Stop checking other props
        break;
      }
    }

    return nextMovePos;
  }
}
