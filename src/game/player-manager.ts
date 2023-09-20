import * as THREE from "three";
import { EventListener } from "../listeners/event-listener";
import { GameStore } from "./game-store";
import { KeyboardListener } from "../listeners/keyboard-listener";
import { clamp, disposeObject } from "../utils/utils";
import { Player, PlayerEffect } from "./model/player";
import { CircleProp } from "./model/props";
import { GameLoader } from "../loaders/game-loader";
import { ModelNames } from "../loaders/model-loader";

export class PlayerManager {
  private moveSpeedNormal = 15;
  private moveSpeedCrossingMultiplier = 1.5;
  private readonly maxUpperMovement = 24; // Measured against player.cameraDistance to prevent moving up offscreen
  private readonly playerPosY = 0.01;
  private moveDirection = new THREE.Vector3();
  private velocity = new THREE.Vector3();
  private nextPosition = new THREE.Vector3();

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

    this.movePlayer(dt);

    // // Move per input
    // const moveSpeed = this.getMoveSpeed();
    // this.inputMovement(dt, moveSpeed);
  }

  private movePlayer(dt: number) {
    // If not allowed to move, can stop
    if (!this.playerCanMove()) {
      return;
    }

    // Set input move direction
    this.setInputDirection();

    // Get move speed
    const moveSpeed = this.getMoveSpeed();

    // Work out next move position
    const { player } = this.gameStore;
    this.velocity = this.moveDirection.clone().multiplyScalar(moveSpeed * dt);
    this.nextPosition = player.object.position.clone().add(this.velocity);

    // Validate via collision checks
    this.collisionCheck();

    // Keep inside world bounds
    this.keepInsideBounds();

    // Finally, move player to valid position
    player.object.position.copy(this.nextPosition);
  }

  private playerCanMove() {
    const { player } = this.gameStore;

    // Review active effects to determine if player can move at all
    if (player.hasActiveEffect(PlayerEffect.IN_MANHOLE)) {
      return false;
    }

    return true;
  }

  private setInputDirection() {
    const { player } = this.gameStore;

    // Reset move direction for this frame
    this.moveDirection.set(0, 0, 0);

    if (this.keyboardListener.isKeyPressed("a")) {
      this.moveDirection.x = -1;
    }
    if (this.keyboardListener.isKeyPressed("d")) {
      this.moveDirection.x = 1;
    }
    if (this.keyboardListener.isKeyPressed("w")) {
      // Prevent moving up beyond camera view
      if (player.cameraDistance < this.maxUpperMovement) {
        this.moveDirection.z = -1;
      }
    }
    if (this.keyboardListener.isKeyPressed("s")) {
      this.moveDirection.z = 1;
    }

    // Must normalise to prevent diagonal movement speedup
    this.moveDirection.normalize();
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

  private collisionCheck() {
    // Check against props on the current road
    const currentRoad = this.gameStore.getCurrentRoad();
    if (!currentRoad) {
      return;
    }

    // Circular prop obstacles
    const roadCircleProps = this.gameStore.getCirclePropsOnRoad(currentRoad.id);
    const movePos = this.checkCollisionCircleProps(roadCircleProps);

    // Ensure player is kept at the same y level
    this.nextPosition.y = this.playerPosY;

    return movePos;
  }

  private keepInsideBounds() {
    const { world } = this.gameStore;

    const currentX = this.nextPosition.x;

    this.nextPosition.x = clamp(currentX, world.xMinPlayer, world.xMaxPlayer);
  }

  private checkCollisionCircleProps(props: CircleProp[]) {
    for (const prop of props) {
      // Distance from next move pos to prop
      const propDistance = this.nextPosition.distanceTo(prop.position);

      // Max allowed distance to prop
      const playerRadius = 0.6;
      const maxDistance = prop.radius + playerRadius;

      // Is it colliding?
      if (propDistance < maxDistance) {
        // Get the intersection depth
        const intersectionDepth = Math.abs(propDistance - maxDistance);

        // Move that far away along collision normal
        const direction = this.nextPosition
          .clone()
          .sub(prop.position)
          .normalize();
        const adjustStep = direction.multiplyScalar(intersectionDepth);

        this.nextPosition.add(adjustStep);

        // Stop checking other props
        break;
      }
    }
  }
}
