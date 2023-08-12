import { action, makeAutoObservable, observable } from "mobx";

import { GameLoader } from "./loaders/game-loader";
import { GameState } from "./game/game-state";

export class AppState {
  @observable canStart = false;
  @observable gameStarted = false;

  readonly gameLoader = new GameLoader();
  gameState?: GameState;

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
    this.gameState = new GameState(canvas, this.gameLoader);
    this.gameStarted = true;
    this.gameState.startGame();
  };

  private async loadGame() {
    this.gameLoader.load(this.onLoad);
  }

  @action onLoad = () => {
    this.canStart = true;
  };
}
