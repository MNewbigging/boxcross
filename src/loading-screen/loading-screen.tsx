import "./loading-screen.scss";

import React from "react";
import { Spinner } from "@blueprintjs/core";
import { SpinnerSize } from "@blueprintjs/core/lib/esm/components";
import { observer } from "mobx-react-lite";

import { AppState } from "../app-state";

interface LoadingScreenProps {
  appState: AppState;
}

export const LoadingScreen: React.FC<LoadingScreenProps> = observer(
  ({ appState }) => {
    return (
      <div className="loading-screen">
        {!appState.canStart && <Spinner size={SpinnerSize.LARGE} />}

        {appState.canStart && (
          <div className="start-button white" onClick={appState.startGame}>
            <div>Play</div>
          </div>
        )}
      </div>
    );
  }
);
