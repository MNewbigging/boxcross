import * as THREE from "three";
import { Bounce, Linear, gsap } from "gsap";
import { EventListener } from "../listeners/event-listener";
import { GameStore } from "./game-store";
import { Road } from "./model/road";
import { randomRange } from "../utils/utils";
import { PlayerEffect } from "./model/player";

export class LightBeamManager {
  private spawnTimer = 0;
  private spawnAt = 1;

  // Whether beam can now pull player (after initial flicker on animation ends)
  private pullActive = false;
  // Whether the beam has pulled the player
  private didPull = false;

  // Current lifetime remaining in the active beam
  private beamLifetime = 1;
  // How long beam takes to animate in - does not pull during this time
  private readonly beamStartupDuration = 1.2;
  // Max length beam stays on without pulling player
  private readonly beamOnDuration = 5;
  // How long beam takes to animate out
  private readonly beamFinishDuration = 1;
  // How long player is trapped in the beam for
  private readonly playerTrapDuration = 3;

  private spotLight = new THREE.SpotLight(0xff0000, 0);
  private activeRoadId?: string;
  private lightPositions = new Map<string, THREE.Vector3[]>();

  constructor(private gameStore: GameStore, private events: EventListener) {
    events.on("street-light-positions", this.onCreateStreetLights);
    events.on("road-removed", this.onRoadRemoved);

    // Setup spotlight properties
    this.spotLight.distance = 12;
    this.spotLight.angle = Math.PI / 5;
    this.spotLight.penumbra = 0.1;
    this.spotLight.decay = 0;

    // Add to scene once
    this.gameStore.scene.add(this.spotLight, this.spotLight.target);
  }

  update(dt: number) {
    // Is there an active beam?
    if (this.activeRoadId) {
      this.trackBeam(dt);
    } else {
      this.trackSpawn(dt);
    }
  }

  private trackBeam(dt: number) {
    // Decrement life time
    this.beamLifetime -= dt;

    // Is the beam done now?
    if (this.beamLifetime <= 0) {
      // Animate beam out
      this.animateBeamOut();
      return;
    }

    // If beam cannot pull player, stop
    const canPull = this.pullActive && !this.didPull;
    if (!canPull) {
      return;
    }

    // Check if player is inside beam area
    if (this.isPlayerInsideBeam()) {
      // Beam lifetime is extended - always pull player for the same duration
      // Subtract finish duration as player is only released at very end
      this.beamLifetime = this.playerTrapDuration - this.beamFinishDuration;

      // Player has now been pulled by the beam
      this.gameStore.player.addActiveEffect(PlayerEffect.IN_BEAM);
      this.didPull = true;

      this.animatePlayerIn();
    }
  }

  private resetBeam() {
    // Reset beam properties
    this.activeRoadId = undefined;
    this.didPull = false;
    this.pullActive = false;

    // Player is no longer beamed
    this.gameStore.player.removeActiveEffect(PlayerEffect.IN_BEAM);

    // Then set spawn timer values
    const min = this.beamFinishDuration + 1;
    const max = min + 2; // replace with prop later
    this.spawnAt = randomRange(min, max);
    this.spawnTimer = 0;
  }

  private isPlayerInsideBeam() {
    const { player } = this.gameStore;

    // Get the beam position
    const position = this.spotLight.position.clone().setY(0);

    // Test if inside circle
    const playerDistance = position.distanceTo(player.object.position);
    const beamRadius = 5.2;
    if (playerDistance < beamRadius) {
      return true;
    }

    return false;
  }

  private trackSpawn(dt: number) {
    this.spawnTimer += dt;

    // If not yet time to spawn next beam, stop
    if (this.spawnTimer < this.spawnAt) {
      return;
    }

    // Get a random road for light to appear on
    const road = this.getRandomRoad();

    // Get a random light position for this road
    const position = this.getRandomLightPosition(road.id);

    // Show the light here
    this.showBeamSpotlight(position);

    // Set lifetime of the beam
    this.beamLifetime = this.beamStartupDuration + this.beamOnDuration;

    // Keep track for later removal
    this.activeRoadId = road.id;
  }

  private getRandomRoad() {
    const { player, roads } = this.gameStore;

    // Choose between this or next road
    const currentRoadIdx = this.gameStore.getCurrentRoadIndexFor(
      player.object.position.z
    );
    const nextRoadIdx = currentRoadIdx + 1;

    // Pick one at random
    const randomRoadIdx = currentRoadIdx; // Math.random() < 0.5 ? currentRoadIdx : nextRoadIdx;

    return roads[randomRoadIdx];
  }

  private getRandomLightPosition(roadId: string) {
    const positions = this.lightPositions.get(roadId);
    if (!positions) {
      return new THREE.Vector3();
    }

    // Pick a random light position
    const rnd = Math.floor(Math.random() * positions.length);
    const position = positions[rnd];

    return position;
  }

  private showBeamSpotlight(position: THREE.Vector3) {
    // Assign to new position
    this.spotLight.position.copy(position);
    this.spotLight.position.y = 7.5;
    this.spotLight.target.position.copy(position);
    this.spotLight.target.position.y = 0;

    // Show the spotlight
    this.animateBeamIn();
  }

  // Event listeners

  private onCreateStreetLights = (data: {
    roadId: string;
    positions: THREE.Vector3[];
  }) => {
    this.lightPositions.set(data.roadId, data.positions);
  };

  private onRoadRemoved = (road: Road) => {
    this.lightPositions.delete(road.id);

    // If there was an active beam on this road
    if (this.activeRoadId === road.id) {
      // Stop it
      this.resetBeam();
    }
  };

  // Animations

  private animateBeamIn() {
    const tl = gsap.timeline();
    tl.to(this.spotLight, {
      intensity: 5,
      angle: Math.PI / 5,
      duration: this.beamStartupDuration,
      ease: Bounce.easeIn,
      onComplete: () => {
        this.pullActive = true;
      },
    });
  }

  private animateBeamOut() {
    const tl = gsap.timeline({
      onComplete: () => {
        this.resetBeam();
      },
    });

    // Animate light
    tl.to(this.spotLight, {
      intensity: 0,
      angle: Math.PI / 8,
      duration: this.beamFinishDuration,
      ease: Linear.easeIn,
    });

    // If player was caught in beam, animate it out too
    const { player } = this.gameStore;
    if (player.hasActiveEffect(PlayerEffect.IN_BEAM)) {
      tl.to(
        player.object.position,
        {
          y: 0.01,
          duration: 0.5,
        },
        "<"
      );
    }
  }

  private animatePlayerIn() {
    const { player } = this.gameStore;

    // Animate into center of beam
    const tl = gsap.timeline();
    tl.to(player.object.position, {
      x: this.spotLight.position.x,
      z: this.spotLight.position.z,
      y: 2,
      duration: 0.5,
    });
  }
}
