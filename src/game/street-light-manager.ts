import * as THREE from "three";
import { EventListener } from "../listeners/event-listener";
import {
  disposeObject,
  randomId,
  randomRange,
  randomRangeInt,
} from "../utils/utils";
import { GameStore } from "./game-store";
import { Road } from "./model/road";
import { ModelNames } from "../loaders/model-loader";
import { CircleProp } from "./model/props";

interface StreetLight {
  object: THREE.Object3D;
  propId: string;
}

export class StreetLightManager {
  private readonly minLightDistance = 10;
  private readonly minLightCount = 4;
  private readonly maxLightCount = 4;

  private streetLights = new Map<string, StreetLight[]>();

  constructor(private gameStore: GameStore, private events: EventListener) {
    events.on("road-created", this.onRoadCreated);
    events.on("road-removed", this.onRoadRemoved);
  }

  reset() {
    this.streetLights.forEach((lights: StreetLight[]) =>
      lights.forEach((light) => this.removeStreetLight(light))
    );

    this.streetLights.clear();
  }

  private readonly onRoadCreated = (road: Road) => {
    const { scene } = this.gameStore;
    const { modelLoader } = this.gameStore.loader;

    // Decide how many lights to create either side
    const lightCount = randomRangeInt(this.minLightCount, this.maxLightCount);

    // Get light positions along x axis
    const xPositions = this.getRandomLightXPositions(lightCount);

    // Place the lights
    const streetLights: StreetLight[] = [];
    for (const xPos of xPositions) {
      // Create the light
      const object = modelLoader.get(ModelNames.STREET_LIGHT);

      // Randomly assign to top/bot side of road
      if (Math.random() < 0.5) {
        // Top
        object.position.set(xPos, 0, road.zMax + 3.5);
      } else {
        // Bot
        object.rotateY(Math.PI);
        object.position.set(xPos, 0, road.zMin - 3.5);
      }

      // Create the prop for the light, give it to game store
      const prop: CircleProp = {
        id: randomId(),
        roadId: road.id,
        position: new THREE.Vector3(object.position.x, 0, object.position.z),
        radius: 0.2,
      };
      this.gameStore.addCircleProp(prop);

      //  Add the object to the scene
      scene.add(object);

      // Keep track of lights made
      streetLights.push({
        object,
        propId: prop.id,
      });
    }

    this.streetLights.set(road.id, streetLights);
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
    const streetLights = this.streetLights.get(road.id) ?? [];
    streetLights.forEach((light) => this.removeStreetLight(light));
  };

  private removeStreetLight(light: StreetLight) {
    disposeObject(light.object);
    this.gameStore.scene.remove(light.object);
    this.gameStore.removeCircleProp(light.propId);
  }
}
