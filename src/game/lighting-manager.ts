import * as THREE from "three";
import { GameStore } from "./game-store";

import GUI from "lil-gui";
import { StreetLight } from "./street-light-manager";
import { EventListener } from "../listeners/event-listener";
import { Road } from "./model/road";

export class LightingManager {
  private ambientLight: THREE.AmbientLight;
  private directLight: THREE.DirectionalLight;

  private spotLights = new Map<string, THREE.SpotLight[]>();

  constructor(private gameStore: GameStore, private events: EventListener) {
    const { scene } = this.gameStore;

    // Add scene lighting once
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);

    const directLight = new THREE.DirectionalLight();

    scene.add(ambientLight, directLight);

    // Assign refs for later
    this.ambientLight = ambientLight;
    this.directLight = directLight;

    // Testing night mode
    //this.nightMode();

    // Debug GUI
    // const gui = new GUI();

    // gui
    //   .add(ambientLight, "intensity")
    //   .name("ambient intensity")
    //   .min(0)
    //   .max(1)
    //   .step(0.01);

    // gui
    //   .add(directLight, "intensity")
    //   .name("direct intensity")
    //   .min(0)
    //   .max(1)
    //   .step(0.01);
  }

  update(dt: number) {
    //
  }

  private nightMode() {
    this.ambientLight.intensity = 0.03;
    this.directLight.intensity = 0.03;
  }
}
