import "./app.scss";

import React from "react";
import { observer } from "mobx-react-lite";

import { AppState, Screen } from "./app-state";
import { GameOverScreen } from "./components/game-over-screen/game-over-screen";
import { GameUI } from "./components/game-ui/game-ui";
import { StartScreen } from "./components/loading-screen/start-screen";

interface AppProps {
  appState: AppState;
}

export const App: React.FC<AppProps> = observer(({ appState }) => {
  let screen: JSX.Element;

  switch (appState.currentScreen) {
    case Screen.START:
      screen = <StartScreen appState={appState} />;
      break;
    case Screen.GAME:
      screen = <GameUI appState={appState} />;
      break;
    case Screen.GAME_OVER:
      screen = <GameOverScreen appState={appState} />;
      break;
    default:
      screen = <span>Something went wrong!</span>;
      break;
  }

  return (
    <div className="app">
      <canvas id="canvas"></canvas>

      {screen}
    </div>
  );
});
