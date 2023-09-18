import * as THREE from "three";
import { GameStore } from "./game-store";

export class LightingManager {
  private ambientLight: THREE.AmbientLight;
  private directLight: THREE.DirectionalLight;
  private dlUp = false;

  constructor(private gameStore: GameStore) {
    const { scene } = gameStore;

    // Add scene lighting once
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);

    const directLight = new THREE.DirectionalLight();
    console.log("intensity", directLight.intensity);

    scene.add(ambientLight, directLight);

    // Assign refs for later
    this.ambientLight = ambientLight;
    this.directLight = directLight;
  }

  update(dt: number) {
    //
  }
}

/**
 * - Don't do shadows from the directional light
 * - Determine best default lighting setup
 * - Lower those lights' intensity over time
 * - Spotlights from street lamps and cars can cast shadows
 */
