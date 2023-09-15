import * as THREE from "three";

import { EventListener } from "../listeners/event-listener";
import { GameStore } from "./game-store";
import { Road } from "./model/road";
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

export class CarManager {
  private roadSpawners = new Map<string, RoadSpawner>(); // key is road id
  private readonly carStartSpeed = 3;

  constructor(private gameStore: GameStore, private events: EventListener) {
    // Subscribe to road events
    events.on("road-created", this.onRoadCreated);
    events.on("road-removed", this.onRoadRemoved);
  }

  reset() {
    // Clean up cars for new game
    this.roadSpawners.forEach((spawner: RoadSpawner) =>
      spawner.cars.forEach((car) => this.gameStore.scene.remove(car.object))
    );

    this.roadSpawners.clear();
  }

  update(dt: number, gameOver: boolean) {
    const { roads } = this.gameStore;

    // Update cars by road even if game is over
    roads.forEach((road) => {
      // Get the spawner for this road
      const spawner = this.roadSpawners.get(road.id);
      if (!spawner) {
        return;
      }

      // Check if any cars need spawning on this road
      this.carSpawnCheck(dt, road, spawner);

      // Drive cars along roads
      this.driveCars(dt, spawner);
    });

    // Check for player-car collisions so long as game still going
    if (!gameOver) {
      this.checkPlayerCollision();
    }
  }

  private carSpawnCheck(dt: number, road: Road, spawner: RoadSpawner) {
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
  }

  private spawnCar(
    spawner: RoadSpawner,
    road: Road,
    direction: number,
    speed: number
  ) {
    const { modelLoader } = this.gameStore.loader;
    const { world, scene } = this.gameStore;

    // Get a random car
    const carName =
      modelLoader.cars[Math.floor(Math.random() * modelLoader.cars.length)];
    const carObject = modelLoader.get(carName);

    // Position according to direction
    carObject.lookAt(direction, 0, 0);
    if (direction < 0) {
      carObject.position.set(world.xMax, 0, road.zRightLane);
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
    scene.add(carObject);

    // Add car to the spawner
    spawner.cars.push(car);
  }

  private driveCars(dt: number, spawner: RoadSpawner) {
    const { world, scene } = this.gameStore;

    const toDestroy: Car[] = [];
    spawner.cars.forEach((car) => {
      // Drive them along the road
      car.object.position.x += car.speed * dt * car.direction;

      // Check against bounds
      if (car.object.position.x > world.xMax || car.object.position.x < 0) {
        toDestroy.push(car);
        scene.remove(car.object);
      }
    });

    // Remove any cars marked for destruction on this road
    spawner.cars = spawner.cars.filter((car) => !toDestroy.includes(car));
  }

  private checkPlayerCollision() {
    const { player } = this.gameStore;
    const currentRoad = this.gameStore.getCurrentRoad();
    if (!currentRoad) {
      return;
    }

    const cars = this.roadSpawners.get(currentRoad.id)?.cars ?? [];
    for (const car of cars) {
      const carBox = new THREE.Box3().setFromObject(car.object);
      const playerBox = new THREE.Box3().setFromObject(player.object);

      if (carBox.intersectsBox(playerBox)) {
        // Player has hit the car, notify
        this.events.fire("player-hit-car", null);

        return;
      }
    }
  }

  private onRoadCreated = (road: Road) => {
    // Create the spawner object for this road
    this.setupRoadSpawner(road);
  };

  private setupRoadSpawner(road: Road) {
    const { roadsCrossed } = this.gameStore;

    // Initial spawn at values should be low
    const leftLaneSpawnAt = randomRange(0, 1);
    const rightLaneSpawnAt = randomRange(0, 1);

    // Speed - higher values at higher difficulty
    const minSpeed = this.carStartSpeed + roadsCrossed / 2;
    const maxSpeed = minSpeed + roadsCrossed;

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
    const { roadsCrossed } = this.gameStore;

    // Spawn at - absolute minimum is time taken to allow for previous car + gap
    const buffer = 12; // 12 metres for longest car and a slight gap

    const leftMinSpawnAt = buffer / spawner.leftLaneSpeed;
    const rightMinSpawnAt = buffer / spawner.rightLaneSpeed;

    // Spawn at - maximum should get closer to min at higher difficulty
    const gap = randomRange(2, Math.max(2.2, 10 - roadsCrossed)); // Math.max(2, 10 - this.roadsCrossed);

    const leftMaxSpawnAt = leftMinSpawnAt + gap;
    const rightMaxSpawnAt = rightMinSpawnAt + gap;

    spawner.leftLaneSpawnAt = randomRange(leftMinSpawnAt, leftMaxSpawnAt);
    spawner.rightLaneSpawnAt = randomRange(rightMinSpawnAt, rightMaxSpawnAt);
  }

  private onRoadRemoved = (road: Road) => {
    const { scene } = this.gameStore;

    // Remove any cars on this road from the scene
    const spawner = this.roadSpawners.get(road.id);
    if (spawner) {
      spawner.cars.forEach((car) => scene.remove(car.object));
    }

    // Remove the spawner object
    this.roadSpawners.delete(road.id);
  };
}
