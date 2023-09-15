import * as THREE from "three";
import { gsap } from "gsap";

import { CameraManager } from "./camera-manager";
import { CarManager } from "./car-manager";
import { EventListener } from "../listeners/event-listener";
import { GameLoader } from "../loaders/game-loader";
import { GameStore } from "./game-store";
import { KeyboardListener } from "../listeners/keyboard-listener";
import { ManholeManager } from "./manhole-manager";
import { PlayerManager } from "./player-manager";
import { Renderer } from "./renderer";
import { RoadBuilder } from "../utils/road-builder";
import { RoadManager } from "./road-manager";
import { createInitData } from "./model/game-init-data";
import { disposeObject } from "../utils/utils";

// Highest level class for the entire game
export class Game {
  gameStore: GameStore;

  private gameOver = false;
  private keyboardListener = new KeyboardListener();
  private renderer: Renderer;
  private clock = new THREE.Clock();
  private animRequestId = 0;

  // Managers
  private roadManager: RoadManager;
  private carManager: CarManager;
  private playerManager: PlayerManager;
  private cameraManager: CameraManager;
  private manholeManager: ManholeManager;

  constructor(
    private canvas: HTMLCanvasElement,
    private gameLoader: GameLoader,
    private eventListener: EventListener
  ) {
    // Create game store, passing initial game properties
    this.gameStore = new GameStore(createInitData(canvas, gameLoader));

    // Init other classes
    this.renderer = new Renderer(
      canvas,
      this.gameStore.camera,
      this.gameStore.scene
    );

    // Managers
    this.roadManager = new RoadManager(
      this.gameStore,
      new RoadBuilder(gameLoader.modelLoader),
      this.eventListener
    );
    this.carManager = new CarManager(this.gameStore, this.eventListener);
    this.playerManager = new PlayerManager(
      this.gameStore,
      this.keyboardListener,
      this.eventListener
    );
    this.cameraManager = new CameraManager(this.gameStore, this.eventListener);
    this.manholeManager = new ManholeManager(
      this.gameStore,
      this.eventListener,
      this.keyboardListener
    );

    // Add lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.3);
    const directLight = new THREE.DirectionalLight();
    this.gameStore.scene.add(ambientLight, directLight);

    // Listeners
    this.eventListener.on("player-hit-car", this.onPlayerHitCar);
    this.eventListener.on("player-out-of-view", this.onPlayerOutOfView);

    // Perform initial game setup
    this.setupGame();
  }

  startGame() {
    this.update();
  }

  resetGame() {
    console.log(
      "before reset: ",
      this.renderer.renderer.info.memory.geometries
    );

    // Set to default values to prepare for a brand new game
    this.gameOver = false;

    disposeObject(this.gameStore.scene);

    // Manager resets
    this.playerManager.reset();
    this.roadManager.reset();
    this.carManager.reset();
    this.cameraManager.reset();
    this.manholeManager.reset();

    cancelAnimationFrame(this.animRequestId);

    console.log("after reset:", this.renderer.renderer.info.memory.geometries);

    // Run setup again
    this.setupGame();
  }

  private setupGame() {
    const { scene, camera, world, player } = this.gameStore;

    // Position camera
    camera.position.set(world.xMid, 30, 0);
    camera.lookAt(world.xMid, 0, -10);

    // Build the starting roads
    this.roadManager.buildStartingRoads();

    // Place player
    player.object.position.set(world.xMid, 0.01, -2.5);
    scene.add(player.object);
  }

  private onPlayerHitCar = () => {
    const { camera, player } = this.gameStore;

    this.endGame();

    // Squash the box
    camera.lookAt(player.object.position);
    gsap.to(player.object.scale, { duration: 0.1, y: 0.1, x: 2.4, z: 2.2 });
    gsap.to(camera, {
      duration: 2,
      zoom: 2,
      onUpdate: () => {
        camera.updateProjectionMatrix();
      },
    });
  };

  private onPlayerOutOfView = () => {
    this.endGame();
  };

  private endGame() {
    this.gameOver = true;
    // Fire game over event
    this.eventListener.fire("game-over", null);
  }

  private update = () => {
    this.animRequestId = requestAnimationFrame(this.update);

    const dt = this.clock.getDelta();

    // Update managers
    this.carManager.update(dt, this.gameOver);

    if (!this.gameOver) {
      this.roadManager.update();
      this.playerManager.update(dt);
      this.cameraManager.update(dt);
      this.manholeManager.update();
    }

    this.renderer.render();
  };
}
