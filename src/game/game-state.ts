import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";

import { GameLoader } from "../loaders/game-loader";
import { KeyboardListener } from "../listeners/keyboard-listener";
import { Renderer } from "./renderer";
import { WorldBuilder } from "../utils/world-builder";

export class GameState {
  private keyboardListener = new KeyboardListener();

  private worldBuilder: WorldBuilder;

  private scene = new THREE.Scene();
  private camera: THREE.PerspectiveCamera;
  private renderer: Renderer;
  private controls: OrbitControls;
  private clock = new THREE.Clock();

  private player?: THREE.Object3D;
  private playerMoveSpeed = 5;
  private worldXMin = 10;
  private worldXMax = 30;

  constructor(
    private canvas: HTMLCanvasElement,
    private gameLoader: GameLoader
  ) {
    this.worldBuilder = new WorldBuilder(gameLoader.modelLoader);

    // Setup camera
    this.camera = new THREE.PerspectiveCamera(
      45,
      canvas.clientWidth / canvas.clientHeight,
      0.1,
      100
    );
    this.camera.position.set(this.worldBuilder.xMid, 30, 0);

    // Setup renderer
    this.renderer = new Renderer(canvas, this.camera, this.scene);

    this.scene.background = new THREE.Color("#1680AF");

    // Camera controls
    this.controls = new OrbitControls(this.camera, canvas);
    this.controls.enableDamping = true;
    this.controls.target.set(this.worldBuilder.xMid, 0, -10);

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.3);
    this.scene.add(ambientLight);

    const directLight = new THREE.DirectionalLight();
    this.scene.add(directLight);

    const axesHelper = new THREE.AxesHelper(50);
    this.scene.add(axesHelper);

    // Start game
    this.setupGame();
    this.update();
  }

  private setupGame() {
    // Build the starting lanes
    const lane = this.worldBuilder.buildLane();
    this.scene.add(lane);

    const lane2 = this.worldBuilder.buildLane();
    lane2.position.z = -20;
    this.scene.add(lane2);

    // Add the player
    const box = this.gameLoader.modelLoader.get("box");
    if (box) {
      box.position.set(this.worldBuilder.xMid, 0.01, -2.5);
      box.scale.set(2, 2, 2);
      this.scene.add(box);
      this.player = box;
    }
  }

  private playerMovement(dt: number) {
    if (!this.player) {
      return;
    }

    if (this.keyboardListener.isKeyPressed("a")) {
      this.player.position.x -= this.playerMoveSpeed * dt;
    } else if (this.keyboardListener.isKeyPressed("d")) {
      this.player.position.x += this.playerMoveSpeed * dt;
    }
    if (this.keyboardListener.isKeyPressed("w")) {
      this.player.position.z -= this.playerMoveSpeed * dt;
    } else if (this.keyboardListener.isKeyPressed("s")) {
      this.player.position.z += this.playerMoveSpeed * dt;
    }
  }

  private update = () => {
    requestAnimationFrame(this.update);

    const dt = this.clock.getDelta();

    this.playerMovement(dt);

    this.renderer.render();
    this.controls.update();
  };
}
