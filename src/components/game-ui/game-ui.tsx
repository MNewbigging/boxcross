import "./game-ui.scss";

import React from "react";
import { observer } from "mobx-react-lite";

import { AppState } from "../../app-state";
import { Card } from "@blueprintjs/core";

interface AppProps {
  appState: AppState;
}

export const GameUI: React.FC<AppProps> = observer(({ appState }) => {
  return (
    <div className="game-ui">
      <div className="content">
        <Card className="top-right-bar">
          <div className="road-count">Crossed: {appState.roadsCrossed}</div>
        </Card>
      </div>
    </div>
  );
});
