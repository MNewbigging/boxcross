import * as THREE from "three";
import { Power2, gsap } from "gsap";

import { GameLoader } from "../loaders/game-loader";
import { ModelNames } from "../loaders/model-loader";
import { Renderer } from "./renderer";

export class BoxScene {
  private scene = new THREE.Scene();
  private camera: THREE.PerspectiveCamera;
  private renderer: Renderer;
  private box: THREE.Object3D;

  private animRequestId?: number;
  private clock = new THREE.Clock();
  private timer = 0;

  constructor(
    private canvas: HTMLCanvasElement,
    private gameLoader: GameLoader
  ) {
    // Camera
    this.camera = new THREE.PerspectiveCamera(
      45,
      canvas.clientWidth / canvas.clientHeight,
      0.1,
      10
    );
    this.camera.position.set(0, 0.1, 3);

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.3);
    const directLight = new THREE.DirectionalLight();
    directLight.position.x = -1;
    this.scene.add(ambientLight, directLight);

    // Renderer
    this.renderer = new Renderer(this.canvas, this.camera, this.scene, true);

    // Box
    const box = this.gameLoader.modelLoader.get(ModelNames.PLAYER);
    box.scale.set(2, 2, 2);

    // Box origin is at its base, needs to be its true center
    const bounds = new THREE.Box3().setFromObject(box);
    box.position.y -= bounds.max.y / 2;

    // Parent the box
    const parent = new THREE.Group();
    parent.add(box);

    // Make the corner face the camera
    parent.rotation.y = Math.PI / 4;
    parent.rotation.x = Math.PI / 8;

    this.box = parent;

    // Add to scene
    this.scene.add(this.box);

    // Start immediatley
    this.update();
  }

  stop() {
    if (this.animRequestId !== undefined) {
      cancelAnimationFrame(this.animRequestId);
    }

    this.scene.remove(this.box);

    console.log("box scene remaining info", this.renderer.renderer.info);
  }

  private flipAnimation = () => {
    const flipTimeline = gsap.timeline();
    flipTimeline.to(this.box.rotation, {
      z: this.box.rotation.z + Math.PI * 2,
      duration: 1,
      ease: Power2.easeInOut,
    });
  };

  private spinAnimation = () => {
    const flipTimeline = gsap.timeline();
    flipTimeline.to(this.box.rotation, {
      y: this.box.rotation.y + Math.PI,
      duration: 0.5,
      ease: Power2.easeInOut,
    });
  };

  private update = () => {
    this.animRequestId = requestAnimationFrame(this.update);

    const delta = this.clock.getDelta();

    this.timer += delta;

    if (this.timer >= 3) {
      // Pick a random animation
      const anims = [this.flipAnimation, this.spinAnimation];
      const rng = Math.floor(Math.random() * anims.length);
      anims[rng]();

      this.timer = 0;
    }

    this.renderer.render();
  };
}
