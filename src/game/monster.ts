import * as THREE from "three";
import { MONSTER } from "./config";
import type { MonsterMode } from "./types";
import type { RoomWorld } from "./world";

const _direction = new THREE.Vector3();
const _toPlayer = new THREE.Vector3();
const _target = new THREE.Vector3();

const PATROL: ReadonlyArray<readonly [number, number]> = [
  [3.4, -2.2], [1.2, 2.3], [-0.2, 3.8], [-4.8, 1.1], [-0.3, -3.8], [7.8, 1.6], [8.1, 3.7], [5.1, 1.9],
];

export class Watcher {
  readonly group = new THREE.Group();
  mode: MonsterMode = "dormant";
  caught = false;
  justSpotted = false;
  escapedChase = false;
  repelled = false;
  danger = 0;
  distanceToPlayer = 99;
  activeTime = 0;

  private model = new THREE.Group();
  private eyeMaterial!: THREE.MeshStandardMaterial;
  private leftArm!: THREE.Group;
  private rightArm!: THREE.Group;
  private leftLeg!: THREE.Group;
  private rightLeg!: THREE.Group;
  private lastKnown = new THREE.Vector3();
  private investigateTarget = new THREE.Vector3();
  private waypoint = 0;
  private stateTimer = 0;
  private lostTimer = 0;
  private dormantTimer: number = MONSTER.activationDelay;
  private walkPhase = 0;
  private stuckTimer = 0;

  constructor(private scene: THREE.Scene, private world: RoomWorld) {
    this.group.name = "The Watcher";
    this.buildModel();
    this.group.add(this.model);
    this.group.visible = false;
    scene.add(this.group);
    this.reset();
  }

