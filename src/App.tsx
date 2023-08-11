import "./app.scss";

import React from "react";
import { observer } from "mobx-react-lite";

import { AppState } from "./app-state";
import { GameOverScreen } from "./components/game-over-screen/game-over-screen";
import { LoadingScreen } from "./components/loading-screen/loading-screen";

interface AppProps {
  appState: AppState;
}

export const App: React.FC<AppProps> = observer(({ appState }) => {
  return (
    <div className="app">
      <canvas id="canvas"></canvas>

      {!appState.gameStarted && <LoadingScreen appState={appState} />}

      {appState.gameState?.gameOver && <GameOverScreen appState={appState} />}
    </div>
  );
});
