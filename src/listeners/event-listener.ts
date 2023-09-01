import { Road } from "../game/model/road";

export interface EventMap {
  "road-created": Road;
  "road-removed": Road;
  "out-of-view": null;
  "player-hit-car": null;
  "player-out-of-view": null;
}

type EventCallback = (event: any) => void;

export class EventListener {
  private readonly events = new Map<keyof EventMap, EventCallback[]>();

  on<E extends keyof EventMap>(
    type: E,
    listener: (event: EventMap[E]) => void
  ) {
    const callbacks = this.events.get(type) ?? [];
    callbacks.push(listener);
    this.events.set(type, callbacks);
  }

  off<E extends keyof EventMap>(
    type: E,
    listener: (event: EventMap[E]) => void
  ) {
    const callbacks =
      this.events.get(type)?.filter((cb) => cb !== listener) ?? [];
    this.events.set(type, callbacks);
  }

  fire<E extends keyof EventMap>(type: E, event: EventMap[E]) {
    const callbacks = this.events.get(type) ?? [];
    callbacks.forEach((cb) => cb(event));
  }

  clear() {
    this.events.clear();
  }
}
