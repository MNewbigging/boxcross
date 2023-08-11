import { Point } from "../utils/common-types";

export type MouseEventCallback = () => void;
export type MouseEventType =
  | "leftclick"
  | "rightclick"
  | "leftclickdrag"
  | "move";

enum MouseButton {
  LEFT,
  RIGHT,
  MIDDLE,
  NONE,
  DEFAULT = 0,
}

interface MouseEventPosition {
  normalised: Point;
  canvas: Point;
  screen: Point;
  delta: Point;
}

export class MouseListener {
  clickPosition: MouseEventPosition = {
    normalised: { x: 0, y: 0 },
    canvas: { x: 0, y: 0 },
    screen: { x: 0, y: 0 },
    delta: { x: 0, y: 0 },
  };
  movePosition: MouseEventPosition = {
    normalised: { x: 0, y: 0 },
    canvas: { x: 0, y: 0 },
    screen: { x: 0, y: 0 },
    delta: { x: 0, y: 0 },
  };

  private pointerDownEvent?: PointerEvent;
  private previousPosition: Point = { x: 0, y: 0 };
  private readonly clickMovementTolerance = 5;

  private callbacks = new Map<MouseEventType, MouseEventCallback[]>();

  constructor(public canvasElement: HTMLCanvasElement) {
    this.addEventListeners();
  }

  on(eventType: MouseEventType, callback: MouseEventCallback) {
    const existing = this.callbacks.get(eventType) ?? [];
    existing.push(callback);
    this.callbacks.set(eventType, existing);
  }

  off(eventType: MouseEventType, callback: MouseEventCallback) {
    let existing = this.callbacks.get(eventType) ?? [];
    if (existing.length) {
      existing = existing.filter((cb) => cb !== callback);
      this.callbacks.set(eventType, existing);
    }
  }

  private addEventListeners() {
    this.canvasElement.addEventListener("pointerdown", this.handleMouseDown);
    this.canvasElement.addEventListener("pointermove", this.handleMouseMove);
    this.canvasElement.addEventListener("pointerup", this.handleMouseUp);
  }

  private readonly handleMouseDown = (event: PointerEvent) => {
    this.pointerDownEvent = event;
  };

  private readonly handleMouseMove = (event: PointerEvent) => {
    // Save the position of the cursor
    this.movePosition = this.getMouseEventPosition(event);

    // If there is a pointer down event, this is a drag
    if (this.pointerDownEvent) {
      const button = this.getMouseButtonFrom(event);
      if (button === MouseButton.LEFT) {
        this.triggerCallbacks("leftclickdrag");
      }
    } else {
      this.triggerCallbacks("move");
    }
  };

  private readonly handleMouseUp = (event: PointerEvent) => {
    this.clickPosition = this.getMouseEventPosition(event);

    if (!this.pointerDownEvent) {
      return;
    }

    if (
      this.movedLessThan(
        this.pointerDownEvent,
        event,
        this.clickMovementTolerance
      )
    ) {
      // Clicked
      const button = this.getMouseButtonFrom(event);
      switch (button) {
        case MouseButton.LEFT:
          this.triggerCallbacks("leftclick");
          break;
        case MouseButton.RIGHT:
          this.triggerCallbacks("rightclick");
          break;
      }
    } else {
      // Drag end
    }

    this.pointerDownEvent = undefined;
  };

  private getMouseEventPosition(event: PointerEvent): MouseEventPosition {
    const rect = this.canvasElement.getBoundingClientRect();

    const normalised: Point = {
      x: ((event.clientX - rect.left) / this.canvasElement.clientWidth) * 2 - 1,
      y:
        -((event.clientY - rect.top) / this.canvasElement.clientHeight) * 2 + 1,
    };

    const delta: Point = {
      x: event.clientX - this.previousPosition.x,
      y: event.clientY - this.previousPosition.y,
    };

    this.previousPosition = {
      x: event.clientX,
      y: event.clientY,
    };

    const canvas: Point = {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    };

    return {
      normalised,
      canvas,
      screen: this.previousPosition,
      delta,
    };
  }

  private getMouseButtonFrom(event: MouseEvent): MouseButton | undefined {
    if (event.buttons === 1 || event.button === 0) {
      return MouseButton.LEFT;
    } else if (event.buttons === 4 || event.button === 1) {
      return MouseButton.MIDDLE;
    } else if (event.buttons === 2 || event.button === 2) {
      return MouseButton.RIGHT;
    }

    return undefined;
  }

  private movedLessThan(a: MouseEvent, b: MouseEvent, radius: number): boolean {
    return (
      (a.clientX - b.clientX) * (a.clientX - b.clientX) +
        (a.clientY - b.clientY) * (a.clientY - b.clientY) <
      radius * radius
    );
  }

  private triggerCallbacks(eventType: MouseEventType) {
    const callbacks = this.callbacks.get(eventType) ?? [];
    callbacks.forEach((cb) => cb());
  }
}
