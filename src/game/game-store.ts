import * as THREE from "three";

import { GameInitData } from "./model/game-init-data";
import { GameLoader } from "../loaders/game-loader";
import { Player } from "./model/player";
import { Road } from "./model/road";
import { World } from "./model/world";
import { CircleProp } from "./model/props";

// Highest level store class for the entire game
export class GameStore {
  // These never get reassigned
  canvas: HTMLCanvasElement;
  loader: GameLoader;
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  // Game specific
  player: Player;
  world: World;
  roads: Road[] = [];
  roadsCrossed = 0;
  circleProps: CircleProp[] = [];

  constructor(initData: GameInitData) {
    // Copy over init values
    this.canvas = initData.canvas;
    this.loader = initData.loader;
    this.scene = initData.scene;
    this.camera = initData.camera;
    this.player = initData.player;
    this.world = initData.world;
  }

  isOnRoad(road: Road, posZ: number) {
    return posZ > road.zMax && posZ < road.zMin;
  }

  getCurrentRoad(): Road | undefined {
    return this.roads.find((road) =>
      this.isOnRoad(road, this.player.object.position.z)
    );
  }

  getCurrentRoadIndexFor(objectPosition: number) {
    const posZ = objectPosition;

    return this.roads.findIndex((road) => this.isOnRoad(road, posZ));
  }

  getRoadsAhead() {}

  addCircleProp(prop: CircleProp) {
    this.circleProps.push(prop);
  }

  removeCircleProp(propId: string) {
    this.circleProps = this.circleProps.filter((prop) => prop.id !== propId);
  }

  getCirclePropsOnRoad(roadId: string) {
    return this.circleProps.filter((prop) => prop.roadId === roadId);
  }
}
