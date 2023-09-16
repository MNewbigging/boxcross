import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";

export enum ModelNames {
  CAR_AMBULANCE = "car-ambulance",
  CAR_HATCH = "car-hatch",
  CAR_MUSCLE = "car-muscle",
  CAR_POLICE = "car-police",
  CAR_SEDAN = "car-sedan",
  CAR_SUV = "car-suv",
  CAR_TAXI = "car-taxi",
  CAR_VAN = "car-van",
  ROAD = "road",
  ROAD_ALT = "road-alt",
  ROAD_CROSSING = "road-crossing",
  PAVEMENT = "pavement",
  PAVEMENT_ALT = "pavement-alt",
  PAVEMENT_DRAIN = "pavement-drain",
  PAVEMENT_PANEL = "pavement-panel",
  PAVEMENT_GRATE = "pavement-grate",
  PAVEMENT_DIP = "pavement-dip",
  MANHOLE_COVER = "manhole-cover",
  MANHOLE_PATCH = "manhole-patch",
  PLAYER = "box",
}

export class ModelLoader {
  loading = false;
  readonly models = new Map<string, THREE.Object3D>();

  readonly cars = [
    ModelNames.CAR_AMBULANCE,
    ModelNames.CAR_HATCH,
    ModelNames.CAR_MUSCLE,
    ModelNames.CAR_POLICE,
    ModelNames.CAR_SEDAN,
    ModelNames.CAR_SUV,
    ModelNames.CAR_TAXI,
    ModelNames.CAR_VAN,
  ];

  private loadingManager = new THREE.LoadingManager();

  get(modelName: string): THREE.Object3D {
    // Clone the model
    const clone = this.models.get(modelName)?.clone();

    // If we couldn't find the model, return an 'error' object
    if (!clone) {
      const geom = new THREE.SphereGeometry();
      const mat = new THREE.MeshBasicMaterial({ color: "red" });
      const mesh = new THREE.Mesh(geom, mat);

      return mesh;
    }

    // Clear its position
    clone.position.set(0, 0, 0);

    return clone;
  }

  preLoad(onPreLoad: () => void) {
    const preloadMgr = new THREE.LoadingManager();
    preloadMgr.onLoad = () => {
      onPreLoad();
    };
    const preloader = new GLTFLoader(preloadMgr);

    const boxUrl = new URL("/box-small.glb", import.meta.url).href;
    preloader.load(boxUrl, (gltf) => {
      // Traverse the gltf scene
      gltf.scene.traverse((child) => {
        const node = child as THREE.Mesh;
        if (node.isMesh) {
          // Kenney assets need their metalness reducing to render correctly
          const mat = node.material as THREE.MeshStandardMaterial;
          mat.metalness = 0;
        }
      });

      this.models.set("box", gltf.scene);
    });
  }

  load(onLoad: () => void) {
    // Setup loading manager
    // this.loadingManager.onProgress = (url, itemsLoaded, itemsTotal) => {
    //   console.log(
    //     `Loading model: ${url}. \n Loaded ${itemsLoaded} of ${itemsTotal}.`
    //   );
    // };

    this.loadingManager.onLoad = () => {
      this.loading = false;
      onLoad();
    };

    // Start loading
    this.loading = true;

    // If you need a texture atlas for the models, load it here first
    // remember to set texture.encoding = THREE.sRGBEncoding;
    // Then pass it to load models and on each model,
    // traverse each loaded model and assign material.map to atlas to each mesh child node

    this.loadModels();
  }

  private loadModels() {
    const gltfLoader = new GLTFLoader(this.loadingManager);

    const boxCrossUrl = new URL("/boxCross.glb", import.meta.url).href;
    gltfLoader.load(boxCrossUrl, (gltf) => {
      const parent = gltf.scene;

      // Pull out the individual models
      Object.values(ModelNames).forEach((name) => {
        const object = parent.getObjectByName(name);
        if (object) {
          this.models.set(name, object);
          console.log("loaded object", object);
        }
      });

      this.models.set("box-cross", gltf.scene);
    });
  }
}
