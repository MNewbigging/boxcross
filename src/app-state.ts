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

  gameState?: Game;
  private readonly gameLoader = new GameLoader();
  private readonly eventListener = new EventListener();
  private boxScene?: BoxScene;

  constructor() {
    makeAutoObservable(this);

    // Give canvas time to mount
    setTimeout(() => this.loadGame(), 10);
  }

  @action startGame = () => {
    const canvas = document.getElementById("canvas") as HTMLCanvasElement;
    if (!canvas) {
      console.error("could not find game canvas");
      return;
    }

    // First stop the box scene
    if (this.boxScene) {
      this.boxScene.stop();
      this.boxScene = undefined;
    }

    // Then start the game
    this.assignEventListeners();
    this.gameState = new Game(canvas, this.gameLoader);
    this.currentScreen = Screen.GAME;
    this.gameState.startGame();
  };

  private async loadGame() {
    this.gameLoader.load(this.onLoad);
  }

  @action onLoad = () => {
    // Can now start the game
    this.canStart = true;

    // Once start screen has mounted, can start box scene
    setTimeout(() => this.setupBoxCanvas(), 10);
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

  @action onGameOver = () => {
    this.currentScreen = Screen.GAME_OVER;
  };

  @action replayGame = () => {
    this.currentScreen = Screen.GAME;
  };

  @action updateRoadsCrossed = (roadsCrossed: number) => {
    this.roadsCrossed = roadsCrossed;
  };

  private assignEventListeners() {
    this.eventListener.on("road-crossed", this.updateRoadsCrossed);
    this.eventListener.on("game-over", this.onGameOver);
  }
}
