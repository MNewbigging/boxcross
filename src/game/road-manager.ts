import { EventListener } from "../listeners/event-listener";
import { GameStore } from "./game-store";
import { RoadBuilder } from "../utils/road-builder";

export class RoadManager {
  private readonly roadBuffer = 2; // How many roads must be ahead/behind player

  constructor(
    private gameStore: GameStore,
    private roadBuilder: RoadBuilder,
    private events: EventListener
  ) {}

  getCurrentRoadIndexFor(objectPosition: number) {
    const { roads } = this.gameStore;
    const posZ = objectPosition;

    return roads.findIndex((road) => posZ > road.zMax && posZ <= road.zMin);
  }

  buildStartingRoads() {
    const { roads, scene } = this.gameStore;

    // Create the unique starting road
    const startingRoad = this.roadBuilder.buildStartingRoad();
    roads.push(startingRoad);
    scene.add(startingRoad.objects);
    this.events.fire("road-created", startingRoad);

    // Then as many lanes as lane buffer dictates
    for (let x = 0; x < this.roadBuffer; x++) {
      this.spawnNextRoad();
    }
  }

  // Check if roads need adding/removing in the scene as player moves
  update() {
    this.updateRoadsCrossed();
    this.updateRoadSpawns();
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
    if (roadsAhead < this.roadBuffer) {
      // Spawn the next lane
      this.spawnNextRoad();
    }

    // Only keep one previous road
    if (currentRoadIndex >= 3) {
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
    scene.remove(oldestRoad.objects);

    // Remove the road data
    roads.splice(0, 1);

    // Notify
    this.events.fire("road-removed", oldestRoad);
  }
}