  private buildModel(): void {
    const shadow = new THREE.MeshStandardMaterial({ color: 0x0a0d0e, roughness: 0.92 });
    const cloth = new THREE.MeshStandardMaterial({ color: 0x111516, roughness: 1, side: THREE.DoubleSide });
    const bone = new THREE.MeshStandardMaterial({ color: 0x706e64, roughness: 0.9 });
    this.eyeMaterial = new THREE.MeshStandardMaterial({ color: 0xd9d9c8, emissive: 0xd8e2d5, emissiveIntensity: 1.4 });

    const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.38, 1.2, 8), cloth);
    torso.position.y = 1.58; torso.scale.z = 0.64; torso.castShadow = true; this.model.add(torso);
    const shoulders = new THREE.Mesh(new THREE.SphereGeometry(0.38, 10, 7), shadow);
    shoulders.position.y = 2.02; shoulders.scale.set(1.2, 0.42, 0.65); shoulders.castShadow = true; this.model.add(shoulders);
    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.1, 0.32, 7), bone);
    neck.position.y = 2.24; this.model.add(neck);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.28, 12, 9), shadow);
    head.position.set(0, 2.52, 0); head.scale.set(0.78, 1.18, 0.82); head.castShadow = true; this.model.add(head);
    const face = new THREE.Mesh(new THREE.SphereGeometry(0.21, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.65), bone);
    face.position.set(0, 2.51, 0.12); face.scale.set(0.76, 1.15, 0.45); face.rotation.x = -0.16; this.model.add(face);
    for (const side of [-1, 1]) {
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.025, 8, 6), this.eyeMaterial);
      eye.position.set(side * 0.073, 2.56, 0.265); eye.scale.y = 0.45; this.model.add(eye);
    }
    const mouth = new THREE.Mesh(new THREE.BoxGeometry(0.085, 0.012, 0.015), shadow);
    mouth.position.set(0, 2.39, 0.275); this.model.add(mouth);

    this.leftArm = this.makeLimb(-0.37, 2.02, 0, 1.34, 0.075, shadow);
    this.rightArm = this.makeLimb(0.37, 2.02, 0, 1.34, 0.075, shadow);
    this.leftLeg = this.makeLimb(-0.17, 1.13, 0, 1.13, 0.095, shadow);
    this.rightLeg = this.makeLimb(0.17, 1.13, 0, 1.13, 0.095, shadow);
    for (const arm of [this.leftArm, this.rightArm]) {
      const hand = new THREE.Mesh(new THREE.SphereGeometry(0.095, 8, 6), bone);
      hand.position.y = -1.35; hand.scale.set(0.7, 1.5, 0.55); arm.add(hand);
      for (let i = 0; i < 3; i++) {
        const finger = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.018, 0.24, 5), bone);
        finger.position.set((i - 1) * 0.035, -1.49, 0.025); arm.add(finger);
      }
    }
    for (let i = 0; i < 7; i++) {
      const strip = new THREE.Mesh(new THREE.ConeGeometry(0.11, 0.65 + (i % 3) * 0.16, 4), cloth);
      const angle = (i / 7) * Math.PI * 2;
      strip.position.set(Math.cos(angle) * 0.26, 0.9, Math.sin(angle) * 0.18);
      strip.rotation.z = Math.cos(angle) * 0.15;
      this.model.add(strip);
    }

    const shadowCanvas = document.createElement("canvas"); shadowCanvas.width = shadowCanvas.height = 64;
    const ctx = shadowCanvas.getContext("2d")!;
    const gradient = ctx.createRadialGradient(32, 32, 2, 32, 32, 32);
    gradient.addColorStop(0, "rgba(0,0,0,.65)"); gradient.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = gradient; ctx.fillRect(0, 0, 64, 64);
    const contact = new THREE.Mesh(new THREE.PlaneGeometry(1.25, 0.85), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(shadowCanvas), transparent: true, depthWrite: false }));
    contact.rotation.x = -Math.PI / 2; contact.position.y = 0.018; this.group.add(contact);
  }

  private makeLimb(x: number, y: number, z: number, length: number, radius: number, material: THREE.Material): THREE.Group {
    const joint = new THREE.Group();
    joint.position.set(x, y, z);
    const limb = new THREE.Mesh(new THREE.CylinderGeometry(radius * 0.7, radius, length, 7), material);
    limb.position.y = -length / 2; limb.castShadow = true; joint.add(limb);
    const cap = new THREE.Mesh(new THREE.SphereGeometry(radius * 1.15, 8, 6), material);
    joint.add(cap);
    this.model.add(joint);
    return joint;
  }

  reset(): void {
    this.mode = "dormant";
    this.group.visible = false;
    this.group.position.set(4.9, 0, -3.5);
    this.group.rotation.set(0, 0, 0);
    this.model.position.set(0, 0, 0);
    this.caught = this.justSpotted = this.escapedChase = this.repelled = false;
    this.danger = 0;
    this.distanceToPlayer = 99;
    this.dormantTimer = MONSTER.activationDelay;
    this.stateTimer = this.lostTimer = this.stuckTimer = 0;
    this.waypoint = 0;
  }

  activate(playerPosition?: THREE.Vector3): void {
    if (this.mode !== "dormant") return;
    const candidates: Array<[number, number]> = [[4.9, -3.4], [8.7, 3.7], [-0.2, -4.0]];
    let chosen = candidates[0];
    if (playerPosition) {
      let best = -1;
      for (const candidate of candidates) {
        const dx = candidate[0] - playerPosition.x, dz = candidate[1] - playerPosition.z;
        const distance = dx * dx + dz * dz;
        if (distance > best) { best = distance; chosen = candidate; }
      }
    }
    this.group.position.set(chosen[0], 0, chosen[1]);
    this.group.visible = true;
    this.mode = "patrol";
    this.stateTimer = 0;
  }

  hear(position: THREE.Vector3, radius: number): void {
    if (this.mode === "dormant") {
      if (radius >= 7) this.activate(position);
      else return;
    }
    if (this.mode === "chase") return;
    const dx = position.x - this.group.position.x, dz = position.z - this.group.position.z;
    if (dx * dx + dz * dz > radius * radius) return;
    this.investigateTarget.copy(position);
    this.mode = "investigate";
    this.stateTimer = 0;
  }

  update(
    dt: number,
    playerPosition: THREE.Vector3,
    playerEye: THREE.Vector3,
    cameraForward: THREE.Vector3,
    hidden: boolean,
    crouched: boolean,
    flashlight: boolean,
  ): void {
    this.justSpotted = false;
    this.escapedChase = false;
    this.repelled = false;
    if (this.mode === "dormant") {
      this.dormantTimer -= dt;
      if (this.dormantTimer <= 0) this.activate(playerPosition);
      this.danger = 0;
      return;
    }
    this.activeTime += dt;
    this.stateTimer += dt;
    _toPlayer.copy(playerPosition).sub(this.group.position); _toPlayer.y = 0;
    const distance = Math.max(0.001, _toPlayer.length());
    this.distanceToPlayer = distance;
    const seesPlayer = !hidden && distance < (flashlight ? MONSTER.sightDistance : crouched ? 2.35 : MONSTER.darkSightDistance)
      && this.world.hasLineOfSight(this.group.position, playerPosition);

    _direction.copy(this.group.position).sub(playerEye).normalize();
    const aimedAt = cameraForward.dot(_direction) > 0.91;
    this.repelled = flashlight && aimedAt && distance < MONSTER.repelDistance && this.world.hasLineOfSight(playerPosition, this.group.position);

    if (seesPlayer) {
      if (this.mode !== "chase") this.justSpotted = true;
      this.mode = "chase";
      this.lastKnown.copy(playerPosition);
      this.lostTimer = 0;
    } else if (this.mode === "chase") {
      this.lostTimer += dt;
      if (this.lostTimer > 1.25 || hidden) {
        this.mode = "search";
        this.stateTimer = 0;
        this.escapedChase = true;
      }
    }

    let speed = 0;
    if (this.mode === "chase") {
      _target.copy(seesPlayer ? playerPosition : this.lastKnown);
      speed = MONSTER.chaseSpeed * (this.repelled ? 0.36 : 1);
      if (!seesPlayer && this.group.position.distanceToSquared(this.lastKnown) < 0.35) {
        this.mode = "search"; this.stateTimer = 0; this.escapedChase = true;
      }
      if (!hidden && distance < MONSTER.catchDistance) this.caught = true;
    } else if (this.mode === "investigate") {
      _target.copy(this.investigateTarget);
      speed = MONSTER.investigateSpeed * (this.repelled ? 0.55 : 1);
      if (this.group.position.distanceToSquared(this.investigateTarget) < 0.35) { this.mode = "search"; this.stateTimer = 0; }
    } else if (this.mode === "search") {
      _target.copy(this.lastKnown.lengthSq() > 0 ? this.lastKnown : this.investigateTarget);
      this.group.rotation.y += dt * 0.55;
      if (this.stateTimer > MONSTER.searchDuration) { this.mode = "patrol"; this.stateTimer = 0; this.lastKnown.set(0, 0, 0); }
    } else {
      const waypoint = PATROL[this.waypoint % PATROL.length];
      _target.set(waypoint[0], 0, waypoint[1]);
      speed = MONSTER.patrolSpeed * (this.repelled ? 0.55 : 1);
      if (this.group.position.distanceToSquared(_target) < 0.3 || this.stuckTimer > 2.2) {
        this.waypoint = (this.waypoint + 1) % PATROL.length;
        this.stuckTimer = 0;
      }
    }

    if (speed > 0) this.moveToward(_target, speed, dt);
    this.animate(dt, speed);
    const proximity = Math.max(0, 1 - distance / 7);
    this.danger = this.mode === "chase" ? Math.max(0.35, proximity) : proximity * 0.55;
    this.eyeMaterial.emissiveIntensity = this.repelled ? 0.35 : this.mode === "chase" ? 3.2 : 1.3;
  }

  private moveToward(target: THREE.Vector3, speed: number, dt: number): void {
    _direction.copy(target).sub(this.group.position); _direction.y = 0;
    const distance = _direction.length();
    if (distance < 0.03) return;
    _direction.multiplyScalar(1 / distance);
    const oldX = this.group.position.x, oldZ = this.group.position.z;
    const step = Math.min(distance, speed * dt);
    const blocked = this.world.resolveMove(this.group.position, _direction.x * step, _direction.z * step, 0.27);
    const moved = Math.hypot(this.group.position.x - oldX, this.group.position.z - oldZ);
    this.stuckTimer = moved < step * 0.15 ? this.stuckTimer + dt : 0;
    if (blocked && moved < step * 0.2) {
      const side = Math.sin(this.activeTime * 0.7 + this.waypoint) > 0 ? 1 : -1;
      this.world.resolveMove(this.group.position, -_direction.z * step * side, _direction.x * step * side, 0.27);
    }
    const desired = Math.atan2(_direction.x, _direction.z);
    const difference = Math.atan2(Math.sin(desired - this.group.rotation.y), Math.cos(desired - this.group.rotation.y));
    this.group.rotation.y += difference * Math.min(1, dt * 7);
  }

  private animate(dt: number, speed: number): void {
    this.walkPhase += dt * (2.2 + speed * 3.2);
    const stride = Math.min(0.58, speed * 0.21);
    const swing = Math.sin(this.walkPhase) * stride;
    this.leftArm.rotation.x = swing * 0.75 + 0.08;
    this.rightArm.rotation.x = -swing * 0.75 - 0.08;
    this.leftLeg.rotation.x = -swing;
    this.rightLeg.rotation.x = swing;
    this.model.position.y = Math.abs(Math.sin(this.walkPhase)) * Math.min(0.045, speed * 0.018);
    this.model.rotation.z = Math.sin(this.activeTime * 0.8) * 0.015;
  }

  teleport(x: number, z: number): void {
    this.activate();
    this.group.position.set(x, 0, z);
  }

  dispose(): void {
    this.group.removeFromParent();
    this.group.traverse(object => {
      if (object instanceof THREE.Mesh) {
        object.geometry.dispose();
        const materials = Array.isArray(object.material) ? object.material : [object.material];
        for (const material of materials) material.dispose();
      }
    });
  }
}
