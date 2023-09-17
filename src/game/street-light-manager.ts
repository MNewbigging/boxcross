import * as THREE from "three";
import { EventListener } from "../listeners/event-listener";
import { disposeObject, randomRange, randomRangeInt } from "../utils/utils";
import { GameStore } from "./game-store";
import { Road } from "./model/road";
import { ModelNames } from "../loaders/model-loader";

export class StreetLightManager {
  private readonly minLightDistance = 10;
  private readonly minLightCount = 4;
  private readonly maxLightCount = 4;

  private streetLights = new Map<string, THREE.Object3D[]>();

  constructor(private gameStore: GameStore, private events: EventListener) {
    events.on("road-created", this.onRoadCreated);
    events.on("road-removed", this.onRoadRemoved);
  }

  private readonly onRoadCreated = (road: Road) => {
    const { scene } = this.gameStore;
    const { modelLoader } = this.gameStore.loader;

    // Decide how many lights to create either side
    const lightCount = randomRangeInt(this.minLightCount, this.maxLightCount);

    // Get light positions along x axis
    const xPositions = this.getRandomLightXPositions(lightCount);
    console.log("light x positions", xPositions);

    // Place the lights
    const lightObjects: THREE.Object3D[] = [];
    for (const xPos of xPositions) {
      // Create the light
      const light = modelLoader.get(ModelNames.STREET_LIGHT);

      // Randomly assign to top/bot side of road
      if (Math.random() < 0.5) {
        // Top
        light.position.set(xPos, 0, road.zMax + 3.5);
      } else {
        // Bot
        light.rotateY(Math.PI);
        light.position.set(xPos, 0, road.zMin - 3.5);
      }

      //  Add to scene and map
      scene.add(light);
      lightObjects.push(light);
    }

    this.streetLights.set(road.id, lightObjects);
  };

  private getRandomLightXPositions(count: number) {
    const { world } = this.gameStore;
    const positions: number[] = [];

    for (let i = 0; i < count; i++) {
      let pos = randomRange(world.xMin, world.xMax);
      while (this.overlapsOthers(pos, positions)) {
        pos = randomRange(world.xMin, world.xMax);
      }
      positions.push(pos);
    }

    return positions;
  }

  private overlapsOthers(posX: number, others: number[]) {
    return others.some(
      (otherPosX) => Math.abs(posX - otherPosX) < this.minLightDistance
    );
  }

  private readonly onRoadRemoved = (road: Road) => {
    const { scene } = this.gameStore;

    const streetLights = this.streetLights.get(road.id) ?? [];
    streetLights.forEach((light) => {
      disposeObject(light);
      scene.remove(light);
    });
  };
}
