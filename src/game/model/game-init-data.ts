import * as THREE from "three";

import { COL_COUNT, ITEM_WIDTH } from "../road-builder";
import { GameLoader } from "../../loaders/game-loader";
import { ModelNames } from "../../loaders/model-loader";
import { Player } from "./player";
import { World } from "./world";

// The starting properties of the game, passed to store on init to ensure all are defined throughout
export interface GameInitData {
  canvas: HTMLCanvasElement;
  loader: GameLoader;
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  player: Player;
  world: World;
}

export function createInitData(
  canvas: HTMLCanvasElement,
  loader: GameLoader
): GameInitData {
  return {
    canvas,
    loader,
    scene: createScene(),
    camera: createCamera(canvas),
    player: createPlayer(loader),
    world: createWorld(),
  };
}

function createCamera(canvas: HTMLCanvasElement) {
  return new THREE.PerspectiveCamera(
    45, // 85 good for debug,
    canvas.clientWidth / canvas.clientHeight,
    0.1,
    1000
  );
}

function createScene() {
  const scene = new THREE.Scene();

  scene.background = new THREE.Color("#1680AF");

  return scene;
}

export function createPlayer(loader: GameLoader): Player {
  const object = loader.modelLoader.get(ModelNames.PLAYER);
  object.scale.set(2, 2, 2);

  return {
    object,
    cameraDistance: 0,
    canMove: true,
    activeEffects: [],
  };
}

function createWorld(): World {
  // World
  const xMax = ITEM_WIDTH * COL_COUNT; // Should these be props of World too?
  const xMid = xMax / 2;

  // Player world boundaries
  const xMaxArea = 50;
  const xMinPlayer = xMid - xMaxArea / 2;
  const xMaxPlayer = xMid + xMaxArea / 2;

  return {
    xMin: 0, // Road objects start at origin
    xMax,
    xMid,
    zMin: 0, // Road objects start at origin
    xMinPlayer,
    xMaxPlayer,
    xMaxArea,
  };
}
