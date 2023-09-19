import * as THREE from "three";
import { EventListener } from "../listeners/event-listener";
import { mergeWithRoad, randomId, randomRangeInt } from "../utils/utils";
import { GameStore } from "./game-store";
import { Road } from "./model/road";
import { ModelNames } from "../loaders/model-loader";
import { ITEM_WIDTH } from "./road-builder";

export class StreetLightManager {
  private readonly minLightCount = 4;
  private readonly maxLightCount = 4;
  private readonly topOffset = -16.5;
  private readonly botOffset = -3.5;

  private circlePropIds = new Map<string, string[]>();

  constructor(private gameStore: GameStore, private events: EventListener) {
    events.on("road-created", this.onRoadCreated);
    events.on("road-removed", this.onRoadRemoved);
  }

  reset() {
    this.circlePropIds.forEach((propIds: string[]) =>
      propIds.forEach((id) => this.gameStore.removeCircleProp(id))
    );
    this.circlePropIds.clear();
  }

  private readonly onRoadCreated = (road: Road) => {
    // Decide how many lights to create either side
    const lightCount = randomRangeInt(this.minLightCount, this.maxLightCount);

    // Get the random positions for those lights
    const positions = this.getRandomLightPositions(lightCount);

    // Create light objects at those positions
    this.createLightObjects(positions, road);

    // Create circle props for the lights
    this.createCircleProps(road.id, positions);
  };

  private getRandomLightPositions(count: number): THREE.Vector3[] {
    const { world } = this.gameStore;

    // Can only place lights at edge of road columns (no overlapping dips/drains this way)
    const validXPositions: number[] = [];
    for (let i = world.xMin; i <= world.xMax; i += ITEM_WIDTH) {
      validXPositions.push(i);
    }

    // Pick random valid positions
    const positions: THREE.Vector3[] = [];
    for (let i = 0; i < count; i++) {
      // Get a random valid x position, then remove it for next iteration
      const rnd = Math.floor(Math.random() * validXPositions.length);
      const xPos = validXPositions[rnd];
      validXPositions.splice(rnd, 1);

      // Random z position - either top of bottom side of road
      const zPos = Math.random() < 0.5 ? this.topOffset : this.botOffset;

      positions.push(new THREE.Vector3(xPos, 0, zPos));
    }

    return positions;
  }

  private createLightObjects(positions: THREE.Vector3[], road: Road) {
    const { modelLoader } = this.gameStore.loader;

    // Create the light objects
    const lightObjects: THREE.Object3D[] = [];
    positions.forEach((position: THREE.Vector3) => {
      // Get model object
      const object = modelLoader.get(ModelNames.STREET_LIGHT);

      // Position it
      object.position.copy(position);

      // If it has a bottom offset, rotate it
      if (object.position.z === this.botOffset) {
        object.rotateY(Math.PI);
      }

      lightObjects.push(object);
    });

    // Merge with the road
    mergeWithRoad(road, lightObjects, this.gameStore.scene);
  }

  private createCircleProps(roadId: string, positions: THREE.Vector3[]) {
    // Create the props
    const circleProps = positions.map((position) => ({
      id: randomId(),
      roadId,
      position,
      radius: 0.2,
    }));

    // Give them to the game store
    circleProps.forEach((prop) => this.gameStore.addCircleProp(prop));

    // Keep track of their ids against the road for later removal
    const propIds = circleProps.map((prop) => prop.id);
    this.circlePropIds.set(roadId, propIds);
  }

  private readonly onRoadRemoved = (road: Road) => {
    const propIds = this.circlePropIds.get(road.id) ?? [];
    propIds.forEach((id) => this.gameStore.removeCircleProp(id));
    this.circlePropIds.delete(road.id);
  };
}
