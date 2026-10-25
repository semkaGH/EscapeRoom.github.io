import * as THREE from "three";
import { COLORS, LAYOUT, QUALITY, ZIPLINE } from "./config";
import { createWorldMaterials, makePortraitMaterial, type WorldMaterials } from "./materials";
import { mulberry32 } from "./random";
import type { AssetRoot, Collider } from "./types";

interface AssetModule { createAsset: (three: typeof THREE, options?: Record<string, unknown>) => Promise<AssetRoot>; }

const _box = new THREE.Box3();
const _center = new THREE.Vector3();
const _size = new THREE.Vector3();
const _matrix = new THREE.Matrix4();
const _quat = new THREE.Quaternion();
const _scale = new THREE.Vector3(1, 1, 1);
const _position = new THREE.Vector3();

export class RoomWorld {
  readonly interior = new THREE.Group();
  readonly exterior = new THREE.Group();
  readonly colliders: Collider[] = [];
  readonly occluders: Collider[] = [];
  readonly materials: WorldMaterials;
  readonly itemNodes = new Map<string, THREE.Group>();
  readonly boards: THREE.Group[] = [];
  readonly ziplineCurve: THREE.CatmullRomCurve3;
  readonly flashlight: THREE.SpotLight;

  doorAsset: AssetRoot | null = null;
  windowAsset: AssetRoot | null = null;
  assetsReady = false;
  assetFallback = false;

  private boxGeometries = new Map<string, THREE.BoxGeometry>();
  private dustUniforms = { time: { value: 0 } };
  private ceilingLight!: THREE.PointLight;
  private storageLight!: THREE.PointLight;
  private lampLight!: THREE.PointLight;
  private titleLight!: THREE.PointLight;
  private bulbMaterial!: THREE.MeshStandardMaterial;
  private keypadMaterial!: THREE.MeshStandardMaterial;
  private rockingChair: THREE.Group | null = null;
  private hatchDoor: THREE.Group | null = null;
  private zipInstall = new THREE.Group();
  private cableGroup = new THREE.Group();
  private doorFallback: THREE.Group | null = null;
  private windowFallback: THREE.Group | null = null;
  private zipRig: THREE.Group | null = null;
  private powered = false;
  private elapsed = 0;

  constructor(private scene: THREE.Scene) {
    this.materials = createWorldMaterials();
    this.interior.name = "Room 13 architecture";
    this.exterior.name = "Night forest";
    scene.add(this.exterior, this.interior);
    this.buildArchitecture();
    this.colliders.push(
      { minX: LAYOUT.door.x - LAYOUT.door.width / 2, maxX: LAYOUT.door.x + LAYOUT.door.width / 2, minZ: LAYOUT.door.z - 0.15, maxZ: LAYOUT.door.z + 0.15, enabled: () => !this.doorOpen },
      { minX: LAYOUT.window.x - 0.15, maxX: LAYOUT.window.x + 0.15, minZ: LAYOUT.window.z - LAYOUT.window.width / 2, maxZ: LAYOUT.window.z + LAYOUT.window.width / 2, enabled: () => !this.windowOpen },
    );
    this.buildBedroom();
    this.buildStorage();
    this.buildItems();
    this.buildLighting();
    this.buildDust();
    this.ziplineCurve = this.buildExterior();
    this.flashlight = this.buildFlashlight();
  }

  private boxGeometry(x: number, y: number, z: number): THREE.BoxGeometry {
    const key = `${x.toFixed(3)}:${y.toFixed(3)}:${z.toFixed(3)}`;
    if (!this.boxGeometries.has(key)) this.boxGeometries.set(key, new THREE.BoxGeometry(x, y, z));
    return this.boxGeometries.get(key)!;
  }

  private box(
    name: string, size: [number, number, number], position: [number, number, number],
    material: THREE.Material | THREE.Material[], parent: THREE.Object3D = this.interior,
    castShadow = true,
  ): THREE.Mesh {
    const mesh = new THREE.Mesh(this.boxGeometry(...size), material);
    mesh.name = name;
    mesh.position.set(...position);
    mesh.castShadow = castShadow;
    mesh.receiveShadow = true;
    parent.add(mesh);
    return mesh;
  }

