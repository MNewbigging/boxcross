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
 * - rename loading screen to start screen
 * - use an enum to track current screen, switch in app
 *
 * - can actions be private?
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
    // First stop the box scene
    if (this.boxScene) {
      this.boxScene.stop();
      this.boxScene = undefined;
    }

    // Then start the game
    this.startGame();
  };

  @action replayGame = () => {
    // Remove any events the game is using
    this.eventListener.clear();

    // Then start the game again
    this.startGame();
  };

  private startGame() {
    if (!this.canvas) {
      return;
    }

    this.assignEventListeners();
    this.gameState = new Game(this.canvas, this.gameLoader, this.eventListener);
    this.currentScreen = Screen.GAME;
    this.gameState.startGame();
  }

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
