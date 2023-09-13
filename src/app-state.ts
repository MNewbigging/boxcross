import { action, makeAutoObservable, observable } from "mobx";

import { BoxScene } from "./game/box-scene";
import { EventListener } from "./listeners/event-listener";
import { Game } from "./game/game";
import { GameLoader } from "./loaders/game-loader";

export class AppState {
  @observable canStart = false;
  @observable gameStarted = false;

  gameState?: Game;
  private readonly gameLoader = new GameLoader();
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
    this.gameState = new Game(canvas, this.gameLoader);
    this.gameStarted = true;
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
}
