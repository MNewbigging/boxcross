import * as THREE from "three";

import { GameInitData } from "./game-init-data";
import { GameLoader } from "../loaders/game-loader";
import { Player } from "./player";
import { World } from "./world";

// Highest level store class for the entire game
export class GameStore {
  // General
  canvas: HTMLCanvasElement;
  loader: GameLoader;
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  player: Player;
  world: World;

  constructor(initData: GameInitData) {
    this.canvas = initData.canvas;
    this.loader = initData.loader;
    this.scene = initData.scene;
    this.camera = initData.camera;
    this.player = initData.player;
    this.world = initData.world;
  }
}
