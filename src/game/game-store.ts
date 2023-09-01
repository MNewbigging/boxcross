import * as THREE from "three";
import { makeAutoObservable, observable } from "mobx";

import { GameInitData } from "./model/game-init-data";
import { GameLoader } from "../loaders/game-loader";
import { Player } from "./model/player";
import { Road } from "./model/road";
import { World } from "./model/world";

// Highest level store class for the entire game
export class GameStore {
  canvas: HTMLCanvasElement;
  loader: GameLoader;
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  player: Player;
  world: World;
  roads: Road[] = [];

  @observable roadsCrossed = 0;

  constructor(initData: GameInitData) {
    makeAutoObservable(this);

    // Copy over init values
    this.canvas = initData.canvas;
    this.loader = initData.loader;
    this.scene = initData.scene;
    this.camera = initData.camera;
    this.player = initData.player;
    this.world = initData.world;
  }

  getCurrentRoad() {
    const pz = this.player.object.position.z;

    return this.roads.find((road) => pz > road.zMax && pz < road.zMin);
  }
}
