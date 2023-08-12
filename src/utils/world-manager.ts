import * as THREE from "three";
import { makeAutoObservable, observable } from "mobx";

import { ModelLoader, ModelNames } from "../loaders/model-loader";
import { randomRange } from "./utils";

interface Car {
  object: THREE.Object3D;
  speed: number;
  direction: number; // 1 for right, -1 for left
  toDestroy: boolean;
}

interface Road {
  index: number; // out of all total roads
  objects: THREE.Group; // the road and pavement objects
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
  @observable roadsCrossed = 0;

  // Road details
  private itemWidth = 5; // Width of an item like a road piece
  private itemCount = 14; // Number of road pieces in a row
  private xMaxArea = 40; // Max metres the player can move left to right
  private roadDepth = 20;
  private roadBuffer = 2;
  private roads: Road[] = [];

  constructor(private modelLoader: ModelLoader, private scene: THREE.Scene) {
    makeAutoObservable(this);

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
      index: 0,
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
      this.spawnCar(road);
    }

    // Update cars
    road.cars.forEach((car) => {
      // Update car position
      car.object.position.x += car.speed * dt * car.direction;

      // Check against bounds
      if (car.object.position.x > this.width || car.object.position.x < 0) {
        this.scene.remove(car.object);
        car.toDestroy = true;
      }
    });

    // Remove any cars marked for destruction
    road.cars = road.cars.filter((car) => !car.toDestroy);
  }

  private spawnCar(road: Road) {
    // Random direction
    const direction = Math.random() < 0.5 ? -1 : 1;
    const car = this.modelLoader.get("car");
    car.lookAt(direction, 0, 0);

    // Position according to direction
    if (direction < 0) {
      car.position.set(this.width, 0, road.zRightLane);
    } else {
      car.position.set(0, 0, road.zLeftLane);
    }

    // Random speed
    const speed = randomRange(3, 10);

    // Add car data
    this.scene.add(car);
    road.cars.push({
      object: car,
      speed,
      direction,
      toDestroy: false,
    });
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
    if (roadIdx >= 3) {
      this.removeOldestRoad();
    }

    // Update roads crossed value
    this.roadsCrossed = this.roads[roadIdx].index;
  }

  private spawnNextRoad() {
    // Create the static lane objects
    const laneObjects = this.buildRoadObjects();

    // Position them immediately after the last existing lane
    laneObjects.position.z = this.roads[this.roads.length - 1].zMax;

    // Add lane data
    const zMin = laneObjects.position.z;
    this.roads.push({
      index: this.roads.length,
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
    oldestRoad.cars.forEach((car) => this.scene.remove(car.object));

    // Remove the lane
    this.roads.splice(0, 1);
  }

  private buildRoadObjects(): THREE.Group {
    // A lane consists of road and pavement either side
    const roadGroup = new THREE.Group();

    // Road pieces
    const road = this.modelLoader.get(ModelNames.ROAD);
    const roadAlt = this.modelLoader.get(ModelNames.ROAD_ALT);
    const roadCrossing = this.modelLoader.get(ModelNames.ROAD_CROSSING);

    for (let x = 0; x < this.itemCount; x++) {
      // Randomise the road chosen
      let roadPiece = road.clone();
      const randomNumber = Math.random();

      // Crossings make up 10% of roads
      if (randomNumber < 0.1) {
        roadPiece = roadCrossing.clone();
      } else if (randomNumber < 0.5) {
        // Alt road makes up 40% of roads
        roadPiece = roadAlt.clone();
      }

      // Position and add the road
      roadPiece.position.set(x * this.itemWidth, 0, -5);
      roadGroup.add(roadPiece);
    }

    // Pavements
    const pavement = this.modelLoader.get(ModelNames.PAVEMENT);
    const pavementAlt = this.modelLoader.get(ModelNames.PAVEMENT_ALT);

    const uniquePavements = [
      this.modelLoader.get(ModelNames.PAVEMENT_DIP),
      this.modelLoader.get(ModelNames.PAVEMENT_DRAIN),
      this.modelLoader.get(ModelNames.PAVEMENT_GRATE),
      this.modelLoader.get(ModelNames.PAVEMENT_PANEL),
    ];

    // Pavement on far side
    for (let x = 0; x < this.itemCount; x++) {
      // Randomise chosen pavement
      let pavementPiece = pavement.clone();
      const randomNumber = Math.random();

      // Small chance of a unique pavement piece
      if (randomNumber < 0.2) {
        // Pick a random unique piece
        const randomIdx = Math.floor(Math.random() * uniquePavements.length);
        pavementPiece = uniquePavements[randomIdx].clone();
      } else if (randomNumber < 0.6) {
        // Remaining 50% chance of being either normal or alt piece
        pavementPiece = pavementAlt.clone();
      }

      pavementPiece.position.set(x * this.itemWidth, 0, -15);
      roadGroup.add(pavementPiece);
    }

    // Pavement on near side
    for (let x = 0; x < this.itemCount; x++) {
      // Randomise chosen pavement
      let pavementPiece = pavement.clone();
      const randomNumber = Math.random();

      // Small chance of a unique pavement piece
      if (randomNumber < 0.2) {
        // Pick a random unique piece
        const randomIdx = Math.floor(Math.random() * uniquePavements.length);
        pavementPiece = uniquePavements[randomIdx].clone();
      } else if (randomNumber < 0.6) {
        // Remaining 50% chance of being either normal or alt piece
        pavementPiece = pavementAlt.clone();
      }

      pavementPiece.rotateY(Math.PI);
      pavementPiece.position.set((x + 1) * this.itemWidth, 0, -5);
      roadGroup.add(pavementPiece);
    }

    return roadGroup;
  }
}