  private cylinder(
    name: string, radiusTop: number, radiusBottom: number, height: number,
    position: [number, number, number], material: THREE.Material,
    parent: THREE.Object3D = this.interior, segments = 10,
  ): THREE.Mesh {
    const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radiusTop, radiusBottom, height, segments), material);
    mesh.name = name;
    mesh.position.set(...position);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    parent.add(mesh);
    return mesh;
  }

  private addCollider(x: number, z: number, width: number, depth: number, occluder = false): void {
    const collider = { minX: x - width / 2, maxX: x + width / 2, minZ: z - depth / 2, maxZ: z + depth / 2 };
    this.colliders.push(collider);
    if (occluder) this.occluders.push(collider);
  }

  private wall(x: number, z: number, width: number, depth: number, height: number, y = height / 2): THREE.Mesh {
    const mesh = this.box("Wallpaper wall", [width, height, depth], [x, y, z], this.materials.wall);
    if (y - height / 2 < 1.75) this.addCollider(x, z, width, depth, true);
    return mesh;
  }

  private buildArchitecture(): void {
    const r = LAYOUT.room, s = LAYOUT.storage, d = LAYOUT.door, w = LAYOUT.window;
    this.box("Bedroom floor", [12, 0.16, 10], [0, -0.08, 0], this.materials.floor, this.interior, false);
    this.box("Storage floor", [4.1, 0.16, 4.7], [8, -0.08, 2.3], this.materials.floor, this.interior, false);
    this.box("Bedroom ceiling", [12, 0.14, 10], [0, r.height + 0.07, 0], this.materials.ceiling, this.interior, false);

    const doorLeft = d.x - d.width / 2, doorRight = d.x + d.width / 2;
    this.wall((r.minX + doorLeft) / 2, r.minZ, doorLeft - r.minX, 0.2, r.height);
    this.wall((doorRight + r.maxX) / 2, r.minZ, r.maxX - doorRight, 0.2, r.height);
    this.wall(d.x, r.minZ, d.width, 0.2, r.height - d.height, d.height + (r.height - d.height) / 2);
    this.wall(0, r.maxZ, 12, 0.2, r.height);

    const windowNear = w.z - w.width / 2, windowFar = w.z + w.width / 2;
    const windowBottom = w.y - w.height / 2, windowTop = w.y + w.height / 2;
    this.wall(r.minX, (r.minZ + windowNear) / 2, 0.2, windowNear - r.minZ, r.height);
    this.wall(r.minX, (windowFar + r.maxZ) / 2, 0.2, r.maxZ - windowFar, r.height);
    this.wall(r.minX, w.z, 0.2, w.width, windowBottom, windowBottom / 2);
    this.wall(r.minX, w.z, 0.2, w.width, r.height - windowTop, windowTop + (r.height - windowTop) / 2);

    const storageDoorNear = 0.55, storageDoorFar = 3.35;
    this.wall(r.maxX, (r.minZ + storageDoorNear) / 2, 0.2, storageDoorNear - r.minZ, r.height);
    this.wall(r.maxX, (storageDoorFar + r.maxZ) / 2, 0.2, r.maxZ - storageDoorFar, r.height);
    this.wall(r.maxX, 1.95, 0.2, storageDoorFar - storageDoorNear, r.height - 2.8, 2.8 + (r.height - 2.8) / 2);

    this.wall(s.maxX, 2.3, 0.2, 4.8, s.height);
    this.wall(8, s.minZ, 4.2, 0.2, s.height);
    this.wall(8, s.maxZ, 4.2, 0.2, s.height);

    const hatchW = 1.35, hx = LAYOUT.hatch.x, hz = LAYOUT.hatch.z;
    const left = hx - hatchW / 2, right = hx + hatchW / 2, near = hz - hatchW / 2, far = hz + hatchW / 2;
    this.box("Storage ceiling left", [left - 6, 0.14, 4.6], [(6 + left) / 2, s.height + 0.07, 2.3], this.materials.ceiling, this.interior, false);
    this.box("Storage ceiling right", [10 - right, 0.14, 4.6], [(right + 10) / 2, s.height + 0.07, 2.3], this.materials.ceiling, this.interior, false);
    this.box("Storage ceiling near", [hatchW, 0.14, near], [hx, s.height + 0.07, near / 2], this.materials.ceiling, this.interior, false);
    this.box("Storage ceiling far", [hatchW, 0.14, 4.6 - far], [hx, s.height + 0.07, (far + 4.6) / 2], this.materials.ceiling, this.interior, false);

    this.addBaseboards();
    this.addDoorFrames();
    this.addRoof();

    const rug = new THREE.Mesh(new THREE.PlaneGeometry(4.2, 2.6), this.materials.rug);
    rug.name = "Threadbare rug";
    rug.rotation.x = -Math.PI / 2;
    rug.rotation.z = 0.04;
    rug.position.set(0.2, 0.012, 1.25);
    rug.receiveShadow = true;
    this.interior.add(rug);
  }

  private addBaseboards(): void {
    const mat = this.materials.wood;
    const segments: Array<[number, number, number, number]> = [
      [0, -4.84, 11.8, 0.1], [0, 4.84, 11.8, 0.1], [-5.84, 0, 0.1, 9.8],
      [5.84, -2.2, 0.1, 5.5], [5.84, 4.2, 0.1, 1.5], [9.84, 2.3, 0.1, 4.5],
      [8, 0.14, 3.8, 0.1], [8, 4.44, 3.8, 0.1],
    ];
    for (const [x, z, width, depth] of segments) this.box("Warped baseboard", [width, 0.18, depth], [x, 0.09, z], mat);
  }

  private addDoorFrames(): void {
    const d = LAYOUT.door, w = LAYOUT.window, h = LAYOUT.hatch;
    for (const side of [-1, 1]) this.box("Door casing", [0.12, d.height + 0.18, 0.28], [d.x + side * (d.width / 2 + 0.03), d.height / 2, d.z + 0.03], this.materials.woodLight);
    this.box("Door lintel", [d.width + 0.22, 0.13, 0.28], [d.x, d.height + 0.06, d.z + 0.03], this.materials.woodLight);
    for (const side of [-1, 1]) this.box("Window stone reveal", [0.3, w.height + 0.18, 0.12], [w.x + 0.02, w.y, w.z + side * (w.width / 2 + 0.02)], this.materials.woodLight);
    this.box("Window sill", [0.48, 0.13, w.width + 0.28], [w.x + 0.12, w.y - w.height / 2, w.z], this.materials.woodLight);
    for (const side of [-1, 1]) {
      this.box("Storage doorway jamb", [0.28, 2.82, 0.12], [6, 1.41, 1.95 + side * 1.46], this.materials.wood);
      this.box("Attic hatch trim", [1.55, 0.11, 0.1], [h.x, h.y + 0.03, h.z + side * 0.73], this.materials.woodLight);
      this.box("Attic hatch trim", [0.1, 0.11, 1.55], [h.x + side * 0.73, h.y + 0.03, h.z], this.materials.woodLight);
    }
    this.box("Storage doorway lintel", [0.28, 0.14, 3.02], [6, 2.82, 1.95], this.materials.wood);
    this.hatchDoor = new THREE.Group();
    this.hatchDoor.position.set(h.x, h.y, h.z - 0.65);
    const hatch = this.box("Attic hatch", [1.28, 0.1, 1.28], [0, 0, 0.65], this.materials.wood, this.hatchDoor);
    this.box("Hatch brace", [0.12, 0.12, 1.1], [0, -0.08, 0.65], this.materials.rust, this.hatchDoor);
    this.hatchDoor.add(hatch);
    this.interior.add(this.hatchDoor);

    for (let i = 0; i < 3; i++) {
      const board = new THREE.Group();
      board.position.set(-5.77, 1.5 + i * 0.54, -1.15);
      board.rotation.x = (i - 1) * 0.07;
      this.box("Window barricade", [0.12, 0.25, 2.7], [0, 0, 0], this.materials.woodLight, board);
      for (const side of [-1, 1]) {
        const nail = this.cylinder("Rusty nail", 0.025, 0.025, 0.16, [0.08, 0, side * 1.05], this.materials.rust, board, 7);
        nail.rotation.z = Math.PI / 2;
      }
      this.boards.push(board);
      this.interior.add(board);
    }
  }

  private addRoof(): void {
    const roofMat = new THREE.MeshStandardMaterial({ color: 0x1c2426, roughness: 0.96, metalness: 0.08 });
    const left = this.box("North roof", [12.7, 0.16, 5.8], [0, 5.25, -2.55], roofMat, this.exterior);
    left.rotation.x = -0.31;
    const right = this.box("South roof", [12.7, 0.16, 5.8], [0, 5.25, 2.55], roofMat, this.exterior);
    right.rotation.x = 0.31;
    this.box("Roof ridge", [12.8, 0.2, 0.22], [0, 6.12, 0], this.materials.rust, this.exterior);
    const storageRoof = this.box("Storage roof", [4.8, 0.16, 5.3], [8, 4.45, 2.3], roofMat, this.exterior);
    storageRoof.rotation.z = -0.12;
    this.cylinder("Attic cable anchor", 0.06, 0.08, 1.8, [8.15, 5.1, 2.25], this.materials.rust, this.exterior, 8);
  }

  private buildBedroom(): void {
    this.makeBed(-2.75, -1.55);
    this.makeNightstand(-4.65, -3.45);
    this.makeDesk(3.6, 3.85);
    this.makeWardrobe(4.85, -3.85);
    this.makePaintings();

    const rugChair = new THREE.Group();
    rugChair.position.set(-4.45, 0, 3.25);
    rugChair.rotation.y = 0.35;
    this.box("Chair seat", [1.0, 0.12, 0.9], [0, 0.72, 0], this.materials.wood, rugChair);
    for (const x of [-0.4, 0.4]) for (const z of [-0.34, 0.34]) {
      const leg = this.box("Chair leg", [0.1, 0.75, 0.1], [x, 0.36, z], this.materials.wood, rugChair);
      leg.rotation.z = x * 0.08;
    }
    this.box("Chair back", [1.0, 1.05, 0.1], [0, 1.23, 0.38], this.materials.wood, rugChair);
    for (const x of [-0.52, 0.52]) {
      const rocker = new THREE.Mesh(new THREE.TorusGeometry(0.75, 0.035, 6, 24, Math.PI * 0.8), this.materials.woodLight);
      rocker.position.set(x, 0.16, 0);
      rocker.rotation.set(Math.PI / 2, 0, Math.PI * 0.1);
      rugChair.add(rocker);
    }
    this.interior.add(rugChair);
    this.rockingChair = rugChair;
    this.addCollider(-4.45, 3.25, 1.15, 1.1);

    const fusebox = new THREE.Group();
    fusebox.position.set(0.65, 1.45, -4.78);
    this.box("Fuse box", [0.62, 0.82, 0.16], [0, 0, 0], this.materials.metal, fusebox);
    this.box("Fuse box door", [0.52, 0.69, 0.05], [0, 0, 0.1], this.materials.rust, fusebox);
    for (let i = 0; i < 3; i++) this.box("Fuse slot", [0.09, 0.24, 0.05], [-0.16 + i * 0.16, 0.02, 0.14], this.materials.black, fusebox);
    this.interior.add(fusebox);

    this.keypadMaterial = new THREE.MeshStandardMaterial({ color: 0x16201a, emissive: 0x000000, roughness: 0.45 });
    const keypad = new THREE.Group();
    keypad.position.set(3.68, 1.4, -4.77);
    this.box("Keypad housing", [0.38, 0.57, 0.12], [0, 0, 0], this.materials.metal, keypad);
    this.box("Keypad dead display", [0.26, 0.12, 0.03], [0, 0.16, 0.075], this.keypadMaterial, keypad);
    for (let row = 0; row < 4; row++) for (let col = 0; col < 3; col++) {
      this.box("Keypad button", [0.055, 0.05, 0.025], [-0.075 + col * 0.075, 0.045 - row * 0.07, 0.08], this.materials.black, keypad, false);
    }
    this.interior.add(keypad);

    const ceilingLamp = new THREE.Group();
    ceilingLamp.position.set(0, 4.08, 0.2);
    this.cylinder("Lamp cord", 0.018, 0.018, 0.55, [0, 0, 0], this.materials.black, ceilingLamp, 6);
    const shade = new THREE.Mesh(new THREE.ConeGeometry(0.42, 0.25, 20, 1, true), this.materials.metal);
    shade.position.y = -0.37; shade.rotation.x = Math.PI; ceilingLamp.add(shade);
    this.bulbMaterial = new THREE.MeshStandardMaterial({ color: 0x81745b, emissive: 0x2c2417, emissiveIntensity: 0.3 });
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.1, 12, 8), this.bulbMaterial);
    bulb.position.y = -0.47; ceilingLamp.add(bulb);
    this.interior.add(ceilingLamp);
  }

  private makeBed(x: number, z: number): void {
    const bed = new THREE.Group();
    bed.position.set(x, 0, z);
    this.box("Bed frame", [2.35, 0.25, 3.45], [0, 0.48, 0], this.materials.wood, bed);
    this.box("Mattress", [2.18, 0.33, 3.2], [0, 0.75, 0], this.materials.cloth, bed);
    this.box("Headboard", [2.45, 1.35, 0.16], [0, 1.05, -1.67], this.materials.woodLight, bed);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
      this.cylinder("Bedpost", 0.075, 0.09, sz < 0 ? 1.65 : 0.75, [sx * 1.08, sz < 0 ? 0.82 : 0.38, sz * 1.57], this.materials.wood, bed, 8);
    }
    const clothGeometry = new THREE.PlaneGeometry(2.24, 2.65, 18, 22);
    const positions = clothGeometry.attributes.position;
    for (let i = 0; i < positions.count; i++) {
      const px = positions.getX(i), py = positions.getY(i);
      positions.setZ(i, 0.035 * Math.sin(px * 9 + py * 3) + 0.022 * Math.cos(py * 10));
    }
    clothGeometry.computeVertexNormals();
    const blanket = new THREE.Mesh(clothGeometry, this.materials.clothDark);
    blanket.rotation.x = -Math.PI / 2;
    blanket.position.set(0, 0.96, 0.25);
    blanket.castShadow = true;
    bed.add(blanket);
    for (const side of [-0.55, 0.55]) {
      const pillow = new THREE.Mesh(new THREE.SphereGeometry(0.5, 14, 8), this.materials.cloth);
      pillow.scale.set(1, 0.22, 0.65);
      pillow.position.set(side, 1.02, -1.08);
      pillow.rotation.y = side * 0.1;
      pillow.castShadow = true;
      bed.add(pillow);
    }
    this.interior.add(bed);
    this.addCollider(x, z, 2.5, 3.55);
  }

  private makeNightstand(x: number, z: number): void {
    const stand = new THREE.Group();
    stand.position.set(x, 0, z);
    this.box("Nightstand body", [0.9, 0.74, 0.72], [0, 0.42, 0], this.materials.wood, stand);
    this.box("Nightstand top", [1.0, 0.1, 0.82], [0, 0.84, 0], this.materials.woodLight, stand);
    this.box("Nightstand drawer", [0.73, 0.22, 0.04], [0, 0.57, 0.38], this.materials.woodLight, stand);
    const knob = new THREE.Mesh(new THREE.SphereGeometry(0.035, 8, 6), this.materials.metal);
    knob.position.set(0, 0.57, 0.43); stand.add(knob);
    this.cylinder("Lamp stem", 0.025, 0.04, 0.55, [-0.22, 1.14, 0], this.materials.metal, stand, 8);
    const shade = new THREE.Mesh(new THREE.ConeGeometry(0.27, 0.38, 16, 1, true), new THREE.MeshStandardMaterial({ color: 0x7b654d, emissive: 0x5d3820, emissiveIntensity: 0.28, side: THREE.DoubleSide }));
    shade.position.set(-0.22, 1.48, 0); stand.add(shade);
    this.interior.add(stand);
    this.addCollider(x, z, 1.0, 0.85);
  }

  private makeDesk(x: number, z: number): void {
    const desk = new THREE.Group();
    desk.position.set(x, 0, z);
    this.box("Desk top", [2.6, 0.13, 1.05], [0, 0.9, 0], this.materials.woodLight, desk);
    for (const side of [-1, 1]) {
      this.box("Desk drawers", [0.68, 0.8, 0.88], [side * 0.84, 0.45, 0], this.materials.wood, desk);
      for (let row = 0; row < 3; row++) {
        this.box("Desk drawer front", [0.57, 0.19, 0.04], [side * 0.84, 0.25 + row * 0.23, -0.46], this.materials.woodLight, desk);
        this.box("Drawer handle", [0.18, 0.025, 0.04], [side * 0.84, 0.25 + row * 0.23, -0.5], this.materials.metal, desk);
      }
    }
    const paper = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.68), this.materials.paper);
    paper.rotation.x = -Math.PI / 2; paper.rotation.z = 0.14; paper.position.set(-0.25, 0.975, -0.12); desk.add(paper);
    for (let i = 0; i < 5; i++) this.box("Writing on note", [0.29 - i * 0.018, 0.003, 0.008], [-0.25, 0.98, -0.31 + i * 0.065], this.materials.black, desk, false);
    this.cylinder("Ink bottle", 0.06, 0.07, 0.13, [0.35, 1.03, 0.1], this.materials.glass, desk, 10);
    this.interior.add(desk);
    this.addCollider(x, z, 2.7, 1.15);
  }

  private makeWardrobe(x: number, z: number): void {
    const wardrobe = new THREE.Group();
    wardrobe.position.set(x, 0, z);
    this.box("Wardrobe back", [1.75, 2.85, 0.12], [0, 1.43, -0.48], this.materials.wood, wardrobe);
    for (const side of [-1, 1]) this.box("Wardrobe side", [0.13, 2.85, 1.05], [side * 0.82, 1.43, 0], this.materials.wood, wardrobe);
    this.box("Wardrobe cornice", [1.95, 0.16, 1.18], [0, 2.87, 0], this.materials.woodLight, wardrobe);
    this.box("Wardrobe base", [1.9, 0.16, 1.12], [0, 0.12, 0], this.materials.woodLight, wardrobe);
    for (const side of [-1, 1]) {
      const door = this.box("Wardrobe door", [0.75, 2.55, 0.1], [side * 0.4, 1.48, 0.53], this.materials.woodLight, wardrobe);
      door.rotation.y = side * 0.06;
      for (let i = 0; i < 5; i++) this.box("Wardrobe vent", [0.35, 0.025, 0.025], [side * 0.4, 2.35 - i * 0.07, 0.6], this.materials.black, wardrobe, false);
      const knob = new THREE.Mesh(new THREE.SphereGeometry(0.035, 8, 6), this.materials.metal);
      knob.position.set(side * 0.1, 1.42, 0.64); wardrobe.add(knob);
    }
    this.interior.add(wardrobe);
    this.addCollider(x, z, 1.95, 1.2);
  }

  private makePaintings(): void {
    const frames: Array<{ x: number; y: number; z: number; ry: number; variant: number; scale: number }> = [
      { x: -1.1, y: 2.35, z: -4.83, ry: 0, variant: 0, scale: 1 },
      { x: -5.83, y: 2.15, z: 2.15, ry: Math.PI / 2, variant: 1, scale: 0.85 },
      { x: 2.0, y: 2.15, z: 4.83, ry: Math.PI, variant: 2, scale: 0.75 },
    ];
    for (const data of frames) {
      const group = new THREE.Group();
      group.position.set(data.x, data.y, data.z);
      group.rotation.y = data.ry;
      group.rotation.z = (data.variant - 1) * 0.035;
      group.scale.setScalar(data.scale);
      this.box("Portrait frame", [1.15, 1.48, 0.09], [0, 0, 0], this.materials.woodLight, group);
      this.box("Portrait canvas", [0.95, 1.27, 0.025], [0, 0, 0.06], makePortraitMaterial(data.variant), group, false);
      this.interior.add(group);
    }
  }

  private buildStorage(): void {
    for (const z of [0.85, 3.55]) {
      const shelf = new THREE.Group();
      shelf.position.set(9.45, 0, z);
      for (const side of [-1, 1]) this.box("Shelf upright", [0.1, 2.6, 0.1], [0, 1.3, side * 0.62], this.materials.rust, shelf);
      for (let level = 0; level < 4; level++) this.box("Shelf board", [0.85, 0.08, 1.4], [-0.12, 0.35 + level * 0.68, 0], this.materials.wood, shelf);
      for (let i = 0; i < 6; i++) {
        const jar = this.cylinder("Dusty jar", 0.07, 0.08, 0.18 + (i % 2) * 0.08, [-0.25, 0.51 + (i % 3) * 0.68, -0.42 + Math.floor(i / 3) * 0.7], this.materials.glass, shelf, 8);
        jar.castShadow = false;
      }
      this.interior.add(shelf);
      this.addCollider(9.45, z, 1.0, 1.5);
    }
    const crates: Array<[number, number, number, number]> = [[6.75, 0.38, 4.0, 0.1], [7.65, 0.28, 4.05, -0.08], [6.65, 0.25, 0.55, 0.06]];
    for (const [x, y, z, rotation] of crates) {
      const crate = new THREE.Group(); crate.position.set(x, 0, z); crate.rotation.y = rotation;
      this.box("Storage crate", [0.85, y * 2, 0.75], [0, y, 0], this.materials.wood, crate);
      for (const side of [-1, 1]) this.box("Crate brace", [0.08, y * 2 + 0.04, 0.79], [side * 0.3, y, 0], this.materials.woodLight, crate);
      this.interior.add(crate);
      this.addCollider(x, z, 0.9, 0.8);
    }
    this.zipInstall.position.set(LAYOUT.hatch.x, LAYOUT.hatch.y - 0.15, LAYOUT.hatch.z);
    const pulley = new THREE.Mesh(new THREE.TorusGeometry(0.18, 0.035, 8, 20), this.materials.rust);
    pulley.rotation.x = Math.PI / 2; this.zipInstall.add(pulley);
    const rope = this.cylinder("Installed zip rope", 0.018, 0.018, 1.6, [0, -0.75, 0], this.materials.cloth, this.zipInstall, 6);
    rope.castShadow = false;
    this.zipInstall.visible = false;
    this.interior.add(this.zipInstall);
  }

  private makeItem(id: string, position: [number, number, number]): THREE.Group {
    const group = new THREE.Group();
    group.name = `Pickup: ${id}`;
    group.position.set(...position);
    group.userData.baseY = position[1];
    group.userData.phase = this.itemNodes.size * 1.37;
    const glint = new THREE.Mesh(new THREE.OctahedronGeometry(0.035, 0), new THREE.MeshBasicMaterial({ color: 0xd4bd86, transparent: true, opacity: 0.75 }));
    glint.position.y = 0.22;
    glint.name = "glint";
    group.add(glint);
    this.itemNodes.set(id, group);
    this.interior.add(group);
    return group;
  }

  private buildItems(): void {
    const crowbar = this.makeItem("crowbar", [-1.25, 0.2, 0.5]);
    const crow = this.cylinder("Crowbar shaft", 0.025, 0.025, 0.85, [0, 0, 0], this.materials.rust, crowbar, 8);
    crow.rotation.z = Math.PI / 2;
    const hook = new THREE.Mesh(new THREE.TorusGeometry(0.11, 0.025, 7, 14, Math.PI * 1.15), this.materials.rust);
    hook.position.x = -0.44; hook.rotation.y = Math.PI / 2; crowbar.add(hook);
    crowbar.rotation.y = 0.35;

    const note = this.makeItem("note", [3.35, 1.02, 3.7]);
    const paper = new THREE.Mesh(new THREE.PlaneGeometry(0.4, 0.52), this.materials.paper);
    paper.rotation.x = -Math.PI / 2; note.add(paper);

    const rope = this.makeItem("rope", [7.1, 0.84, 0.58]);
    for (let i = 0; i < 3; i++) {
      const coil = new THREE.Mesh(new THREE.TorusGeometry(0.22 - i * 0.025, 0.027, 7, 22), this.materials.cloth);
      coil.rotation.x = Math.PI / 2; coil.position.y = i * 0.045; rope.add(coil);
    }

    const handle = this.makeItem("handle", [-4.35, 1.02, -3.25]);
    const bar = this.cylinder("Zipline handle", 0.025, 0.025, 0.55, [0, 0, 0], this.materials.metal, handle, 8);
    bar.rotation.z = Math.PI / 2;
    for (const side of [-1, 1]) {
      const grip = this.cylinder("Handle grip", 0.045, 0.045, 0.18, [side * 0.2, 0, 0], this.materials.black, handle, 8);
      grip.rotation.z = Math.PI / 2;
    }

    const fuse = this.makeItem("fuse", [8.98, 1.43, 0.72]);
    const glass = this.cylinder("Fuse glass", 0.045, 0.045, 0.25, [0, 0, 0], this.materials.glass, fuse, 10);
    glass.rotation.z = Math.PI / 2;
    for (const side of [-1, 1]) {
      const cap = this.cylinder("Fuse cap", 0.052, 0.052, 0.06, [side * 0.14, 0, 0], this.materials.metal, fuse, 10);
      cap.rotation.z = Math.PI / 2;
    }

    const battery = this.makeItem("battery", [8.98, 1.43, 3.55]);
    this.box("Battery", [0.16, 0.27, 0.12], [0, 0, 0], this.materials.black, battery);
    this.cylinder("Battery terminal", 0.025, 0.025, 0.035, [0, 0.15, 0], this.materials.metal, battery, 8);
  }

  private buildLighting(): void {
    const hemisphere = new THREE.HemisphereLight(0x718092, 0x17130f, 1.05);
    this.scene.add(hemisphere);
    const moon = new THREE.DirectionalLight(0x9ebcd2, 1.05);
    moon.position.set(-12, 15, -8);
    this.scene.add(moon);
    const windowGlow = new THREE.PointLight(0x8ba9c2, 10.5, 8, 2);
    windowGlow.position.set(-5.25, 2.25, -1.15);
    this.scene.add(windowGlow);
    this.lampLight = new THREE.PointLight(0xe0a062, 7, 5.8, 2);
    this.lampLight.position.set(-4.87, 1.55, -3.45);
    this.scene.add(this.lampLight);
    this.ceilingLight = new THREE.PointLight(0xe3b27d, 0.05, 10, 2);
    this.ceilingLight.position.set(0, 3.65, 0.2);
    this.scene.add(this.ceilingLight);
    this.storageLight = new THREE.PointLight(0x9ba891, 0.35, 5.5, 2);
    this.storageLight.position.set(8.1, 3.1, 2.3);
    this.scene.add(this.storageLight);
    this.titleLight = new THREE.PointLight(0xa7b4b6, 0, 15, 1.7);
    this.titleLight.position.set(2.5, 3.3, 2.4);
    this.scene.add(this.titleLight);
  }

  private buildDust(): void {
    const random = mulberry32(1337);
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(QUALITY.dustHigh * 3);
    for (let i = 0; i < QUALITY.dustHigh; i++) {
      positions[i * 3] = -5.7 + random() * 15.3;
      positions[i * 3 + 1] = random() * 4.1;
      positions[i * 3 + 2] = -4.7 + random() * 9.4;
    }
    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    const material = new THREE.ShaderMaterial({
      uniforms: this.dustUniforms,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      vertexShader: `
        uniform float time;
        varying float vAlpha;
        void main() {
          vec3 p = position;
          p.y = mod(p.y + time * .018, 4.1);
          p.x += sin(time * .13 + position.z * 2.1) * .035;
          vec4 mv = modelViewMatrix * vec4(p, 1.0);
          gl_Position = projectionMatrix * mv;
          gl_PointSize = clamp(8.0 / -mv.z, 1.0, 3.2);
          vAlpha = .16 + .12 * sin(position.x * 13.0 + time * .4);
        }
      `,
      fragmentShader: `
        varying float vAlpha;
        void main() {
          float d = length(gl_PointCoord - .5);
          if (d > .5) discard;
          gl_FragColor = vec4(.72, .75, .69, (1.0 - d * 2.0) * vAlpha);
        }
      `,
    });
    const dust = new THREE.Points(geometry, material);
    dust.frustumCulled = false;
    this.interior.add(dust);
  }

  private buildExterior(): THREE.CatmullRomCurve3 {
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(130, 130), new THREE.MeshStandardMaterial({ color: 0x101915, roughness: 1 }));
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.18;
    ground.receiveShadow = true;
    this.exterior.add(ground);

    const random = mulberry32(131313);
    const maxTrees = 105;
    const trunk = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.13, 0.24, 3.4, 6), new THREE.MeshStandardMaterial({ color: 0x1b1c18, roughness: 1 }), maxTrees);
    const crownA = new THREE.InstancedMesh(new THREE.ConeGeometry(1.45, 4.5, 7), new THREE.MeshStandardMaterial({ color: 0x10201b, roughness: 1 }), maxTrees);
    const crownB = new THREE.InstancedMesh(new THREE.ConeGeometry(1.05, 3.5, 7), new THREE.MeshStandardMaterial({ color: 0x14251e, roughness: 1 }), maxTrees);
    let count = 0, attempts = 0;
    while (count < maxTrees && attempts++ < 800) {
      const angle = random() * Math.PI * 2;
      const radius = 13 + random() * 38;
      const x = Math.cos(angle) * radius, z = Math.sin(angle) * radius - 7;
      if (x > 5 && x < 14 && z < 4 && z > -35) continue;
      const scale = 0.75 + random() * 1.35;
      _quat.setFromAxisAngle(new THREE.Vector3(0, 1, 0), random() * Math.PI);
      _scale.set(scale, scale, scale);
      _position.set(x, 1.5 * scale, z);
      _matrix.compose(_position, _quat, _scale);
      trunk.setMatrixAt(count, _matrix);
      _position.y = 4.1 * scale;
      _matrix.compose(_position, _quat, _scale);
      crownA.setMatrixAt(count, _matrix);
      _position.y = 6.0 * scale;
      _matrix.compose(_position, _quat, _scale);
      crownB.setMatrixAt(count, _matrix);
      count++;
    }
    trunk.count = crownA.count = crownB.count = count;
    trunk.instanceMatrix.needsUpdate = crownA.instanceMatrix.needsUpdate = crownB.instanceMatrix.needsUpdate = true;
    this.exterior.add(trunk, crownA, crownB);

    const hillMaterial = new THREE.MeshBasicMaterial({ color: 0x0a1114, fog: true });
    for (let i = 0; i < 12; i++) {
      const angle = (i / 12) * Math.PI * 2;
      const hill = new THREE.Mesh(new THREE.ConeGeometry(15 + random() * 12, 17 + random() * 15, 5), hillMaterial);
      hill.position.set(Math.cos(angle) * 65, 3, Math.sin(angle) * 65 - 10);
      hill.rotation.y = random() * Math.PI;
      this.exterior.add(hill);
    }

    const moon = new THREE.Mesh(new THREE.SphereGeometry(2.0, 24, 16), new THREE.MeshBasicMaterial({ color: 0xc4d4d7, fog: false }));
    moon.position.set(-18, 22, -47);
    this.exterior.add(moon);
    const haloCanvas = document.createElement("canvas"); haloCanvas.width = haloCanvas.height = 128;
    const haloCtx = haloCanvas.getContext("2d")!;
    const gradient = haloCtx.createRadialGradient(64, 64, 4, 64, 64, 64);
    gradient.addColorStop(0, "rgba(190,215,225,.4)"); gradient.addColorStop(.22, "rgba(150,190,210,.16)"); gradient.addColorStop(1, "rgba(100,150,180,0)");
    haloCtx.fillStyle = gradient; haloCtx.fillRect(0, 0, 128, 128);
    const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(haloCanvas), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }));
    halo.position.copy(moon.position); halo.scale.set(15, 15, 1); this.exterior.add(halo);

    const starPositions = new Float32Array(240 * 3);
    for (let i = 0; i < 240; i++) {
      const angle = random() * Math.PI * 2, radius = 65 + random() * 25;
      starPositions[i * 3] = Math.cos(angle) * radius;
      starPositions[i * 3 + 1] = 15 + random() * 45;
      starPositions[i * 3 + 2] = Math.sin(angle) * radius - 10;
    }
    const starGeometry = new THREE.BufferGeometry();
    starGeometry.setAttribute("position", new THREE.BufferAttribute(starPositions, 3));
    const stars = new THREE.Points(starGeometry, new THREE.PointsMaterial({ color: 0x91a8b5, size: 0.16, transparent: true, opacity: 0.65, fog: false }));
    this.exterior.add(stars);

    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(8.15, 5.65, 2.25),
      new THREE.Vector3(8.85, 3.25, -8.5),
      new THREE.Vector3(9.8, 2.15, -20),
      new THREE.Vector3(11, 1.8, -31),
    ]);
    const cable = new THREE.Mesh(new THREE.TubeGeometry(curve, 80, 0.022, 5, false), this.materials.metal);
    cable.castShadow = false;
    this.cableGroup.add(cable);
    this.cylinder("Landing tree", 0.45, 0.7, 10, [11.4, 4.5, -31.5], this.materials.wood, this.cableGroup, 9);
    this.box("Landing platform", [3.0, 0.18, 2.4], [11, 1.05, -31], this.materials.wood, this.cableGroup);
    this.cableGroup.visible = false;
    this.exterior.add(this.cableGroup);
    return curve;
  }

  private buildFlashlight(): THREE.SpotLight {
    const light = new THREE.SpotLight(0xd9e0d2, 82, 18, 0.47, 0.55, 1.6);
    light.position.set(0.16, -0.12, 0.05);
    light.castShadow = true;
    light.shadow.mapSize.set(1024, 1024);
    light.shadow.camera.near = 0.15;
    light.shadow.camera.far = 18;
    light.shadow.normalBias = 0.035;
    light.shadow.bias = -0.00015;
    return light;
  }

  attachCamera(camera: THREE.PerspectiveCamera): void {
    camera.add(this.flashlight);
    this.flashlight.target.position.set(0, -0.05, -4);
    camera.add(this.flashlight.target);
    const body = new THREE.Group();
    body.position.set(0.28, -0.25, -0.68);
    body.rotation.set(-0.12, -0.12, 0.08);
    body.scale.setScalar(0.72);
    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.048, 0.26, 10), new THREE.MeshBasicMaterial({ color: 0x0b0f10 }));
    barrel.rotation.x = Math.PI / 2;
    body.add(barrel);
    const rim = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.05, 0.07, 12), new THREE.MeshBasicMaterial({ color: 0x161c1d }));
    rim.rotation.x = Math.PI / 2; rim.position.z = -0.14; body.add(rim);
    camera.add(body);

    this.zipRig = new THREE.Group();
    this.zipRig.position.set(0, 0.32, -0.62);
    const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.7, 8), new THREE.MeshBasicMaterial({ color: 0x737d7b }));
    bar.rotation.z = Math.PI / 2; this.zipRig.add(bar);
    for (const side of [-1, 1]) {
      const grip = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.24, 8), new THREE.MeshBasicMaterial({ color: 0x1a1e1e }));
      grip.rotation.z = Math.PI / 2; grip.position.x = side * 0.25; this.zipRig.add(grip);
      const hand = new THREE.Mesh(new THREE.SphereGeometry(0.07, 10, 7), new THREE.MeshBasicMaterial({ color: 0x7e6d5e }));
      hand.scale.set(1, 0.75, 1.2); hand.position.set(side * 0.25, -0.025, 0.025); this.zipRig.add(hand);
    }
    const strap = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.55, 6), new THREE.MeshBasicMaterial({ color: 0x424b49 }));
    strap.position.y = 0.28; this.zipRig.add(strap);
    this.zipRig.visible = false;
    camera.add(this.zipRig);
  }

  setZipRig(visible: boolean): void { if (this.zipRig) this.zipRig.visible = visible; }

  setFlashlight(visible: boolean, batteryRatio: number): void {
    this.flashlight.visible = visible && batteryRatio > 0;
    this.flashlight.intensity = 62 + batteryRatio * 24;
  }

  setQuality(high: boolean): void {
    this.flashlight.castShadow = high;
    this.flashlight.shadow.mapSize.set(high ? 1024 : 512, high ? 1024 : 512);
  }

  setTitleLighting(enabled: boolean): void {
    this.titleLight.intensity = enabled ? 24 : 0;
  }

  setPower(powered: boolean): void {
    this.powered = powered;
    this.ceilingLight.intensity = powered ? 5.5 : 0.05;
    this.storageLight.intensity = powered ? 3.2 : 0.35;
    this.keypadMaterial.emissive.setHex(powered ? 0x57754d : 0x000000);
    this.keypadMaterial.emissiveIntensity = powered ? 0.8 : 0;
    this.bulbMaterial.emissive.setHex(powered ? 0xe0a062 : 0x2c2417);
    this.bulbMaterial.emissiveIntensity = powered ? 2.5 : 0.3;
  }

  setItemVisible(id: string, visible: boolean): void {
    const item = this.itemNodes.get(id);
    if (item) item.visible = visible;
  }

  setBoardsRemoved(count: number): void {
    this.boards.forEach((board, index) => { board.visible = index >= count; });
  }

  setZiplineReady(ready: boolean): void {
    this.zipInstall.visible = ready;
    this.cableGroup.visible = ready;
    if (this.hatchDoor) this.hatchDoor.rotation.x = ready ? -1.22 : 0;
  }

  setDoorOpen(open: boolean): void {
    if (this.doorAsset) void this.doorAsset.setState(open ? "open" : "closed");
    if (this.doorFallback) this.doorFallback.rotation.y = open ? -Math.PI * 0.52 : 0;
  }

  setWindowOpen(open: boolean): void {
    if (this.windowAsset) void this.windowAsset.setState(open ? "open" : "closed");
    if (this.windowFallback) this.windowFallback.rotation.y = open ? Math.PI * 0.35 : 0;
  }

  update(dt: number, time: number, danger: number): void {
    this.elapsed += dt;
    this.dustUniforms.time.value = time;
    this.lampLight.intensity = 6.7 + Math.sin(time * 7.1) * 0.22 + Math.sin(time * 17.3) * 0.13;
    if (this.powered) this.ceilingLight.intensity = 5.3 + Math.sin(time * 2.7) * 0.25;
    for (const item of this.itemNodes.values()) {
      if (!item.visible) continue;
      const glint = item.getObjectByName("glint");
      if (glint) {
        glint.rotation.y = time * 1.4 + item.userData.phase;
        glint.position.y = 0.22 + Math.sin(time * 2 + item.userData.phase) * 0.035;
      }
    }
    if (this.rockingChair) this.rockingChair.rotation.x = Math.sin(time * (danger > 0.25 ? 1.8 : 0.45)) * (danger > 0.25 ? 0.025 : 0.004);
  }

  private doorOpen = false;
  private windowOpen = false;

  async loadAssets(): Promise<void> {
    const base = new URL(import.meta.env.BASE_URL, document.baseURI).href;
    await Promise.all([this.loadDoor(base), this.loadWindow(base)]);
    this.assetsReady = true;
  }

  private async loadDoor(base: string): Promise<void> {
    try {
      const module = await import(/* @vite-ignore */ `${base}assets/door/asset.mjs`) as AssetModule;
      const root = await module.createAsset(THREE, { states: "lazy", sharedResources: true });
      this.doorAsset = root;
      this.placeAsset(root, new THREE.Vector3(LAYOUT.door.x, LAYOUT.door.height / 2, LAYOUT.door.z + 0.02), new THREE.Vector3(LAYOUT.door.width * 0.94, LAYOUT.door.height * 0.97, 0.44), 0, this.interior);
      this.restyleAsset(root, false);
      await root.prepareState("open");
      this.restyleAsset(root, false);
    } catch (error) {
      console.warn("Door asset unavailable; using the built-in door.", error);
      this.assetFallback = true;
      this.buildFallbackDoor();
    }
  }

  private async loadWindow(base: string): Promise<void> {
    try {
      const module = await import(/* @vite-ignore */ `${base}assets/window/asset.mjs`) as AssetModule;
      const root = await module.createAsset(THREE, { states: "lazy", sharedResources: true });
      this.windowAsset = root;
      this.placeAsset(root, new THREE.Vector3(LAYOUT.window.x + 0.02, LAYOUT.window.y, LAYOUT.window.z), new THREE.Vector3(LAYOUT.window.width * 0.94, LAYOUT.window.height * 0.95, 0.4), Math.PI / 2, this.interior);
      this.restyleAsset(root, true);
      await root.prepareState("open");
      this.restyleAsset(root, true);
    } catch (error) {
      console.warn("Window asset unavailable; using the built-in window.", error);
      this.assetFallback = true;
      this.buildFallbackWindow();
    }
  }

  private restyleAsset(root: AssetRoot, darkenWood: boolean): void {
    root.traverse(object => {
      if (!(object instanceof THREE.Mesh)) return;
      const original = Array.isArray(object.material) ? object.material : [object.material];
      const metal = original.some(material => material instanceof THREE.MeshStandardMaterial && material.metalness > 0.42);
      object.material = metal ? this.materials.metal : darkenWood ? this.materials.wood : this.materials.woodLight;
      object.castShadow = true;
      object.receiveShadow = true;
    });
  }

  private placeAsset(root: AssetRoot, center: THREE.Vector3, localSize: THREE.Vector3, yaw: number, parent: THREE.Group): void {
    const placement = new THREE.Group();
    placement.name = `Placement: ${root.name}`;
    placement.add(root);
    parent.add(placement);
    root.updateMatrixWorld(true);
    _box.setFromObject(root);
    _box.getSize(_size);
    placement.scale.set(localSize.x / Math.max(0.001, _size.x), localSize.y / Math.max(0.001, _size.y), localSize.z / Math.max(0.001, _size.z));
    placement.rotation.y = yaw;
    placement.updateMatrixWorld(true);
    _box.setFromObject(placement);
    _box.getCenter(_center);
    placement.position.copy(center).sub(_center);
    placement.updateMatrixWorld(true);
  }

  private buildFallbackDoor(): void {
    const d = LAYOUT.door;
    const pivot = new THREE.Group();
    pivot.position.set(d.x - d.width * 0.47, 0, d.z);
    this.box("Fallback door leaf", [d.width * 0.94, d.height * 0.97, 0.12], [d.width * 0.47, d.height * 0.485, 0], this.materials.woodLight, pivot);
    for (const y of [0.65, 1.75]) this.box("Door raised panel", [d.width * 0.65, 0.72, 0.05], [d.width * 0.47, y, 0.08], this.materials.wood, pivot);
    const knob = new THREE.Mesh(new THREE.SphereGeometry(0.055, 10, 8), this.materials.metal);
    knob.position.set(d.width * 0.79, 1.05, 0.12); pivot.add(knob);
    this.interior.add(pivot);
    this.doorFallback = pivot;
  }

  private buildFallbackWindow(): void {
    const w = LAYOUT.window;
    const pivot = new THREE.Group();
    pivot.position.set(w.x + 0.02, w.y, w.z - w.width * 0.47);
    for (const side of [-1, 1]) this.box("Fallback window jamb", [0.14, w.height, 0.1], [0, 0, side * w.width * 0.47 + w.width * 0.47], this.materials.woodLight, pivot);
    for (const side of [-1, 1]) this.box("Fallback window rail", [0.14, 0.1, w.width], [0, side * w.height * 0.47, w.width * 0.47], this.materials.woodLight, pivot);
    for (let i = 0; i < 9; i++) this.box("Fallback louver", [0.09, 0.12, w.width * 0.88], [0, -w.height * 0.4 + i * w.height * 0.1, w.width * 0.47], this.materials.wood, pivot);
    this.interior.add(pivot);
    this.windowFallback = pivot;
  }

  reset(): void {
    this.setTitleLighting(false);
    this.doorOpen = false;
    this.windowOpen = false;
    this.setDoorOpen(false);
    this.setWindowOpen(false);
    this.setPower(false);
    this.setBoardsRemoved(0);
    this.setZiplineReady(false);
    this.setZipRig(false);
    for (const id of this.itemNodes.keys()) this.setItemVisible(id, true);
  }

  openDoor(): void { this.doorOpen = true; this.setDoorOpen(true); }
  openWindow(): void { this.windowOpen = true; this.setWindowOpen(true); }

  resolveMove(position: THREE.Vector3, dx: number, dz: number, radius: number): boolean {
    let blocked = false;
    if (this.canOccupy(position.x + dx, position.z, radius)) position.x += dx;
    else blocked = true;
    if (this.canOccupy(position.x, position.z + dz, radius)) position.z += dz;
    else blocked = true;
    return blocked;
  }

  private canOccupy(x: number, z: number, radius: number): boolean {
    for (const collider of this.colliders) {
      if (collider.enabled && !collider.enabled()) continue;
      const closestX = Math.max(collider.minX, Math.min(x, collider.maxX));
      const closestZ = Math.max(collider.minZ, Math.min(z, collider.maxZ));
      const dx = x - closestX, dz = z - closestZ;
      if (dx * dx + dz * dz < radius * radius) return false;
    }
    return true;
  }

  hasLineOfSight(from: THREE.Vector3, to: THREE.Vector3): boolean {
    for (const collider of this.occluders) {
      if (this.segmentHitsBox(from.x, from.z, to.x, to.z, collider)) return false;
    }
    return true;
  }

  private segmentHitsBox(x0: number, z0: number, x1: number, z1: number, box: Collider): boolean {
    const dx = x1 - x0, dz = z1 - z0;
    let near = 0, far = 1;
    if (Math.abs(dx) < 0.00001) {
      if (x0 < box.minX || x0 > box.maxX) return false;
    } else {
      let a = (box.minX - x0) / dx, b = (box.maxX - x0) / dx;
      if (a > b) [a, b] = [b, a];
      near = Math.max(near, a); far = Math.min(far, b);
      if (near > far) return false;
    }
    if (Math.abs(dz) < 0.00001) {
      if (z0 < box.minZ || z0 > box.maxZ) return false;
    } else {
      let a = (box.minZ - z0) / dz, b = (box.maxZ - z0) / dz;
      if (a > b) [a, b] = [b, a];
      near = Math.max(near, a); far = Math.min(far, b);
      if (near > far) return false;
    }
    return far > 0.06 && near < 0.94;
  }

  dispose(): void {
    void this.doorAsset?.dispose();
    void this.windowAsset?.dispose();
    const geometries = new Set<THREE.BufferGeometry>();
    const materials = new Set<THREE.Material>();
    const textures = new Set<THREE.Texture>();
    for (const root of [this.interior, this.exterior]) {
      root.traverse(object => {
        if (object instanceof THREE.Mesh || object instanceof THREE.Points) {
          geometries.add(object.geometry);
          const list = Array.isArray(object.material) ? object.material : [object.material];
          for (const material of list) {
            materials.add(material);
            for (const value of Object.values(material)) if (value instanceof THREE.Texture) textures.add(value);
          }
        }
      });
      root.removeFromParent();
    }
    for (const texture of textures) texture.dispose();
    for (const material of materials) material.dispose();
    for (const geometry of geometries) geometry.dispose();
  }
}
