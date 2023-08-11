import * as THREE from "three";

import { ModelLoader, ModelNames } from "../loaders/model-loader";

interface Lane {
  objects: THREE.Group;
  zMin: number; // Closest z value
  zMax: number; // Farthest z value (will be a smaller number since travelling negatively)
}

export class WorldBuilder {
  xMin = 0;
  xMax = 0;
  xMid = 0;
  zMin = 0;

  // Lane details
  private colWidth = 5; // Width of an item like a road piece
  private colCount = 14; // Number of road pieces in a row
  private xMaxArea = 30; // Max metres the player can move left to right
  private laneDepth = 20;
  private laneBuffer = 2;
  private lanes: Lane[] = [];

  constructor(private modelLoader: ModelLoader, private scene: THREE.Scene) {
    // Set world vars
    const worldWidth = this.colWidth * this.colCount;
    this.xMid = worldWidth / 2;
    this.xMin = this.xMid - this.xMaxArea / 2;
    this.xMax = this.xMid + this.xMaxArea / 2;
  }

  setup() {
    // Build starting lane
    const startLaneObjects = this.buildLaneObjects();
    this.scene.add(startLaneObjects);
    this.lanes.push({
      objects: startLaneObjects,
      zMin: startLaneObjects.position.z,
      zMax: startLaneObjects.position.z - this.laneDepth,
    });

    // Then as many lanes as the lane buffer dictates
    for (let x = 0; x < this.laneBuffer; x++) {
      this.spawnNextLane();
      console.log("spawned next lane");
    }
  }

  laneCheck(playerZ: number) {
    // Do any lanes need creating?

    // Which lane is player on right now
    const laneIdx = this.lanes.findIndex(
      (lane) => playerZ > lane.zMax && playerZ < lane.zMin
    );

    // If remaining lanes ahead count is less than lane buffer, spawn a lane
    const lanesAhead = this.lanes.length - (laneIdx + 1);
    if (lanesAhead < this.laneBuffer) {
      // Spawn the next lane
      this.spawnNextLane();
    }

    // Do any lanes need removing?
    // Only keep one previous lane
    if (laneIdx >= 2) {
      this.removeOldestLane();
    }
  }

  private spawnNextLane() {
    // Create the lane objects
    const laneObjects = this.buildLaneObjects();

    // Position them immediately after the last existing lane
    laneObjects.position.z = this.lanes[this.lanes.length - 1].zMax;

    // Create the lane object
    this.lanes.push({
      objects: laneObjects,
      zMin: laneObjects.position.z,
      zMax: laneObjects.position.z - this.laneDepth,
    });

    // Add lane to the scene
    this.scene.add(laneObjects);
  }

  private removeOldestLane() {
    const oldestLane = this.lanes[0];

    // Update the new world zMin now that a lane is being removed
    this.zMin = oldestLane.zMax;

    // Remove objects from the scene
    this.scene.remove(oldestLane.objects);

    // Remove the lane
    this.lanes.splice(0, 1);
  }

  private buildLaneObjects(): THREE.Group {
    console.log("build lane objects");
    // A lane consists of road and pavement either side
    const lane = new THREE.Group();

    // Simple road
    const road = this.modelLoader.get(ModelNames.ROAD);
    if (road) {
      for (let x = 0; x < this.colCount; x++) {
        const roadPiece = road.clone();
        roadPiece.position.set(x * this.colWidth, 0, -5);
        lane.add(roadPiece);
      }
    }

    // Pavements
    const pavement = this.modelLoader.get(ModelNames.PAVEMENT);
    if (pavement) {
      for (let x = 0; x < this.colCount; x++) {
        const pavementPiece = pavement.clone();
        pavementPiece.position.set(x * this.colWidth, 0, -15);
        lane.add(pavementPiece);

        const otherSide = pavement.clone();
        otherSide.rotateY(Math.PI);
        otherSide.position.set((x + 1) * this.colWidth, 0, -5);
        lane.add(otherSide);
      }
    }

    return lane;
  }
}
