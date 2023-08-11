import * as THREE from "three";

export interface EventMap {
  "object-intersected": THREE.Intersection<THREE.Object3D<THREE.Event>>;
}

export type EventCallback = (event: any) => void;

export class EventListener {
  private readonly events = new Map<keyof EventMap, EventCallback[]>();

  on<E extends keyof EventMap>(
    type: E,
    listener: (event: EventMap[E]) => void
  ) {
    const existing = this.events.get(type) ?? [];
    existing.push(listener);
    this.events.set(type, existing);
  }

  off<E extends keyof EventMap>(
    type: E,
    listener: (event: EventMap[E]) => void
  ) {
    let existing = this.events.get(type) ?? [];
    existing = existing.filter((cb) => cb !== listener);
    this.events.set(type, existing);
  }

  fire<E extends keyof EventMap>(type: E, event: EventMap[E]) {
    const callbacks = this.events.get(type) ?? [];
    callbacks.forEach((cb) => cb(event));
  }
}
