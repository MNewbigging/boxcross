import * as THREE from "three";
import { Linear, Power2, Power3, gsap } from "gsap";

import { GameStore } from "./game-store";
import { ModelNames } from "../loaders/model-loader";

export class IntroManager {
  private suv?: THREE.Object3D;
  private taxi?: THREE.Object3D;
  private van?: THREE.Object3D;
  private rightDoor?: THREE.Object3D;
  private leftDoor?: THREE.Object3D;

  constructor(private gameStore: GameStore) {
    // Van doors
    // this.rightDoor = this.van.getObjectByName("SM_Veh_Car_Van_Door_r001");
    // this.leftDoor = this.van.getObjectByName("SM_Veh_Car_Van_Door_l001");
  }

  setupIntro() {
    const { scene, world } = this.gameStore;
    const { modelLoader } = this.gameStore.loader;

    // Add any props needed before starting the intro animations
    const suv = modelLoader.get(ModelNames.CAR_SUV);
    suv.position.set(10, 0, -7.5);
    suv.rotateY(-Math.PI / 2);

    const taxi = modelLoader.get(ModelNames.CAR_TAXI);
    taxi.position.set(21, 0, -7.5);
    taxi.rotateY(-Math.PI / 2);

    const van = modelLoader.get(ModelNames.CAR_VAN);
    van.position.set(world.xMax, 0, -7.5);
    van.rotateY(-Math.PI / 2);

    scene.add(suv, taxi, van);

    // Save refs for later
    this.suv = suv;
    this.taxi = taxi;
    this.van = van;
    this.rightDoor = this.van.getObjectByName("SM_Veh_Car_Van_Door_r001");
    this.leftDoor = this.van.getObjectByName("SM_Veh_Car_Van_Door_l001");
  }

  startIntro() {
    if (!this.van || !this.rightDoor) {
      return;
    }

    const master = gsap.timeline();
    master.add(this.vanDriveIn(this.van));
    master.add(this.cameraZoomIn());
  }

  private vanDriveIn(van: THREE.Object3D) {
    const tl = gsap.timeline();
    tl.to(van.position, {
      x: 32,
      duration: 2,
    });

    return tl;
  }

  private cameraZoomIn() {
    const { camera, world } = this.gameStore;

    const tl = gsap.timeline();
    tl.to(camera, {
      zoom: 1.5,
      duration: 2,
      ease: Power3.easeInOut,
      onUpdate: () => {
        camera.updateProjectionMatrix();
      },
    });
    tl.to(
      camera.position,
      {
        x: world.xMid + 5,
        duration: 2,
        ease: Power3.easeInOut,
      },
      "<"
    );

    return tl;
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
