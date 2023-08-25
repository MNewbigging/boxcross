import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import { action, autorun, makeAutoObservable, observable } from "mobx";
import { gsap } from "gsap";

import { GameLoader } from "../loaders/game-loader";
import { KeyboardListener } from "../listeners/keyboard-listener";
import { Renderer } from "./renderer";
import { WorldManager } from "./world-manager";

export class GameState {
  private keyboardListener = new KeyboardListener();
  worldManager: WorldManager;
  private player!: THREE.Object3D;
  private playerMoveSpeed = 15;
  private playerCanMove = true;
  private inManhole?: THREE.Object3D;
  @observable gameOver = false;

  private scene = new THREE.Scene();
  private camera: THREE.PerspectiveCamera;
  private cameraMoveSpeed = 5;
  private playerCameraDistance = 0;
  @observable outOfViewTimer = 0;
  private outOfViewLimit = 3;
  private renderer: Renderer;
  private clock = new THREE.Clock();

  constructor(
    private canvas: HTMLCanvasElement,
    private gameLoader: GameLoader
  ) {
    makeAutoObservable(this);

    this.worldManager = new WorldManager(gameLoader.modelLoader, this.scene);

    // Setup camera
    this.camera = new THREE.PerspectiveCamera(
      45, // 85 good for debug
      canvas.clientWidth / canvas.clientHeight,
      0.1,
      1000
    );
    this.camera.position.set(this.worldManager.xMidWorld, 30, 0);
    this.camera.lookAt(this.worldManager.xMidWorld, 0, -10);

    // Setup renderer
    this.renderer = new Renderer(canvas, this.camera, this.scene);

    this.scene.background = new THREE.Color("#1680AF");

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.3);
    this.scene.add(ambientLight);

    const directLight = new THREE.DirectionalLight();
    this.scene.add(directLight);

    // Setup game
    this.setupGame();

    // Listen for crossed roads
    // autorun(() => {
    //   // Update speed values for camera, cars and player
    //   this.cameraMoveSpeed = 1 + this.worldManager.roadsCrossed / 3;
    // });
  }

  startGame() {
    this.update();
  }

  private setupGame() {
    // Build the starting roads
    this.worldManager.setup();

    // Add the player
    const box = this.gameLoader.modelLoader.get("box");
    box.position.set(this.worldManager.xMidWorld, 0.01, -2.5);
    box.scale.set(2, 2, 2);
    this.scene.add(box);
    this.player = box;
  }

  private playerMovement(dt: number) {
    if (!this.player) {
      return;
    }

    // Player wants to exit manhole
    if (
      this.inManhole &&
      this.keyboardListener.anyKeysPressed(["w", "a", "s", "d"])
    ) {
      this.exitManhole(this.inManhole);
      return;
    }

    // Standard movement
    if (!this.playerCanMove) {
      return;
    }

    if (this.keyboardListener.isKeyPressed("a")) {
      const newPos = this.player.position.x - this.playerMoveSpeed * dt;
      this.player.position.x = Math.max(newPos, this.worldManager.xMinPlayer);
    } else if (this.keyboardListener.isKeyPressed("d")) {
      const newPos = this.player.position.x + this.playerMoveSpeed * dt;
      this.player.position.x = Math.min(newPos, this.worldManager.xMaxPlayer);
    }
    if (this.keyboardListener.isKeyPressed("w")) {
      // Prevent moving beyond camera view
      if (this.playerCameraDistance < 24) {
        this.player.position.z -= this.playerMoveSpeed * dt;
      }
    } else if (this.keyboardListener.isKeyPressed("s")) {
      const newPos = this.player.position.z + this.playerMoveSpeed * dt;
      this.player.position.z = Math.min(newPos, this.worldManager.zMinWorld);
    }
  }

  private playerCollisionCheck() {
    // Check against cars in this lane
    const playerHitCar = this.worldManager.playerHitCar(this.player);
    if (playerHitCar) {
      this.endGame();
    }

    // Check against manhole covers
    if (!this.inManhole) {
      const currentRoad = this.worldManager.getCurrentRoad(
        this.player.position.z
      );
      if (currentRoad?.manholes?.length) {
        // Is the player over the cover?
        for (const manhole of currentRoad.manholes) {
          // When player is within a certain small distance, considered over the cover
          if (manhole.position.clone().sub(this.player.position).length() < 1) {
            console.log("over");

            // Can start the animation
            this.enterManhole(manhole);

            // Cannot also be over any other manholes if over this one
            break;
          }
        }
      }
    }
  }

  @action checkPlayerCameraDistance(dt: number) {
    // Assign new distance value
    this.playerCameraDistance = this.camera.position.z - this.player.position.z;

    // If player is behind camera by too much,
    if (this.playerCameraDistance < -3) {
      // Start countdown timer
      this.outOfViewTimer += dt;

      if (this.outOfViewTimer >= this.outOfViewLimit) {
        this.endGame();
      }
    } else {
      // Reset timer
      this.outOfViewTimer = 0;
    }
  }

  @action endGame() {
    this.gameOver = true;

    // Squash the box
    this.camera.lookAt(this.player.position);
    gsap.to(this.player.scale, { duration: 0.1, y: 0.1, x: 2.4, z: 2.2 });
    gsap.to(this.camera, {
      duration: 2,
      zoom: 2,
      onUpdate: () => {
        this.camera.updateProjectionMatrix();
      },
    });
  }

  private enterManhole(manhole: THREE.Object3D) {
    // Start the manhole cover flip animation
    const coverStartHeight = manhole.position.y;
    const coverTimeline = gsap.timeline();
    coverTimeline.to(manhole.position, {
      y: coverStartHeight + 1,
      duration: 0.5,
    });
    coverTimeline.to(manhole.position, { y: coverStartHeight, duration: 0.5 });

    // Start player sink animation:
    // Player should be drawn to center of manhole first
    // Then sink into it as the cover moves aside

    const playerTimeline = gsap.timeline();
    playerTimeline.to(this.player.position, {
      x: manhole.position.x,
      z: manhole.position.z,
      duration: 0.2,
    });
    playerTimeline.to(this.player.position, {
      y: -1.2,
      duration: 0.4,
    });

    // Player is now in the manhole
    this.inManhole = manhole;
    this.playerCanMove = false;
  }

  private exitManhole(manhole: THREE.Object3D) {
    // Start the manhole cover anim
    const coverStartHeight = manhole.position.y;
    const coverTimeline = gsap.timeline();
    coverTimeline.to(manhole.position, {
      y: coverStartHeight + 1,
      duration: 0.5,
    });
    coverTimeline.to(manhole.position, {
      y: coverStartHeight,
      duration: 0.5,
    });

    // Player reveal anim
    gsap.to(this.player.position, {
      y: 0.01,
      duration: 0.4,
      onComplete: () => {
        this.playerCanMove = true;
      },
    });

    this.inManhole = undefined;
  }

  private update = () => {
    requestAnimationFrame(this.update);

    const dt = this.clock.getDelta();

    if (!this.gameOver) {
      // Update player
      this.playerMovement(dt);
      this.checkPlayerCameraDistance(dt);

      // Update camera
      //this.camera.position.z -= this.cameraMoveSpeed * dt;

      // Collision check
      this.playerCollisionCheck();
    }

    // Update world
    this.worldManager.update(dt, this.player);

    //this.controls.update();
    this.renderer.render();
  };
}
