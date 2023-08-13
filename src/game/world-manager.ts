import * as THREE from "three";
import { makeAutoObservable, observable } from "mobx";

import {
  COL_COUNT,
  ITEM_WIDTH,
  Road,
  RoadBuilder,
} from "../utils/road-builder";
import { ModelLoader } from "../loaders/model-loader";
import { randomRange } from "../utils/utils";

interface RoadSpawner {
  leftLaneSpawnTimer: number; // tracks time since last spawn
  leftLaneSpawnAt: number; // once timer reaches this value, spawn a new car
  leftLaneSpeed: number;
  rightLaneSpawnTimer: number;
  rightLaneSpawnAt: number;
  rightLaneSpeed: number;
  cars: Car[];
}

interface Car {
  object: THREE.Object3D;
  speed: number;
  direction: number; // 1 for right, -1 for left
}

export class WorldManager {
  // World values
  xMaxWorld = 0;
  xMinPlayer = 0;
  xMaxPlayer = 0;
  xMidWorld = 0;
  zMinWorld = 0;
  @observable roadsCrossed = 0;

  // Road details
  private roadBuilder: RoadBuilder;
  private xMaxArea = 50; // Max metres the player can move left to right
  private readonly roadBuffer = 2; // How many roads must be ahead/behind player
  private roads: Road[] = [];
  private roadSpawners = new Map<string, RoadSpawner>();
  private readonly carStartSpeed = 3;

  constructor(private modelLoader: ModelLoader, private scene: THREE.Scene) {
    makeAutoObservable(this);

    this.roadBuilder = new RoadBuilder(modelLoader);

    // Set world vars
    this.xMaxWorld = ITEM_WIDTH * COL_COUNT;
    this.xMidWorld = this.xMaxWorld / 2;
    this.xMinPlayer = this.xMidWorld - this.xMaxArea / 2;
    this.xMaxPlayer = this.xMidWorld + this.xMaxArea / 2;
  }

