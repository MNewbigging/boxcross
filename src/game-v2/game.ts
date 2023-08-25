import * as THREE from "three";

import { GameLoader } from "../loaders/game-loader";
import { GameStore } from "./game-store";
import { KeyboardListener } from "../listeners/keyboard-listener";
import { Renderer } from "../game/renderer";
import { RoadBuilder } from "../utils/road-builder";
import { RoadManager } from "./road-manager";
import { createInitData } from "./model/game-init-data";

// Highest level class for the entire game
export class Game {
  gameStore: GameStore;
  private keyboardListener = new KeyboardListener();
  private renderer: Renderer;
  private clock = new THREE.Clock();

  // Managers
  private roadManager: RoadManager;

  constructor(
    private canvas: HTMLCanvasElement,
    private gameLoader: GameLoader
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
      new RoadBuilder(gameLoader.modelLoader)
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

    // Place player
    player.object.position.set(world.xMid, 0.01, -2.5);
    scene.add(player.object);
  }

  private update = () => {
    requestAnimationFrame(this.update);

    const dt = this.clock.getDelta();

    this.renderer.render();
  };
}
