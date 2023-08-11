import * as THREE from "three";

import { ModelLoader, ModelNames } from "../loaders/model-loader";

export class WorldBuilder {
  xMin = 0;
  xMax = 0;
  xMid = 0;

  // Lane details
  private colWidth = 5; // Width of an item like a road piece
  private colCount = 14; // Number of road pieces in a row
  private xMaxArea = 20; // Max metres the player can move left to right

  constructor(private modelLoader: ModelLoader) {
    // Set world vars
    const worldWidth = this.colWidth * this.colCount;
    this.xMid = worldWidth / 2;
    this.xMin = this.xMid - this.xMaxArea / 2;
    this.xMax = this.xMid + this.xMaxArea / 2;
  }

  buildLane() {
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
