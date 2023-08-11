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

  private player!: THREE.Object3D;
  private playerMoveSpeed = 15;
  private worldXMin = 10;
  private worldXMax = 30;

  constructor(
    private canvas: HTMLCanvasElement,
    private gameLoader: GameLoader
  ) {
    this.worldBuilder = new WorldBuilder(gameLoader.modelLoader, this.scene);

    // Setup camera
    this.camera = new THREE.PerspectiveCamera(
      45,
      canvas.clientWidth / canvas.clientHeight,
      0.1,
      1000
    );
    this.camera.position.set(this.worldBuilder.xMid, 30, 0);
    this.camera.lookAt(this.worldBuilder.xMid, 0, -10);

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
    this.worldBuilder.setup();

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
      const newPos = this.player.position.x - this.playerMoveSpeed * dt;
      this.player.position.x = Math.max(newPos, this.worldBuilder.xMin);
    } else if (this.keyboardListener.isKeyPressed("d")) {
      const newPos = this.player.position.x + this.playerMoveSpeed * dt;
      this.player.position.x = Math.min(newPos, this.worldBuilder.xMax);
    }
    if (this.keyboardListener.isKeyPressed("w")) {
      this.player.position.z -= this.playerMoveSpeed * dt;
    } else if (this.keyboardListener.isKeyPressed("s")) {
      const newPos = this.player.position.z + this.playerMoveSpeed * dt;
      this.player.position.z = Math.min(newPos, this.worldBuilder.zMin);
    }
  }

  private update = () => {
    requestAnimationFrame(this.update);

    const dt = this.clock.getDelta();

    // Update player
    this.playerMovement(dt);

    // Update camera
    //this.camera.position.z = this.player?.position.z;

    // Update world
    this.worldBuilder.laneCheck(this.player.position.z);

    this.renderer.render();
    this.controls.update();
  };
}