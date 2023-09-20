import * as THREE from "three";
import { EventListener } from "../listeners/event-listener";
import { GameStore } from "./game-store";
import { Road } from "./model/road";
import { randomRange } from "../utils/utils";

interface Beam {
  light: THREE.SpotLight;
  roadId: string;
}

export class LightBeamManager {
  private spawnTimer = 0;
  private spawnAt = 1;
  private beamLifetime = 5;
  private readonly beamLifetimeDefault = 5;
  private activeBeam?: Beam;
  private lightPositions = new Map<string, THREE.Vector3[]>();

  constructor(private gameStore: GameStore, private events: EventListener) {
    events.on("street-light-positions", this.onCreateStreetLights);
    events.on("road-removed", this.onRoadRemoved);
  }

  update(dt: number) {
    if (this.activeBeam) {
      this.trackBeam(dt);
    } else {
      this.trackSpawn(dt);
    }
  }

  private trackBeam(dt: number) {
    this.beamLifetime -= dt;

    if (this.beamLifetime <= 0) {
      this.removeBeam();
      this.resetTimers();
    }
  }

  private removeBeam() {
    if (!this.activeBeam) {
      return;
    }

    const { scene } = this.gameStore;

    scene.remove(this.activeBeam.light, this.activeBeam.light.target);
    this.activeBeam = undefined;
  }

  private trackSpawn(dt: number) {
    this.spawnTimer += dt;

    if (this.spawnTimer >= this.spawnAt) {
      this.spawnBeam();
    }
  }

  private spawnBeam() {
    this.createBeam();
    this.beamLifetime = this.beamLifetimeDefault;
  }

  private createBeam() {
    const { roads, scene } = this.gameStore;

    // Pick a random street light on this or future road
    const currentRoadIdx = this.gameStore.getCurrentRoadIndexFor(
      this.gameStore.player.object.position.z
    );
    const nextRoadIdx = currentRoadIdx + 1;

    // Get the light positions for the random road choice
    const roadIdx = currentRoadIdx; //Math.random() < 0.5 ? currentRoadIdx : nextRoadIdx;
    const positions = this.lightPositions.get(roads[roadIdx].id);
    if (!positions) {
      return undefined;
    }

    // Pick a random light position
    const rnd = Math.floor(Math.random() * positions.length);
    const position = positions[rnd];

    // Create a light here
    const light = new THREE.SpotLight(0xff0000, 5);
    light.distance = 12;
    light.angle = Math.PI / 5;
    light.penumbra = 0.1;
    light.decay = 0;

    light.position.copy(position);
    light.position.y = 7.5;
    light.target.position.copy(position);
    light.target.position.y = 0;

    scene.add(light, light.target);

    // Keep track for later removal
    this.activeBeam = {
      light,
      roadId: roads[roadIdx].id,
    };

    console.log("created light at", light);
  }

  private resetTimers() {
    this.spawnAt = randomRange(1, 2);
    this.spawnTimer = 0;
  }

  private onCreateStreetLights = (data: {
    roadId: string;
    positions: THREE.Vector3[];
  }) => {
    this.lightPositions.set(data.roadId, data.positions);
  };

  private onRoadRemoved = (road: Road) => {
    this.lightPositions.delete(road.id);

    // If there was an active beam on this road
    if (this.activeBeam?.roadId === road.id) {
      // Stop it
    }
  };
}
