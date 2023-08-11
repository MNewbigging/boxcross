import "./loading-screen.scss";

import React from "react";
import { Spinner } from "@blueprintjs/core";
import { SpinnerSize } from "@blueprintjs/core/lib/esm/components";
import { observer } from "mobx-react-lite";

import { AppState } from "../../app-state";
import { Button } from "../button/button";

interface LoadingScreenProps {
  appState: AppState;
}

export const LoadingScreen: React.FC<LoadingScreenProps> = observer(
  ({ appState }) => {
    return (
      <div className="loading-screen">
        {!appState.canStart && <Spinner size={SpinnerSize.LARGE} />}

        {appState.canStart && (
          <Button text="Play" onClick={appState.startGame} />
        )}
      </div>
    );
  }
);
