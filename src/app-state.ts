import { action, makeAutoObservable, observable } from "mobx";

import { BoxScene } from "./game/box-scene";
import { EventListener } from "./listeners/event-listener";
import { Game } from "./game/game";
import { GameLoader } from "./loaders/game-loader";

/**
 * For some reason, creating new Game instances does not overwrite - dupes are made.
 *
 * Need to separate observable state from the game:
 * - pass in the event listener to the game
 * - appState can listen for events and update observable props
 * - that way, those props are never reassigned when new game classes are made
 *
 * New thinking:
 *
 * Surely it's less performant to re-init the entire game rather than resetting values across numerous classes?
 *
 * - Benchmark memory usage before this refactor
 * -- 20 seconds, hit replay 3 times and played til next replay would show
 * -- heap usage 9.6mb - 18.1mb
 * - Never re-init the game class, only reset the game
 * - Benchmark again and compare
 *
 */

export enum Screen {
  START = "start",
  GAME = "game",
  GAME_OVER = "game-over",
}

export class AppState {
  // Observable props for the UI
  @observable currentScreen = Screen.START;
  @observable canStart = false;
  @observable roadsCrossed = 0;

  private gameState?: Game;
  private canvas?: HTMLCanvasElement;
  private readonly gameLoader = new GameLoader();
  private readonly eventListener = new EventListener();
  private boxScene?: BoxScene;

  constructor() {
    makeAutoObservable(this);

    this.loadGame();
  }

  @action playGame = () => {
    const canvas = document.getElementById("canvas") as HTMLCanvasElement;
    if (!canvas) {
      console.error("could not find game canvas");
      return;
    }

    // First stop the box scene
    if (this.boxScene) {
      // todo proper disposal of this scene
      this.boxScene.stop();
      this.boxScene = undefined;
    }

    // Assign listener events before starting first game
    this.assignEventListeners();

    // Then start the game
    this.gameState = new Game(canvas, this.gameLoader, this.eventListener);
    this.currentScreen = Screen.GAME;
    this.gameState.startGame();
  };

  @action replayGame = () => {
    if (!this.gameState) {
      return;
    }

    // Reset values for a new game
    this.roadsCrossed = 0;
    this.gameState.resetGame();

    // Then start the game
    this.currentScreen = Screen.GAME;
    this.gameState.startGame();
  };

  private async loadGame() {
    // Preload assets for the start screen first
    this.gameLoader.modelLoader.preLoad(this.onPreLoad);

    // Then load game assets
    this.gameLoader.load(this.onLoad);
  }

  private onPreLoad = () => {
    // Start screen scene setup
    this.setupBoxCanvas();

    // Game canvas would have mounted by now, get a ref to it
    const canvas = document.getElementById("canvas") as HTMLCanvasElement;
    this.canvas = canvas;
  };

  private setupBoxCanvas() {
    // Setup the loading screen box canvas
    const boxCanvas = document.getElementById(
      "box-canvas"
    ) as HTMLCanvasElement;
    if (!boxCanvas) {
      console.error("Could not find box canvas");
      return;
    }

    this.boxScene = new BoxScene(boxCanvas, this.gameLoader);
  }

  @action private onLoad = () => {
    // So long as we were able to get a ref to the game canvas, can start
    if (this.canvas) {
      this.canStart = true;
    }
  };

  @action private onGameOver = () => {
    this.currentScreen = Screen.GAME_OVER;
  };

  @action private updateRoadsCrossed = (roadsCrossed: number) => {
    this.roadsCrossed = roadsCrossed;
  };

  private assignEventListeners() {
    this.eventListener.on("road-crossed", this.updateRoadsCrossed);
    this.eventListener.on("game-over", this.onGameOver);
  }
}
