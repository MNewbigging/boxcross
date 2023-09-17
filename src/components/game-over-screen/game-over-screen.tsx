import "./game-over-screen.scss";

import React from "react";
import { observer } from "mobx-react-lite";

import { AppState } from "../../app-state";
import { Button, Card, Checkbox, Intent } from "@blueprintjs/core";

interface GameOverProps {
  appState: AppState;
}

export const GameOverScreen: React.FC<GameOverProps> = observer(
  ({ appState }) => {
    return (
      <div className="game-over">
        <Card className="game-over-panel">
          <div>You crossed: {appState.roadsCrossed}</div>

          <Checkbox
            checked={!appState.showIntro}
            onChange={appState.toggleSkipIntro}
          >
            Skip intro cutscene
          </Checkbox>

          <Button
            text="Replay"
            intent={Intent.PRIMARY}
            onClick={appState.replayGame}
          />
        </Card>
      </div>
    );
  }
);
