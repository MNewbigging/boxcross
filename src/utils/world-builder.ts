import * as THREE from "three";

import { ModelLoader, ModelNames } from "../loaders/model-loader";

export function buildLane(modelLoader: ModelLoader) {
  // A lane consists of road and pavement either side
  const lane = new THREE.Group();

  const count = 10;
  const width = 5;

  // Simple road
  const road = modelLoader.get(ModelNames.ROAD);
  if (road) {
    for (let x = 0; x < count; x++) {
      const roadPiece = road.clone();
      roadPiece.position.set(x * width, 0, -5);
      lane.add(roadPiece);
    }
  }

  // Pavements
  const pavement = modelLoader.get(ModelNames.PAVEMENT);
  if (pavement) {
    for (let x = 0; x < count; x++) {
      const pavementPiece = pavement.clone();
      pavementPiece.position.set(x * width, 0, -15);
      lane.add(pavementPiece);

      const otherSide = pavement.clone();
      otherSide.rotateY(Math.PI);
      otherSide.position.set((x + 1) * width, 0, -5);
      lane.add(otherSide);
    }
  }

  return lane;
}
