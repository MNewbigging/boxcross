import "./start-screen.scss";

import React from "react";
import { Button, Card, Intent } from "@blueprintjs/core";
import { observer } from "mobx-react-lite";

import { AppState } from "../../app-state";

interface StartScreenProps {
  appState: AppState;
}

export const StartScreen: React.FC<StartScreenProps> = observer(
  ({ appState }) => {
    return (
      <div className="start-screen">
        <canvas id="box-canvas"></canvas>
        <Card className="start-panel">
          <h1 className="bp5-heading title">Box Cross</h1>

          <div className="bp5-running-text">
            <p>To play:</p>
            <ul>
              <li>WASD - Move</li>
              <li>Avoid the cars!</li>
              <li>Cross as many roads as you can!</li>
            </ul>
          </div>

          <Button
            text="Play"
            onClick={appState.startGame}
            intent={Intent.PRIMARY}
            large
          />
        </Card>
      </div>
    );
  }
);
