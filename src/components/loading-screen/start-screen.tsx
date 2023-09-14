import "./start-screen.scss";

import React from "react";
import { Spinner } from "@blueprintjs/core";
import { SpinnerSize } from "@blueprintjs/core/lib/esm/components";
import { observer } from "mobx-react-lite";

import { AppState } from "../../app-state";
import { StartPanel } from "./start-panel";

interface StartScreenProps {
  appState: AppState;
}

export const StartScreen: React.FC<StartScreenProps> = observer(
  ({ appState }) => {
    return (
      <div className="start-screen">
        {!appState.canStart && <Spinner size={SpinnerSize.LARGE} />}

        {appState.canStart && <StartPanel appState={appState} />}
      </div>
    );
  }
);
