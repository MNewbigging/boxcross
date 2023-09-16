import * as THREE from "three";
import { Linear, Power2, gsap } from "gsap";

import { GameStore } from "./game-store";
import { ModelNames } from "../loaders/model-loader";

export class IntroManager {
  private van: THREE.Object3D;
  private rightDoor?: THREE.Object3D;
  private leftDoor?: THREE.Object3D;

  constructor(private gameStore: GameStore) {
    // Get the van objects now so it's defined for later use
    this.van = gameStore.loader.modelLoader.get(ModelNames.CAR_VAN);
    console.log("van", this.van);

    // Van doors
    this.rightDoor = this.van.getObjectByName("SM_Veh_Car_Van_Door_r001");
    this.leftDoor = this.van.getObjectByName("SM_Veh_Car_Van_Door_l001");
  }

  startIntro() {
    const { scene, world } = this.gameStore;

    // Place the van
    this.van.position.set(world.xMax, 0.01, -7.5);
    this.van.rotateY(-Math.PI / 2);
    scene.add(this.van);

    if (!this.rightDoor || !this.leftDoor) {
      console.log("no right or left door");
      return;
    }

    // Start animation
    const master = gsap.timeline();
    master.add(this.getDriveInTimeline());
    master.add(this.getDoorsTimeline(this.leftDoor, this.rightDoor), "1.3");
  }

  private getDriveInTimeline() {
    const { world } = this.gameStore;

    const driveInTimeline = gsap.timeline();

    const startRot = this.van.rotation.y;

    driveInTimeline.to(this.van.position, {
      x: world.xMin,
      duration: 3,
      ease: Linear.easeNone,
    });

    return driveInTimeline;
  }

  private getDoorsTimeline(
    leftDoor: THREE.Object3D,
    rightDoor: THREE.Object3D
  ) {
    // Get the back right door of the van
    const doorsTimeline = gsap.timeline();

    const rightStartRot = rightDoor.rotation.y;
    const leftStartRot = leftDoor.rotation.y;

    doorsTimeline.to(rightDoor.rotation, {
      y: rightDoor.rotation.y + Math.PI / 2 + 0.2,
      duration: 0.4,
    });
    doorsTimeline.to(
      leftDoor.rotation,
      {
        y: leftDoor.rotation.y - Math.PI / 2 + 0.2,
        duration: 0.4,
      },
      "<"
    );
    doorsTimeline.to(rightDoor.rotation, {
      y: rightStartRot,
      duration: 0.4,
    });
    doorsTimeline.to(
      leftDoor.rotation,
      {
        y: leftStartRot,
        duration: 0.4,
      },
      "<"
    );

    return doorsTimeline;
  }
}
