import * as THREE from "three";
import { mulberry32 } from "./random";
import { COLORS } from "./config";

function canvasTexture(size: number, paint: (ctx: CanvasRenderingContext2D, size: number) => void, repeatX = 1, repeatY = 1): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  paint(ctx, size);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(repeatX, repeatY);
  texture.anisotropy = 4;
  return texture;
}

function wallpaperTexture(): THREE.CanvasTexture {
  return canvasTexture(512, (ctx, size) => {
    const random = mulberry32(1301);
    ctx.fillStyle = "#4a504c";
    ctx.fillRect(0, 0, size, size);
    for (let x = 0; x < size; x += 28) {
      ctx.fillStyle = x % 56 === 0 ? "rgba(190,190,163,.055)" : "rgba(0,0,0,.045)";
      ctx.fillRect(x, 0, 13, size);
      ctx.strokeStyle = "rgba(210,205,180,.04)";
      ctx.beginPath();
      for (let y = 0; y < size; y += 32) {
        ctx.moveTo(x + 6, y + 4);
        ctx.bezierCurveTo(x + 15, y + 9, x - 2, y + 17, x + 7, y + 26);
      }
      ctx.stroke();
    }
    for (let i = 0; i < 95; i++) {
      const x = random() * size, y = random() * size;
      const radius = 4 + random() * 34;
      ctx.fillStyle = `rgba(${20 + random() * 20},${25 + random() * 20},${23 + random() * 15},${0.06 + random() * 0.2})`;
      ctx.beginPath();
      for (let p = 0; p < 8; p++) {
        const angle = (p / 8) * Math.PI * 2;
        const r = radius * (0.45 + random() * 0.65);
        const px = x + Math.cos(angle) * r, py = y + Math.sin(angle) * r;
        if (p === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
      }
      ctx.closePath(); ctx.fill();
    }
    const mold = ctx.createLinearGradient(0, size * 0.65, 0, size);
    mold.addColorStop(0, "rgba(5,15,12,0)"); mold.addColorStop(1, "rgba(3,12,9,.52)");
    ctx.fillStyle = mold; ctx.fillRect(0, size * 0.6, size, size * 0.4);
    for (let i = 0; i < 1000; i++) {
      const shade = 40 + Math.floor(random() * 45);
      ctx.fillStyle = `rgba(${shade},${shade},${shade},.06)`;
      ctx.fillRect(random() * size, random() * size, 1, 1);
    }
  }, 2.4, 1);
}

function woodTexture(floor = false): THREE.CanvasTexture {
  return canvasTexture(512, (ctx, size) => {
    const random = mulberry32(floor ? 1313 : 1307);
    ctx.fillStyle = floor ? "#33271f" : "#3b2a20";
    ctx.fillRect(0, 0, size, size);
    const plank = floor ? 64 : 128;
    for (let y = 0; y < size; y += plank) {
      ctx.fillStyle = `rgba(0,0,0,${0.08 + random() * 0.12})`;
      ctx.fillRect(0, y, size, 3);
      for (let i = 0; i < 22; i++) {
        ctx.strokeStyle = `rgba(${80 + random() * 35},${56 + random() * 20},${35 + random() * 15},${0.05 + random() * 0.13})`;
        ctx.lineWidth = 0.6 + random() * 1.5;
        ctx.beginPath();
        const sy = y + random() * plank;
        ctx.moveTo(0, sy);
        for (let x = 0; x <= size; x += 32) ctx.lineTo(x, sy + Math.sin(x * 0.035 + random()) * 2.5);
        ctx.stroke();
      }
      if (floor) {
        const seam = ((y / plank) % 2) * size * 0.45;
        ctx.fillStyle = "rgba(0,0,0,.28)";
        ctx.fillRect(seam, y, 2, plank);
      }
    }
    for (let i = 0; i < 50; i++) {
      ctx.fillStyle = "rgba(4,3,2,.18)";
      ctx.beginPath(); ctx.ellipse(random() * size, random() * size, 2 + random() * 8, 1 + random() * 3, 0, 0, Math.PI * 2); ctx.fill();
    }
  }, floor ? 3 : 1.5, floor ? 3 : 1.5);
}

function ceilingTexture(): THREE.CanvasTexture {
  return canvasTexture(256, (ctx, size) => {
    const random = mulberry32(1319);
    ctx.fillStyle = "#555650"; ctx.fillRect(0, 0, size, size);
    for (let i = 0; i < 70; i++) {
      const x = random() * size, y = random() * size, r = 4 + random() * 30;
      const g = ctx.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, "rgba(47,40,29,.18)"); g.addColorStop(1, "rgba(47,40,29,0)");
      ctx.fillStyle = g; ctx.fillRect(x - r, y - r, r * 2, r * 2);
    }
    ctx.strokeStyle = "rgba(30,30,28,.35)"; ctx.lineWidth = 1;
    for (let i = 0; i < 8; i++) {
      let x = random() * size, y = random() * size;
      ctx.beginPath(); ctx.moveTo(x, y);
      for (let p = 0; p < 8; p++) { x += (random() - .5) * 25; y += random() * 14; ctx.lineTo(x, y); }
      ctx.stroke();
    }
  }, 3, 3);
}

