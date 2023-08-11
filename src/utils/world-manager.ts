import * as THREE from "three";

import { ModelLoader, ModelNames } from "../loaders/model-loader";

interface Car {
  object: THREE.Object3D;
  speed: number;
  direction: number; // 1 for right, -1 for left
  toDestroy: boolean;
}

interface Road {
  objects: THREE.Group;
  zMin: number; // Closest z value
  zMax: number; // Farthest z value (will be a smaller number since travelling negatively)
  zLeftLane: number; // Where to spawn cars moving from left-right
  zRightLane: number; // Where to spawn cars moving from right-left
  cars: Car[];
}

export class WorldManager {
  // World values
  width = 0;
  xMin = 0;
  xMax = 0;
  xMid = 0;
  zMin = 0;

  // Road details
  private itemWidth = 5; // Width of an item like a road piece
  private itemCount = 14; // Number of road pieces in a row
  private xMaxArea = 30; // Max metres the player can move left to right
  private roadDepth = 20;
  private roadBuffer = 2;
  private roads: Road[] = [];

  constructor(private modelLoader: ModelLoader, private scene: THREE.Scene) {
    // Set world vars
    this.width = this.itemWidth * this.itemCount;
    this.xMid = this.width / 2;
    this.xMin = this.xMid - this.xMaxArea / 2;
    this.xMax = this.xMid + this.xMaxArea / 2;
  }

  setup() {
    // Build starting lane
    const startLaneObjects = this.buildRoadObjects();
    this.scene.add(startLaneObjects);
    this.roads.push({
      objects: startLaneObjects,
      zMin: startLaneObjects.position.z,
      zMax: startLaneObjects.position.z - this.roadDepth,
      cars: [],
      zLeftLane: -12.5,
      zRightLane: -7.5,
    });

    // Then as many lanes as the lane buffer dictates
    for (let x = 0; x < this.roadBuffer; x++) {
      this.spawnNextRoad();
    }
  }

  update(player: THREE.Object3D, dt: number) {
    // Add/remove lanes according to player position
    this.roadCheck(player.position.z);

    // Update cars moving along roads
    this.roads.forEach((road) => this.updateRoad(road, dt));
  }

  playerHitCar(player: THREE.Object3D) {
    const playerZ = player.position.z;
    const currentRoad = this.roads.find(
      (road) => playerZ > road.zMax && playerZ < road.zMin
    );
    if (!currentRoad) {
      return;
    }

    // Test intersections with cars on the road
    for (const car of currentRoad.cars) {
      const carBox = new THREE.Box3().setFromObject(car.object);
      const playerBox = new THREE.Box3().setFromObject(player);

      if (carBox.intersectsBox(playerBox)) {
        return true;
      }
    }

    return false;
  }

  private updateRoad(road: Road, dt: number) {
    // Do any cars need spawning?
    if (road.cars.length < 1) {
      const car = this.modelLoader.get("car");
      if (car) {
        // Place at left lane start point, face right
        car.lookAt(1, 0, 0);
        car.position.set(0, 0, road.zLeftLane);
        this.scene.add(car);
        road.cars.push({
          object: car,
          speed: 5,
          direction: 1,
          toDestroy: false,
        });
      }
    }

    // Update cars
    road.cars.forEach((car) => {
      // Update car position
      car.object.position.x += car.speed * dt;
      // Check against bounds
      if (car.object.position.x > this.width) {
        this.scene.remove(car.object);
        car.toDestroy = true;
      }
    });

    // Remove any cars marked for destruction
    road.cars = road.cars.filter((car) => !car.toDestroy);
  }

  private roadCheck(playerZ: number) {
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
    if (roadIdx >= 2) {
      this.removeOldestRoad();
    }
  }

  private spawnNextRoad() {
    // Create the static lane objects
    const laneObjects = this.buildRoadObjects();

    // Position them immediately after the last existing lane
    laneObjects.position.z = this.roads[this.roads.length - 1].zMax;

    // Add lane data
    const zMin = laneObjects.position.z;
    this.roads.push({
      objects: laneObjects,
      zMin,
      zMax: laneObjects.position.z - this.roadDepth,
      cars: [],
      zLeftLane: zMin - 12.5,
      zRightLane: zMin - 7.5,
    });

    // Add lane to the scene
    this.scene.add(laneObjects);
  }

  private removeOldestRoad() {
    const oldestRoad = this.roads[0];

    // Update the new world zMin now that a lane is being removed
    this.zMin = oldestRoad.zMax;

    // Remove objects from the scene
    this.scene.remove(oldestRoad.objects);

    // Remove the lane
    this.roads.splice(0, 1);
  }

  private buildRoadObjects(): THREE.Group {
    // A lane consists of road and pavement either side
    const lane = new THREE.Group();

    // Simple road
    const road = this.modelLoader.get(ModelNames.ROAD);
    if (road) {
      for (let x = 0; x < this.itemCount; x++) {
        const roadPiece = road.clone();
        roadPiece.position.set(x * this.itemWidth, 0, -5);
        lane.add(roadPiece);
      }
    }

    // Pavements
    const pavement = this.modelLoader.get(ModelNames.PAVEMENT);
    if (pavement) {
      for (let x = 0; x < this.itemCount; x++) {
        const pavementPiece = pavement.clone();
        pavementPiece.position.set(x * this.itemWidth, 0, -15);
        lane.add(pavementPiece);

        const otherSide = pavement.clone();
        otherSide.rotateY(Math.PI);
        otherSide.position.set((x + 1) * this.itemWidth, 0, -5);
        lane.add(otherSide);
      }
    }

    return lane;
  }
}