  setup() {
    // Get starting road
    const startRoad = this.roadBuilder.buildStartingRoad();
    this.roads.push(startRoad);
    this.scene.add(startRoad.objects);
    this.setupRoadSpawner(startRoad);

    // Then as many lanes as the lane buffer dictates
    for (let x = 0; x < this.roadBuffer; x++) {
      this.spawnNextRoad();
    }
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

  update(player: THREE.Object3D, dt: number) {
    // Add/remove roads
    this.roadCheck(player.position.z);

    // Check if more cars need spawning
    this.carSpawnCheck(dt);

    // Update cars moving along roads
    this.updateCars(dt);
  }

  private carSpawnCheck(dt: number) {
    this.roads.forEach((road) => {
      // Get the car spawner for this road
      const spawner = this.roadSpawners.get(road.id);
      if (!spawner) {
        return;
      }

      // Increment car spawn timers
      spawner.leftLaneSpawnTimer += dt;
      spawner.rightLaneSpawnTimer += dt;

      // Check if a car should be spawned in either lane
      if (spawner.leftLaneSpawnTimer >= spawner.leftLaneSpawnAt) {
        this.spawnCar(spawner, road, 1, spawner.leftLaneSpeed);
        // Reset timer and target spawn timer
        spawner.leftLaneSpawnTimer = 0;
        this.randomSpawnerValues(spawner);
      }

      if (spawner.rightLaneSpawnTimer >= spawner.rightLaneSpawnAt) {
        this.spawnCar(spawner, road, -1, spawner.rightLaneSpeed);
        spawner.rightLaneSpawnTimer = 0;
        this.randomSpawnerValues(spawner);
      }
    });
  }

  private spawnCar(
    spawner: RoadSpawner,
    road: Road,
    direction: number,
    speed: number
  ) {
    // Get a random car
    const carName =
      this.modelLoader.cars[
        Math.floor(Math.random() * this.modelLoader.cars.length)
      ];
    const carObject = this.modelLoader.get(carName);

    // Position according to direction
    carObject.lookAt(direction, 0, 0);
    if (direction < 0) {
      carObject.position.set(this.xMaxWorld, 0, road.zRightLane);
    } else {
      carObject.position.set(0, 0, road.zLeftLane);
    }

    // Create car data
    const car: Car = {
      object: carObject,
      speed,
      direction,
    };

    // Add car to the scene
    this.scene.add(carObject);

    // Add car to the spawner
    spawner.cars.push(car);
  }

  // Drives existing cars
  private updateCars(dt: number) {
    // Update per each road
    this.roads.forEach((road) => {
      // Get the cars on this road
      const spawner = this.roadSpawners.get(road.id);
      if (!spawner) {
        return;
      }

      const toDestroy: Car[] = [];
      spawner.cars.forEach((car) => {
        // Drive them along the road
        car.object.position.x += car.speed * dt * car.direction;

        // Check against bounds
        if (
          car.object.position.x > this.xMaxWorld ||
          car.object.position.x < 0
        ) {
          toDestroy.push(car);
          this.scene.remove(car.object);
        }
      });

      // Remove any cars marked for destruction on this road
      spawner.cars = spawner.cars.filter((car) => !toDestroy.includes(car));
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

    // Setup the road spawner for this road
    this.setupRoadSpawner(nextRoad);
  }

  private setupRoadSpawner(road: Road) {
    // Initial spawn at values should be low
    const leftLaneSpawnAt = randomRange(0, 1);
    const rightLaneSpawnAt = randomRange(0, 1);

    // Speed - higher values at higher difficulty
    const minSpeed = this.carStartSpeed + this.roadsCrossed / 2;
    const maxSpeed = minSpeed + this.roadsCrossed;

    const spawner: RoadSpawner = {
      leftLaneSpawnTimer: 0,
      leftLaneSpawnAt,
      leftLaneSpeed: randomRange(minSpeed, maxSpeed),
      rightLaneSpawnTimer: 0,
      rightLaneSpawnAt,
      rightLaneSpeed: randomRange(minSpeed, maxSpeed),
      cars: [],
    };

    this.roadSpawners.set(road.id, spawner);
  }

  private randomSpawnerValues(spawner: RoadSpawner) {
    // Spawn at - absolute minimum is time taken to allow for previous car + gap
    const buffer = 12; // 12 metres for longest car and a slight gap

    const leftMinSpawnAt = buffer / spawner.leftLaneSpeed;
    const rightMinSpawnAt = buffer / spawner.rightLaneSpeed;

    // Spawn at - maximum should get closer to min at higher difficulty
    const gap = randomRange(2, Math.max(2.2, 10 - this.roadsCrossed)); // Math.max(2, 10 - this.roadsCrossed);

    const leftMaxSpawnAt = leftMinSpawnAt + gap;
    const rightMaxSpawnAt = rightMinSpawnAt + gap;

    spawner.leftLaneSpawnAt = randomRange(leftMinSpawnAt, leftMaxSpawnAt);
    spawner.rightLaneSpawnAt = randomRange(rightMinSpawnAt, rightMaxSpawnAt);
  }

  private removeOldestRoad() {
    const oldestRoad = this.roads[0];

    // Update the new world zMin now that a road is being removed
    this.zMinWorld = oldestRoad.zMax;

    // Remove objects from the scene
    this.scene.remove(oldestRoad.objects);
    const spawner = this.roadSpawners.get(oldestRoad.id);
    if (spawner) {
      spawner.cars.forEach((car) => this.scene.remove(car.object));
    }

    // Remove the car and road data
    this.roads.splice(0, 1);
    this.roadSpawners.delete(oldestRoad.id);
  }

  private getCarsForRoad(road: Road) {
    return this.roadSpawners.get(road.id)?.cars ?? [];
  }
}
