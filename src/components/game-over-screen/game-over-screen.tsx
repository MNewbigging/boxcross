import "./game-over-screen.scss";

import React from "react";
import { observer } from "mobx-react-lite";

import { AppState } from "../../app-state";
import { Button } from "../button/button";

interface GameOverProps {
  appState: AppState;
}

export const GameOverScreen: React.FC<GameOverProps> = observer(
  ({ appState }) => {
    return (
      <div className="game-over">
        <Button
          className="replay-button"
          text="Replay"
          onClick={appState.replayGame}
        />
      </div>
    );
  }
);
