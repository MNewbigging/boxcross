import * as THREE from "three";
import * as YUKA from "yuka";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";

import { GameLoader } from "./loaders/game-loader";
import { addGui } from "./utils/utils";

export class GameState {
  private scene = new THREE.Scene();
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private controls: OrbitControls;

  private entityManager = new YUKA.EntityManager();
  private time = new YUKA.Time();
  private vehicle?: YUKA.Vehicle;
  private path?: YUKA.Path;

  constructor(
    private canvas: HTMLCanvasElement,
    private gameLoader: GameLoader
  ) {
    // Setup camera
    this.camera = new THREE.PerspectiveCamera(
      75,
      canvas.clientWidth / canvas.clientHeight,
      0.1,
      100
    );
    this.camera.position.z = 15;
    this.camera.position.y = 15;
    this.camera.position.x = 15;

    // Setup renderer
    this.renderer = new THREE.WebGLRenderer({ canvas });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    THREE.ColorManagement.legacyMode = false;
    this.renderer.outputEncoding = THREE.sRGBEncoding;
    this.renderer.toneMapping = THREE.LinearToneMapping;
    this.renderer.toneMappingExposure = 1;
    this.renderer.shadowMap.enabled = true;
    window.addEventListener("resize", this.onCanvasResize);
    this.onCanvasResize();

    this.scene.background = new THREE.Color("#1680AF");

    this.controls = new OrbitControls(this.camera, canvas);
    this.controls.enableDamping = true;

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.3);
    this.scene.add(ambientLight);

    const directLight = new THREE.DirectionalLight();
    this.scene.add(directLight);

    // Add scene object
    const trafficTown = this.gameLoader.modelLoader.get("traffic-town");
    if (!trafficTown) {
      return;
    }

    this.scene.add(trafficTown);

    // Pull out the road and car objects
    const road = trafficTown.getObjectByName("Road");
    const car = trafficTown.getObjectByName("Car");
    if (!road || !car) {
      console.log("Could not find road or car");
      return;
    }

    console.log("object", trafficTown);

    const box = this.gameLoader.modelLoader.get("box");
    if (!box) {
      return;
    }

    //this.scene.add(box);

    this.setupYuka(road, car);

    // Start game
    this.update();
  }

  private setupYuka(road: THREE.Object3D, car: THREE.Object3D) {
    // Yuka will handle the matrix updates itself
    car.matrixAutoUpdate = false;

    // Setup vehicle
    const vehicle = new YUKA.Vehicle();
    vehicle.maxSpeed = 200;
    vehicle.setRenderComponent(car, this.syncVehicle);

    // Pull out path points from the road
    const laneOneEntry = road.getObjectByName("Lane_1_Entry")?.position;
    const laneOneExit = road.getObjectByName("Lane_1_Exit")?.position;
    if (!laneOneEntry || !laneOneExit) {
      console.log("Could not find lane 1 points");
      return;
    }

    const box1 = this.gameLoader.modelLoader.get("box");
    if (box1) {
      box1.position.copy(laneOneEntry);
      this.scene.add(box1);
    }
    const box2 = this.gameLoader.modelLoader.get("box");
    if (box2) {
      box2.position.copy(laneOneExit);
      this.scene.add(box2);
    }

    const path = new YUKA.Path();
    path.add(new YUKA.Vector3(laneOneEntry.x, laneOneEntry.y, laneOneEntry.z));
    path.add(new YUKA.Vector3(laneOneExit.x, laneOneExit.y, laneOneExit.z));
    console.log("path", path);

    // Put vehicle at start of path
    vehicle.position.copy(path.current());
    this.path = path;

    // Setup vehicle behaviour
    const followPathBehaviour = new YUKA.FollowPathBehavior(path, 0.5);
    vehicle.steering.add(followPathBehaviour);

    // Add vehicle entity to the manager
    this.entityManager.add(vehicle);
    this.vehicle = vehicle;
  }

  private syncVehicle = (entity: YUKA.GameEntity, renderComponent: any) => {
    renderComponent.matrix.copy(entity.worldMatrix);
  };

  private onCanvasResize = () => {
    this.renderer.setSize(
      this.canvas.clientWidth,
      this.canvas.clientHeight,
      false
    );

    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    this.camera.aspect = this.canvas.clientWidth / this.canvas.clientHeight;

    this.camera.updateProjectionMatrix();
  };

  private update = () => {
    requestAnimationFrame(this.update);

    const dt = this.time.update().getDelta();

    this.entityManager.update(dt);

    // if (this.path?.finished()) {
    //   console.log("finished");
    // } else {
    //   console.log("active");
    // }

    this.renderer.render(this.scene, this.camera);
    this.controls.update();
  };
}
