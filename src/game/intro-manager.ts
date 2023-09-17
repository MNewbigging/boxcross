import * as THREE from "three";
import { Linear, Power2, Power3, gsap } from "gsap";

import { GameStore } from "./game-store";
import { ModelNames } from "../loaders/model-loader";

export class IntroManager {
  introRunning = false;

  private suv?: THREE.Object3D;
  private taxi?: THREE.Object3D;
  private van?: THREE.Object3D;
  private rightDoor?: THREE.Object3D;
  private leftDoor?: THREE.Object3D;

  constructor(private gameStore: GameStore) {}

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
    if (
      !this.van ||
      !this.leftDoor ||
      !this.rightDoor ||
      !this.suv ||
      !this.taxi
    ) {
      return;
    }

    this.introRunning = true;

    const master = gsap.timeline();
    master.add(this.vanDriveIn(this.van));
    master.add(this.cameraZoomIn());
    master.add(this.vanDoorsOpen(this.leftDoor, this.rightDoor));
    master.add(this.boxFall());
    master.add(this.cameraZoomOut());
    master.add(this.carDriveOut(this.suv));
    master.add(this.carDriveOut(this.taxi));
    master.add(this.vanDoorsClose(this.leftDoor, this.rightDoor));
    master.add(this.carDriveOut(this.van));
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

  private vanDoorsOpen(leftDoor: THREE.Object3D, rightDoor: THREE.Object3D) {
    // Get the back right door of the van
    const doorsTimeline = gsap.timeline();

    doorsTimeline.to(rightDoor.rotation, {
      y: rightDoor.rotation.y + Math.PI / 2 + 0.2,
      duration: 0.1,
      ease: Linear.easeIn,
    });
    doorsTimeline.to(
      leftDoor.rotation,
      {
        y: leftDoor.rotation.y - Math.PI / 2 - 0.2,
        duration: 0.1,
        ease: Linear.easeIn,
      },
      "<"
    );

    return doorsTimeline;
  }

  private boxFall() {
    const { player } = this.gameStore;

    const tl = gsap.timeline();
    tl.to(player.object.position, {
      x: 40,
      duration: 1,
      onStart: () => {
        player.object.position.set(34, 2, -7.5);
      },
    });
    tl.to(player.object.position, {
      y: 0.01,
      duration: 0.5,
    });

    return tl;
  }

  private cameraZoomOut() {
    const { camera, world } = this.gameStore;

    const tl = gsap.timeline();
    tl.to(camera, {
      zoom: 1,
      duration: 2,
      ease: Power3.easeInOut,
      onUpdate: () => {
        camera.updateProjectionMatrix();
      },
    });
    tl.to(
      camera.position,
      {
        x: world.xMid,
        duration: 2,
        ease: Power3.easeInOut,
      },
      "<"
    );

    return tl;
  }

  private carDriveOut(car: THREE.Object3D) {
    const { world } = this.gameStore;

    const tl = gsap.timeline();
    tl.to(car.position, {
      x: world.xMin,
      duration: 2,
      ease: Power2.easeIn,
    });

    return tl;
  }

  private vanDoorsClose(leftDoor: THREE.Object3D, rightDoor: THREE.Object3D) {
    // Get the back right door of the van
    const doorsTimeline = gsap.timeline();
    doorsTimeline.to(rightDoor.rotation, {
      y: 0,
      duration: 0.1,
      ease: Linear.easeIn,
    });
    doorsTimeline.to(
      leftDoor.rotation,
      {
        y: 0,
        duration: 0.1,
        ease: Linear.easeIn,
      },
      "<"
    );

    return doorsTimeline;
  }
}
