import * as THREE from "three";

import { ModelLoader, ModelNames } from "../loaders/model-loader";
import { randomId, randomIndex, randomRange } from "./utils";

export interface Road {
  id: string;
  index: number; // out of all total roads
  objects: THREE.Group; // the road and pavement objects
  zMin: number; // Closest z value
  zMax: number; // Farthest z value (will be a smaller number since travelling negatively)
  zLeftLane: number; // Where to spawn cars moving from left-right
  zRightLane: number; // Where to spawn cars moving from right-left
  manholes?: THREE.Object3D[];
}

enum RoadColumnType {
  BASIC = "basic",
  DRAIN = "drain",
  CROSSING = "crossing",
}

// These will never change (unless I rescale the models in blender)
export const ITEM_WIDTH = 5; // How many metres wide the pavements and roads are
export const ROAD_DEPTH = 20; // How many metres deep is an entire road row (2x pavements and one road piece)

// These may change
export const COL_COUNT = 14; // How many columns of pavement and road pieces there are

export class RoadBuilder {
  private readonly leftLaneOffset = 12.5;
  private readonly rightLaneOffset = 7.5;

  constructor(private modelLoader: ModelLoader) {}

  buildStartingRoad() {
    // Custom road will go here eventually
    const road = this.buildRoad(0, 0);

    // Testing manhole covers
    const manhole = this.modelLoader.get(ModelNames.MANHOLE_COVER);
    manhole.position.set(30, 0.02, -2.5);
    road.objects.add(manhole);

    road.manholes = [manhole];

    const patch = this.modelLoader.get(ModelNames.MANHOLE_PATCH);
    patch.position.set(30, 0.02, -2.5);
    road.objects.add(patch);

    return road;
  }

  buildRoad(zPos: number, index: number) {
    // Create the objects for the road and position them
    const objects = this.buildRoadObjects();
    objects.position.z = zPos;

    // Road data
    const road: Road = {
      id: randomId(),
      index,
      objects,
      zMin: zPos,
      zMax: zPos - ROAD_DEPTH,
      zLeftLane: zPos - this.leftLaneOffset,
      zRightLane: zPos - this.rightLaneOffset,
    };

    return road;
  }

  private buildRoadObjects() {
    const roadGroup = new THREE.Group();

    // Get the road schema
    const schema = this.getRoadSchema();

    // Build it
    schema.forEach((columnType: RoadColumnType, index: number) => {
      const posX = index * ITEM_WIDTH;

      switch (columnType) {
        case RoadColumnType.BASIC:
          roadGroup.add(...this.buildBasicRoadColumn(posX));
          break;
        case RoadColumnType.DRAIN:
          roadGroup.add(...this.buildDrainRoadColumn(posX));
          break;
        case RoadColumnType.CROSSING:
          roadGroup.add(...this.buildCrossingRoadColumn(posX));
          break;
      }
    });

    return roadGroup;
  }

  // Return all indices that do not contain or neighbour the target type
  private getNonNeighbouringIndices(
    schema: RoadColumnType[],
    targetType: RoadColumnType,
    range = 1
  ) {
    // First identify the invalid indices
    const invalidIndices: number[] = [];
    const totalIndices: number[] = [];

    for (let i = 0; i < schema.length; i++) {
      // Track the total indices as we go
      totalIndices.push(i);

      // Check if current type is the target
      const currentType = schema[i];
      if (currentType !== targetType) {
        // This is not an invalid index
        continue;
      }

      // This index contains the target type, so it's invalid along with its neighbours
      for (let r = i - range; r < i + range + 1; r++) {
        invalidIndices.push(r);
      }
    }

    // Then remove those indices from total indices
    const validIndices = totalIndices.filter(
      (index) => !invalidIndices.includes(index)
    );

    return validIndices;
  }

