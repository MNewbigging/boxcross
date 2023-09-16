import "./game-over-screen.scss";

import React from "react";
import { observer } from "mobx-react-lite";

import { AppState } from "../../app-state";
import { Button } from "../button/button";
import { Card } from "@blueprintjs/core";

interface GameOverProps {
  appState: AppState;
}

export const GameOverScreen: React.FC<GameOverProps> = observer(
  ({ appState }) => {
    return (
      <div className="game-over">
        <Card className="game-stats">
          <div>You crossed: {appState.roadsCrossed}</div>
        </Card>

        <Button
          className="replay-button"
          text="Replay"
          onClick={appState.replayGame}
        />
      </div>
    );
  }
);
