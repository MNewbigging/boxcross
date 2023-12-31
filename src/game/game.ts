import * as THREE from "three";

import { CameraManager } from "./camera-manager";
import { CarManager } from "./car-manager";
import { EventListener } from "../listeners/event-listener";
import { GameLoader } from "../loaders/game-loader";
import { GameStore } from "./game-store";
import { KeyboardListener } from "../listeners/keyboard-listener";
import { ManholeManager } from "./manhole-manager";
import { PlayerManager } from "./player-manager";
import { Renderer } from "./renderer";
import { RoadBuilder } from "./road-builder";
import { RoadManager } from "./road-manager";
import { createInitData } from "./model/game-init-data";
import { IntroManager } from "./intro-manager";
import { disposeObject } from "../utils/utils";
import { StreetLightManager } from "./street-light-manager";
import { LightBeamManager } from "./light-beam-manager";

// Highest level class for the entire game
export class Game {
  gameStore: GameStore;
  showIntro = true;

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
  private introManager: IntroManager;
  private streetLightManager: StreetLightManager;
  private lightBeamManager: LightBeamManager;

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
    this.introManager = new IntroManager(this.gameStore);
    this.streetLightManager = new StreetLightManager(
      this.gameStore,
      this.eventListener
    );
    this.lightBeamManager = new LightBeamManager(
      this.gameStore,
      this.eventListener
    );

    // Add lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.3);
    const directLight = new THREE.DirectionalLight(0xffffff, 1);
    this.gameStore.scene.add(ambientLight, directLight);

    // Listeners
    this.eventListener.on("player-hit-car", this.onPlayerHitCar);
    this.eventListener.on("player-out-of-view", this.onPlayerOutOfView);

    // Perform initial game setup
    this.setupGame();
  }

  startGame() {
    // Start the intro cutscene
    if (this.showIntro) {
      this.introManager.startIntro();
    }

    this.update();
  }

  resetGame() {
    // Set to default values to prepare for a brand new game
    this.gameOver = false;

    disposeObject(this.gameStore.scene); // For blunt-force-removal!

    // Manager resets
    this.playerManager.reset();
    this.roadManager.reset();
    this.carManager.reset();
    this.cameraManager.reset();
    this.manholeManager.reset();
    this.streetLightManager.reset();
    this.lightBeamManager.reset();

    cancelAnimationFrame(this.animRequestId);

    console.log(
      "Geometries left after reset:",
      this.renderer.renderer.info.memory.geometries
    );

    // Run setup again
    this.setupGame();
  }

  private setupGame() {
    this.playerManager.setup();
    this.cameraManager.setup();

    // Build the starting roads
    this.roadManager.buildStartingRoads();

    // Different setup depending on if running intro
    if (this.showIntro) {
      this.introManager.setupIntro();
    } else {
      // Place player if not using intro
      const { world, player } = this.gameStore;
      player.object.position.set(40, 0.01, -7.5);
    }
  }

  private onPlayerHitCar = () => {
    this.endGame();

    // Squash the box
    this.playerManager.squashPlayer();

    // Zoom camera to it
    this.cameraManager.zoomToPlayer();
  };

  private onPlayerOutOfView = () => {
    this.endGame();
  };

  private endGame() {
    this.gameOver = true;
    this.eventListener.fire("game-over", null);
  }

  private update = () => {
    this.animRequestId = requestAnimationFrame(this.update);

    const dt = this.clock.getDelta();

    const gameRunning = !this.gameOver && !this.introManager.introRunning;

    this.carManager.update(dt, gameRunning);

    if (gameRunning) {
      this.roadManager.update();
      this.playerManager.update(dt);
      this.cameraManager.update(dt);
      this.manholeManager.update();
      this.lightBeamManager.update(dt);
    }

    this.renderer.render();
  };
}