  private getRoadSchema() {
    // Start with all basic columns
    const schema: RoadColumnType[] = Array(COL_COUNT).fill(
      RoadColumnType.BASIC
    );

    // Add drains first
    const maxDrains = Math.floor(COL_COUNT / 4);
    const drainCount = randomRange(1, maxDrains);
    for (let d = 0; d < drainCount; d++) {
      // Find valid drain positions
      const validIndices = this.getNonNeighbouringIndices(
        schema,
        RoadColumnType.DRAIN
      );

      // IF there are no valid positions, just stop
      if (!validIndices) {
        break;
      }

      // Add a drain at a random valid index
      const randomPosition = validIndices[randomIndex(validIndices.length)];
      schema[randomPosition] = RoadColumnType.DRAIN;
    }

    // Add a crossing
    const maxCrossings = 2; // may want to change based on difficulty later
    const crossingCount = randomRange(0, maxCrossings);
    for (let c = 0; c < crossingCount; c++) {
      const validIndices = this.getNonNeighbouringIndices(
        schema,
        RoadColumnType.CROSSING,
        2
      );
      if (!validIndices) {
        break;
      }

      const randomPosition = validIndices[randomIndex(validIndices.length)];
      schema[randomPosition] = RoadColumnType.CROSSING;
    }

    return schema;
  }

  private buildCrossingRoadColumn(posX: number): THREE.Object3D[] {
    // Create the road piece
    const crossing = this.modelLoader.get(ModelNames.ROAD_CROSSING);
    crossing.position.set(posX, 0, -5);

    // And the pavement pieces
    const upperPavement = this.modelLoader.get(ModelNames.PAVEMENT_DIP);
    upperPavement.position.set(posX, 0, -15);

    const lowerPavement = this.modelLoader.get(ModelNames.PAVEMENT_DIP);
    lowerPavement.rotateY(Math.PI);
    lowerPavement.position.set(posX + ITEM_WIDTH, 0, -5);

    return [crossing, upperPavement, lowerPavement];
  }

  private buildBasicRoadColumn(posX: number): THREE.Object3D[] {
    // Road equal chance to be normal or alt
    const road = this.modelLoader.get(
      Math.random() < 0.5 ? ModelNames.ROAD : ModelNames.ROAD_ALT
    );
    road.position.set(posX, 0, -5);

    // Pavement pieces equal change to be normal or alt
    const upperPavement = this.modelLoader.get(this.randomPavementType());
    upperPavement.position.set(posX, 0, -15);

    const lowerPavement = this.modelLoader.get(this.randomPavementType());
    lowerPavement.rotateY(Math.PI);
    lowerPavement.position.set(posX + ITEM_WIDTH, 0, -5);

    return [road, upperPavement, lowerPavement];
  }

  private randomPavementType() {
    const uniqueChance = Math.random();

    // n% of basic pavements should be a unique type
    if (uniqueChance < 0.15) {
      // 50/50 between the two unique choices here
      return Math.random() < 0.5
        ? ModelNames.PAVEMENT_GRATE
        : ModelNames.PAVEMENT_PANEL;
    }

    // otherwise it's a 50/50 for being normal or alt pavement type
    return Math.random() < 0.5 ? ModelNames.PAVEMENT : ModelNames.PAVEMENT_ALT;
  }

  private buildDrainRoadColumn(posX: number) {
    // Road equal chance to be normal or alt
    const road = this.modelLoader.get(
      Math.random() < 0.5 ? ModelNames.ROAD : ModelNames.ROAD_ALT
    );
    road.position.set(posX, 0, -5);

    const upperPavement = this.modelLoader.get(ModelNames.PAVEMENT_DRAIN);
    upperPavement.position.set(posX, 0, -15);

    const lowerPavement = this.modelLoader.get(ModelNames.PAVEMENT_DRAIN);
    lowerPavement.rotateY(Math.PI);
    lowerPavement.position.set(posX + ITEM_WIDTH, 0, -5);

    return [road, upperPavement, lowerPavement];
  }
}
