import * as THREE from "three";
import { action, makeAutoObservable, observable } from "mobx";

import {
  COL_COUNT,
  ITEM_WIDTH,
  ROAD_DEPTH,
  RoadBuilder,
} from "../utils/road-builder";
import { ModelLoader } from "../loaders/model-loader";
import { randomId, randomRange } from "../utils/utils";

interface Car {
  object: THREE.Object3D;
  speed: number;
  direction: number; // 1 for right, -1 for left
  toDestroy: boolean;
}

interface Road {
  id: string;
  index: number; // out of all total roads
  objects: THREE.Group; // the road and pavement objects
  zMin: number; // Closest z value
  zMax: number; // Farthest z value (will be a smaller number since travelling negatively)
  zLeftLane: number; // Where to spawn cars moving from left-right
  zRightLane: number; // Where to spawn cars moving from right-left
}

export class WorldManager {
  // World values
  xMaxWorld = 0;
  xMin = 0;
  xMax = 0;
  xMid = 0;
  zMin = 0;
  @observable roadsCrossed = 0;

  // Road details
  private roadBuilder: RoadBuilder;
  private xMaxArea = 40; // Max metres the player can move left to right
  private readonly roadBuffer = 2;
  private roads: Road[] = [];

  // Cars
  private cars = new Map<string, Car[]>(); // road id to cars on that road

  constructor(private modelLoader: ModelLoader, private scene: THREE.Scene) {
    makeAutoObservable(this);

    this.roadBuilder = new RoadBuilder(modelLoader);

    // Set world vars
    this.xMaxWorld = ITEM_WIDTH * COL_COUNT;
    this.xMid = this.xMaxWorld / 2;
    this.xMin = this.xMid - this.xMaxArea / 2;
    this.xMax = this.xMid + this.xMaxArea / 2;
  }

  setup() {
    // Get starting road
    const startRoad = this.roadBuilder.buildStartingRoad();
    this.roads.push(startRoad);
    this.scene.add(startRoad.objects);

    // Then as many lanes as the lane buffer dictates
    for (let x = 0; x < this.roadBuffer; x++) {
      this.spawnNextRoad();
    }
  }

  update(player: THREE.Object3D, dt: number) {
    // Add/remove roads
    this.roadCheck(player.position.z);

    // Check if more cars need spawning
    this.carCheck();

    // Update cars moving along roads
    this.updateCars(dt);
  }

  playerHitCar(player: THREE.Object3D) {
    const playerZ = player.position.z;
    // TODO - write getter for current road
    const currentRoad = this.roads.find(
      (road) => playerZ > road.zMax && playerZ < road.zMin
    );
    if (!currentRoad) {
      return;
    }

    // Test intersections with cars on the road
    const roadCars = this.getCarsForRoad(currentRoad);
    for (const car of roadCars) {
      const carBox = new THREE.Box3().setFromObject(car.object);
      const playerBox = new THREE.Box3().setFromObject(player);

      if (carBox.intersectsBox(playerBox)) {
        return true;
      }
    }

    return false;
  }

  // Determines if more cars need spawning
  private carCheck() {
    // Check against each road
    this.roads.forEach((road) => {
      // Get the cars for this road
      const cars = this.getCarsForRoad(road);

      // Do any cars need spawning?
      if (cars.length < 1) {
        this.spawnCar(road);
      }
    });
  }

  // Drives existing cars
  private updateCars(dt: number) {
    // Update per each road
    this.roads.forEach((road) => {
      // Get the cars on this road
      let cars = this.getCarsForRoad(road);
      cars.forEach((car) => {
        // Drive them along the road
        car.object.position.x += car.speed * dt * car.direction;

        // Check against bounds
        if (
          car.object.position.x > this.xMaxWorld ||
          car.object.position.x < 0
        ) {
          this.scene.remove(car.object);
          car.toDestroy = true;
        }
      });

      // Remove any cars marked for destruction on this road
      cars = cars.filter((car) => !car.toDestroy);
      this.cars.set(road.id, cars);
    });
  }

  private spawnCar(road: Road) {
    // Get a random car
    const carName =
      this.modelLoader.cars[
        Math.floor(Math.random() * this.modelLoader.cars.length)
      ];
    const carObject = this.modelLoader.get(carName);

    // Random direction
    const direction = Math.random() < 0.5 ? -1 : 1;
    carObject.lookAt(direction, 0, 0);

    // Position according to direction
    if (direction < 0) {
      carObject.position.set(this.xMaxWorld, 0, road.zRightLane);
    } else {
      carObject.position.set(0, 0, road.zLeftLane);
    }

    // Random speed
    const speed = randomRange(3, 10);

    // Create car data
    const car: Car = {
      object: carObject,
      speed,
      direction,
      toDestroy: false,
    };

    // Add car data and to scene
    this.scene.add(carObject);
    this.addCarToRoad(car, road);
  }

  @action roadCheck(playerZ: number) {
    // Which road is player on right now
    const roadIdx = this.roads.findIndex(
      (road) => playerZ > road.zMax && playerZ < road.zMin
    );

    // If remaining roads ahead count is less than road buffer, spawn a lane
    const roadsAhead = this.roads.length - (roadIdx + 1);
    if (roadsAhead < this.roadBuffer) {
      // Spawn the next lane
      this.spawnNextRoad();
    }

    // Only keep one previous road
    if (roadIdx >= 3) {
      this.removeOldestRoad();
    }

    // Update roads crossed value
    this.roadsCrossed = Math.max(this.roadsCrossed, this.roads[roadIdx].index);
  }

  private spawnNextRoad() {
    // Next road is positioned immediately after the last existing road
    const previousRoad = this.roads[this.roads.length - 1];
    const zPos = previousRoad.zMax;
    const index = previousRoad.index + 1;

    // Get the next road
    const nextRoad = this.roadBuilder.buildRoad(zPos, index);
    this.roads.push(nextRoad);

    // Add road to the scene
    this.scene.add(nextRoad.objects);
  }

  private removeOldestRoad() {
    const oldestRoad = this.roads[0];

    // Update the new world zMin now that a lane is being removed
    this.zMin = oldestRoad.zMax;

    // Remove objects from the scene
    this.scene.remove(oldestRoad.objects);

    const cars = this.getCarsForRoad(oldestRoad);
    cars.forEach((car) => this.scene.remove(car.object));

    // Remove the lane
    this.roads.splice(0, 1);
  }

  private getCarsForRoad(road: Road) {
    return this.cars.get(road.id) ?? [];
  }

  private addCarToRoad(car: Car, road: Road) {
    const existing = this.getCarsForRoad(road);
    existing.push(car);
    this.cars.set(road.id, existing);
  }

  //private getCurrentRoad(playerZ: number) {}
}
