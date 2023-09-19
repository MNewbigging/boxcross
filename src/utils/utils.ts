import * as THREE from "three";
import GUI from "lil-gui";
import * as BufferGeometryUtils from "three/examples/jsm/utils/BufferGeometryUtils";

export function addGui(object: THREE.Object3D, name = "") {
  const gui = new GUI();

  gui.add(object.position, "x").name(name + " pos x");
  gui.add(object.position, "y").name(name + " pos y");
  gui.add(object.position, "z").name(name + " pos z");

  gui
    .add(object.rotation, "y")
    .name(name + " rot y")
    .min(0)
    .max(Math.PI * 2)
    .step(0.001);

  gui.add(object.scale, "x").name(name + " scale x");
}

export function randomRange(min: number, max: number) {
  return Math.random() * (max - min) + min;
}

export function randomRangeInt(min: number, max: number) {
  return Math.floor(randomRange(min, max));
}

export function randomIndex(arrayLength: number) {
  return Math.floor(Math.random() * arrayLength);
}

export function randomId(length: number = 5) {
  const characters =
    "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUV0123456789";

  let id = "";
  for (let i = 0; i < length; i++) {
    const rnd = Math.floor(Math.random() * characters.length);
    id += characters.charAt(rnd);
  }

  return id;
}

export function disposeObject(object: THREE.Object3D) {
  object.traverse((child) => {
    if (child instanceof THREE.Mesh) {
      (child as THREE.Mesh).geometry.dispose();
    }
  });
}

// Name in format: car-type
export function getCarWheels(
  car: THREE.Object3D,
  name: string
): THREE.Object3D[] {
  // The four wheel names
  const wheelNames = [
    `${name}-wheel-fl`,
    `${name}-wheel-fr`,
    `${name}-wheel-rl`,
    `${name}-wheel-rr`,
  ];

  // Get each wheel
  const wheels: THREE.Object3D[] = [];
  wheelNames.forEach((name) => {
    const wheel = car.getObjectByName(name);
    if (wheel) {
      wheels.push(wheel);
    }
  });

  return wheels;
}

export function getMaterial(group: THREE.Group) {
  let material: THREE.Material | undefined = undefined;
  group.traverse((child) => {
    if (material !== undefined) {
      return;
    }

    if (child instanceof THREE.Mesh) {
      material = child.material;
    }
  });

  return material;
}

export function mergeGeometries(group: THREE.Group) {
  // Get the material to apply to merged mesh
  const material = getMaterial(group);
  if (!material) {
    return undefined;
  }

  // Pull out all the geometries from the group
  const geometries: THREE.BufferGeometry[] = [];
  group.traverse((child) => {
    if (child instanceof THREE.Mesh) {
      child.updateMatrixWorld();
      const geom = child.geometry.clone();
      geom.applyMatrix4(child.matrixWorld);
      geometries.push(geom);
    }
  });

  // Merge the geometries
  const mergedGeometry = BufferGeometryUtils.mergeBufferGeometries(
    geometries,
    true
  );
  if (!mergedGeometry) {
    return undefined;
  }

  // Create a mesh for the geometry and material
  const mesh = new THREE.Mesh(mergedGeometry, material);

  // Wrap in a group and return
  return new THREE.Group().add(mesh);
}
