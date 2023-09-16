import * as THREE from "three";

export enum TextureNames {
  ONE_A = "one-a",
  ONE_B = "one-b",
}

export class TextureLoader {
  loading = false;
  readonly textures = new Map<string, THREE.Texture>();

  private loadingManager = new THREE.LoadingManager();

  load(onLoad: () => void) {
    // Setup loading manager
    this.loadingManager.onProgress = (url, itemsLoaded, itemsTotal) => {
      console.log(
        `Loading texture: ${url}. \n Loaded ${itemsLoaded} of ${itemsTotal}`
      );
    };

    this.loadingManager.onLoad = () => {
      this.loading = false;
      onLoad();
    };

    this.loading = true;
    this.loadTextures();
  }

  private loadTextures() {
    const loader = new THREE.TextureLoader(this.loadingManager);

    // Example
    const oneA = new URL("/PolygonCity_Texture_01_A.png", import.meta.url).href;
    loader.load(oneA, (texture) =>
      this.textures.set(TextureNames.ONE_A, texture)
    );

    const oneB = new URL("/PolygonCity_Texture_01_B.png", import.meta.url).href;
    loader.load(oneB, (texture) =>
      this.textures.set(TextureNames.ONE_B, texture)
    );
  }
}