function rugTexture(): THREE.CanvasTexture {
  return canvasTexture(512, (ctx, size) => {
    ctx.fillStyle = "#3f2023"; ctx.fillRect(0, 0, size, size);
    for (let inset = 15; inset < 85; inset += 18) {
      ctx.strokeStyle = inset % 36 ? "#75624c" : "#2e3834";
      ctx.lineWidth = 7; ctx.strokeRect(inset, inset, size - inset * 2, size - inset * 2);
    }
    ctx.translate(size / 2, size / 2); ctx.rotate(Math.PI / 4);
    ctx.strokeStyle = "#77644b"; ctx.lineWidth = 12; ctx.strokeRect(-105, -105, 210, 210);
    ctx.strokeStyle = "#283a35"; ctx.lineWidth = 6; ctx.strokeRect(-70, -70, 140, 140);
    const random = mulberry32(1323);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    for (let i = 0; i < 3500; i++) {
      ctx.fillStyle = `rgba(10,10,8,${random() * .22})`;
      ctx.fillRect(random() * size, random() * size, 1 + random() * 3, 1 + random() * 3);
    }
  });
}

export interface WorldMaterials {
  wall: THREE.MeshStandardMaterial;
  floor: THREE.MeshStandardMaterial;
  wood: THREE.MeshStandardMaterial;
  woodLight: THREE.MeshStandardMaterial;
  ceiling: THREE.MeshStandardMaterial;
  metal: THREE.MeshStandardMaterial;
  rust: THREE.MeshStandardMaterial;
  cloth: THREE.MeshStandardMaterial;
  clothDark: THREE.MeshStandardMaterial;
  paper: THREE.MeshStandardMaterial;
  rug: THREE.MeshStandardMaterial;
  black: THREE.MeshStandardMaterial;
  glass: THREE.MeshPhysicalMaterial;
}

export function createWorldMaterials(): WorldMaterials {
  return {
    wall: new THREE.MeshStandardMaterial({ map: wallpaperTexture(), color: 0xe0e2d8, roughness: 0.97 }),
    floor: new THREE.MeshStandardMaterial({ map: woodTexture(true), color: 0xd5c9ba, roughness: 0.9 }),
    wood: new THREE.MeshStandardMaterial({ map: woodTexture(), color: 0xbda58d, roughness: 0.83 }),
    woodLight: new THREE.MeshStandardMaterial({ map: woodTexture(), color: 0xd0b99f, roughness: 0.82 }),
    ceiling: new THREE.MeshStandardMaterial({ map: ceilingTexture(), color: 0xd0d1c8, roughness: 1 }),
    metal: new THREE.MeshStandardMaterial({ color: 0x4b5150, roughness: 0.48, metalness: 0.72 }),
    rust: new THREE.MeshStandardMaterial({ color: COLORS.rust, roughness: 0.88, metalness: 0.35 }),
    cloth: new THREE.MeshStandardMaterial({ color: 0x645c50, roughness: 1, side: THREE.DoubleSide }),
    clothDark: new THREE.MeshStandardMaterial({ color: 0x3f3332, roughness: 1, side: THREE.DoubleSide }),
    paper: new THREE.MeshStandardMaterial({ color: 0xbeb69f, roughness: 1, side: THREE.DoubleSide }),
    rug: new THREE.MeshStandardMaterial({ map: rugTexture(), color: 0xd4cec2, roughness: 1 }),
    black: new THREE.MeshStandardMaterial({ color: 0x090c0d, roughness: 0.9 }),
    glass: new THREE.MeshPhysicalMaterial({ color: 0x829da6, roughness: 0.2, transmission: 0.35, transparent: true, opacity: 0.38, metalness: 0.1 }),
  };
}

export function makePortraitMaterial(variant: number): THREE.MeshStandardMaterial {
  const texture = canvasTexture(256, (ctx, size) => {
    const random = mulberry32(1400 + variant);
    ctx.fillStyle = variant % 2 ? "#242b29" : "#342c28"; ctx.fillRect(0, 0, size, size);
    const glow = ctx.createRadialGradient(128, 104, 5, 128, 110, 105);
    glow.addColorStop(0, "#8b8270"); glow.addColorStop(.45, "#514e43"); glow.addColorStop(1, "rgba(20,22,20,0)");
    ctx.fillStyle = glow; ctx.fillRect(0, 0, size, size);
    ctx.fillStyle = "#171b19";
    ctx.beginPath(); ctx.ellipse(128, 105, 52, 70, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.moveTo(50, 256); ctx.quadraticCurveTo(55, 157, 128, 160); ctx.quadraticCurveTo(205, 157, 211, 256); ctx.fill();
    ctx.fillStyle = "#9c927c";
    ctx.beginPath(); ctx.ellipse(107, 104, 7, 3, 0, 0, Math.PI * 2); ctx.ellipse(150, 104, 7, 3, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = "rgba(195,185,155,.2)"; ctx.lineWidth = 1;
    for (let i = 0; i < 45; i++) { ctx.beginPath(); ctx.moveTo(random() * size, random() * size); ctx.lineTo(random() * size, random() * size); ctx.stroke(); }
  });
  return new THREE.MeshStandardMaterial({ map: texture, roughness: 0.92 });
}
