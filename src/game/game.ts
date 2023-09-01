import * as THREE from "three";
import { action, makeAutoObservable, observable } from "mobx";
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

// Highest level class for the entire game
export class Game {
  gameStore: GameStore;
  @observable gameOver = false;

  private keyboardListener = new KeyboardListener();
  private eventListener = new EventListener();

  private renderer: Renderer;
  private clock = new THREE.Clock();

  // Managers
  private roadManager: RoadManager;
  private carManager: CarManager;
  private playerManager: PlayerManager;
  private cameraManager: CameraManager;
  private manholeManager: ManholeManager;

  constructor(
    private canvas: HTMLCanvasElement,
    private gameLoader: GameLoader
  ) {
    makeAutoObservable(this);

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
      this.eventListener
    );

    // Perform initial game setup
    this.setupGame();
  }

  startGame() {
    this.update();
  }

  private setupGame() {
    const { scene, camera, world, player } = this.gameStore;

    // Add lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.3);
    const directLight = new THREE.DirectionalLight();
    scene.add(ambientLight, directLight);

    // Position camera
    camera.position.set(world.xMid, 30, 0);
    camera.lookAt(world.xMid, 0, -10);

    // Build the starting roads
    this.roadManager.buildStartingRoads();

    // Place player
    player.object.position.set(world.xMid, 0.01, -2.5);
    scene.add(player.object);

    // Listeners
    this.eventListener.on("player-hit-car", this.onPlayerHitCar);
    this.eventListener.on("player-out-of-view", this.onPlayerOutOfView);
  }

  @action onPlayerHitCar = () => {
    const { camera, player } = this.gameStore;

    this.gameOver = true;

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

  @action onPlayerOutOfView = () => {
    this.gameOver = true;
  };

  private update = () => {
    requestAnimationFrame(this.update);

    const dt = this.clock.getDelta();

    // Update managers
    this.roadManager.update();
    this.carManager.update(dt);

    if (!this.gameOver) {
      this.playerManager.update(dt);
      this.cameraManager.update(dt);
      this.manholeManager.update(dt);
    }

    this.renderer.render();
  };
}
