import * as THREE from "three";

import { EventListener } from "../listeners/event-listener";
import { GameStore } from "./game-store";
import { RoadBuilder } from "./road-builder";
import { disposeObject } from "../utils/utils";

export class RoadManager {
  private readonly roadAheadBuffer = 2;
  private readonly roadBehindBuffer = 1;

  constructor(
    private gameStore: GameStore,
    private roadBuilder: RoadBuilder,
    private events: EventListener
  ) {}

  buildStartingRoads() {
    const { roads, scene } = this.gameStore;

    // Create the unique starting road
    const startingRoad = this.roadBuilder.buildStartingRoad();
    roads.push(startingRoad);
    scene.add(startingRoad.objects);
    this.events.fire("road-created", startingRoad);

    // Testing crossing bounds are correct
    startingRoad.crossings.forEach((box2) => {
      const box3 = new THREE.Box3(
        new THREE.Vector3(box2.min.x, 0, box2.min.y),
        new THREE.Vector3(box2.max.x, 2, box2.max.y)
      );

      const helper = new THREE.Box3Helper(box3, new THREE.Color(0xff0000));
      scene.add(helper);
    });

    // Then as many lanes as lane buffer dictates
    for (let x = 0; x < this.roadAheadBuffer; x++) {
      this.spawnNextRoad();
    }
  }

  reset() {
    // Clear all the roads in the game
    this.gameStore.roads.forEach((road) => {
      disposeObject(road.objects);
      this.gameStore.scene.remove(road.objects);
    });
    this.gameStore.roads = [];
    this.gameStore.roadsCrossed = 0;
  }

  update() {
    this.updateRoadsCrossed();
    this.updateRoadSpawns();
  }

  private getCurrentRoadIndexFor(objectPosition: number) {
    const { roads } = this.gameStore;
    const posZ = objectPosition;

    return roads.findIndex((road) => posZ > road.zMax && posZ <= road.zMin);
  }

  private updateRoadsCrossed() {
    const { player, roads } = this.gameStore;

    const currentRoadIndex = this.getCurrentRoadIndexFor(
      player.object.position.z
    );
    if (currentRoadIndex < 0) {
      return;
    }

    // Update roads crossed value
    const { roadsCrossed } = this.gameStore;
    const newCrossed = Math.max(roadsCrossed, roads[currentRoadIndex].index);
    if (roadsCrossed !== newCrossed) {
      this.gameStore.roadsCrossed = newCrossed;
      this.events.fire("road-crossed", newCrossed);
    }
  }

  private updateRoadSpawns() {
    const { roads, camera } = this.gameStore;

    const currentRoadIndex = this.getCurrentRoadIndexFor(camera.position.z);
    if (currentRoadIndex < 0) {
      return;
    }

    // If remaining roads ahead count is less than road buffer, spawn a lane
    const roadsAhead = roads.length - (currentRoadIndex + 1);
    if (roadsAhead < this.roadAheadBuffer) {
      // Spawn the next lane
      this.spawnNextRoad();
    }

    // Only keep one previous road
    const roadsBehind = currentRoadIndex;
    if (roadsBehind > this.roadBehindBuffer) {
      this.removeOldestRoad();
    }
  }

  private spawnNextRoad() {
    const { roads, scene } = this.gameStore;

    // Next road is positioned immediately after the last existing road
    const previousRoad = roads[roads.length - 1];
    const zPos = previousRoad.zMax;
    const index = previousRoad.index + 1;

    // Get the next road
    const nextRoad = this.roadBuilder.buildRoad(zPos, index);
    roads.push(nextRoad);

    // Add road to the scene
    scene.add(nextRoad.objects);

    // Notify
    this.events.fire("road-created", nextRoad);
  }

  private removeOldestRoad() {
    const { roads, scene, world } = this.gameStore;

    // Get the oldest road (FIFO)
    const oldestRoad = roads[0];

    // Update the new world zMin now that a road is being removed
    world.zMin = oldestRoad.zMax;

    // Remove objects from the scene
    disposeObject(oldestRoad.objects);
    scene.remove(oldestRoad.objects);

    // Remove the road data
    roads.splice(0, 1);

    // Notify
    this.events.fire("road-removed", oldestRoad);
  }

  checkPlayerCrossing() {
    // Get the current road
    // Are there any crossings on this road?
    // If so, is the player over one?
  }
}
