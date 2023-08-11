import "./game-ui.scss";

import React from "react";
import { observer } from "mobx-react-lite";

import { AppState } from "../../app-state";

interface AppProps {
  appState: AppState;
}

export const GameUI: React.FC<AppProps> = observer(({ appState }) => {
  return (
    <div className="game-ui">
      <div className="content">
        <div className="timer">{appState.gameState?.outOfViewTimer}</div>
      </div>
    </div>
  );
});
