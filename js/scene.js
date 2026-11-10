// js/scene.js
// Escena WebGL con Three.js: busto 3D interactivo, texturas WebP multicapa y shader de rayos X

import {
  ACESFilmicToneMapping,
  Color as Color2,
  DataTexture,
  DirectionalLight,
  Group as Group2,
  LinearFilter,
  LinearMipmapLinearFilter,
  Mesh as Mesh2,
  PerspectiveCamera,
  PlaneGeometry,
  PMREMGenerator,
  RepeatWrapping as RepeatWrapping2,
  RGBAFormat,
  Scene,
  ShaderMaterial,
  BufferGeometry as BufferGeometry2,
  SRGBColorSpace as SRGBColorSpace2,
  Texture,
  TextureLoader,
  UnsignedByteType,
  Vector2,
  Vector3 as Vector32,
  Vector4,
  WebGLRenderer
} from "three";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";

// Texturas WebP del Hero
export const HERO_SUBJECT = "photo";
const hero_photo_default = "./assets/hero-photo.webp";
const hero_xray_default = "./assets/hero-xray.webp";
const hero_edge_default = "./assets/hero-edge.webp";
const hero_arc_default = "./assets/hero-arc.webp";

// src/hero/avatar.js
import {
  BufferGeometry,
  CanvasTexture,
  CatmullRomCurve3,
  Color,
  CylinderGeometry,
  ExtrudeGeometry,
  Float32BufferAttribute,
  Group,
  IcosahedronGeometry,
  Matrix4,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  Quaternion,
  RepeatWrapping,
  Shape,
  SphereGeometry,
  SRGBColorSpace,
  TorusGeometry,
  TubeGeometry,
  Vector3
} from "three";
import { ConvexHull } from "three/addons/math/ConvexHull.js";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
var AVATAR_CONFIG = {
  skin: "#d6a283",
  hair: "#2a1f19",
  hairLight: "#6b5d52",
  cap: { crown: "#5f4130", brim: "#d0bc9a", seam: "#4a3123" },
  // the techwear jacket: a night-navy body, slate plates, a dark-red lining, and the neon that is the site's own accent (red)
  jacket: { base: "#121827", shoulder: "#192033", collar: "#1b2131", lining: "#46100f", plate: "#37425a", strap: "#2a3347", neon: "#ff1a1a" },
  glasses: { frame: "#d0d7df", lens: "#8a949c", lensGlow: "#1a1f23" },
  // His eyes, laid on the face (see `buildEyes`). Off: the shades are always on and hide them, and the first version of them
  // was not good enough to show. They are kept for the day the shades come off — set show to true to see them.
  eyes: { show: false, white: "#e8dfd6", iris: "#2d1b12", ring: "#4b2d1c", pupil: "#0a0605", lash: "#1a100c" },
  // where the hair is gathered. "low" sits under a cap as well as on a bare head, so the cap can come and go; "high" is for bare only
  bun: "low",
  accessories: {
    earrings: true,
    airpod: false,
    chain: true,
    stubble: true,
    teddyPatch: true,
    sunglasses: "worn",
    // "worn" | "off"
    cap: "off"
    // "off" | "worn" — he has one (with a teddy patch) and it is all still built; it is off until a page puts it on
  }
};
var CAP = { y: 1.66, z: -0.29, rx: 0.8, ry: 0.78, rz: 0.95, tilt: -0.17, brim: 0.5, brimPitch: 0.28 };
var GLASSES = { y: 1.23, z: 0.72, bend: 0.85 };
var clamp = (v, a, b) => Math.min(b, Math.max(a, v));
var smooth = (a, b, x) => {
  const t2 = clamp((x - a) / (b - a), 0, 1);
  return t2 * t2 * (3 - 2 * t2);
};
function rng(seed) {
  let s = seed >>> 0;
  return () => {
    s = s + 1831565813 >>> 0;
    let t2 = Math.imul(s ^ s >>> 15, 1 | s);
    t2 = t2 + Math.imul(t2 ^ t2 >>> 7, 61 | t2) ^ t2;
    return ((t2 ^ t2 >>> 14) >>> 0) / 4294967296;
  };
}
var std = (color, o = {}) => new MeshStandardMaterial({ color, roughness: 0.74, metalness: 0, flatShading: true, ...o });
var metal = (color, rough = 0.24, o = {}) => new MeshStandardMaterial({ color, roughness: rough, metalness: 1, flatShading: true, ...o });
var tag = (mesh, name) => {
  mesh.name = name;
  return mesh;
};
var smin = (a, b, k) => {
  const h = Math.max(k - Math.abs(a - b), 0) / k;
  return Math.min(a, b) - h * h * k * 0.25;
};
var ell = (x, y, z, cx, cy, cz, rx, ry, rz) => {
  const px = x - cx, py = y - cy, pz = z - cz;
  const k0 = Math.hypot(px / rx, py / ry, pz / rz);
  const k1 = Math.hypot(px / (rx * rx), py / (ry * ry), pz / (rz * rz));
  return k1 < 1e-9 ? -Math.min(rx, ry, rz) : k0 * (k0 - 1) / k1;
};
function triDist2(px, py, pz, ax, ay, az, bx, by, bz, cx, cy, cz) {
  const abx = bx - ax, aby = by - ay, abz = bz - az, acx = cx - ax, acy = cy - ay, acz = cz - az;
  const apx = px - ax, apy = py - ay, apz = pz - az;
  const d1 = abx * apx + aby * apy + abz * apz, d2 = acx * apx + acy * apy + acz * apz;
  if (d1 <= 0 && d2 <= 0) return apx * apx + apy * apy + apz * apz;
  const bpx = px - bx, bpy = py - by, bpz = pz - bz;
  const d3 = abx * bpx + aby * bpy + abz * bpz, d4 = acx * bpx + acy * bpy + acz * bpz;
  if (d3 >= 0 && d4 <= d3) return bpx * bpx + bpy * bpy + bpz * bpz;
  const vc = d1 * d4 - d3 * d2;
  if (vc <= 0 && d1 >= 0 && d3 <= 0) {
    const v2 = d1 / (d1 - d3), qx2 = ax + abx * v2 - px, qy2 = ay + aby * v2 - py, qz2 = az + abz * v2 - pz;
    return qx2 * qx2 + qy2 * qy2 + qz2 * qz2;
  }
  const cpx = px - cx, cpy = py - cy, cpz = pz - cz;
  const d5 = abx * cpx + aby * cpy + abz * cpz, d6 = acx * cpx + acy * cpy + acz * cpz;
  if (d6 >= 0 && d5 <= d6) return cpx * cpx + cpy * cpy + cpz * cpz;
  const vb = d5 * d2 - d1 * d6;
  if (vb <= 0 && d2 >= 0 && d6 <= 0) {
    const w2 = d2 / (d2 - d6), qx2 = ax + acx * w2 - px, qy2 = ay + acy * w2 - py, qz2 = az + acz * w2 - pz;
    return qx2 * qx2 + qy2 * qy2 + qz2 * qz2;
  }
  const va = d3 * d6 - d5 * d4;
  if (va <= 0 && d4 - d3 >= 0 && d5 - d6 >= 0) {
    const w2 = (d4 - d3) / (d4 - d3 + (d5 - d6)), qx2 = bx + (cx - bx) * w2 - px, qy2 = by + (cy - by) * w2 - py, qz2 = bz + (cz - bz) * w2 - pz;
    return qx2 * qx2 + qy2 * qy2 + qz2 * qz2;
  }
  const den = 1 / (va + vb + vc), v = vb * den, w = vc * den;
  const qx = ax + abx * v + acx * w - px, qy = ay + aby * v + acy * w - py, qz = az + abz * v + acz * w - pz;
  return qx * qx + qy * qy + qz * qz;
}
var Hull = class {
  constructor(points) {
    const pts = points.map((p) => p.isVector3 ? p.clone() : new Vector3(p[0], p[1], p[2]));
    const ctr = new Vector3();
    for (const p of pts) ctr.add(p);
    ctr.multiplyScalar(1 / pts.length);
    const ch = new ConvexHull().setFromPoints(pts);
    const tris = [];
    const ab = new Vector3(), ac = new Vector3(), nn = new Vector3(), mid = new Vector3();
    for (const f of ch.faces) {
      const vs = [];
      let e = f.edge;
      do {
        vs.push(e.head().point);
        e = e.next;
      } while (e !== f.edge);
      for (let i = 1; i < vs.length - 1; i++) {
        let [a, b, c] = [vs[0], vs[i], vs[i + 1]];
        ab.subVectors(b, a);
        ac.subVectors(c, a);
        nn.crossVectors(ab, ac);
        mid.copy(a).add(b).add(c).multiplyScalar(1 / 3).sub(ctr);
        if (nn.dot(mid) < 0) [b, c] = [c, b];
        tris.push([a, b, c]);
      }
    }
    const T = tris.length;
    this.count = T;
    this.v = new Float64Array(T * 9);
    this.n = new Float64Array(T * 3);
    this.c = new Float64Array(T);
    this.pv = new Float64Array(T);
    tris.forEach(([a, b, c], i) => {
      this.v.set([a.x, a.y, a.z, b.x, b.y, b.z, c.x, c.y, c.z], i * 9);
      ab.subVectors(b, a);
      ac.subVectors(c, a);
      nn.crossVectors(ab, ac).normalize();
      this.n.set([nn.x, nn.y, nn.z], i * 3);
      this.c[i] = nn.dot(a);
    });
    let R = 0;
    for (const p of pts) R = Math.max(R, p.distanceTo(ctr));
    this.cx = ctr.x;
    this.cy = ctr.y;
    this.cz = ctr.z;
    this.R = R;
    this.points = pts;
  }
  /** Signed distance to the surface. Far away it is only a lower bound, which is all the shell needs. */
  sdf(x, y, z) {
    const far = Math.hypot(x - this.cx, y - this.cy, z - this.cz) - this.R;
    if (far > 0.45) return far;
    const { n, c, pv, v, count } = this;
    let m = -Infinity;
    for (let i = 0; i < count; i++) {
      const s = n[i * 3] * x + n[i * 3 + 1] * y + n[i * 3 + 2] * z - c[i];
      pv[i] = s;
      if (s > m) m = s;
    }
    if (m <= 0 || m > 0.4) return m;
    let best = Infinity;
    for (let i = 0; i < count; i++) {
      if (pv[i] <= 0 || pv[i] >= best) continue;
      const o = i * 9;
      const d = Math.sqrt(triDist2(x, y, z, v[o], v[o + 1], v[o + 2], v[o + 3], v[o + 4], v[o + 5], v[o + 6], v[o + 7], v[o + 8]));
      if (d < best) best = d;
    }
    return best;
  }
  /** The z at which the vertical line through (x, y) leaves the solid towards +z. */
  frontZ(x, y) {
    let z = Infinity;
    for (let i = 0; i < this.count; i++) {
      const nz = this.n[i * 3 + 2];
      if (nz > 1e-6) z = Math.min(z, (this.c[i] - this.n[i * 3] * x - this.n[i * 3 + 1] * y) / nz);
    }
    return z;
  }
  /** The surface straight in front of (x, y): its z and the outward normal of the plane it lies on. */
  front(x, y, out = {}) {
    let z = Infinity, k = 0;
    for (let i = 0; i < this.count; i++) {
      const nz = this.n[i * 3 + 2];
      if (nz <= 1e-6) continue;
      const zi = (this.c[i] - this.n[i * 3] * x - this.n[i * 3 + 1] * y) / nz;
      if (zi < z) {
        z = zi;
        k = i;
      }
    }
    out.z = z;
    out.nx = this.n[k * 3];
    out.ny = this.n[k * 3 + 1];
    out.nz = this.n[k * 3 + 2];
    return out;
  }
  /** Where a unit ray from a point inside leaves the solid: the distance, and the outward normal of the plane it leaves by. */
  rayHit(ox, oy, oz, dx, dy, dz, out = {}) {
    let t2 = Infinity, k = 0;
    for (let i = 0; i < this.count; i++) {
      const nx = this.n[i * 3], ny = this.n[i * 3 + 1], nz = this.n[i * 3 + 2];
      const den = nx * dx + ny * dy + nz * dz;
      if (den <= 1e-9) continue;
      const ti = (this.c[i] - nx * ox - ny * oy - nz * oz) / den;
      if (ti < t2) {
        t2 = ti;
        k = i;
      }
    }
    out.t = t2;
    out.nx = this.n[k * 3];
    out.ny = this.n[k * 3 + 1];
    out.nz = this.n[k * 3 + 2];
    return out;
  }
  /** Distance along a unit ray, from a point inside, to the surface. */
  rayExit(ox, oy, oz, dx, dy, dz) {
    let t2 = Infinity;
    for (let i = 0; i < this.count; i++) {
      const nx = this.n[i * 3], ny = this.n[i * 3 + 1], nz = this.n[i * 3 + 2];
      const den = nx * dx + ny * dy + nz * dz;
      if (den > 1e-9) t2 = Math.min(t2, (this.c[i] - nx * ox - ny * oy - nz * oz) / den);
    }
    return t2;
  }
  /** Flat-shaded, non-indexed triangles; `paint(centroid, normal, out)` picks a colour per facet (coplanar facets agree). */
  geometry(paint, jitter = 0) {
    const pos = [], nor = [], col = [];
    const out = new Color(), c = new Vector3(), n = new Vector3();
    for (let i = 0; i < this.count; i++) {
      const o = i * 9;
      c.set((this.v[o] + this.v[o + 3] + this.v[o + 6]) / 3, (this.v[o + 1] + this.v[o + 4] + this.v[o + 7]) / 3, (this.v[o + 2] + this.v[o + 5] + this.v[o + 8]) / 3);
      n.set(this.n[i * 3], this.n[i * 3 + 1], this.n[i * 3 + 2]);
      if (paint) {
        paint(c, n, out);
        if (jitter) {
          const key = rng(Math.round(n.x * 40 + 91) * 7919 + Math.round(n.y * 40 + 91) * 104729 + Math.round(n.z * 40 + 91) * 1299709 + Math.round(this.c[i] * 30 + 91))();
          out.multiplyScalar(1 + (key * 2 - 1) * jitter);
        }
      }
      for (let k = 0; k < 3; k++) {
        pos.push(this.v[o + k * 3], this.v[o + k * 3 + 1], this.v[o + k * 3 + 2]);
        nor.push(n.x, n.y, n.z);
        if (paint) col.push(out.r, out.g, out.b);
      }
    }
    const g = new BufferGeometry();
    g.setAttribute("position", new Float32BufferAttribute(pos, 3));
    g.setAttribute("normal", new Float32BufferAttribute(nor, 3));
    if (paint) g.setAttribute("color", new Float32BufferAttribute(col, 3));
    return g;
  }
};
function mirrorX(g) {
  const p = g.attributes.position, n = g.attributes.normal, c = g.attributes.color;
  for (let i = 0; i < p.count; i++) {
    p.setX(i, -p.getX(i));
    if (n) n.setX(i, -n.getX(i));
  }
  for (let i = 0; i < p.count; i += 3) {
    for (const a of [p, n, c]) {
      if (!a) continue;
      const x = a.getX(i + 1), y = a.getY(i + 1), z = a.getZ(i + 1);
      a.setXYZ(i + 1, a.getX(i + 2), a.getY(i + 2), a.getZ(i + 2));
      a.setXYZ(i + 2, x, y, z);
    }
  }
  return g;
}
var HW = 1.1;
var widen = (pts, k = HW) => pts.map(([x, y, z]) => [x * k, y, z]);
var mir = (pts) => {
  const o = [];
  for (const p of pts) {
    o.push(p);
    if (p[0] > 1e-6) o.push([-p[0], p[1], p[2]]);
  }
  return o;
};
var ring = (y, pairs) => pairs.map(([x, z]) => [x, y, z]);
function beam(p, q, a, b) {
  const t2 = new Vector3().subVectors(q, p).normalize();
  const ref = Math.abs(t2.y) > 0.9 ? new Vector3(0, 0, 1) : new Vector3(0, 1, 0);
  const s = new Vector3().crossVectors(t2, ref).normalize();
  const u = new Vector3().crossVectors(t2, s).normalize();
  const out = [];
  for (const e of [p, q]) for (const [i, j] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) out.push(e.clone().addScaledVector(s, a * i).addScaledVector(u, b * j));
  return out;
}
var HEAD_PTS = widen(mir([
  ...ring(0.25, [[0, 0.4], [0.2, 0.35], [0.27, 0.08], [0.2, -0.32], [0, -0.42]]),
  ...ring(0.33, [[0, 0.53], [0.25, 0.48], [0.36, 0.22], [0.38, -0.12], [0.3, -0.52], [0, -0.6]]),
  ...ring(0.52, [[0, 0.55], [0.3, 0.5], [0.45, 0.28], [0.5, -0.08], [0.46, -0.48], [0.3, -0.7], [0, -0.76]]),
  ...ring(0.8, [[0, 0.53], [0.35, 0.49], [0.51, 0.29], [0.56, -0.1], [0.54, -0.5], [0.36, -0.82], [0, -0.88]]),
  ...ring(1.1, [[0, 0.54], [0.37, 0.5], [0.55, 0.28], [0.59, -0.1], [0.57, -0.55], [0.38, -0.9], [0, -0.95]]),
  ...ring(1.46, [[0, 0.58], [0.36, 0.54], [0.53, 0.31], [0.59, -0.1], [0.57, -0.56], [0.38, -0.93], [0, -0.98]]),
  ...ring(1.8, [[0, 0.5], [0.34, 0.47], [0.51, 0.24], [0.58, -0.15], [0.56, -0.6], [0.37, -0.95], [0, -1]]),
  ...ring(2.05, [[0, 0.32], [0.29, 0.29], [0.45, 0.08], [0.51, -0.25], [0.47, -0.66], [0.31, -0.92], [0, -0.97]]),
  ...ring(2.22, [[0, 0.02], [0.21, 0], [0.31, -0.2], [0.29, -0.5], [0.19, -0.72], [0, -0.78]]),
  [0, 2.27, -0.38]
]));
var NOSE_PTS = mir([
  [0, 1.34, 0.59],
  [0.075, 1.32, 0.56],
  [0, 1.12, 0.7],
  [0.115, 1.1, 0.6],
  [0, 0.89, 0.83],
  [0.12, 0.87, 0.75],
  [0.2, 0.84, 0.6],
  [0.19, 0.96, 0.56],
  [0, 0.8, 0.72],
  [0.12, 0.79, 0.68],
  [0.21, 0.82, 0.55]
]);
var LIP_UP_PTS = mir([
  [0, 0.706, 0.548],
  [0.1, 0.702, 0.538],
  [0.19, 0.676, 0.492],
  [0, 0.673, 0.563],
  [0.1, 0.671, 0.553],
  [0.19, 0.666, 0.497],
  [0, 0.69, 0.5],
  [0.17, 0.68, 0.44]
]);
var LIP_LO_PTS = mir([
  [0, 0.671, 0.563],
  [0.1, 0.669, 0.553],
  [0.19, 0.665, 0.497],
  [0, 0.618, 0.556],
  [0.1, 0.622, 0.546],
  [0.155, 0.642, 0.5],
  [0, 0.64, 0.5],
  [0.14, 0.65, 0.44]
]);
var EAR_PTS = widen([
  [0.57, 1.33, -0.1],
  [0.68, 1.28, -0.14],
  [0.715, 1.12, -0.17],
  [0.7, 0.98, -0.16],
  [0.64, 0.95, -0.12],
  [0.56, 1, -0.06],
  [0.58, 1.3, -0.33],
  [0.665, 1.2, -0.35],
  [0.66, 1, -0.3],
  [0.6, 0.96, -0.28],
  // the lobe: a short, full, rounded drop below the rest of the ear
  [0.6, 0.905, -0.12],
  [0.69, 0.91, -0.15],
  [0.69, 0.905, -0.25],
  [0.6, 0.905, -0.28],
  [0.65, 0.868, -0.2]
]);
var NECK_PTS = widen(mir([
  ...ring(0.62, [[0, 0.3], [0.28, 0.24], [0.4, -0.05], [0.31, -0.4], [0, -0.46]]),
  ...ring(-0.45, [[0, 0.3], [0.28, 0.24], [0.4, -0.05], [0.31, -0.4], [0, -0.46]])
]), 1.06);
var SHELL_BOTTOM = -2.45;
var TORSO_PTS = mir([
  [0, 0.04, 0.46],
  [0.5, 0.04, 0.4],
  [0.52, 0.04, -0.46],
  [0, 0.04, -0.52],
  [0, -0.3, 0.6],
  [0.9, -0.3, 0.5],
  [0.96, -0.3, -0.52],
  [0, -0.3, -0.58],
  [0.9, -0.7, 0.6],
  [1.62, -0.7, 0.38],
  [1.66, -0.7, -0.48],
  [0, -0.7, -0.58],
  [1.2, -1.1, 0.66],
  [1.9, -1.1, 0.3],
  [1.92, -1.1, -0.46],
  [0, -1.1, 0.72],
  [0, -1.1, -0.58],
  [1.25, -2.6, 0.7],
  [1.94, -2.6, 0.38],
  [1.96, -2.6, -0.5],
  [0, -2.6, 0.76],
  [0, -2.6, -0.58]
]);
var COLLAR = {
  sides: 12,
  rim: [0.05, 0.19, 0.35, 0.45, 0.38, 0.32, 0.29],
  // rim height: low in the V at the front, tallest beside the jaw
  lean: [0.02, 0.04, 0.08, 0.17, 0.11, 0.06, 0.04],
  // how far the rim stands out from the foot of the wall
  a: 0.6,
  b: 0.55,
  cz: -0.05,
  // half-width, half-depth and centre of the wall's foot
  wall: 0.085,
  footY: -0.12,
  innerY: 0,
  band: 0.055
};
function collarRings() {
  const { sides: n, rim, lean, a, b, cz, wall, footY, innerY } = COLLAR;
  const rings = [];
  for (let i = 0; i < n; i++) {
    const th = i / n * Math.PI * 2, k = Math.min(i, n - i), s = Math.sin(th), c = Math.cos(th);
    const L = lean[k], aa = a + L, bb = b + L * 0.6;
    rings.push({
      s,
      c,
      foot: new Vector3(a * s, footY, cz + b * c),
      rim: new Vector3(aa * s, rim[k], cz + bb * c),
      rimIn: new Vector3((aa - wall) * s, rim[k], cz + (bb - wall) * c),
      footIn: new Vector3((a - wall) * s, innerY, cz + (b - wall) * c)
    });
  }
  return rings;
}
function collarSolids() {
  const R = collarRings(), solids = [];
  for (let i = 0; i < R.length / 2; i += 2) {
    const pts = [];
    for (let k = i; k <= i + 2; k++) {
      const r = R[k % R.length];
      pts.push(r.foot, r.rim, r.footIn, r.rimIn);
    }
    solids.push(new Hull(pts));
  }
  return solids;
}
var PLATE_PTS = [
  [0.88, -0.1, 0.46],
  [1.42, -0.4, 0.48],
  [1.84, -0.68, 0.46],
  [2.08, -1.18, 0.4],
  [0.88, -0.1, -0.46],
  [1.42, -0.4, -0.48],
  [1.84, -0.68, -0.46],
  [2.08, -1.18, -0.44],
  [0.8, -0.38, 0.3],
  [1.4, -0.78, 0.36],
  [1.8, -1.1, 0.34],
  [1.96, -1.52, 0.3],
  [0.8, -0.38, -0.4],
  [1.4, -0.78, -0.4],
  [1.8, -1.1, -0.4],
  [1.96, -1.52, -0.4]
];
var PLATE_CREST = [[0.88, -0.1, 0.475], [1.42, -0.4, 0.495], [1.84, -0.68, 0.475], [2.08, -1.18, 0.415]];
var ZIP_XY = [[-0.17, -0.02], [-0.25, -0.55], [-0.42, -1.15], [-0.66, -1.85], [-0.92, -2.5]];
var SEAM_XY = [[1.02, -0.5], [0.8, -0.92], [0.64, -1.18], [0.64, -2.5]];
var TRACE_XY = [[1.12, -1.72], [1.12, -2.1], [0.9, -2.35]];
var STRAP_XY = [[-1.78, -1.5], [1.78, -1.5]];
var BUCKLE = { x: -0.5, y: -1.5 };
var ZIP_PULL = { x: -0.26, y: -0.62 };
var LIGHTS_XY = [[0.84, -1], [0.97, -1], [1.1, -1]];
function soup(list2) {
  const pos = [], nor = [], col = [];
  const ab = new Vector3(), ac = new Vector3(), n = new Vector3();
  for (const [a, b, c, hint, colour] of list2) {
    ab.subVectors(b, a);
    ac.subVectors(c, a);
    n.crossVectors(ab, ac);
    if (n.lengthSq() < 1e-12) continue;
    n.normalize();
    const flip = n.dot(hint) < 0;
    if (flip) n.negate();
    for (const p of flip ? [a, c, b] : [a, b, c]) {
      pos.push(p.x, p.y, p.z);
      nor.push(n.x, n.y, n.z);
      col.push(colour.r, colour.g, colour.b);
    }
  }
  const g = new BufferGeometry();
  g.setAttribute("position", new Float32BufferAttribute(pos, 3));
  g.setAttribute("normal", new Float32BufferAttribute(nor, 3));
  g.setAttribute("color", new Float32BufferAttribute(col, 3));
  return g;
}
var quad = (list2, a, b, c, d, hint, colour) => {
  list2.push([a, b, c, hint, colour], [a, c, d, hint, colour]);
};
function collarGeometry(J) {
  const R = collarRings(), n = R.length, cloth = [], glow = [];
  const wall = new Color(J.collar), lining = new Color(J.lining), tone = new Color();
  const up = new Vector3(0, 1, 0), dir = new Vector3(), inward = new Vector3();
  const along = (p, q, f) => p.clone().lerp(q, f);
  const frac = (r) => 1 - COLLAR.band / Math.max(COLLAR.band * 1.5, r.rim.y - r.foot.y);
  const fracIn = (r) => 1 - COLLAR.band / Math.max(COLLAR.band * 1.5, r.rimIn.y - r.footIn.y);
  for (let i = 0; i < n; i++) {
    const A = R[i], B = R[(i + 1) % n];
    dir.set(A.s + B.s, 0, A.c + B.c).normalize();
    inward.copy(dir).negate();
    const shade = 0.88 + 0.2 * (i * 5 % 7 / 6);
    const oA = along(A.foot, A.rim, frac(A)), oB = along(B.foot, B.rim, frac(B));
    const iA = along(A.footIn, A.rimIn, fracIn(A)), iB = along(B.footIn, B.rimIn, fracIn(B));
    quad(cloth, A.foot, B.foot, oB, oA, dir, tone.copy(wall).multiplyScalar(shade).clone());
    quad(glow, oA, oB, B.rim, A.rim, dir, wall);
    quad(glow, A.rim, B.rim, B.rimIn, A.rimIn, up, wall);
    quad(glow, B.rimIn, A.rimIn, iA, iB, inward, wall);
    quad(cloth, iA, iB, B.footIn, A.footIn, inward, lining);
  }
  return { cloth: soup(cloth), glow: soup(glow) };
}
function traceBeams(pts, r, ext = 0.02) {
  const out = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const p = new Vector3(...pts[i]), q = new Vector3(...pts[i + 1]);
    const t2 = new Vector3().subVectors(q, p).normalize();
    out.push(new Hull(beam(p.addScaledVector(t2, -ext), q.addScaledVector(t2, ext), r, r)).geometry(null));
  }
  return out;
}
function bar(p, q, depth, half, ext = 0.02) {
  const t2 = new Vector3().subVectors(q, p).normalize();
  const w = new Vector3(-t2.y, t2.x, 0).normalize(), z = new Vector3(0, 0, 1);
  const pts = [];
  for (const e of [p.clone().addScaledVector(t2, -ext), q.clone().addScaledVector(t2, ext)]) {
    for (const [i, j] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) pts.push(e.clone().addScaledVector(w, half * i).addScaledVector(z, depth * j));
  }
  return new Hull(pts);
}
function barRun(pts, depth, half, paint = null, ext = 0.02) {
  const out = [];
  for (let i = 0; i < pts.length - 1; i++) out.push(bar(new Vector3(...pts[i]), new Vector3(...pts[i + 1]), depth, half, ext).geometry(paint));
  return out;
}
var box = (cx, cy, cz, hx, hy, hz) => [-1, 1].flatMap((i) => [-1, 1].flatMap((j) => [-1, 1].map((k) => [cx + hx * i, cy + hy * j, cz + hz * k])));
function onTorso(torso, xy, lift, step = 0.22) {
  const out = [];
  for (let i = 0; i < xy.length - 1; i++) {
    const [x0, y0] = xy[i], [x1, y1] = xy[i + 1];
    const cuts = Math.max(1, Math.ceil(Math.hypot(x1 - x0, y1 - y0) / step));
    for (let k = i === 0 ? 0 : 1; k <= cuts; k++) {
      const x = x0 + (x1 - x0) * k / cuts, y = y0 + (y1 - y0) * k / cuts;
      out.push([x, y, torso.frontZ(x, y) + lift]);
    }
  }
  return out;
}
function buildJacket(cfg, F) {
  const J = cfg.jacket, meshes = [];
  const base = new Color(J.base), shoulder = new Color(J.shoulder), lining = new Color(J.lining);
  const body = F.torso.geometry((c, n, out) => {
    out.copy(base);
    if (n.y > 0.5) out.lerp(shoulder, 0.3).multiplyScalar(0.8);
    if (n.y > 0.9 && c.y > -0.05 && Math.abs(c.x) < 0.7) out.copy(lining);
  }, 0.07);
  meshes.push(tag(new Mesh(body, std("#ffffff", { vertexColors: true, roughness: 0.64, metalness: 0.1 })), "torso"));
  const collar = collarGeometry(J);
  meshes.push(tag(new Mesh(collar.cloth, std("#ffffff", { vertexColors: true, roughness: 0.55, metalness: 0.25 })), "collar"));
  const plateTone = new Color(J.plate);
  const platePaint = (c, n, out) => {
    out.copy(plateTone);
    if (n.y > 0.6) out.multiplyScalar(1.12);
  };
  const plateMat = std("#ffffff", { vertexColors: true, roughness: 0.5, metalness: 0.4 });
  meshes.push(tag(new Mesh(F.plate.geometry(platePaint, 0.05), plateMat), "plate"));
  meshes.push(tag(new Mesh(mirrorX(F.plate.geometry(platePaint, 0.05)), plateMat), "plate"));
  const webbing = new Color(J.strap);
  const strap = mergeGeometries(barRun(onTorso(F.torso, STRAP_XY, 0.02, 0.2), 0.024, 0.085, (c, n, out) => out.copy(webbing), 0.03));
  meshes.push(tag(new Mesh(strap, std("#ffffff", { vertexColors: true, roughness: 0.62, metalness: 0.15 })), "strap"));
  const bz = F.torso.frontZ(BUCKLE.x, BUCKLE.y) + 0.05;
  meshes.push(tag(new Mesh(mergeGeometries([new Hull(box(BUCKLE.x, BUCKLE.y, bz, 0.12, 0.1, 0.02)).geometry(null)]), metal("#b9c2cd", 0.3)), "buckle"));
  const tab = F.torso.frontZ(ZIP_PULL.x, ZIP_PULL.y) + 0.045;
  meshes.push(tag(new Mesh(new Hull(box(ZIP_PULL.x, ZIP_PULL.y, tab, 0.035, 0.1, 0.014)).geometry(null), metal("#b9c2cd", 0.3)), "zip-pull"));
  const beams = [];
  const crest = traceBeams(PLATE_CREST, 0.017, 0.01);
  beams.push(...crest, ...crest.map((g) => mirrorX(g.clone())));
  beams.push(...barRun(onTorso(F.torso, ZIP_XY, 0.016), 0.012, 0.017));
  beams.push(...barRun(onTorso(F.torso, SEAM_XY, 0.014), 0.01, 0.013));
  beams.push(...barRun(onTorso(F.torso, TRACE_XY, 0.014), 0.01, 0.013));
  for (const [x, y] of LIGHTS_XY) beams.push(new Hull(box(x, y, F.torso.frontZ(x, y) + 0.03, 0.04, 0.04, 0.014)).geometry(null));
  const neon = mergeGeometries([...beams, collar.glow.deleteAttribute("color")]);
  meshes.push(tag(new Mesh(neon, new MeshBasicMaterial({ color: J.neon, toneMapped: false })), "neon"));
  return meshes;
}
function skinPainter(cfg) {
  const skin = new Color(cfg.skin);
  const stub = skin.clone().lerp(new Color("#4a3328"), cfg.accessories.stubble ? 0.42 : 0);
  const blush = skin.clone().lerp(new Color("#e0836f"), 0.42);
  const lips = skin.clone().lerp(new Color("#b8625a"), 0.46);
  const mouth = new Color("#5e312d");
  const earTint = skin.clone().lerp(new Color("#d0705f"), 0.22).multiplyScalar(0.95);
  return (kind) => (c, n, out) => {
    out.copy(skin);
    if (kind === "lipUp" || kind === "lipLo") {
      out.copy(lips);
      if (n.y < -0.25 && kind === "lipUp") out.copy(skin).lerp(mouth, 0.7);
      if (n.y > 0.55 && kind === "lipLo") out.multiplyScalar(0.92);
      return;
    }
    if (kind === "ear") {
      out.copy(earTint);
      out.multiplyScalar(0.8 + 0.2 * smooth(-0.6, 0.6, n.x * Math.sign(c.x || 1)));
      return;
    }
    const lower = smooth(0.86, 0.52, c.y) * smooth(-0.5, 0.05, c.z);
    out.lerp(stub, lower * 0.72);
    out.lerp(blush, smooth(0.72, 0.9, c.y) * smooth(1.22, 1.02, c.y) * smooth(0.18, 0.42, Math.abs(c.x)) * smooth(-0.05, 0.3, c.z) * 0.4);
    if (kind === "nose") {
      if (n.y < -0.35) out.multiplyScalar(0.86);
      out.lerp(blush, 0.18 * smooth(0.95, 0.8, c.y));
    }
    if (kind === "neck") out.multiplyScalar(0.8).lerp(stub, 0.25 * smooth(0.3, 0.6, c.y));
    out.multiplyScalar(1 - 0.2 * smooth(0, -0.7, n.y));
  };
}
var EYE = { cx: 0.335, cy: 1.385, w: 0.3, h: 0.09, iris: 0.06 };
var EYE_XI = EYE.cx - EYE.w / 2;
var EYE_XO = EYE.cx + EYE.w / 2;
var eyeT = (x) => (x - EYE_XI) / EYE.w;
var eyeBump = (t2, p) => Math.pow(Math.sin(Math.PI * Math.pow(clamp(t2, 0, 1), p)), 0.85);
var eyeTilt = (t2) => -0.012 + 0.016 * clamp(t2, 0, 1);
var eyeUp = (x) => {
  const t2 = eyeT(x);
  return EYE.cy + eyeTilt(t2) + 0.58 * EYE.h * eyeBump(t2, 0.82);
};
var eyeLo = (x) => {
  const t2 = eyeT(x);
  return EYE.cy + eyeTilt(t2) - 0.42 * EYE.h * eyeBump(t2, 1.05);
};
function foldsAlong(head, y, x0, x1) {
  const o = {};
  const key = (x) => {
    head.front(x, y, o);
    return `${o.nx.toFixed(5)},${o.ny.toFixed(5)},${o.nz.toFixed(5)}`;
  };
  const out = [];
  let prev = key(x0), px = x0;
  for (let x = x0 + 4e-3; x <= x1 + 1e-9; x += 4e-3) {
    const k = key(x);
    if (k !== prev) {
      let a = px, b = x;
      for (let i = 0; i < 24; i++) {
        const m = (a + b) / 2;
        if (key(m) === prev) a = m;
        else b = m;
      }
      out.push((a + b) / 2);
      prev = k;
    }
    px = x;
  }
  return out;
}
var Sheets = class {
  constructor() {
    this.pos = [];
    this.nor = [];
    this.col = [];
    this.ab = new Vector3();
    this.ac = new Vector3();
    this.n = new Vector3();
  }
  add(head, { x0, x1, lo, hi, lift, colour, rows = 2, step = 0.02, folds = [] }) {
    const xs = [];
    const count = Math.max(2, Math.ceil((x1 - x0) / step));
    for (let i = 0; i <= count; i++) xs.push(x0 + (x1 - x0) * i / count);
    for (const f of folds) if (f > x0 + 2e-4 && f < x1 - 2e-4) xs.push(f - 1e-4, f + 1e-4);
    xs.sort((a, b) => a - b);
    const o = {}, c = new Color();
    const cols = xs.map((x) => {
      const a = lo(x), b = Math.max(a, hi(x)), v = [];
      for (let j = 0; j <= rows; j++) {
        const s = j / rows, y = a + (b - a) * s;
        head.front(x, y, o);
        const L = lift(x, s);
        colour(x, s, c, y);
        v.push({ p: new Vector3(x + o.nx * L, y + o.ny * L, o.z + o.nz * L), r: c.r, g: c.g, b: c.b });
      }
      return { v, flat: b - a < 1e-5 };
    });
    for (let k = 0; k < cols.length - 1; k++) {
      const A = cols[k], B = cols[k + 1];
      if (A.flat && B.flat) continue;
      for (let j = 0; j < rows; j++) {
        this.tri(A.v[j], B.v[j], B.v[j + 1]);
        this.tri(A.v[j], B.v[j + 1], A.v[j + 1]);
      }
    }
    return this;
  }
  tri(a, b, c) {
    const { ab, ac, n } = this;
    n.crossVectors(ab.subVectors(b.p, a.p), ac.subVectors(c.p, a.p));
    if (n.lengthSq() < 1e-14) return;
    n.normalize();
    for (const q of [a, b, c]) {
      this.pos.push(q.p.x, q.p.y, q.p.z);
      this.nor.push(n.x, n.y, n.z);
      this.col.push(q.r, q.g, q.b);
    }
  }
  geometry() {
    const g = new BufferGeometry();
    g.setAttribute("position", new Float32BufferAttribute(this.pos, 3));
    g.setAttribute("normal", new Float32BufferAttribute(this.nor, 3));
    g.setAttribute("color", new Float32BufferAttribute(this.col, 3));
    return g;
  }
};
function eyeDisc(cx, cy, r) {
  const half = (x) => Math.sqrt(Math.max(0, r * r - (x - cx) * (x - cx)));
  const lo = (x) => Math.max(cy - half(x), eyeLo(x)), hi = (x) => Math.min(cy + half(x), eyeUp(x));
  return { x0: cx - r, x1: cx + r, lo: (x) => Math.min(lo(x), hi(x)), hi: (x) => Math.max(lo(x), hi(x)) };
}
function buildEyes(F, cfg) {
  const E = cfg.eyes;
  const skin = new Color(cfg.skin);
  const folds = foldsAlong(F.head, EYE.cy, EYE_XI - 0.06, EYE_XO + 0.06);
  const lids = new Sheets(), ball = new Sheets(), ink = new Sheets(), glint = new Sheets();
  const tint = (hex, k) => skin.clone().lerp(new Color(hex), k);
  const bag = tint("#8a5a63", 0.4).multiplyScalar(0.94);
  lids.add(F.head, {
    x0: EYE_XI - 0.015,
    x1: EYE_XO + 0.01,
    folds,
    rows: 3,
    lo: (x) => eyeLo(x) - 0.085 * (0.45 + 0.55 * Math.sin(Math.PI * clamp(eyeT(x), 0, 1))),
    hi: (x) => eyeLo(x) + 1e-3,
    lift: () => 3e-3,
    colour: (x, s, out) => {
      const t2 = eyeT(x);
      out.copy(skin).lerp(bag, Math.pow(s, 1.3) * smooth(-0.12, 0.14, t2) * smooth(1.1, 0.78, t2));
    }
  });
  const white = new Color(E.white), pink = new Color("#d29b8f"), shade = new Color("#b99589");
  ball.add(F.head, {
    x0: EYE_XI,
    x1: EYE_XO,
    folds,
    rows: 3,
    step: 0.015,
    lo: eyeLo,
    hi: eyeUp,
    lift: () => 0.01,
    colour: (x, s, out) => {
      const t2 = eyeT(x);
      out.copy(white).lerp(pink, smooth(0.16, 0, t2) * 0.85).lerp(shade, smooth(0.84, 1, t2) * 0.55).multiplyScalar(0.8 + 0.2 * smooth(1, 0.5, s));
    }
  });
  const ix = EYE_XI + EYE.w * 0.49, iy = EYE.cy + 0.02 + eyeTilt(0.49);
  const disc = (r, hex, lift) => {
    const col = new Color(hex);
    ball.add(F.head, { ...eyeDisc(ix, iy, r), folds, rows: 3, step: 0.012, lift: () => lift, colour: (x, s, out) => out.copy(col) });
  };
  disc(EYE.iris, E.iris, 0.0135);
  disc(EYE.iris * 0.62, E.ring, 0.0148);
  disc(EYE.iris * 0.33, E.pupil, 0.0162);
  const gx = ix - 0.02, gy = iy + 0.013, gr = 0.0105;
  glint.add(F.head, {
    x0: gx - gr,
    x1: gx + gr,
    folds,
    rows: 2,
    step: 7e-3,
    lo: (x) => gy - Math.sqrt(Math.max(0, gr * gr - (x - gx) * (x - gx))),
    hi: (x) => gy + Math.sqrt(Math.max(0, gr * gr - (x - gx) * (x - gx))),
    lift: () => 0.0185,
    colour: (x, s, out) => out.set("#ffffff")
  });
  const lidShade = tint("#a8604f", 0.14);
  lids.add(F.head, {
    x0: EYE_XI - 4e-3,
    x1: EYE_XO + 0.012,
    folds,
    rows: 3,
    step: 0.015,
    lo: (x) => eyeUp(x) - 3e-3,
    hi: (x) => eyeUp(x) + 6e-3 + 0.04 * Math.pow(Math.sin(Math.PI * clamp(eyeT(x), 0, 1)), 0.8),
    lift: (x, s) => 6e-3 + 0.019 * Math.pow(1 - s, 1.2),
    colour: (x, s, out) => out.copy(lidShade).multiplyScalar(0.9 + 0.1 * s)
  });
  const rim = tint("#d9917f", 0.32).multiplyScalar(1.02);
  lids.add(F.head, {
    x0: EYE_XI,
    x1: EYE_XO,
    folds,
    rows: 2,
    step: 0.015,
    lo: (x) => eyeLo(x) - 4e-3 - 0.026 * Math.pow(Math.sin(Math.PI * clamp(eyeT(x), 0, 1)), 0.7),
    hi: (x) => eyeLo(x) + 1e-3,
    lift: (x, s) => 4e-3 + 0.012 * s,
    colour: (x, s, out) => out.copy(skin).multiplyScalar(1.03).lerp(rim, smooth(0.55, 1, s) * 0.8)
  });
  const lash = new Color(E.lash), lower = new Color("#4d2f27");
  const taper = (t2, a, b) => smooth(a - 0.1, a + 0.06, t2) * smooth(b + 0.1, b - 0.06, t2);
  ink.add(F.head, {
    x0: EYE_XI + 4e-3,
    x1: EYE_XO + 0.03,
    folds,
    rows: 1,
    step: 0.015,
    lo: (x) => eyeUp(x) - 4e-3,
    hi: (x) => eyeUp(x) - 4e-3 + (0.013 + 8e-3 * smooth(0.2, 1, eyeT(x))) * taper(eyeT(x), 0.02, 1.05),
    lift: () => 0.0285,
    colour: (x, s, out) => out.copy(lash)
  });
  ink.add(F.head, {
    x0: EYE_XI + 0.04,
    x1: EYE_XO - 0.015,
    folds,
    rows: 1,
    step: 0.02,
    lo: (x) => eyeLo(x) - 4e-3,
    hi: (x) => eyeLo(x) - 4e-3 + 7e-3 * taper(eyeT(x), 0.15, 0.92),
    lift: () => 0.02,
    colour: (x, s, out) => out.copy(lower)
  });
  const both = (sheets) => {
    const g = sheets.geometry();
    return [g, mirrorX(g.clone())];
  };
  return { skin: both(lids), ball: both(ball), ink: both(ink), glint: both(glint) };
}
var HAIRLINE = widen([[0, 1.93, 0.46], [0.28, 1.9, 0.44], [0.46, 1.78, 0.26], [0.58, 1.62, -0.14], [0.64, 1.42, -0.36], [0.6, 1.28, -0.42], [0.56, 1.05, -0.5], [0.42, 0.92, -0.78], [0, 0.9, -0.86]]);
var HAIR_CENTRE = new Vector3(0, 1.3, -0.2);
function buildHair(head, cfg) {
  const low = cfg.bun !== "high";
  const vol = 1;
  const bunDir = (low ? new Vector3(0, -0.09, -1) : new Vector3(0, 0.55, -1)).normalize();
  const e1 = new Vector3(0, 1, 0).addScaledVector(bunDir, -bunDir.y).normalize();
  const edge = HAIRLINE.map(([x, y, z]) => {
    const d = new Vector3(x, y, z).sub(HAIR_CENTRE).normalize();
    const phi = Math.acos(clamp(d.dot(bunDir), -1, 1));
    const t2 = d.clone().addScaledVector(bunDir, -d.dot(bunDir));
    return { theta: Math.abs(Math.atan2(t2.x, t2.dot(e1))), phi };
  }).sort((a, b) => a.theta - b.theta);
  const phiMax = (theta) => {
    const th = Math.abs((theta + Math.PI) % (Math.PI * 2) - Math.PI);
    for (let i = 1; i < edge.length; i++) {
      if (th <= edge[i].theta) {
        const k = (th - edge[i - 1].theta) / Math.max(1e-6, edge[i].theta - edge[i - 1].theta);
        return edge[i - 1].phi + (edge[i].phi - edge[i - 1].phi) * clamp(k, 0, 1);
      }
    }
    return edge[edge.length - 1].phi;
  };
  const NJ = 18, S = [0, 0.15, 0.3, 0.46, 0.62, 0.78, 0.9, 1];
  const grid = S.map((s) => []);
  for (let i = 0; i < S.length; i++) {
    for (let j = 0; j < NJ; j++) {
      const theta = j / NJ * Math.PI * 2;
      const phi = phiMax(theta) * S[i];
      const dir = new Vector3().addScaledVector(bunDir, Math.cos(phi)).addScaledVector(e1, Math.sin(phi) * Math.cos(theta)).addScaledVector(new Vector3(1, 0, 0), Math.sin(phi) * Math.sin(theta));
      const t2 = head.rayExit(HAIR_CENTRE.x, HAIR_CENTRE.y, HAIR_CENTRE.z, dir.x, dir.y, dir.z);
      const thick = i === S.length - 1 ? 0.012 : 0.02 + vol * (0.03 + 0.06 * Math.pow(1 - S[i], 0.8));
      grid[i].push(HAIR_CENTRE.clone().addScaledVector(dir, t2 + thick));
    }
  }
  const dark = new Color(cfg.hair), light = new Color(cfg.hairLight);
  const R = rng(11);
  const pos = [], nor = [], col = [];
  const ab = new Vector3(), ac = new Vector3(), n = new Vector3(), mid = new Vector3(), out = new Color();
  const tri = (a, b, c, strand) => {
    ab.subVectors(b, a);
    ac.subVectors(c, a);
    n.crossVectors(ab, ac);
    if (n.lengthSq() < 1e-12) return;
    n.normalize();
    mid.copy(a).add(b).add(c).multiplyScalar(1 / 3);
    if (n.dot(mid.clone().sub(HAIR_CENTRE)) < 0) {
      const t2 = b;
      b = c;
      c = t2;
      n.negate();
    }
    out.copy(dark).lerp(light, clamp(0.06 + strand * 0.3 + R() * 0.26 + 0.2 * smooth(0.4, 1, n.y), 0, 0.85));
    for (const v of [a, b, c]) {
      pos.push(v.x, v.y, v.z);
      nor.push(n.x, n.y, n.z);
      col.push(out.r, out.g, out.b);
    }
  };
  for (let i = 0; i < S.length - 1; i++) {
    for (let j = 0; j < NJ; j++) {
      const j1 = (j + 1) % NJ, strand = j % 2;
      const a = grid[i][j], b = grid[i + 1][j], c = grid[i + 1][j1], d = grid[i][j1];
      if (i === 0) tri(a, b, c, strand);
      else {
        tri(a, b, c, strand);
        tri(a, c, d, strand);
      }
    }
  }
  const patch = new BufferGeometry();
  patch.setAttribute("position", new Float32BufferAttribute(pos, 3));
  patch.setAttribute("normal", new Float32BufferAttribute(nor, 3));
  patch.setAttribute("color", new Float32BufferAttribute(col, 3));
  const tPole = head.rayExit(HAIR_CENTRE.x, HAIR_CENTRE.y, HAIR_CENTRE.z, bunDir.x, bunDir.y, bunDir.z) + 0.09;
  const bunAt = HAIR_CENTRE.clone().addScaledVector(bunDir, tPole + 0.13);
  const bun = new IcosahedronGeometry(1, 1);
  bun.deleteAttribute("uv");
  const m = new Matrix4().compose(bunAt, new Quaternion().setFromUnitVectors(new Vector3(0, 0, -1), bunDir), new Vector3(0.29, 0.27, 0.25));
  bun.applyMatrix4(m);
  bun.computeVertexNormals();
  const bcol = [];
  const bp = bun.attributes.position;
  for (let i = 0; i < bp.count; i += 3) {
    out.copy(dark).lerp(light, 0.1 + R() * 0.34);
    for (let k = 0; k < 3; k++) bcol.push(out.r, out.g, out.b);
  }
  bun.setAttribute("color", new Float32BufferAttribute(bcol, 3));
  const hullPts = [];
  for (const g of [patch, bun]) {
    const a = g.attributes.position;
    for (let i = 0; i < a.count; i++) hullPts.push(new Vector3(a.getX(i), a.getY(i), a.getZ(i)));
  }
  return { patch, bun, bunAt, bunR: 0.29, hull: new Hull(hullPts) };
}
function corduroy(base) {
  const c = document.createElement("canvas");
  c.width = 32;
  c.height = 8;
  const g = c.getContext("2d");
  g.fillStyle = base;
  g.fillRect(0, 0, 32, 8);
  for (let i = 0; i < 4; i++) {
    g.fillStyle = "rgba(0,0,0,0.12)";
    g.fillRect(i * 8, 0, 2, 8);
    g.fillStyle = "rgba(255,255,255,0.05)";
    g.fillRect(i * 8 + 4, 0, 2, 8);
  }
  const t2 = new CanvasTexture(c);
  t2.wrapS = t2.wrapT = RepeatWrapping;
  t2.colorSpace = SRGBColorSpace;
  t2.anisotropy = 4;
  t2.repeat.set(9, 1);
  return t2;
}
function brimGeometry(grow = 0) {
  const pts = [];
  const N = 8;
  const inner = (x) => CAP.rz * Math.sqrt(Math.max(0, 1 - (x / CAP.rx) ** 2));
  const outer = (x) => inner(x) + CAP.brim * Math.pow(Math.max(0, 1 - (x / CAP.rx) ** 2), 0.6);
  for (let i = 0; i <= N; i++) {
    const x = -CAP.rx + 2 * CAP.rx * i / N;
    pts.push([x, outer(x) + grow]);
  }
  for (let i = N; i >= 0; i--) {
    const x = -CAP.rx + 2 * CAP.rx * i / N;
    pts.push([x, inner(x) - 0.03]);
  }
  const shape = new Shape();
  shape.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) shape.lineTo(pts[i][0], pts[i][1]);
  const geo = new ExtrudeGeometry(shape, { depth: 0.07 + grow * 1.6, bevelEnabled: false });
  geo.rotateX(Math.PI / 2);
  const p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    const u = Math.min(1, Math.abs(x) / CAP.rx);
    const o = z - CAP.rz * Math.sqrt(1 - u * u);
    const th = CAP.brimPitch * (0.4 + 0.6 * Math.sqrt(1 - u * u));
    p.setY(i, y - o * Math.sin(th) - 0.15 * u * u * smooth(0, 0.45, o));
    p.setZ(i, CAP.rz * Math.sqrt(1 - u * u) + o * Math.cos(th));
  }
  geo.computeVertexNormals();
  return geo;
}
function capGroup(cfg) {
  const g = new Group();
  const cap = cfg.cap;
  const crownMap = corduroy(cap.crown);
  const dome = new Mesh(new SphereGeometry(1, 12, 4, 0, Math.PI * 2, 0, Math.PI / 2), std("#ffffff", { map: crownMap, roughness: 0.95 }));
  dome.scale.set(CAP.rx, CAP.ry, CAP.rz);
  g.add(tag(dome, "cap-dome"));
  const seam = std(cap.seam, { roughness: 0.85 });
  for (let k = 0; k < 6; k++) {
    const u = k * 2 / 12, pts = [];
    for (let i = 0; i <= 4; i++) {
      const v = i / 4 * (Math.PI / 2);
      const s = 1.006;
      pts.push(new Vector3(-Math.cos(u * Math.PI * 2) * Math.sin(v) * CAP.rx * s, Math.cos(v) * CAP.ry * s, Math.sin(u * Math.PI * 2) * Math.sin(v) * CAP.rz * s));
    }
    g.add(new Mesh(new TubeGeometry(new CatmullRomCurve3(pts, false, "catmullrom", 0), 4, 0.011, 4, false), seam));
  }
  const button = new Mesh(new CylinderGeometry(0.045, 0.06, 0.05, 6), std(cap.seam, { roughness: 0.9 }));
  button.position.y = CAP.ry + 5e-3;
  g.add(button);
  g.add(tag(new Mesh(brimGeometry(0), std(cap.brim, { roughness: 0.88 })), "cap-brim"));
  if (cfg.accessories.teddyPatch) {
    const bear = new Group();
    const tan = std("#c1925f", { roughness: 0.85 }), cream = std("#efdfc0", { roughness: 0.85 }), dark = std("#1b120d", { roughness: 0.5 });
    const part = (geo, mat, x, y, z) => {
      const m = new Mesh(geo, mat);
      m.position.set(x, y, z);
      bear.add(m);
      return m;
    };
    part(new SphereGeometry(0.07, 7, 5), tan, 0, 0.045, 0);
    part(new SphereGeometry(0.03, 6, 4), tan, -0.055, 0.1, -0.01);
    part(new SphereGeometry(0.03, 6, 4), tan, 0.055, 0.1, -0.01);
    part(new SphereGeometry(0.028, 6, 4), cream, 0, 0.03, 0.055).scale.set(1.1, 0.85, 0.7);
    part(new SphereGeometry(9e-3, 4, 3), dark, 0, 0.04, 0.08);
    part(new SphereGeometry(8e-3, 4, 3), dark, -0.026, 0.07, 0.06);
    part(new SphereGeometry(8e-3, 4, 3), dark, 0.026, 0.07, 0.06);
    part(new SphereGeometry(0.078, 7, 5), tan, 0, -0.08, -0.02).scale.set(1, 0.9, 0.8);
    part(new SphereGeometry(0.044, 6, 4), cream, 0, -0.08, 0.04).scale.set(1, 1, 0.5);
    part(new SphereGeometry(0.02, 4, 3), dark, 0, -0.01, 0.062).scale.set(1.8, 0.7, 0.6);
    const th = 1.14;
    bear.position.set(0, Math.cos(th) * CAP.ry * 1.01, Math.sin(th) * CAP.rz * 1);
    bear.rotation.x = th;
    bear.scale.setScalar(1.2);
    g.add(bear);
  }
  g.position.set(0, CAP.y, CAP.z);
  g.rotation.x = CAP.tilt;
  return { group: g, textures: [crownMap] };
}
function brimSdf(x, yl, zl) {
  const u = Math.abs(x) / CAP.rx;
  const rim = CAP.rz * Math.sqrt(Math.max(0, 1 - u * u));
  const span = CAP.brim * Math.pow(Math.max(0, 1 - u * u), 0.6);
  const th = CAP.brimPitch * (0.4 + 0.6 * Math.sqrt(Math.max(0, 1 - u * u)));
  const o = zl - rim;
  const mid = -Math.max(o, 0) * Math.tan(th) - 0.15 * u * u * smooth(0, 0.45, o);
  const across = Math.abs(yl - mid) * Math.cos(th) - 0.04;
  const along = Math.max(-0.03 - o, o - span);
  const side = Math.abs(x) - CAP.rx;
  const a = Math.max(along, side), b = across;
  return Math.min(Math.max(a, b), 0) + Math.hypot(Math.max(a, 0), Math.max(b, 0));
}
var FRAME_ROWS = [
  //  frame x,  y     opening x,  y    bridge
  [0, 0.108, 0.08, 0.066, 1],
  [0.09, 0.124, 0.128, 0.082, 0.5],
  [0.215, 0.16, 0.235, 0.114, 0],
  [0.43, 0.186, 0.43, 0.141, 0],
  [0.62, 0.19, 0.61, 0.146, 0],
  [0.7, 0.158, 0.67, 0.116, 0],
  [0.735, 0.075, 0.692, 0.05, 0],
  [0.708, -0.035, 0.664, -0.02, 0],
  [0.628, -0.12, 0.588, -0.088, 0],
  [0.5, -0.18, 0.468, -0.14, 0],
  [0.35, -0.215, 0.335, -0.172, 0],
  [0.195, -0.222, 0.195, -0.18, 0],
  [0.118, -0.195, 0.124, -0.15, 0],
  [0.082, -0.115, 0.1, -0.088, 0.3],
  [0.052, -0.035, 0.082, -0.026, 0.7],
  [0, 0.016, 0.08, 4e-3, 1],
  [0, 0.062, 0.08, 0.036, 1]
];
var FRAME_BACK = -0.095;
var frameProfile = (bw) => {
  const mix = (a, b) => a + (b - a) * bw;
  return [[0, mix(-0.025, 0.024)], [0.4, mix(0.013, 6e-3)], [1, -0.03], [1, FRAME_BACK], [0, FRAME_BACK]];
};
var sag = (x) => Math.sqrt(Math.max(GLASSES.bend * GLASSES.bend - x * x, 0.01)) - GLASSES.bend;
function finishGeometry(pos, idx, { mirror = false } = {}) {
  const p = new Float32Array(pos.length);
  for (let i = 0; i < pos.length; i += 3) {
    p[i] = mirror ? -pos[i] : pos[i];
    p[i + 1] = pos[i + 1];
    p[i + 2] = pos[i + 2];
  }
  let vol = 0;
  for (let i = 0; i < idx.length; i += 3) {
    const a = idx[i] * 3, b = idx[i + 1] * 3, c = idx[i + 2] * 3;
    vol += p[a] * (p[b + 1] * p[c + 2] - p[b + 2] * p[c + 1]) - p[a + 1] * (p[b] * p[c + 2] - p[b + 2] * p[c]) + p[a + 2] * (p[b] * p[c + 1] - p[b + 1] * p[c]);
  }
  const ix = Array.from(idx);
  if (vol < 0) for (let i = 0; i < ix.length; i += 3) {
    const t2 = ix[i + 1];
    ix[i + 1] = ix[i + 2];
    ix[i + 2] = t2;
  }
  const g = new BufferGeometry();
  g.setAttribute("position", new Float32BufferAttribute(p, 3));
  g.setIndex(ix);
  g.computeVertexNormals();
  return g;
}
function frameGeometry(mirror) {
  const n = FRAME_ROWS.length, m = 5;
  const pos = [], idx = [];
  for (let j = 0; j < n; j++) {
    const [ox, oy, hx, hy, bw] = FRAME_ROWS[j];
    for (const [a, z] of frameProfile(bw)) {
      const x = ox + (hx - ox) * a;
      pos.push(x, oy + (hy - oy) * a, z + sag(x));
    }
  }
  for (let j = 0; j < n; j++) {
    for (let k = 0; k < m; k++) {
      const a = j * m + k, b = (j + 1) % n * m + k, c = (j + 1) % n * m + (k + 1) % m, d = j * m + (k + 1) % m;
      idx.push(a, b, c, a, c, d);
    }
  }
  return finishGeometry(pos, idx, { mirror });
}
function lensGeometry(mirror) {
  const hole = FRAME_ROWS.map((r) => [r[2], r[3]]);
  const n = hole.length;
  let cx = 0, cy = 0;
  for (const [x, y] of hole) {
    cx += x / n;
    cy += y / n;
  }
  const depth = (x, y) => {
    const u = (x - cx) / 0.4, v = (y - cy) / 0.16;
    return -0.06 + sag(x) + 0.022 * (1 - u * u - v * v);
  };
  const sx = mirror ? -1 : 1;
  const pos = [cx * sx, cy, depth(cx, cy)], nor = [];
  const normalAt = (x, y) => {
    const e = 1e-3;
    const fx = (depth(x + e, y) - depth(x - e, y)) / (2 * e), fy = (depth(x, y + e) - depth(x, y - e)) / (2 * e);
    const l = Math.hypot(fx, fy, 1);
    return [-fx / l * sx, -fy / l, 1 / l];
  };
  nor.push(...normalAt(cx, cy));
  const SCALES = [0.4, 0.7, 1];
  for (const s of SCALES) {
    for (const [hx, hy] of hole) {
      const x = cx + (hx - cx) * s, y = cy + (hy - cy) * s;
      pos.push(x * sx, y, depth(x, y));
      nor.push(...normalAt(x, y));
    }
  }
  const idx = [];
  for (let j = 0; j < n; j++) idx.push(0, 1 + j, 1 + (j + 1) % n);
  for (let r = 0; r < SCALES.length - 1; r++) {
    for (let j = 0; j < n; j++) {
      const a = 1 + r * n + j, b = 1 + r * n + (j + 1) % n, c = 1 + (r + 1) * n + (j + 1) % n, d = 1 + (r + 1) * n + j;
      idx.push(a, d, c, a, c, b);
    }
  }
  let facing = 0;
  for (let i = 0; i < idx.length; i += 3) {
    const a = idx[i] * 3, b = idx[i + 1] * 3, c = idx[i + 2] * 3;
    facing += (pos[b] - pos[a]) * (pos[c + 1] - pos[a + 1]) - (pos[b + 1] - pos[a + 1]) * (pos[c] - pos[a]);
  }
  if (facing < 0) for (let i = 0; i < idx.length; i += 3) {
    const t2 = idx[i + 1];
    idx[i + 1] = idx[i + 2];
    idx[i + 2] = t2;
  }
  const g = new BufferGeometry();
  g.setAttribute("position", new Float32BufferAttribute(pos, 3));
  g.setAttribute("normal", new Float32BufferAttribute(nor, 3));
  g.setIndex(idx);
  return g;
}
function glassesSolids() {
  const w = (x, y, z) => new Vector3(x, y + GLASSES.y, z + GLASSES.z);
  const framePts = [];
  for (const [x, y] of FRAME_ROWS) for (const z of [0.026, FRAME_BACK - 5e-3]) framePts.push(w(x, y, z + sag(x)));
  const frame2 = new Hull(framePts);
  const A = [new Vector3(0.735, GLASSES.y + 0.064, GLASSES.z + sag(0.735) - 0.05), new Vector3(0.7, 1.3, -0.08), new Vector3(0.685, 1.34, -0.3), new Vector3(0.655, 1.2, -0.44)];
  const arms = [beam(A[0], A[1], 0.016, 0.034), beam(A[1], A[2], 0.016, 0.03), beam(A[2], A[3], 0.015, 0.016)].map((pts) => new Hull(pts));
  return { frame: frame2, arms };
}
function neoGlasses(cfg, S) {
  const g = new Group();
  g.name = "glasses";
  const frameMat = metal(cfg.glasses.frame, 0.3);
  const lensMat = new MeshStandardMaterial({ color: cfg.glasses.lens, emissive: cfg.glasses.lensGlow, metalness: 1, roughness: 0.05, envMapIntensity: 1.45 });
  for (const mirror of [false, true]) {
    const frame2 = new Mesh(frameGeometry(mirror), frameMat);
    frame2.position.set(0, GLASSES.y, GLASSES.z);
    g.add(tag(frame2, "frame"));
    const lens = new Mesh(lensGeometry(mirror), lensMat);
    lens.position.set(0, GLASSES.y, GLASSES.z);
    g.add(tag(lens, "lens"));
    for (const arm of S.arms) {
      const geo = arm.geometry();
      if (mirror) mirrorX(geo);
      g.add(tag(new Mesh(geo, frameMat), "arm"));
    }
  }
  return g;
}
var FIGURES = /* @__PURE__ */ new Map();
function figure(cfg) {
  const key = `${cfg.accessories.cap}|${cfg.accessories.sunglasses}|${cfg.bun}`;
  if (FIGURES.has(key)) return FIGURES.get(key);
  const head = new Hull(HEAD_PTS);
  const F = {
    head,
    nose: new Hull(NOSE_PTS),
    lipUp: new Hull(LIP_UP_PTS),
    lipLo: new Hull(LIP_LO_PTS),
    ear: new Hull(EAR_PTS),
    neck: new Hull(NECK_PTS),
    torso: new Hull(TORSO_PTS),
    plate: new Hull(PLATE_PTS),
    collar: collarSolids(),
    hair: buildHair(head, cfg),
    glasses: glassesSolids()
  };
  FIGURES.set(key, F);
  return F;
}
function figureSdf(withGlasses = true, cfg = AVATAR_CONFIG) {
  const F = figure(cfg);
  const capOn = cfg.accessories.cap !== "off";
  const ct = Math.cos(CAP.tilt), st = Math.sin(CAP.tilt);
  const G = F.glasses;
  return (x, y, z) => {
    const ax = Math.abs(x);
    let d = F.head.sdf(x, y, z);
    d = smin(d, F.nose.sdf(x, y, z), 0.05);
    d = Math.min(d, F.ear.sdf(ax, y, z), ell(ax, y, z, 0.7, 0.85, -0.2, 0.1, 0.13, 0.09));
    d = smin(d, F.hair.hull.sdf(x, y, z), 0.08);
    d = Math.min(d, ell(x, y, z, F.hair.bunAt.x, F.hair.bunAt.y, F.hair.bunAt.z, F.hair.bunR * 1, F.hair.bunR * 0.95, F.hair.bunR * 0.88));
    if (capOn) {
      const dy = y - CAP.y, dz = z - CAP.z, yl = dy * ct + dz * st, zl = -dy * st + dz * ct;
      d = smin(d, Math.max(ell(x, yl, zl, 0, 0, 0, CAP.rx, CAP.ry, CAP.rz), -yl - 0.02), 0.06);
      d = smin(d, brimSdf(x, yl, zl), 0.05);
    }
    if (withGlasses) {
      let g = G.frame.sdf(ax, y, z);
      for (const arm of G.arms) g = Math.min(g, arm.sdf(ax, y, z));
      d = smin(d, g, 0.04);
    }
    d = smin(d, F.neck.sdf(x, y, z), 0.15);
    let j = F.torso.sdf(x, y, z);
    let cl = Infinity;
    for (const piece of F.collar) cl = Math.min(cl, piece.sdf(ax, y, z));
    j = smin(j, cl, 0.06);
    j = smin(j, F.plate.sdf(ax, y, z), 0.1);
    d = smin(d, j, 0.25);
    return Math.max(d, SHELL_BOTTOM - y);
  };
}
function createAvatar(config = AVATAR_CONFIG) {
  const cfg = config;
  const acc = cfg.accessories;
  const F = figure(cfg);
  const group = new Group();
  group.name = "avatar";
  const textures = [];
  const paint = skinPainter(cfg);
  const eyes = cfg.eyes.show ? buildEyes(F, cfg) : { skin: [], ball: [], ink: [], glint: [] };
  const skinParts = [
    F.head.geometry(paint("head"), 0.014),
    F.nose.geometry(paint("nose"), 0.01),
    F.lipUp.geometry(paint("lipUp")),
    F.lipLo.geometry(paint("lipLo")),
    F.neck.geometry(paint("neck"), 0.01),
    ...eyes.skin
  ];
  for (const sx of [1, -1]) {
    const g = F.ear.geometry(paint("ear"), 0.01);
    if (sx < 0) mirrorX(g);
    skinParts.push(g);
  }
  group.add(tag(new Mesh(mergeGeometries(skinParts), std("#ffffff", { vertexColors: true, roughness: 0.62 })), "skin"));
  for (const m of buildJacket(cfg, F)) group.add(m);
  const hairGeo = mergeGeometries([F.hair.patch, F.hair.bun], false);
  const dark = new Color(cfg.hair);
  const brows = [];
  const hit = {};
  const AXIS_Z = -0.2;
  const browArch = (x) => 1.465 + 0.07 * Math.sin(Math.min(1, x / 0.42) * Math.PI * 0.5) - 0.05 * smooth(0.42, 0.66, x);
  const browAt = (deg, y) => {
    const a = deg * Math.PI / 180;
    F.head.rayHit(0, y, AXIS_Z, Math.sin(a), 0, Math.cos(a), hit);
    return { x: hit.t * Math.sin(a), z: AXIS_Z + hit.t * Math.cos(a), nx: hit.nx, ny: hit.ny, nz: hit.nz };
  };
  const brow = (sx, a0, a1, { thin = 1, end = 1 } = {}) => {
    const pts = [];
    const cols = Math.max(3, Math.ceil(Math.abs(a1 - a0) / 4));
    for (let k = 0; k <= cols; k++) {
      const u = k / cols, deg = a0 + (a1 - a0) * u;
      const mid = browAt(deg, 1.5);
      const arch = browArch(mid.x);
      const half = 0.045 * thin * (1 - 0.55 * smooth(0.25, 0.66, mid.x)) * (0.62 + 0.38 * smooth(0.1, 0.24, mid.x)) * (1 - (1 - end) * smooth(0.5, 1, u));
      for (const dy of [half, -half]) {
        const y = arch + dy, f = browAt(deg, y);
        pts.push([sx * (f.x + f.nx * 0.024), y + f.ny * 0.024, f.z + f.nz * 0.024], [sx * (f.x - f.nx * 0.03), y - f.ny * 0.03, f.z - f.nz * 0.03]);
      }
    }
    brows.push(new Hull(pts).geometry((c, n, out) => out.copy(dark).multiplyScalar(0.7)));
  };
  brow(-1, 11, 92);
  brow(1, 11, 45);
  brow(1, 60, 104, { thin: 0.85, end: 0.6 });
  group.add(tag(new Mesh(mergeGeometries([hairGeo, ...brows, ...eyes.ink], false), std("#ffffff", { vertexColors: true, roughness: 0.85 })), "hair"));
  if (cfg.eyes.show) {
    group.add(tag(new Mesh(mergeGeometries(eyes.ball), std("#ffffff", { vertexColors: true, roughness: 0.3 })), "eyes"));
    group.add(tag(new Mesh(mergeGeometries(eyes.glint), new MeshBasicMaterial({ color: "#fff6ee", toneMapped: false })), "eye-glint"));
  }
  const worn = new Group();
  worn.name = "accessories";
  if (acc.earrings) {
    const silver = metal("#d5dade", 0.22), bead = std("#1b1d22", { roughness: 0.4 });
    const LOBE = { x: 0.72, y: 0.9, z: -0.2 };
    {
      const hoop = new Group();
      const R = 0.05;
      hoop.add(new Mesh(new TorusGeometry(R, 0.0115, 5, 12), silver));
      const ball = new Mesh(new SphereGeometry(0.024, 6, 4), bead);
      ball.position.set(0, -R, 0);
      const cuff = new Mesh(new TorusGeometry(0.027, 65e-4, 3, 8), silver);
      cuff.rotation.x = Math.PI / 2;
      cuff.position.set(0, -R, 0);
      hoop.add(ball, cuff);
      hoop.position.set(-LOBE.x, LOBE.y - R + 5e-3, LOBE.z);
      hoop.rotation.y = -0.35;
      worn.add(tag(hoop, "hoop"));
    }
    {
      const huggie = new Group();
      const R = 0.027, r = 0.022;
      huggie.add(new Mesh(new TorusGeometry(R, r, 6, 10), silver));
      const ink = std("#101114", { roughness: 0.5 });
      for (const d of [-0.0115, 0.0115]) {
        const stripe = new Mesh(new TorusGeometry(R + Math.sqrt(r * r - d * d), 65e-4, 3, 10), ink);
        stripe.position.z = d;
        huggie.add(stripe);
      }
      huggie.position.set(LOBE.x, LOBE.y - R + 3e-3, LOBE.z);
      huggie.rotation.y = 0.3;
      worn.add(tag(huggie, "hoop"));
    }
  }
  if (acc.airpod) {
    const white = std("#f2f3f4", { roughness: 0.35 });
    const stem = new Mesh(new CylinderGeometry(0.026, 0.026, 0.26, 5), white);
    stem.position.set(-0.7, 0.8, -0.14);
    const bud = new Mesh(new SphereGeometry(0.05, 6, 4), white);
    bud.position.set(-0.7, 0.96, -0.14);
    worn.add(stem, bud);
  }
  if (acc.chain) {
    const frontZ = (x, y) => F.torso.frontZ(x, y) + 0.04;
    const xy = [[-0.5, 0], [-0.6, -0.32], [-0.56, -0.72], [-0.34, -1.05], [0, -1.2], [0.34, -1.05], [0.56, -0.72], [0.6, -0.32], [0.5, 0]];
    const pts = xy.map(([x, y]) => new Vector3(x, y, frontZ(x, y)));
    pts.unshift(new Vector3(-0.58, 0.1, 0.08));
    pts.push(new Vector3(0.58, 0.1, 0.08));
    worn.add(tag(new Mesh(new TubeGeometry(new CatmullRomCurve3(pts), 36, 0.024, 4, false), metal("#d3d8dc", 0.22)), "chain"));
  }
  if (acc.cap !== "off") {
    const cap = capGroup(cfg);
    worn.add(cap.group);
    textures.push(...cap.textures);
  }
  group.add(worn);
  if (acc.sunglasses === "worn") group.add(neoGlasses(cfg, F.glasses));
  return { group, accessories: worn, textures, config: cfg };
}
var SHELL_OFFSET = 0.085;
async function surfaceNets(sdf, offset, lo, hi, h) {
  const n = [0, 1, 2].map((a) => Math.ceil((hi[a] - lo[a]) / h));
  const sx = n[0] + 1, sy = n[1] + 1, sz = n[2] + 1;
  const field2 = new Float32Array(sx * sy * sz);
  const B = 4;
  let sliceStart = performance.now();
  for (let kb = 0; kb < sz; kb += B) {
    if (performance.now() - sliceStart > 7) {
      await new Promise((resolve) => setTimeout(resolve, 0));
      sliceStart = performance.now();
    }
    for (let jb = 0; jb < sy; jb += B) {
      for (let ib = 0; ib < sx; ib += B) {
        const i1 = Math.min(ib + B, sx), j1 = Math.min(jb + B, sy), k1 = Math.min(kb + B, sz);
        const cx = lo[0] + (ib + i1 - 1) / 2 * h, cy = lo[1] + (jb + j1 - 1) / 2 * h, cz = lo[2] + (kb + k1 - 1) / 2 * h;
        const v = sdf(cx, cy, cz) - offset;
        const half = 0.5 * h * Math.hypot(i1 - ib - 1, j1 - jb - 1, k1 - kb - 1);
        const far = Math.abs(v) > 2 * half + 0.06;
        for (let k = kb; k < k1; k++) {
          for (let j = jb; j < j1; j++) {
            for (let i = ib; i < i1; i++) {
              field2[i + sx * (j + sy * k)] = far ? v : sdf(lo[0] + i * h, lo[1] + j * h, lo[2] + k * h) - offset;
            }
          }
        }
      }
    }
  }
  const at = (i, j, k) => field2[i + sx * (j + sy * k)];
  const cell = new Int32Array(n[0] * n[1] * n[2]).fill(-1);
  const cellId = (i, j, k) => i + n[0] * (j + n[1] * k);
  const verts = [];
  const c = new Float64Array(8);
  for (let k = 0; k < n[2]; k++) {
    for (let j = 0; j < n[1]; j++) {
      for (let i = 0; i < n[0]; i++) {
        let mask = 0;
        for (let g = 0; g < 8; g++) {
          c[g] = at(i + (g & 1), j + (g >> 1 & 1), k + (g >> 2 & 1));
          if (c[g] < 0) mask |= 1 << g;
        }
        if (mask === 0 || mask === 255) continue;
        let px = 0, py = 0, pz = 0, count = 0;
        for (let g = 0; g < 8; g++) {
          for (let a = 0; a < 3; a++) {
            if (g & 1 << a) continue;
            const g1 = g | 1 << a;
            if (c[g] < 0 === c[g1] < 0) continue;
            const t2 = c[g] / (c[g] - c[g1]);
            px += (g & 1) + (a === 0 ? 1 : 0) * t2;
            py += (g >> 1 & 1) + (a === 1 ? 1 : 0) * t2;
            pz += (g >> 2 & 1) + (a === 2 ? 1 : 0) * t2;
            count++;
          }
        }
        cell[cellId(i, j, k)] = verts.length / 3;
        verts.push(lo[0] + (i + px / count) * h, lo[1] + (j + py / count) * h, lo[2] + (k + pz / count) * h);
      }
    }
  }
  const quads = [];
  const ij = [0, 0, 0];
  for (let k = 1; k < n[2]; k++) {
    for (let j = 1; j < n[1]; j++) {
      for (let i = 1; i < n[0]; i++) {
        const here = at(i, j, k);
        for (let a = 0; a < 3; a++) {
          const there = at(i + (a === 0 ? 1 : 0), j + (a === 1 ? 1 : 0), k + (a === 2 ? 1 : 0));
          if (here < 0 === there < 0) continue;
          const u = (a + 1) % 3, v = (a + 2) % 3;
          const pick = (du, dv) => {
            ij[0] = i;
            ij[1] = j;
            ij[2] = k;
            ij[u] -= du;
            ij[v] -= dv;
            return cell[cellId(ij[0], ij[1], ij[2])];
          };
          const q = [pick(0, 0), pick(1, 0), pick(1, 1), pick(0, 1)];
          if (q.some((id) => id < 0)) continue;
          quads.push(here < 0 ? q : [q[0], q[3], q[2], q[1]]);
        }
      }
    }
  }
  return { verts, quads, field: field2, n, sx, sy };
}
async function buildShell({ cell = 0.085, glasses = AVATAR_CONFIG.accessories.sunglasses === "worn", config = AVATAR_CONFIG } = {}) {
  const sdf = figureSdf(glasses, config);
  const lo = [-2.5, -2.55, -1.85];
  const { verts, quads, field: field2, n, sx, sy } = await surfaceNets(sdf, SHELL_OFFSET, lo, [2.5, 2.75, 1.5], cell);
  const nV = verts.length / 3;
  const h = cell;
  const out = [0, 0, 0, 0];
  const sample = (x, y, z) => {
    const fx = Math.min(Math.max((x - lo[0]) / h, 0), n[0] - 1e-4), fy = Math.min(Math.max((y - lo[1]) / h, 0), n[1] - 1e-4), fz = Math.min(Math.max((z - lo[2]) / h, 0), n[2] - 1e-4);
    const i = Math.floor(fx), j = Math.floor(fy), k = Math.floor(fz), tx = fx - i, ty = fy - j, tz = fz - k;
    const f = (a, b, c) => field2[i + a + sx * (j + b + sy * (k + c))];
    const f000 = f(0, 0, 0), f100 = f(1, 0, 0), f010 = f(0, 1, 0), f110 = f(1, 1, 0), f001 = f(0, 0, 1), f101 = f(1, 0, 1), f011 = f(0, 1, 1), f111 = f(1, 1, 1);
    const x00 = f000 + (f100 - f000) * tx, x10 = f010 + (f110 - f010) * tx, x01 = f001 + (f101 - f001) * tx, x11 = f011 + (f111 - f011) * tx;
    const y0 = x00 + (x10 - x00) * ty, y1 = x01 + (x11 - x01) * ty;
    out[0] = y0 + (y1 - y0) * tz;
    out[1] = ((f100 - f000) * (1 - ty) * (1 - tz) + (f110 - f010) * ty * (1 - tz) + (f101 - f001) * (1 - ty) * tz + (f111 - f011) * ty * tz) / h;
    out[2] = ((x10 - x00) * (1 - tz) + (x11 - x01) * tz) / h;
    out[3] = (y1 - y0) / h;
    return out;
  };
  const project = (x, y, z) => {
    for (let it = 0; it < 2; it++) {
      const [f, gx, gy, gz] = sample(x, y, z);
      const gg = gx * gx + gy * gy + gz * gz;
      if (gg < 1e-6) break;
      x -= gx * f / gg;
      y -= gy * f / gg;
      z -= gz * f / gg;
    }
    return [x, y, z];
  };
  const nb = Array.from({ length: nV }, () => /* @__PURE__ */ new Set());
  for (const q of quads) for (let e = 0; e < 4; e++) {
    nb[q[e]].add(q[(e + 1) % 4]);
    nb[q[e]].add(q[(e + 3) % 4]);
  }
  for (let pass = 0; pass < 2; pass++) {
    const next = new Float32Array(verts.length);
    for (let v = 0; v < nV; v++) {
      let ax = 0, ay = 0, az = 0;
      for (const w of nb[v]) {
        ax += verts[w * 3];
        ay += verts[w * 3 + 1];
        az += verts[w * 3 + 2];
      }
      const m = nb[v].size || 1;
      const x = verts[v * 3] + (ax / m - verts[v * 3]) * 0.5, y = verts[v * 3 + 1] + (ay / m - verts[v * 3 + 1]) * 0.5, z = verts[v * 3 + 2] + (az / m - verts[v * 3 + 2]) * 0.5;
      const p = project(x, y, z);
      next[v * 3] = p[0];
      next[v * 3 + 1] = p[1];
      next[v * 3 + 2] = p[2];
    }
    for (let i = 0; i < verts.length; i++) verts[i] = next[i];
  }
  const idx = [];
  const d2 = (a, b) => (verts[a * 3] - verts[b * 3]) ** 2 + (verts[a * 3 + 1] - verts[b * 3 + 1]) ** 2 + (verts[a * 3 + 2] - verts[b * 3 + 2]) ** 2;
  for (const [a, b, c, d] of quads) {
    if (d2(a, c) <= d2(b, d)) idx.push(a, b, c, a, c, d);
    else idx.push(a, b, d, b, c, d);
  }
  const g = new BufferGeometry();
  g.setAttribute("position", new Float32BufferAttribute(verts, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

// src/hero/tier.js
var CAP_60 = 1e3 / 60 - 2;
var isEnergySaver = () => {
  const nav = navigator;
  return Boolean(nav.connection?.saveData) || (nav.deviceMemory ?? 8) <= 2;
};
var getSceneTier = () => {
  const coarse = window.matchMedia("(hover: none) and (pointer: coarse)").matches;
  const width = window.innerWidth;
  const name = width < 768 || coarse && width < 1024 ? "mobile" : coarse || width < 1280 ? "tablet" : "desktop";
  const mobile = name === "mobile";
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const saver = isEnergySaver();
  return {
    name,
    mobile,
    coarsePointer: coarse,
    reducedMotion,
    // 1 → 1.25 → 1.5. Held at 1 on a phone rather than the skill's 0.85: this
    // scene draws hairline backdrop contours, and sub-1.0 aliases them
    // visibly (§6's hard-edged-geometry exception). Not above 1.5 anywhere —
    // a 3× phone at its native ratio would draw nine times the fragments of
    // this for no difference a reader can see.
    maxDpr: mobile ? 1 : name === "tablet" ? 1.25 : 1.5,
    // Touch tiers cap at 60, desktop runs every tick. This was 1000/30 on a
    // phone (26fps as the ticker measures it) and 1000/45 on a tablet, on the
    // skill's argument that a slowly evolving field cannot show a halved
    // frame rate — but nothing in this scene evolves slowly. The idle sweep
    // is a 0.45s stroke, the entrance is a burn, and the figure tilts with
    // the pointer; at 26fps every one of them stepped, and it was reported
    // as lag from a device emulator on a desktop GPU, where fill cannot have
    // been the cost. The frame is paid for elsewhere: the backdrop's reveal
    // loop no longer runs where it is invisible, and the wireframe is off.
    frameInterval: name === "desktop" ? 0 : CAP_60,
    pointerEnabled: !coarse && !reducedMotion,
    antialias: name === "desktop",
    trailSamples: mobile ? 28 : name === "tablet" ? 44 : 72,
    outline: !mobile,
    reveal: !mobile,
    freeze: reducedMotion || mobile && saver
  };
};

// src/config.js
// src/hero/scene.js
var HEAD_CENTRE_Y = 1.35;
var makeNoiseTexture = (size = 256) => {
  let seed = 2654435769;
  const rand = () => {
    seed = seed + 1831565813 >>> 0;
    let t2 = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t2 = t2 + Math.imul(t2 ^ t2 >>> 7, 61 | t2) ^ t2;
    return ((t2 ^ t2 >>> 14) >>> 0) / 4294967296;
  };
  const octaves = [4, 8, 16, 32].map((period) => ({ period, grid: Float32Array.from({ length: period * period }, () => rand()) }));
  const fade = (t2) => t2 * t2 * (3 - 2 * t2);
  const sample = ({ period, grid }, u, v) => {
    const x = u * period, y = v * period;
    const x0 = Math.floor(x), y0 = Math.floor(y);
    const fx = fade(x - x0), fy = fade(y - y0);
    const g = (i, j) => grid[j % period * period + i % period];
    const a = g(x0, y0), b = g(x0 + 1, y0), c = g(x0, y0 + 1), d = g(x0 + 1, y0 + 1);
    return a + (b - a) * fx + (c - a) * fy + (a - b - c + d) * fx * fy;
  };
  const raw = new Float32Array(size * size);
  let lo = 1, hi = 0;
  for (let j = 0; j < size; j++) {
    for (let i = 0; i < size; i++) {
      let n = 0, amp = 0.5, total = 0;
      for (const o of octaves) {
        n += sample(o, i / size, j / size) * amp;
        total += amp;
        amp *= 0.5;
      }
      n /= total;
      raw[j * size + i] = n;
      if (n < lo) lo = n;
      if (n > hi) hi = n;
    }
  }
  const data = new Uint8Array(size * size * 4);
  for (let k = 0; k < raw.length; k++) {
    const v = Math.round(255 * (raw[k] - lo) / (hi - lo));
    data[k * 4] = data[k * 4 + 1] = data[k * 4 + 2] = v;
    data[k * 4 + 3] = 255;
  }
  const texture = new DataTexture(data, size, size, RGBAFormat, UnsignedByteType);
  texture.wrapS = texture.wrapT = RepeatWrapping2;
  texture.minFilter = LinearMipmapLinearFilter;
  texture.magFilter = LinearFilter;
  texture.generateMipmaps = true;
  texture.needsUpdate = true;
  return texture;
};
var readToken = (token2) => {
  const probe = document.createElement("span");
  probe.style.cssText = `position:absolute;visibility:hidden;color:var(${token2})`;
  document.body.appendChild(probe);
  const resolved = getComputedStyle(probe).color;
  probe.remove();
  return resolved;
};
var DEG = Math.PI / 180;
var swing = (v, ampDeg, curve) => {
  const amp = ampDeg * DEG;
  if (curve < 1e-3)
    return amp * v;
  return amp * Math.tanh(curve * v) / Math.tanh(curve);
};
var STATIC_POSE = { x: 0.3, y: 0.1 };
var PHOTO_STATIC_POSE = { x: 0, y: 0.1 };
var PHOTO_STATIC_FACE = { x: 0.012, y: -0.224 };
var SPOT_COLOR = [0.011, 0.0115, 0.0135];
var PLATE = { width: 1520, height: 1136, visible: 1060, bust: 1327, face: 1026, edgeIn: 28, edgeSpan: 160, arcMax: 4096, arcPeriod: 64, neckL: 850, neckR: 2215, skinEnd: 14 };
var PLATE_ASPECT = PLATE.width / PLATE.height;
var PLATE_SWEEP_PATH = [
  { x: -0.47, y: -0.548 },
  { x: 0.47, y: -0.232 },
  { x: -0.4, y: 0.174 },
  { x: 0.47, y: 0.535 }
];
var CAMERA_FOV = 35;
var CAMERA_Y = 0.1;
var visibleWorldHeight = (cameraZ) => 2 * cameraZ * Math.tan(CAMERA_FOV * Math.PI / 360);
var fitSubjectToBox = (params, box2, canvasHeight) => {
  if (canvasHeight <= 0 || box2.height <= 0) {
    return { subjectScale: params.subjectScale, subjectY: params.subjectY };
  }
  const ratio = box2.height / canvasHeight;
  const world = visibleWorldHeight(params.cameraZ);
  const centreShift = canvasHeight / 2 - (box2.top + box2.height / 2);
  return {
    subjectScale: params.subjectScale * ratio,
    subjectY: CAMERA_Y + (params.subjectY - CAMERA_Y) * ratio + centreShift * world / canvasHeight
  };
};
var OUTLINE_MAX_WAVES = 8;
var BACKDROP_Z = -3;
var REFERENCE_ASPECT = 1.778;
var PORT_WIDTH = 1440;
var MIN_FIT = 0.9;
var NARROW_STEP = 0.25;
var STEP_UNDER = 1280;
var AUTO_SWEEP_PATH = [
  { x: -0.85, y: -0.62 },
  { x: 0.78, y: -0.2 },
  { x: -0.7, y: 0.2 },
  { x: 0.82, y: 0.6 }
];
var revealTrailFunction = (name, trail, boundsMin, boundsMax, pace, warp, length, radius, samples) => (
  /* glsl */
  `
  float ${name}(vec2 ndc) {
    // Cheapest rejection first. Below the gate this trail contributes nothing
    // at all, so skipping here removes the entire loop for whichever trail is
    // resting \u2014 which, for the cursor, is most of the time.
    float gate = smoothstep(uGateStart, uGateStart + uGateWidth, ${pace});
    if (gate <= 0.0) return 0.0;

    // Then reject anything outside this trail's bounding box. The backdrop is
    // full-screen, so without this the mask would run its loop over every
    // pixel of the frame; a trail only ever covers a small part of it. The
    // bounds already carry the brush radius and the warp's reach as margin.
    vec2 bounded = vec2(ndc.x * uAspect, ndc.y);
    if (any(lessThan(bounded, ${boundsMin})) || any(greaterThan(bounded, ${boundsMax}))) {
      return 0.0;
    }

    // Displace the point being measured, not the result. Warping the sample
    // position bends the whole shape \u2014 so a parked cursor still shows a blob
    // that kneads itself rather than a perfect disc \u2014 whereas nudging the
    // final value only shifts the threshold and leaves the silhouette round.
    //
    // Branched, because the two texture fetches are the expensive part and a
    // trail with no warp should not pay for them at all.
    vec2 point = bounded;
    if (${warp} > 0.001) {
      vec2 noiseUv = ndc * 0.5 + 0.5;
      float nx = texture2D(uNoiseTex, noiseUv * uWarpScale + vec2(uTime * 0.07, uTime * 0.05)).r;
      float ny = texture2D(uNoiseTex, noiseUv * uWarpScale * 1.4 - vec2(uTime * 0.06, uTime * 0.09)).r;
      point += (vec2(nx, ny) - 0.5) * ${warp} * 0.22;
    }

    // Speed drives the shape: barely moving gives a small tight blob, a fast
    // sweep widens the brush and flattens the age falloff so the whole path
    // stays above threshold as one long trail.
    float radius = ${radius} * mix(uIdleScale, 1.0, ${pace});
    float taper = uTaper * mix(uTaperIdle, uTaperFast, ${pace});

    // Sweep a capsule along every link of the recent path and keep the
    // strongest. Linking successive samples \u2014 rather than stamping a dot per
    // sample \u2014 is what keeps the stroke unbroken when the point being tracked
    // outruns the frame rate.
    float span = max(${length} * float(${samples} - 1), 1.0);
    float ceiling = uThreshold + uEdge + uGlowBand;
    float trail = 0.0;
    for (int i = 0; i < ${samples} - 1; i++) {
      // Links past this trail's length contribute nothing, so stop rather than
      // multiplying by zero \u2014 this is what keeps a long history affordable.
      if (float(i) >= span) break;
      float weight = pow(1.0 - float(i) / span, taper);

      // Two exact early exits. Neither changes a pixel; both cut the common
      // case hard, which matters because this loop now runs twice per
      // fragment over a full-screen plane.
      //
      // 1. A link's contribution is weight * smoothstep(...), and smoothstep
      //    tops out at 1 \u2014 so weight is its ceiling. weight decreases
      //    monotonically with age, so once it drops to what we already have,
      //    no remaining link can beat it. This fires almost immediately in
      //    the solid core of a stroke.
      if (weight <= trail) break;

      vec2 a = vec2(${trail}[i].x * uAspect, ${trail}[i].y);
      vec2 b = vec2(${trail}[i + 1].x * uAspect, ${trail}[i + 1].y);
      float r = radius * weight;
      trail = max(trail, weight * smoothstep(r, r * 0.35, revealSegment(point, a, b)));

      // 2. Past the upper threshold edge the final smoothstep saturates, so
      //    a larger trail value is indistinguishable from this one.
      if (trail >= ceiling) break;
    }

    // The raw strength, kept for whoever wants a glow along the edge of the mask (the accessories do).
    gRevealRaw = max(gRevealRaw, trail * gate);
    return smoothstep(uThreshold - uEdge, uThreshold + uEdge, trail) * gate;
  }
`
);
var buildRevealDeclarations = (samples) => (
  /* glsl */
  `
  uniform vec2 uTrail[${samples}];
  uniform vec2 uTrailMin;
  uniform vec2 uTrailMax;
  uniform float uPace;
  uniform vec2 uSweep[${samples}];
  uniform vec2 uSweepMin;
  uniform vec2 uSweepMax;
  uniform float uSweepPace;
  uniform float uSweepWarp;
  uniform float uSweepLength;
  uniform float uSweepRadius;
  uniform float uAspect;
  uniform float uRadius;
  uniform float uIdleScale;
  uniform float uTaper;
  uniform float uTaperIdle;
  uniform float uTaperFast;
  uniform float uLength;
  uniform float uGateStart;
  uniform float uGateWidth;
  uniform float uWarpScale;
  uniform float uTime;
  uniform float uEdge;
  uniform float uThreshold;
  uniform float uWarp;
  uniform float uRevealMix;
  uniform float uGlowBand;
  uniform float uHold;
  uniform float uRimGlow;
  uniform sampler2D uNoiseTex;

  /** Set by the trail functions below: how strongly the brush reaches this pixel, before the threshold is applied. */
  float gRevealRaw = 0.0;

  /** Distance from p to the segment a-b \u2014 one link of a trail. */
  float revealSegment(vec2 p, vec2 a, vec2 b) {
    vec2 pa = p - a;
    vec2 ba = b - a;
    float h = clamp(dot(pa, ba) / max(dot(ba, ba), 1e-6), 0.0, 1.0);
    return length(pa - ba * h);
  }

  ${revealTrailFunction("revealCursorTrail", "uTrail", "uTrailMin", "uTrailMax", "uPace", "uWarp", "uLength", "uRadius", samples)}
  ${revealTrailFunction("revealSweepTrail", "uSweep", "uSweepMin", "uSweepMax", "uSweepPace", "uSweepWarp", "uSweepLength", "uSweepRadius", samples)}

  float revealTrail(vec2 ndc) {
    gRevealRaw = 0.0;
    // Short-circuit rather than max(): where the cursor already reveals fully
    // the sweep cannot add anything, so its whole loop is skipped. Exactly the
    // region where both trails overlap \u2014 which is the case that was costing.
    float cursor = revealCursorTrail(ndc);
    if (cursor >= 1.0) return 1.0;
    return max(cursor, revealSweepTrail(ndc));
  }
`
);
var DEFAULT_PARAMS = {
  cameraZ: 6.5,
  subjectScale: 1.15,
  // The photograph is not symmetric: the head sits ~43px left of the 2048px
  // texture's centre while the shoulders sit ~14px right of it, so the figure
  // reads as leaning left. 0.09 world units (~19px at an 800px-tall canvas)
  // puts the head back on the axis.
  subjectX: 0,
  subjectY: 0.42,
  subjectParallax: 0.02,
  // The photo comes up from below while it is scanned in: 170 px (CSS) over 2.8 s, easing out like a heavy thing settling.
  riseDistance: 170,
  riseDuration: 2.8,
  headScale: 0.8,
  headY: 0.58,
  headParallax: 5e-3,
  headRelight: 0.32,
  figureScale: 0.68,
  figureX: 0,
  figureY: 0,
  figureZ: 0,
  figureFollow: 0.01,
  // The owner's pass on the degree sliders (2026-09-08, second tune of the
  // day): a small, **linear** turn on both axes, and the pitch now goes *with*
  // the cursor — positive looks down as the cursor goes down. Before it, the
  // shipped tilt was −8.6° at curve 6.67 (the old `−1 × 0.15 rad` restated),
  // steep through the middle and held at the ends; that read as too much
  // motion, and once the angle was a number on a slider the owner took it to
  // a fraction. About 6px of crown travel across a full sweep at 1440×900 —
  // under the whole composition's own `subjectParallax`, which is the point:
  // the figure is a portrait, it is not looking around.
  figureAmpX: 3.4,
  figureCurveX: 0,
  figureAmpY: 5.2,
  figureCurveY: 0,
  figureBrightness: 1,
  trailRadius: 0.46,
  trailIdleScale: 0.28,
  trailTaper: 1.9,
  trailTaperIdle: 1.6,
  trailTaperFast: 1.25,
  trailLength: 0.64,
  revealThreshold: 0.08,
  revealEdge: 5e-3,
  revealWarp: 1.29,
  revealWarpScale: 2.9,
  revealSpeed: 1.25,
  pointerLerp: 0.17,
  pacePeak: 0.029,
  paceAttack: 0.09,
  paceRelease: 0.205,
  paceThreshold: 0.06,
  paceRamp: 0.15,
  outlinePeriod: 3.1,
  sweepWarp: 0.86,
  sweepLength: 0.67,
  sweepRadius: 0.33,
  outlineStagger: 1.2,
  outlineOpacity: 0.09,
  outlineWidth: 0.15,
  outlineBase: 0,
  outlineLightness: 0.64,
  bgLineScale: 3.8,
  // 1 slices the noise field into a single band, so the backdrop draws one
  // sparse iso-line rather than a dense contour map.
  bgLineCount: 2.5,
  bgLineThickness: 1.4,
  bgLineOpacity: 0.85,
  bgWaveAmount: 0.37,
  bgWaveSpeed: 1.66,
  // Linear, so the sRGB encode lands this near mid grey — close to the lit
  // figure's on-screen value, which is what makes the two halves read as one.
  bgRevealLightness: 0.62,
  bgRevealLightnessAlt: 0.44,
  // **Off.** The grey, band-striped shadow the cursor used to leave on the backdrop belonged to the dark carbon shell, and
  // both are gone: what the cursor manifests now is the avatar's accessories, and nothing is drawn around them.
  bgRevealOpacity: 0,
  // The lens: where the cursor runs over the page *outside* the photo, the backdrop answers with a small version of the X-ray —
  // the contours bend, a finer set of accent lines draws in, and a thin rim marks the edge of the brush. 0 leaves it off (the
  // model hero, touch, reduced motion); the photo hero turns it on for a fine pointer in `applyFit`.
  bgLens: 0,
  bgLensWarp: 0.8,
  bgLensLines: 3.4,
  bgLensInk: 0.3,
  bgLensRim: 0.38,
  // The manifest rim: an accent-coloured glow along the edge of the brush where an accessory is being drawn in. `manifestBand` is how
  // far into the brush it reaches (in the mask's own units), `manifestGlow` how bright it is.
  manifestBand: 0.16,
  manifestGlow: 1.15,
  introDuration: 4,
  // The photo's entrance (see the plate shader): an X-ray scan down his body, then the symbiote sprouting from the neck out over the
  // shoulders. One clock, 0…1 over this many seconds, started when the scene is ready.
  photoIntro: 4.8,
  burnStart: 0.14,
  burnSoftness: 0.02,
  burnGlow: 4,
  // **Off.** The idle sweep is a second, synthetic cursor that runs on its own
  // cycle whether or not anyone is pointing at the scene, so the figure kept
  // revealing itself with the mouse nowhere near it. The reveal is a hover
  // effect and nothing else. The slider still brings it back — 0.76 was the
  // tuned extent, if it is ever wanted.
  autoSweepAmount: 0,
  autoSweepPeriod: 5,
  autoSweepStroke: 0.45,
  autoSweepHold: 0
};
var outlineVertex = (
  /* glsl */
  `
  varying float vHeight;
  uniform float uMinY;
  uniform float uRangeY;
  void main() {
    vHeight = (position.y - uMinY) / max(uRangeY, 0.0001);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`
);
var outlineFragment = (
  /* glsl */
  `
  varying float vHeight;
  uniform float uTime;
  uniform float uPeriod;
  uniform float uStagger;
  uniform float uOpacity;
  uniform float uBase;
  uniform float uWidth;
  uniform float uLightness;
  uniform float uRevealMix;
  uniform vec3 uColor;

  void main() {
    float width = max(uWidth, 0.0001);
    float period = max(uPeriod, 0.0001);
    float stagger = max(uStagger, 0.0001);

    // Enter three widths above the crown, leave three below the chin, so a
    // wave is fully faded at both ends of its travel.
    float start = 1.0 + width * 3.0;
    float travel = 1.0 + width * 6.0;

    // A wave is *spawned* every uStagger seconds and lives uPeriod seconds,
    // so several are in flight at once whenever stagger < period \u2014 that is
    // the wave train. Walking back from the most recent spawn means the loop
    // costs only as many iterations as there are live waves; set stagger >=
    // period and it collapses to the single-wave behaviour.
    float wave = 0.0;
    for (int i = 0; i < ${OUTLINE_MAX_WAVES}; i++) {
      float age = mod(uTime, stagger) + float(i) * stagger;
      if (age > period) break;
      float centre = start - (age / period) * travel;
      float d = (vHeight - centre) / width;
      // max, not sum: waves all travel the same way at the same speed so they
      // never actually meet, and summing would blow out if they ever did.
      wave = max(wave, exp(-d * d));
    }

    // Lift off the foreground token toward white, so the token stays the
    // source of the colour and this is only a tuning offset from it.
    vec3 stroke = mix(uColor, vec3(1.0), uLightness);
    gl_FragColor = vec4(stroke, (uBase + wave * uOpacity) * uRevealMix);
  }
`
);
var plateVertex = (
  /* glsl */
  `
  varying vec2 vUv;
  varying vec4 vPlateClip;
  void main() {
    vUv = uv;
    vec4 clip = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    vPlateClip = clip;
    gl_Position = clip;
  }
`
);
var buildPlateFragment = (samples) => (
  /* glsl */
  `
  varying vec2 vUv;
  varying vec4 vPlateClip;
  uniform sampler2D uPhoto;
  uniform sampler2D uXray;
  uniform sampler2D uOutline;  // signed distance to his outline (+ outside), plate px \u2014 see test/xray-align.py
  uniform sampler2D uArc;      // arc length of the outline point nearest to each pixel (coarse R, cos/sin of its phase in G, B)
  uniform vec3 uXrayTint;
  uniform vec3 uGooInk;        // what the symbiote is made of: near black, a breath of the page's ink
  uniform float uGoo;          // 1 = the contour is alive, 0 = the plain cut edge
  uniform float uIntro;        // the entrance clock, 0\u20261
  uniform float uBurnGlow;
  uniform vec3 uBurnColor;
  ${buildRevealDeclarations(samples)}

  const vec2 PLATE_PX = vec2(${PLATE.width}.0, ${PLATE.height}.0);
  const float EDGE_IN = ${PLATE.edgeIn}.0;
  const float EDGE_SPAN = ${PLATE.edgeSpan}.0;
  const float ARC_MAX = ${PLATE.arcMax}.0;
  const float ARC_PERIOD = ${PLATE.arcPeriod}.0;
  const float NECK_L = ${PLATE.neckL}.0;     // arc length of the two corners where the neck meets the shoulders
  const float NECK_R = ${PLATE.neckR}.0;
  const float SKIN_END = ${PLATE.skinEnd}.0; // the goo skin follows the nape this far from a corner, then lets go: the head is left as cut
  const float TAU = 6.28318530718;
  // The entrance, on the uIntro clock: the scan line leaves his crown at SCAN_FROM and is past the last row of the plate at SCAN_TO; the
  // symbiote starts to sprout at SPROUT_FROM and has finished at 1. XRAY_DEPTH is how far behind the line (plate px) the skeleton still shows.
  const float SCAN_FROM = 0.04;
  const float SCAN_TO = 0.52;
  const float SPROUT_FROM = 0.44;
  const float XRAY_DEPTH = 250.0;
  float gSprout = 0.0;                       // 0\u20261: the tendrils' own clock (set in main)

  float h21(float k, float seed) {
    return fract(sin(k * 12.9898 + seed * 78.233) * 43758.5453);
  }
  // value noise along the outline, 0\u20261
  float n1(float x) {
    float i = floor(x);
    float f = fract(x);
    f = f * f * (3.0 - 2.0 * f);
    return mix(h21(i, 9.0), h21(i + 1.0, 9.0), f);
  }
  // smooth union of two distances: the goo pulls itself up into a fillet where two shapes meet
  float smin(float a, float b, float r) {
    float h = max(r - abs(a - b), 0.0) / r;
    return min(a, b) - h * h * r * 0.25;
  }
  // where the tendril of cell k roots: the outline is cut into cells 'cell' px long, and the root is jittered inside its cell
  float rootAt(float k, float seed, float cell) {
    return (k + 0.5 + 0.34 * (h21(k, seed) * 2.0 - 1.0)) * cell;
  }
  // One tendril. (s, v) = (arc length, distance out of the outline), both px; 'centre' is where it roots, k and seed pick its character.
  // Returns the distance (< 0 inside) to its body: a needle that tapers to nothing, leans to one side, sways along its length and breathes
  // on its own clock \u2014 and on the entrance it sprouts: from the neck outward over the shoulders, each on its own beat, shooting out a little
  // past its length and whipping back into place. 'len' = shortest, longest it gets; 'wid' = half-width at the root; 'vis' = 0\u20261.
  float tendril(float s, float v, float centre, float k, float seed, vec2 len, float lenPow, vec2 wid, float bend, float vis) {
    float r1 = h21(k, seed);
    float r2 = h21(k, seed + 1.0);
    float r3 = h21(k, seed + 2.0);
    float r4 = h21(k, seed + 3.0);
    float away = max(max(NECK_L - centre, centre - NECK_R), 0.0);      // px of outline from the neck
    float delay = 0.4 * clamp(away / 700.0, 0.0, 1.0) + 0.2 * r4;
    float g = clamp((gSprout - delay) / 0.34, 0.0, 1.0);
    float u = g - 1.0;
    float pop = 1.0 + 2.70158 * u * u * u + 1.70158 * u * u;            // ease-out-back: 0 \u2192 1, with ~10 % overshoot on the way
    float life = 0.5 + 0.5 * sin(uTime * (0.3 + 0.55 * r3) + r4 * TAU);
    float l = mix(len.x, len.y, pow(r2, lenPow)) * (0.42 + 0.58 * life) * pop * vis;
    float t = clamp(v / max(l, 1.0), 0.0, 1.0);
    float lean = (r3 * 2.0 - 1.0) * bend;
    float sway = (0.4 + 0.6 * r1) * bend * 0.8;
    float whip = (1.0 - g) * bend * 1.2 * t * sin(v * 0.07 - g * 11.0 + r4 * TAU);   // a young tendril lashes while it grows
    float off = lean * pow(t, 1.4) + sway * t * sin(uTime * (0.7 + 0.7 * r2) + r4 * TAU - v * 0.05) + whip;
    float w = mix(wid.x, wid.y, r1) * pow(1.0 - t, 1.5) + 3.5 * (1.0 - smoothstep(0.0, 14.0, v));
    return max(abs(s - centre - off) - w, v - l);
  }

  void main() {
    vec2 ndc = vPlateClip.xy / vPlateClip.w;
    vec2 plate = vec2(vUv.x, 1.0 - vUv.y) * PLATE_PX;     // plate px, y down

    vec4 photoTexel = texture2D(uPhoto, vUv);
    vec4 xrayTexel = texture2D(uXray, vUv);
    vec3 photo = photoTexel.rgb;
    vec3 xray = xrayTexel.rgb * uXrayTint;

    // Entrance, 1 \u2014 the scan. A line of light travels down his body, crown to shirt, and he comes into being behind it: first as the
    // skeleton, which then develops into the photograph over XRAY_DEPTH px. 'dd' is how far behind the line a pixel is (plate px; < 0 =
    // not reached yet), roughened with noise so the front is a living edge and not a ruler. It is read in the plate's own space, so it
    // starts at his crown whatever the window is like, and when the clock ends every pixel is far behind it: the plate is the photograph.
    float sp = clamp((uIntro - SCAN_FROM) / (SCAN_TO - SCAN_FROM), 0.0, 1.0);
    sp = mix(sp, sp * sp * (3.0 - 2.0 * sp), 0.4);
    float scanY = mix(40.0, PLATE_PX.y + XRAY_DEPTH + 70.0, sp);
    float rough = (texture2D(uNoiseTex, vUv * vec2(1.0, 1.33)).r - 0.5) * 46.0 + 5.0 * sin(plate.x * 0.05 - uIntro * 60.0);
    float dd = scanY - plate.y + rough;
    float here = smoothstep(-6.0, 20.0, dd);                                            // he exists behind the line\u2026
    float xr = smoothstep(-6.0, 14.0, dd) * (1.0 - smoothstep(60.0, XRAY_DEPTH, dd));   // \u2026first as the skeleton

    // Union, so the cursor can already be drawing the skeleton while the scan is still going down.
    float cursor = revealTrail(ndc);
    float mask = max(cursor, xr) * uRevealMix;

    vec3 color = mix(photo, xray, mask);
    color *= 1.0 - 0.12 * xr * (0.5 + 0.5 * sin(plate.y * 0.9));                         // the scanner's raster, faint, in the skeleton only

    // The line itself and the glow it leaves behind; the footprint of his body (alpha, below) is what cuts them to his shape.
    float lineD = dd - 5.0;
    float line = exp(-lineD * lineD / 28.0);
    float wake = smoothstep(-4.0, 12.0, dd) * exp(-max(dd, 0.0) / 80.0);
    color = mix(color, vec3(1.0, 0.9, 0.9), clamp(line * 0.55, 0.0, 1.0));
    color += uBurnColor * (line * 1.1 + wake * 0.3) * uBurnGlow * 0.25 * uRevealMix;

    // The rim of the brush, where the skeleton is just coming in under the cursor. Held down: on a photograph a wide glow floods
    // the front with flat accent; this keeps it a line.
    float rim = (1.0 - smoothstep(uThreshold, uThreshold + uGlowBand, gRevealRaw)) * step(0.0005, gRevealRaw) * (1.0 - xr) * cursor;
    color += uBurnColor * rim * uRimGlow * uRevealMix;

    // Both layers are cut-outs (transparent where he is not), so the page shows round him and the X-ray's film is the shape of
    // his body, not a rectangle. Alpha is crossed with the same mask as the colour; the line is solid wherever the body is.
    float footprint = max(photoTexel.a, xrayTexel.a);
    float alpha = max(mix(photoTexel.a, xrayTexel.a, mask) * here, line * footprint);

    // The symbiote. His outline stays exactly as cut; round the shoulders and the first stretch of nape it grows a skin of black goo, and
    // out of the goo come tendrils \u2014 thin, sharp, curling, each on its own clock. The head is left alone. Where the outline is (sd = 0)
    // and how far out a pixel is (v) come from the distance image; where ALONG the outline it is (s) from the arc image, so a tendril is a
    // shape in (s, v) that hangs on one spot of the contour and moves with it. It is drawn behind the body, as a distance field: the goo
    // and the tendrils are merged with a smooth union, which is what makes the roots webbed and wet.
    // Entrance, 2 \u2014 it sprouts once the scan has gone by: first the skin, then the tendrils, neck outward (see tendril()).
    gSprout = clamp((uIntro - SPROUT_FROM) / (1.0 - SPROUT_FROM), 0.0, 1.0);
    float grown = smoothstep(0.0, 0.22, gSprout);
    float v = texture2D(uOutline, vUv).r * EDGE_SPAN - EDGE_IN;
    vec3 arc = texture2D(uArc, vUv).rgb;
    // not below the shoulders \u2014 the arms run into the hero's corners, where the mail link and the socials are \u2014 and not at the plate's top
    float zone = (1.0 - smoothstep(740.0, 900.0, plate.y)) * smoothstep(0.0, 50.0, plate.y) * uGoo;
    float d = 1000.0;
    float s = 0.0;
    // only the band round the outline (and a hair under the body, to close the seam) is worked out; everywhere else is a constant
    if (zone > 0.001 && v > -4.0 && v < 131.5) {
      vec2 cs = arc.gb * 2.0 - 1.0 + vec2(1e-4, 0.0);
      float ph = atan(cs.y, cs.x);
      s = ARC_PERIOD * (floor((arc.r * ARC_MAX - ARC_PERIOD * ph / TAU) / ARC_PERIOD + 0.5) + ph / TAU);
      // where the nearest outline point flips (the corner of the neck, the notch under an ear) the phase is a blend and means nothing
      float vis = smoothstep(0.5, 0.85, length(cs)) * zone;

      // the skin: 1 along the shoulders, 0 along the nape and the head (a soft hand-over, 46 px, starting at the neck's corners)
      float headA = NECK_L + SKIN_END;
      float headB = NECK_R - SKIN_END;
      float skin = 1.0 - smoothstep(headA, headA + 46.0, s) * (1.0 - smoothstep(headB - 46.0, headB, s));
      float coat = (3.8 + 2.6 * n1(s * 0.03 + uTime * 0.3) + 1.0 * n1(s * 0.1 - uTime * 0.5)) * zone * skin * grown;
      // where there is no skin the goo's edge sits 3 px inside the body, so not even the cut edge's anti-aliasing picks up a dark fringe
      d = v - coat + 3.0 * (1.0 - skin * grown * zone);

      // the shoulders: two trains of tendrils, long and middling, rooted in cells of the outline (and never on the neck or the head)
      float kA = floor(s / 110.0);
      float kB = floor(s / 60.0);
      for (int i = -1; i <= 1; i++) {
        float f = float(i);
        float cA = rootAt(kA + f, 1.0, 110.0);
        float cB = rootAt(kB + f, 5.0, 60.0);
        if (cA < NECK_L - 25.0 || cA > NECK_R + 25.0) d = smin(d, tendril(s, v, cA, kA + f, 1.0, vec2(60.0, 128.0), 1.1, vec2(5.2, 8.6), 36.0, vis), 11.0);
        if (cB < NECK_L - 25.0 || cB > NECK_R + 25.0) d = smin(d, tendril(s, v, cB, kB + f, 5.0, vec2(18.0, 70.0), 1.2, vec2(3.2, 5.4), 18.0, vis), 9.0);
      }
      d = max(d, -v - 2.5);
    }

    // wet: a thin bright line just inside the goo's edge on the side the light is on, in streaks that slide along it; where the brush is
    // the skeleton's accent, the same scan as the lines of the backdrop
    float px = 0.5 * max(fwidth(plate.x), fwidth(plate.y));    // half a screen pixel, in plate px
    vec2 grad = vec2(dFdx(d), dFdy(d));
    vec2 nrm = grad / max(length(grad), 1e-4);
    float e = -d;
    float lit = pow(max(dot(nrm, normalize(vec2(-0.55, 0.85))), 0.0), 1.5);
    float streak = 0.4 + 0.6 * smoothstep(0.2, 0.75, n1(s * 0.02 - uTime * 0.4));
    float shine = smoothstep(2.2, 2.9, e) * (1.0 - smoothstep(3.3, 4.3, e)) * lit * streak;
    float gooA = (1.0 - smoothstep(-px, px, d)) * step(0.5, uGoo) * here;      // (and none where the scan has not reached yet)
    // graphite, a hair lighter than the black page so the mass reads; a thin red rim all along its edge; the wet streak on the lit side
    // in a hot white; and where the brush is, the accent takes over
    float rimLine = 1.0 - smoothstep(0.5, 2.8, e);
    vec3 gooColor = mix(uGooInk, uBurnColor * 0.85, rimLine * 0.5);
    gooColor = mix(gooColor, vec3(1.0, 0.86, 0.84), shine * 0.8);
    gooColor = mix(gooColor, uBurnColor, mask * (0.25 + 0.6 * shine));

    float gooOver = gooA * (1.0 - alpha);
    float outA = alpha + gooOver;
    gl_FragColor = vec4((color * alpha + gooColor * gooOver) / max(outA, 1e-4), outA);
    #include <colorspace_fragment>
  }
`
);
var backdropVertex = (
  /* glsl */
  `
  varying vec4 vBackdropClip;
  void main() {
    vec4 clip = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    vBackdropClip = clip;
    gl_Position = clip;
  }
`
);
var buildBackdropFragment = (samples) => (
  /* glsl */
  `
  varying vec4 vBackdropClip;
  uniform vec3 uBackground;
  uniform vec3 uLineColor;      // the glyphs' ink
  uniform float uLineScale;
  uniform float uLineOpacity;
  uniform float uWaveAmount;
  uniform float uWaveSpeed;
  uniform float uRevealOpacity;
  uniform float uLens;
  uniform float uLensWarp;
  uniform float uLensRim;
  uniform vec3 uBurnColor;
  uniform float uRows;          // glyph rows over the height of the view
  uniform vec4 uSpot;           // centre (x, y) and radii (x, y) of the spot behind the figure, in NDC
  uniform vec3 uSpotColor;
  ${buildRevealDeclarations(samples)}

  /** Smooth analytic field the glyph density is read from: four sines at incommensurate frequencies, two of them diagonal. */
  float backdropField(vec2 p, float t) {
    float f = sin(p.x * 1.00 + t * 0.60) * 0.50;
    f += sin(p.y * 0.85 - t * 0.45) * 0.45;
    f += sin((p.x + p.y) * 0.65 + t * 0.35) * 0.35;
    f += sin((p.x - p.y) * 0.95 - t * 0.55) * 0.25;
    return f * 0.5 + 0.5;
  }
  float cellHash(vec2 c, float seed) {
    return fract(sin(dot(c, vec2(127.1, 311.7)) + seed * 17.13) * 43758.5453);
  }
  float segD(vec2 p, vec2 a, vec2 b) {
    vec2 pa = p - a;
    vec2 ba = b - a;
    return length(pa - ba * clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0));
  }
  /** The glyph of a density level (1\u20264), q in screen px from the cell's centre (y up), cell = its size in px, hw = half a stroke. */
  float glyph(vec2 q, vec2 cell, float lvl, float hw) {
    float w = cell.x;
    float h = cell.y;
    float d;
    if (lvl < 1.5) {
      d = length(q - vec2(0.0, -0.2 * h)) - max(hw * 1.2, 0.045 * h);                       // .
    } else if (lvl < 2.5) {
      d = min(length(q - vec2(0.0, -0.2 * h)), length(q - vec2(0.0, 0.13 * h))) - max(hw * 1.15, 0.045 * h);   // :
    } else if (lvl < 3.5) {
      d = min(segD(q, vec2(-0.27 * w, 0.0), vec2(0.27 * w, 0.0)), segD(q, vec2(0.0, -0.2 * h), vec2(0.0, 0.2 * h))) - hw;   // +
    } else {
      float x = 0.15 * w;
      float y = 0.15 * h;
      d = min(min(segD(q, vec2(-x, -0.3 * h), vec2(-x, 0.3 * h)), segD(q, vec2(x, -0.3 * h), vec2(x, 0.3 * h))),
              min(segD(q, vec2(-0.33 * w, -y), vec2(0.33 * w, -y)), segD(q, vec2(-0.33 * w, y), vec2(0.33 * w, y)))) - hw;   // #
    }
    return 1.0 - smoothstep(-0.55, 0.55, d);
  }

  void main() {
    vec2 ndc = vBackdropClip.xy / vBackdropClip.w;
    vec2 sp = vec2(ndc.x * uAspect, ndc.y);                  // half the view's height = 1

    // The monospace grid: a cell is 0.56 as wide as it is tall. u = where in the cell this pixel is (\u22120.5\u20260.5, y up).
    vec2 cellSize = vec2(0.56, 1.0) * (2.0 / uRows);
    vec2 scaled = sp / cellSize;
    vec2 cid = floor(scaled);
    vec2 u = fract(scaled) - 0.5;
    vec2 cellPx = 1.0 / max(fwidth(scaled), vec2(1e-5));     // the cell's size on screen, px
    vec2 cc = (cid + 0.5) * cellSize;                        // the cell's centre
    vec2 ndcC = vec2(cc.x / uAspect, cc.y);

    // The cursor's trail is measured once per cell, for the lens. Skipped outright when it is off (every touch width): a uniform branch.
    float cursor = 0.0;
    float lens = 0.0;
    float rim = 0.0;
    if (uLens > 0.001) {
      cursor = revealTrail(ndcC) * uRevealMix;
      lens = smoothstep(uThreshold, 0.75, gRevealRaw) * uRevealMix * uLens;
      rim = (1.0 - smoothstep(uThreshold, uThreshold + uGlowBand, gRevealRaw)) * step(0.0005, gRevealRaw) * cursor * uLens;
    }

    // Two out-of-phase displacements, one per axis, roll the field; inside the brush it is kneaded by the same noise the brush's edge uses.
    float t = uTime * uWaveSpeed;
    vec2 p = cc * uLineScale;
    vec2 q = p;
    q.x += sin(p.y * 0.8 + t * 0.7) * uWaveAmount;
    q.y += cos(p.x * 0.7 - t * 0.6) * uWaveAmount;
    vec2 lensUv = ndcC * 0.5 + 0.5;
    vec2 lensNoise = vec2(
      texture2D(uNoiseTex, lensUv * uWarpScale + vec2(uTime * 0.07, uTime * 0.05)).r,
      texture2D(uNoiseTex, lensUv * uWarpScale * 1.4 - vec2(uTime * 0.06, uTime * 0.09)).r
    ) - 0.5;
    q += lensNoise * uLensWarp * lens;
    float f = backdropField(q, t);

    // density \u2192 level: a dithered threshold, so the bands between levels break up into characters instead of drawing contours
    float jitter = cellHash(cid, 1.0);
    float dens = smoothstep(0.46, 0.92, f) + (jitter - 0.5) * 0.24;
    float lvl = floor(clamp(dens, 0.0, 0.999) * 5.0);        // 0\u20264
    lvl = min(4.0, lvl + floor(lens * 2.6));                 // the lens thickens what it covers
    lvl = max(lvl, step(0.2, rim) * 4.0);                    // \u2026and the edge of the brush is all #

    vec3 color = uBackground;
    float spot = 1.0 - smoothstep(0.0, 1.0, length((ndc - uSpot.xy) / max(uSpot.zw, vec2(1e-3))));
    color = mix(color, uSpotColor, spot);

    if (lvl > 0.5) {
      float hw = 0.62;                                       // half a stroke: 1.2 px
      float g = glyph(u * cellPx, cellPx, lvl, hw);
      float vig = 1.0 - 0.5 * smoothstep(0.55, 1.45, length(vec2(ndc.x * 0.85, ndc.y)));
      float a = (0.05 + 0.036 * cellHash(cid, 2.0)) * uLineOpacity * vig * uRevealMix;
      a = mix(a, 0.95, clamp(lens * 1.1, 0.0, 1.0));
      a = max(a, rim * uLensRim * 2.4);
      vec3 ink = mix(uLineColor, uBurnColor, clamp(lens * 1.6 + rim, 0.0, 1.0));
      color = mix(color, ink, g * a);
    }

    gl_FragColor = vec4(color, 1.0);
    #include <colorspace_fragment>
  }
`
);
var HeroScene = class {
  get tier() {
    return this._tier;
  }
  constructor(canvas, options = {}) {
    this.subject = options.subject ?? HERO_SUBJECT;
    this.photoMode = this.subject === "photo";
    this.staticPose = this.photoMode ? PHOTO_STATIC_POSE : STATIC_POSE;
    this.sweepPath = AUTO_SWEEP_PATH;
    this.plate = null;
    this.plateBox = null;
    this.scene = new Scene();
    this.camera = new PerspectiveCamera(CAMERA_FOV, 1, 0.1, 50);
    this.avatar = null;
    this.rig = null;
    this.keyLight = null;
    this.revealUniforms = null;
    this.outlineMaterial = null;
    this.outlineMesh = null;
    this.figureGroup = new Group2();
    this.figurePivot = new Group2();
    this.subjectGroup = new Group2();
    this.backdropMesh = null;
    this.backdropMaterial = null;
    this.params = { ...DEFAULT_PARAMS };
    this.pointer = { x: 0, y: 0 };
    this.smoothed = { x: 0, y: 0 };
    this.lastSmoothed = { x: 0, y: 0 };
    this.pointerSeen = false;
    this.tilt = 0;
    this.yaw = 0;
    this.pace = 0;
    this.readyAt = null;
    this.intro = 0;
    this.viewportHeight = 1;
    this.viewportWidth = 1;
    this.riseStarted = false;
    this.riseAt = null;
    this.sweepPointer = {
      x: this.sweepPath[0].x,
      y: this.sweepPath[0].y
    };
    this.sweepSmoothed = { ...this.sweepPointer };
    this.sweepLast = { ...this.sweepPointer };
    this.sweepPace = 0;
    this.sweepCycle = 0;
    this.aspect = 1;
    this.reveal = 0;
    this.settled = false;
    this.disposed = false;
    this.startTime = null;
    this.ready = false;
    this.onReady = null;
    this._tier = this.adaptTier(getSceneTier());
    this.samples = this._tier.trailSamples;
    this.trail = Array.from({ length: this.samples }, () => new Vector2(this.staticPose.x, -this.staticPose.y));
    this.sweepTrail = Array.from({ length: this.samples }, () => new Vector2(this.sweepPath[0].x, -this.sweepPath[0].y));
    this.renderer = new WebGLRenderer({
      canvas,
      // Opaque canvas — cheaper compositing than alpha; the clear colour is
      // read from the page so the brand token stays the single source.
      alpha: false,
      antialias: this._tier.antialias,
      stencil: false,
      powerPreference: this._tier.mobile ? "default" : "high-performance"
    });
    this.renderer.setClearColor(new Color2(getComputedStyle(document.body).backgroundColor));
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, this._tier.maxDpr));
    this.renderer.toneMapping = ACESFilmicToneMapping;
    if (!this._tier.pointerEnabled)
      this.parkPointer();
    this.camera.position.set(0, CAMERA_Y, 6.5);
    this.figureGroup.add(this.figurePivot);
    this.subjectGroup.add(this.figureGroup);
    this.scene.add(this.subjectGroup);
    void this.load();
  }
  /**
   * The photo has no wireframe to draw, and its reveal is the whole point of it — so unlike the model it keeps the reveal on a
   * phone too (a touch screen gets the idle sweep instead of a cursor).
   */
  adaptTier(tier) {
    return this.photoMode ? { ...tier, reveal: true, outline: false } : tier;
  }
  /**
   * Re-reads the device tier and applies everything that can change without
   * a rebuild: the pixel-ratio cap, the frame budget, whether the wireframe
   * draws, whether the pointer is parked, and whether a frozen scene resumes.
   * Returns the tier so the React wrapper can follow it — the frame budget
   * into the ticker, the pointer flag into its listener.
   *
   * Called when the container's width changes or the pointer class flips. A
   * desktop window dragged across a breakpoint genuinely changes tier, and
   * so does a device emulator switched off: until 2026-09-08 the second case
   * was never handled, because touch-class devices were excluded from the
   * resize path wholesale, so a page opened under emulation and returned to
   * a desktop viewport kept a phone's canvas size, budget and parked pointer
   * for the rest of the session. The skill's "read the tier once" rule is
   * about a *device* not changing class mid-session, which still holds — the
   * iOS URL bar only ever changes the height, and the wrapper ignores that.
   *
   * `trailSamples` and `antialias` deliberately do **not** update: one is
   * baked into the shader source and the other into the GL context, so
   * honouring them would mean recompiling every material or rebuilding the
   * context mid-session. A window dragged from phone-width to desktop keeps
   * the shorter trail and no MSAA until reload — a slightly stubbier reveal,
   * and nothing else.
   */
  retune() {
    const fresh = getSceneTier();
    const previous = this._tier;
    const tier = this.adaptTier({
      ...fresh,
      antialias: previous.antialias,
      trailSamples: previous.trailSamples
    });
    this._tier = tier;
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, tier.maxDpr));
    if (this.outlineMesh)
      this.outlineMesh.visible = tier.outline;
    if (!tier.pointerEnabled)
      this.parkPointer();
    else if (!previous.pointerEnabled)
      this.pointerSeen = false;
    if (!tier.freeze)
      this.settled = false;
    return tier;
  }
  /**
   * Parks the cursor at `STATIC_POSE` and settles every follower on it, so a
   * scene with no pointer — touch, reduced motion, or a tier that has just
   * lost its cursor — holds the composition's fixed off-axis pose rather than
   * whatever the last real event left behind.
   */
  parkPointer() {
    const pose = this.staticPose;
    this.pointer = { ...pose };
    this.smoothed = { ...pose };
    this.lastSmoothed = { ...pose };
    this.tilt = this.pitchFor(pose.y);
    this.yaw = this.yawFor(pose.x);
    this.pointerSeen = false;
  }
  /**
   * Starts the composition's rise into place. Called the moment the scene is
   * ready, as the canvas fades in, so the photo is already on its way up while
   * the scan brings it into being.
   */
  beginRise() {
    this.riseStarted = true;
  }
  /**
   * Where the layout wants the photo, as a box in CSS pixels measured from the canvas's top-left. The scene converts it to
   * world units itself (`updatePlate`), so the page's own CSS — not a camera constant — decides where the photo sits at each
   * width. The idle sweep is re-mapped onto the same box, so a touch screen scans his face and not the empty window around it.
   */
  setPlate(box2) {
    this.plateBox = box2;
    this.updateBackdropGrid();
    if (!this.photoMode || !box2 || !this.viewportWidth || !this.viewportHeight)
      return;
    const cx = (box2.left + box2.width / 2) / this.viewportWidth * 2 - 1;
    const cy = (box2.top + box2.height / 2) / this.viewportHeight * 2 - 1;
    const hx = box2.width / this.viewportWidth;
    const hy = box2.height / this.viewportHeight;
    this.sweepPath = PLATE_SWEEP_PATH.map((w) => ({ x: cx + w.x * hx, y: cy + w.y * hy }));
    this.resetSweep();
    this.staticPose = { x: cx + PHOTO_STATIC_FACE.x * hx, y: cy + PHOTO_STATIC_FACE.y * hy };
    if (!this._tier.pointerEnabled) {
      this.parkPointer();
      for (const sample of this.trail)
        sample.set(this.staticPose.x, -this.staticPose.y);
    }
  }
  setPointer(x, y) {
    this.pointer.x = x;
    this.pointer.y = y;
    if (!this.pointerSeen) {
      this.pointerSeen = true;
      this.smoothed.x = x;
      this.smoothed.y = y;
      this.lastSmoothed.x = x;
      this.lastSmoothed.y = y;
      this.tilt = this.pitchFor(y);
      this.yaw = this.yawFor(x);
    }
  }
  /** The pitch the cursor's vertical position asks for, in radians. */
  pitchFor(y) {
    return swing(y, this.params.figureAmpX, this.params.figureCurveX);
  }
  /** The yaw its horizontal position asks for. */
  yawFor(x) {
    return swing(x, this.params.figureAmpY, this.params.figureCurveY);
  }
  /** Live-apply a partial set of effect parameters. */
  setParams(partial) {
    Object.assign(this.params, partial);
    this.settled = false;
  }
  /**
   * The backdrop's glyph grid and the spot behind the figure. A glyph cell is about 16 CSS px tall (13–18 as the window goes from short to
   * tall); the spot is an ellipse over the photo's neck, wide enough to take both the head and the shoulders.
   */
  updateBackdropGrid() {
    const bg = this.backdropMaterial?.uniforms;
    if (!bg || !this.viewportHeight)
      return;
    const H = this.viewportHeight, W = this.viewportWidth;
    bg.uRows.value = H / Math.min(18, Math.max(13, H / 56));
    const box2 = this.plateBox;
    if (!this.photoMode || !box2 || !W) {
      bg.uSpotColor.value.copy(bg.uBackground.value);
      return;
    }
    const cx = (box2.left + box2.width / 2) / W * 2 - 1;
    const cy = 1 - (box2.top + box2.height * (560 / PLATE.height)) / H * 2;
    bg.uSpot.value.set(cx, cy, box2.width * 0.58 / W * 2, box2.height * 0.66 / H * 2);
    bg.uSpotColor.value.set(...SPOT_COLOR);
  }
  resize(width, height) {
    this.renderer.setSize(width, height, false);
    this.viewportHeight = Math.max(height, 1);
    this.viewportWidth = Math.max(width, 1);
    this.aspect = width / height;
    this.camera.aspect = this.aspect;
    this.camera.updateProjectionMatrix();
    this.updateBackdropGrid();
    if (this.revealUniforms)
      this.revealUniforms.uAspect.value = this.aspect;
  }
  update(time) {
    if (this.disposed || this.settled)
      return;
    if (this.startTime === null)
      this.startTime = time;
    const t2 = (time - this.startTime) / 1e3;
    const p = this.params;
    if (this._tier.freeze && this.reveal > 0.995 && this.intro >= 1) {
      this.settled = true;
    }
    const autoEnabled = p.autoSweepAmount > 0 && !this._tier.freeze && this.intro >= 1;
    if (autoEnabled) {
      const cycle = t2 % Math.max(p.autoSweepPeriod, 1e-3);
      if (cycle < this.sweepCycle)
        this.resetSweep();
      this.sweepCycle = cycle;
      const legs = this.sweepPath.length - 1;
      const stroke = Math.max(p.autoSweepStroke, 0.05);
      const slot = stroke + Math.max(p.autoSweepHold, 0);
      const leg = Math.floor(cycle / slot);
      if (leg < legs) {
        const local = Math.min(1, (cycle - leg * slot) / stroke);
        const eased = 1 - (1 - local) * (1 - local);
        const from = this.sweepPath[leg];
        const to = this.sweepPath[leg + 1];
        this.sweepPointer.x = (from.x + (to.x - from.x) * eased) * p.autoSweepAmount;
        this.sweepPointer.y = (from.y + (to.y - from.y) * eased) * p.autoSweepAmount;
      }
    }
    this.sweepSmoothed.x += (this.sweepPointer.x - this.sweepSmoothed.x) * p.pointerLerp;
    this.sweepSmoothed.y += (this.sweepPointer.y - this.sweepSmoothed.y) * p.pointerLerp;
    const sweepStep = Math.hypot(this.sweepSmoothed.x - this.sweepLast.x, this.sweepSmoothed.y - this.sweepLast.y);
    const sweepTarget = autoEnabled ? Math.min(1, sweepStep / Math.max(p.pacePeak, 1e-5)) : 0;
    this.sweepPace += (sweepTarget - this.sweepPace) * (sweepTarget > this.sweepPace ? p.paceAttack : p.paceRelease);
    this.sweepLast.x = this.sweepSmoothed.x;
    this.sweepLast.y = this.sweepSmoothed.y;
    const oldestSweep = this.sweepTrail.pop();
    if (oldestSweep) {
      oldestSweep.set(this.sweepSmoothed.x, -this.sweepSmoothed.y);
      this.sweepTrail.unshift(oldestSweep);
    }
    this.smoothed.x += (this.pointer.x - this.smoothed.x) * p.pointerLerp;
    this.smoothed.y += (this.pointer.y - this.smoothed.y) * p.pointerLerp;
    if (this.ready) {
      if (this.readyAt === null)
        this.readyAt = t2;
      this.intro = Math.min(1, (t2 - this.readyAt) / Math.max(this.photoMode ? p.photoIntro : p.introDuration, 1e-3));
      if (this._tier.freeze)
        this.intro = 1;
    }
    this.camera.position.z = p.cameraZ;
    this.subjectGroup.scale.setScalar(p.subjectScale * this.narrowFit());
    this.subjectGroup.position.x = p.subjectX + // Landscape only. On a portrait screen the copy sits above the figure
    // rather than beside it, so there is nothing to step away from — and
    // stepping anyway put him off the block's centre line.
    (this.viewportWidth < STEP_UNDER && this.aspect >= 1.2 ? NARROW_STEP : 0) + this.smoothed.x * p.subjectParallax;
    this.subjectGroup.position.y = p.subjectY - this.smoothed.y * p.subjectParallax - this.riseOffset(t2, p);
    if (this.keyLight) {
      this.keyLight.position.set(3 + this.smoothed.x * 3.5, 4 - this.smoothed.y * 3, 5);
    }
    this.tilt += (this.pitchFor(this.smoothed.y) - this.tilt) * p.pointerLerp;
    this.yaw += (this.yawFor(this.smoothed.x) - this.yaw) * p.pointerLerp;
    this.figurePivot.rotation.x = this.tilt;
    this.figurePivot.rotation.y = this.yaw;
    this.figureGroup.position.x = p.figureX + this.smoothed.x * p.figureFollow;
    this.figureGroup.position.y = p.figureY - this.smoothed.y * p.figureFollow * 0.8;
    this.figureGroup.position.z = p.figureZ;
    this.figureGroup.scale.setScalar(p.figureScale);
    if (this.plate)
      this.updatePlate(t2, p);
    const step = Math.hypot(this.smoothed.x - this.lastSmoothed.x, this.smoothed.y - this.lastSmoothed.y);
    if (this._tier.pointerEnabled) {
      const target = Math.min(1, step / Math.max(p.pacePeak, 1e-5));
      this.pace += (target - this.pace) * (target > this.pace ? p.paceAttack : p.paceRelease);
    } else if (!autoEnabled && this.intro >= 1 && this._tier.reveal) {
      this.pace = 1;
    }
    this.lastSmoothed.x = this.smoothed.x;
    this.lastSmoothed.y = this.smoothed.y;
    const oldest = this.trail.pop();
    if (oldest) {
      oldest.set(this.smoothed.x, -this.smoothed.y);
      this.trail.unshift(oldest);
    }
    if (this.revealUniforms) {
      this.revealUniforms.uAspect.value = this.aspect;
      this.revealUniforms.uRadius.value = p.trailRadius;
      this.revealUniforms.uIdleScale.value = p.trailIdleScale;
      this.revealUniforms.uTaper.value = p.trailTaper;
      this.revealUniforms.uTaperIdle.value = p.trailTaperIdle;
      this.revealUniforms.uTaperFast.value = p.trailTaperFast;
      this.revealUniforms.uLength.value = p.trailLength;
      this.revealUniforms.uPace.value = this.pace;
      this.revealUniforms.uGateStart.value = p.paceThreshold;
      this.revealUniforms.uGateWidth.value = p.paceRamp;
      this.revealUniforms.uWarpScale.value = p.revealWarpScale;
      this.revealUniforms.uTime.value = t2 * p.revealSpeed;
      this.revealUniforms.uRevealMix.value = this.reveal;
      this.revealUniforms.uThreshold.value = p.revealThreshold;
      this.revealUniforms.uEdge.value = p.revealEdge;
      this.revealUniforms.uWarp.value = p.revealWarp;
      this.revealUniforms.uIntro.value = this.intro;
      this.revealUniforms.uBurnStart.value = p.burnStart;
      this.revealUniforms.uBurnSoft.value = p.burnSoftness;
      this.revealUniforms.uBurnGlow.value = p.burnGlow;
      this.revealUniforms.uGlowBand.value = p.manifestBand;
      this.revealUniforms.uRimGlow.value = p.manifestGlow;
      this.revealUniforms.uHold.value = this.holdsAccessories() ? 1 : 0;
      this.revealUniforms.uSweepPace.value = this.sweepPace;
      this.revealUniforms.uSweepWarp.value = p.sweepWarp;
      this.revealUniforms.uSweepLength.value = p.sweepLength;
      this.revealUniforms.uSweepRadius.value = p.sweepRadius;
      this.writeTrailBounds(this.trail, p.trailLength, p.revealWarp, p.trailRadius, this.revealUniforms.uTrailMin.value, this.revealUniforms.uTrailMax.value);
      this.writeTrailBounds(this.sweepTrail, p.sweepLength, p.sweepWarp, p.sweepRadius, this.revealUniforms.uSweepMin.value, this.revealUniforms.uSweepMax.value);
    }
    if (this.backdropMesh && this.backdropMaterial) {
      const distance = this.camera.position.z - BACKDROP_Z;
      const height = 2 * distance * Math.tan(this.camera.fov * Math.PI / 360) * 1.06;
      this.backdropMesh.scale.set(height * this.aspect, height, 1);
      const bg = this.backdropMaterial.uniforms;
      bg.uLineScale.value = p.bgLineScale;
      bg.uLineCount.value = p.bgLineCount;
      bg.uLineThickness.value = p.bgLineThickness;
      bg.uLineOpacity.value = p.bgLineOpacity;
      bg.uWaveAmount.value = p.bgWaveAmount;
      bg.uWaveSpeed.value = p.bgWaveSpeed;
      bg.uRevealOpacity.value = p.bgRevealOpacity;
      bg.uLens.value = p.bgLens;
      bg.uLensWarp.value = p.bgLensWarp;
      bg.uLensLines.value = p.bgLensLines;
      bg.uLensInk.value = p.bgLensInk;
      bg.uLensRim.value = p.bgLensRim;
      bg.uRevealColor.value.setScalar(p.bgRevealLightness);
      bg.uRevealColorAlt.value.setScalar(p.bgRevealLightnessAlt);
    }
    if (this.outlineMaterial) {
      const outline = this.outlineMaterial.uniforms;
      outline.uTime.value = t2;
      outline.uPeriod.value = p.outlinePeriod;
      outline.uStagger.value = p.outlineStagger;
      outline.uOpacity.value = p.outlineOpacity;
      outline.uWidth.value = p.outlineWidth;
      outline.uLightness.value = p.outlineLightness;
      outline.uBase.value = p.outlineBase;
      outline.uRevealMix.value = this.reveal * this.burnProgress(p);
    }
    this.renderer.render(this.scene, this.camera);
  }
  /**
   * Places the photo: the box the layout gave it (see `setPlate`) turned into world units at the plane's own depth, then the
   * same slow parallax, rise and cursor lean the model gets. Both textures live on this one plane, so whatever it does they
   * do together and stay registered.
   */
  updatePlate(t2, p) {
    const { group, mesh } = this.plate;
    const box2 = this.plateBox;
    group.visible = Boolean(box2 && box2.width > 0 && box2.height > 0);
    if (!group.visible)
      return;
    const unit = visibleWorldHeight(p.cameraZ) / this.viewportHeight;
    const cx = box2.left + box2.width / 2;
    const cy = box2.top + box2.height / 2;
    group.position.x = (cx - this.viewportWidth / 2) * unit + this.smoothed.x * p.subjectParallax;
    group.position.y = CAMERA_Y + (this.viewportHeight / 2 - cy) * unit - this.smoothed.y * p.subjectParallax - this.riseOffset(t2, p);
    mesh.scale.set(box2.width * unit, box2.height * unit, 1);
    group.rotation.x = this.tilt;
    group.rotation.y = this.yaw;
  }
  /**
   * World-space drop still to be travelled by the composition's entrance.
   *
   * `riseDistance` is given in CSS pixels so it stays the same apparent
   * movement on every screen; converting it needs the frustum height at the
   * subject's depth, which changes with `cameraZ`, so it is resolved per
   * frame rather than baked once.
   *
   * Holds at the full drop until `beginRise()`, which the page calls the moment
   * the scene is ready — the same moment the entrance clock starts — so the
   * gesture is seen from its first frame.
   */
  riseOffset(t2, p) {
    if (this._tier.freeze || p.riseDistance === 0)
      return 0;
    let remaining = 1;
    if (this.riseStarted) {
      if (this.riseAt === null)
        this.riseAt = t2;
      const u = Math.min(1, (t2 - this.riseAt) / Math.max(p.riseDuration, 1e-3));
      remaining = (1 - u) * (1 - u) * (1 - u);
    }
    if (remaining <= 0)
      return 0;
    const visible = 2 * p.cameraZ * Math.tan(this.camera.fov * Math.PI / 360);
    return remaining * p.riseDistance * (visible / this.viewportHeight);
  }
  /**
   * How far the entrance burn has progressed, 0 before it starts and 1 once
   * the accessories are gone. Mirrors the `smoothstep(uBurnStart, 1.0, uIntro)` the
   * burn shader uses, so anything keyed off it stays in step with the front.
   */
  burnProgress(p) {
    const span = Math.max(1 - p.burnStart, 1e-4);
    const x = Math.min(1, Math.max(0, (this.intro - p.burnStart) / span));
    return x * x * (3 - 2 * x);
  }
  /** Collapses the sweep back to its first waypoint with no motion recorded. */
  resetSweep() {
    const start = this.sweepPath[0];
    const amount = this.params.autoSweepAmount;
    const x = start.x * amount;
    const y = start.y * amount;
    this.sweepPointer.x = x;
    this.sweepPointer.y = y;
    this.sweepSmoothed.x = x;
    this.sweepSmoothed.y = y;
    this.sweepLast.x = x;
    this.sweepLast.y = y;
    this.sweepPace = 0;
    for (const sample of this.sweepTrail)
      sample.set(x, -y);
  }
  /**
   * How much the figure gives back on a narrow screen, and how far right it
   * steps, as the viewport closes on the masthead.
   *
   * The masthead is set in rem and the figure in world units against a fixed
   * camera, so the two do not shrink together: below 1440 the name keeps its
   * share of the width while the figure keeps its share of the *height*, and
   * on a 1280x800 screen the figure had closed on "masella" until the last
   * letters were reading through the glass. At 1440 and above both are
   * identities — 1 and 0 — so the frame the block is drawn at is untouched.
   */
  narrowFit() {
    if (this.viewportWidth >= PORT_WIDTH)
      return 1;
    if (this.aspect < 1.2)
      return 1;
    return Math.max(MIN_FIT, Math.min(1, this.aspect / REFERENCE_ASPECT));
  }
  /**
   * Screen-space bounding box of the samples the shader will actually visit,
   * inflated by the widest brush and the warp's reach so nothing inside the
   * mask is ever clipped by the early-out. Written in place — this runs twice
   * a frame and must not allocate.
   */
  writeTrailBounds(trail, length, warp, radius, min, max) {
    const active = Math.min(trail.length, Math.ceil(length * (this.samples - 1)) + 1);
    const margin = radius + warp * 0.22 + 0.05;
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    for (let i = 0; i < active; i++) {
      const sample = trail[i];
      const x = sample.x * this.aspect;
      if (x < minX)
        minX = x;
      if (x > maxX)
        maxX = x;
      if (sample.y < minY)
        minY = sample.y;
      if (sample.y > maxY)
        maxY = sample.y;
    }
    min.set(minX - margin, minY - margin);
    max.set(maxX + margin, maxY + margin);
  }
  dispose() {
    this.disposed = true;
    this.scene.traverse((object) => {
      const mesh = object;
      if (mesh.geometry)
        mesh.geometry.dispose();
      const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      for (const material of materials) {
        if (!material)
          continue;
        for (const value of Object.values(material)) {
          if (value instanceof Texture)
            value.dispose();
        }
        material.dispose();
      }
    });
    for (const texture of this.plate?.textures ?? [])
      texture.dispose();
    this.renderer.dispose();
  }
  async load() {
    const frame2 = () => new Promise((resolve) => requestAnimationFrame(() => resolve()));
    await frame2();
    if (this.disposed)
      return;
    const noise2 = makeNoiseTexture();
    if (this.photoMode) {
      this.makeRevealUniforms(noise2);
      const textures = await this.buildPlate();
      if (this.disposed)
        return;
      this.buildBackdrop(noise2);
      this.reveal = 1;
      for (const texture of [noise2, ...textures])
        this.renderer.initTexture(texture);
      await this.renderer.compileAsync(this.scene, this.camera);
      if (this.disposed)
        return;
      this.renderer.render(this.scene, this.camera);
      this.ready = true;
      this.onReady?.();
      return;
    }
    const pmrem = new PMREMGenerator(this.renderer);
    this.scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    this.scene.environmentIntensity = 0.55;
    pmrem.dispose();
    this.addLights();
    await frame2();
    if (this.disposed)
      return;
    this.rig = new Group2();
    this.rig.position.set(0, -HEAD_CENTRE_Y, 0);
    this.figurePivot.add(this.rig);
    this.avatar = createAvatar();
    this.rig.add(this.avatar.group);
    await frame2();
    if (this.disposed)
      return;
    await this.buildFigure(noise2);
    this.buildBackdrop(noise2);
    this.reveal = 1;
    for (const texture of [noise2, ...this.avatar.textures]) {
      this.renderer.initTexture(texture);
    }
    await this.renderer.compileAsync(this.scene, this.camera);
    if (this.disposed)
      return;
    this.renderer.render(this.scene, this.camera);
    this.ready = true;
    this.onReady?.();
  }
  /** A warm key from the upper right that follows the cursor, and a cool rim from behind that picks out the silhouette. */
  addLights() {
    this.keyLight = new DirectionalLight("#fff4e6", 2.3);
    this.keyLight.position.set(3, 4, 5);
    const rim = new DirectionalLight("#bfefff", 0.9);
    rim.position.set(-4, 2, -3);
    this.scene.add(this.keyLight, rim);
  }
  /** The uniforms every masked material shares (the accessories, the photo, the backdrop), written once per frame in update(). */
  makeRevealUniforms(noise2) {
    noise2.wrapS = RepeatWrapping2;
    noise2.wrapT = RepeatWrapping2;
    this.revealUniforms = {
      uTrail: { value: this.trail },
      uTrailMin: { value: new Vector2(-1e3, -1e3) },
      uTrailMax: { value: new Vector2(1e3, 1e3) },
      uSweep: { value: this.sweepTrail },
      uSweepMin: { value: new Vector2(-1e3, -1e3) },
      uSweepMax: { value: new Vector2(1e3, 1e3) },
      uSweepPace: { value: 0 },
      uSweepWarp: { value: DEFAULT_PARAMS.sweepWarp },
      uSweepLength: { value: DEFAULT_PARAMS.sweepLength },
      uSweepRadius: { value: DEFAULT_PARAMS.sweepRadius },
      uAspect: { value: this.aspect },
      uRadius: { value: DEFAULT_PARAMS.trailRadius },
      uIdleScale: { value: DEFAULT_PARAMS.trailIdleScale },
      uTaper: { value: DEFAULT_PARAMS.trailTaper },
      uTaperIdle: { value: DEFAULT_PARAMS.trailTaperIdle },
      uTaperFast: { value: DEFAULT_PARAMS.trailTaperFast },
      uLength: { value: DEFAULT_PARAMS.trailLength },
      uPace: { value: 0 },
      uGateStart: { value: DEFAULT_PARAMS.paceThreshold },
      uGateWidth: { value: DEFAULT_PARAMS.paceRamp },
      uWarpScale: { value: DEFAULT_PARAMS.revealWarpScale },
      uTime: { value: 0 },
      uThreshold: { value: DEFAULT_PARAMS.revealThreshold },
      uEdge: { value: DEFAULT_PARAMS.revealEdge },
      uWarp: { value: DEFAULT_PARAMS.revealWarp },
      uRevealMix: { value: 0 },
      uNoiseTex: { value: noise2 },
      uIntro: { value: 0 },
      uBurnStart: { value: DEFAULT_PARAMS.burnStart },
      uBurnSoft: { value: DEFAULT_PARAMS.burnSoftness },
      uBurnGlow: { value: DEFAULT_PARAMS.burnGlow },
      uBurnColor: { value: new Color2(readToken("--accent")) },
      uGlowBand: { value: DEFAULT_PARAMS.manifestBand },
      uRimGlow: { value: DEFAULT_PARAMS.manifestGlow },
      // 1 where the accessories simply stay on (no reveal on this tier, or the reader asked for no motion)
      uHold: { value: this.holdsAccessories() ? 1 : 0 }
    };
  }
  async buildFigure(noise2) {
    this.makeRevealUniforms(noise2);
    this.avatar.accessories.traverse((object) => {
      if (!object.isMesh)
        return;
      for (const material of Array.isArray(object.material) ? object.material : [object.material])
        this.injectAccessoryReveal(material);
    });
    const tier = this._tier;
    const geometry = await buildShell({ cell: tier.mobile ? 0.115 : tier.name === "tablet" ? 0.1 : 0.085 });
    this.buildOutline(geometry);
  }
  /** Tiers with no reveal after the entrance (a phone) or no motion at all keep the accessories on instead of burning them off. */
  holdsAccessories() {
    return !this.photoMode && (!this._tier.reveal || this._tier.freeze);
  }
  /**
   * The photo and its X-ray as one plane. Loaded from the page itself (they are inlined data URLs, so nothing touches the
   * network); resolves with both textures so the caller can upload them before the first visible frame.
   */
  async buildPlate() {
    const loader = new TextureLoader();
    const [photo, xray, edge, arc] = await Promise.all([loader.loadAsync(hero_photo_default), loader.loadAsync(hero_xray_default), loader.loadAsync(hero_edge_default), loader.loadAsync(hero_arc_default)]);
    const anisotropy = Math.min(4, this.renderer.capabilities.getMaxAnisotropy());
    for (const texture of [photo, xray]) {
      texture.colorSpace = SRGBColorSpace2;
      texture.anisotropy = anisotropy;
      texture.generateMipmaps = true;
      texture.minFilter = LinearMipmapLinearFilter;
      texture.magFilter = LinearFilter;
    }
    for (const texture of [edge, arc]) {
      texture.generateMipmaps = false;
      texture.minFilter = LinearFilter;
      texture.magFilter = LinearFilter;
    }
    const material = new ShaderMaterial({
      vertexShader: plateVertex,
      fragmentShader: buildPlateFragment(this.samples),
      transparent: true,
      depthWrite: false,
      uniforms: {
        ...this.revealUniforms,
        uPhoto: { value: photo },
        uXray: { value: xray },
        uOutline: { value: edge },
        uArc: { value: arc },
        uGooInk: { value: new Color2(readToken("--surface-dark-raised")) },
        uGoo: { value: 1 },
        // A touch of the accent's blue in the greys, so the skeleton belongs to the page and not to a stock photo.
        uXrayTint: { value: new Color2(1, 0.97, 0.96) }
      }
    });
    const mesh = new Mesh2(new PlaneGeometry(1, 1), material);
    mesh.renderOrder = 1;
    const group = new Group2();
    group.visible = false;
    group.add(mesh);
    this.scene.add(group);
    this.plate = { group, mesh, material, textures: [photo, xray, edge, arc] };
    return [photo, xray, edge, arc];
  }
  /**
   * The scanning wireframe: the figure's inflated envelope (see buildShell), positions only, in one mesh on the same rig as the figure
   * so it inherits every transform including the tilt.
   */
  buildOutline(shellGeometry) {
    const merged = new BufferGeometry2();
    merged.setAttribute("position", shellGeometry.attributes.position);
    merged.setIndex(shellGeometry.index);
    const minY = -1.7;
    const rangeY = 4.2;
    this.outlineMaterial = new ShaderMaterial({
      vertexShader: outlineVertex,
      fragmentShader: outlineFragment,
      wireframe: true,
      transparent: true,
      depthWrite: false,
      uniforms: {
        uTime: { value: 0 },
        uPeriod: { value: DEFAULT_PARAMS.outlinePeriod },
        uStagger: { value: DEFAULT_PARAMS.outlineStagger },
        uOpacity: { value: DEFAULT_PARAMS.outlineOpacity },
        uWidth: { value: DEFAULT_PARAMS.outlineWidth },
        uLightness: { value: DEFAULT_PARAMS.outlineLightness },
        uBase: { value: DEFAULT_PARAMS.outlineBase },
        uRevealMix: { value: 0 },
        uColor: { value: new Color2(readToken("--foreground")) },
        uMinY: { value: minY },
        uRangeY: { value: rangeY }
      }
    });
    const outline = new Mesh2(merged, this.outlineMaterial);
    outline.renderOrder = 3;
    outline.visible = this._tier.outline;
    this.outlineMesh = outline;
    this.rig.add(outline);
  }
  /**
   * Gives one of the accessories' materials the liquid reveal.
   *
   * The mask is the cursor's recent *path* (see `SceneTier.trailSamples`), not a falloff around its current position: the
   * accessories flood in along the way the pointer came and drain behind it. The threshold is deliberately narrow —
   * `uEdge` is a few thousandths — because a hard boundary is what makes the edge read as liquid instead of a soft
   * spotlight; the softness that keeps it from looking cut out comes from `uWarp` displacing the lookup with scrolling
   * noise, so the edge crawls. Along that edge the piece glows in the accent colour, as if it were being drawn in.
   *
   * The material stays a lit, depth-writing one (so the pieces sit correctly against the skin and against each other);
   * only its alpha is driven, and anything wholly gone is thrown away so it never writes depth over what is behind it.
   * One uniforms object is shared by every masked material.
   */
  injectAccessoryReveal(material) {
    const uniforms = this.revealUniforms;
    if (!uniforms)
      return;
    material.transparent = true;
    material.alphaTest = 0.01;
    material.onBeforeCompile = (shader) => {
      Object.assign(shader.uniforms, uniforms);
      shader.vertexShader = shader.vertexShader.replace("#include <common>", "#include <common>\nvarying vec4 vRevealClip;").replace("#include <project_vertex>", "#include <project_vertex>\nvRevealClip = gl_Position;");
      shader.fragmentShader = shader.fragmentShader.replace("#include <common>", `#include <common>
           varying vec4 vRevealClip;
           uniform float uIntro;
           uniform float uBurnStart;
           uniform float uBurnSoft;
           uniform float uBurnGlow;
           uniform vec3 uBurnColor;
           ${buildRevealDeclarations(this.samples)}`).replace("#include <alphamap_fragment>", `#include <alphamap_fragment>
           vec2 revealNdc = vRevealClip.xy / vRevealClip.w;

           // Entrance: the accessories arrive whole, then burn off.
           //
           // Every pixel gets a threshold from a noise lookup biased by height, and the burn front sweeps that threshold
           // from 0 to 1. Pure noise dissolves as an even speckle; pure height is a flat wipe. Mixing them gives a ragged
           // front that still travels crown-to-chin, which is the direction the outline wave runs.
           float burnFront = smoothstep(uBurnStart, 1.0, uIntro);
           float burnNoise = texture2D(uNoiseTex, revealNdc * 0.5 + 0.5).r;
           float burnHeight = 1.0 - (revealNdc.y * 0.5 + 0.5);
           float burnAt = mix(burnHeight, burnNoise, 0.45);
           // 1 where the accessories are still intact, 0 where the burn has passed. uHold keeps them on for good.
           float intact = max(smoothstep(burnFront - uBurnSoft, burnFront + uBurnSoft, burnAt), uHold);

           // Union, so the cursor can already be drawing them back in while the tail of the burn is still finishing.
           float mask = max(revealTrail(revealNdc), intact);
           diffuseColor.a *= mask * uRevealMix;

           // The dissolve front itself glows \u2014 without it the pieces just thin out and the burn reads as a fade. Derived
           // from intact, so it is pinned to the real dissolve boundary however ragged that is.
           float burnEdge = 4.0 * intact * (1.0 - intact);
           diffuseColor.rgb += uBurnColor * burnEdge * uBurnGlow * uRevealMix;

           // The same glow along the brush's edge: strongest where a piece is just coming in, fading over uGlowBand.
           float rim = (1.0 - smoothstep(uThreshold, uThreshold + uGlowBand, gRevealRaw)) * step(0.0005, gRevealRaw) * (1.0 - intact);
           totalEmissiveRadiance += uBurnColor * rim * uRimGlow * uRevealMix;`);
    };
  }
  /**
   * The backdrop plane — animated contour lines plus the grey half of the
   * cursor reveal. Sits behind everything and is re-scaled to the frustum
   * each frame, so it fills the view at any aspect or camera distance.
   *
   * It replaces the circuit-outline `LineSegments` that used to sit here.
   * Those could not do what was asked of them: `LineBasicMaterial.linewidth`
   * is ignored by every WebGL backend, so "a little thicker" was impossible
   * without pulling in fat-line geometry, and they were five draws for art
   * that a single shader now produces and animates.
   */
  buildBackdrop(noise2) {
    const uniforms = this.revealUniforms;
    if (!uniforms)
      return;
    this.backdropMaterial = new ShaderMaterial({
      vertexShader: backdropVertex,
      fragmentShader: buildBackdropFragment(this.samples),
      depthWrite: false,
      uniforms: {
        ...uniforms,
        uNoiseTex: { value: noise2 },
        uBackground: { value: new Color2(readToken("--background")) },
        uLineColor: { value: new Color2(readToken("--foreground")) },
        uRows: { value: 56 },
        uSpot: { value: new Vector4(0, 0, 1, 1) },
        uSpotColor: { value: new Color2(readToken("--background")) },
        uRevealColor: {
          value: new Color2().setScalar(DEFAULT_PARAMS.bgRevealLightness)
        },
        uRevealColorAlt: {
          value: new Color2().setScalar(DEFAULT_PARAMS.bgRevealLightnessAlt)
        },
        uLineScale: { value: DEFAULT_PARAMS.bgLineScale },
        uLineCount: { value: DEFAULT_PARAMS.bgLineCount },
        uLineThickness: { value: DEFAULT_PARAMS.bgLineThickness },
        uLineOpacity: { value: DEFAULT_PARAMS.bgLineOpacity },
        uWaveAmount: { value: DEFAULT_PARAMS.bgWaveAmount },
        uWaveSpeed: { value: DEFAULT_PARAMS.bgWaveSpeed },
        uRevealOpacity: { value: DEFAULT_PARAMS.bgRevealOpacity },
        uLens: { value: DEFAULT_PARAMS.bgLens },
        uLensWarp: { value: DEFAULT_PARAMS.bgLensWarp },
        uLensLines: { value: DEFAULT_PARAMS.bgLensLines },
        uLensInk: { value: DEFAULT_PARAMS.bgLensInk },
        uLensRim: { value: DEFAULT_PARAMS.bgLensRim }
      }
    });
    const backdrop = new Mesh2(new PlaneGeometry(1, 1), this.backdropMaterial);
    backdrop.position.z = BACKDROP_Z;
    backdrop.renderOrder = -1;
    this.backdropMesh = backdrop;
    this.scene.add(backdrop);
    this.updateBackdropGrid();
  }
};



// Exportaciones principales
export { HeroScene, getSceneTier, isEnergySaver, PLATE, DEFAULT_PARAMS, fitSubjectToBox };
