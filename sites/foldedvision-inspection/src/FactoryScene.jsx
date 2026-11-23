import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

const SHOTS = {
  line: { eye: [9.5, 9, 15.8], target: [.5, .8, 0] },
  camera: { eye: [3.7, 4.2, 6.8], target: [0, 1.35, 0] },
  sort: { eye: [10.8, 6.7, 7.9], target: [4.7, 1.1, 0] },
};
const ROUTE_Z = { pass: -2.05, review: 0, reject: 2.05 };
const COLORS = { pass: 0x168987, review: 0xd49b34, reject: 0xd66b62 };
const material = (color, metalness = .5, roughness = .35) => new THREE.MeshStandardMaterial({ color, metalness, roughness });
function mesh(geometry, mat, x = 0, y = 0, z = 0) {
  const m = new THREE.Mesh(geometry, mat); m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true; return m;
}
function box(w, h, d, mat, x = 0, y = 0, z = 0, radius = .035) {
  return mesh(new RoundedBoxGeometry(w, h, d, 2, Math.min(radius, w / 4, h / 4, d / 4)), mat, x, y, z);
}
function cylinder(r, h, mat, x = 0, y = 0, z = 0, segments = 32) { return mesh(new THREE.CylinderGeometry(r, r, h, segments), mat, x, y, z); }
function ring(radius, thickness, mat, x = 0, y = 0, z = 0) {
  const m = mesh(new THREE.TorusGeometry(radius, thickness, 12, 64), mat, x, y, z); m.rotation.x = Math.PI / 2; return m;
}
function label(text, x, y, z, width = 1.25, color = '#24435c') {
  const canvas = document.createElement('canvas'); canvas.width = 512; canvas.height = 128;
  const ctx = canvas.getContext('2d'); ctx.font = '600 50px Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = color; ctx.fillText(text, 256, 64);
  const map = new THREE.CanvasTexture(canvas); map.colorSpace = THREE.SRGBColorSpace;
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map, depthWrite: false })); sprite.position.set(x, y, z); sprite.scale.set(width, width / 4, 1); return sprite;
}
function makePart(kind) {
  const g = new THREE.Group();
  const silver = material(0xc5d0d8, .94, .19); const dark = material(0x1c2939, .68, .25); const gold = material(0xe1bd70, .86, .23);
  if (kind === 'pcb') {
    const board = material(0x146c65, .28, .45); g.add(box(1.28, .065, .95, board, 0, .04, 0));
    const trace = material(0x54ac89, .7, .32);
    for (let i = 0; i < 8; i++) {
      g.add(box(.014, .005, .65, trace, -.53 + i * .14, .076, 0));
      g.add(box(.92, .005, .012, trace, -.03, .077, -.32 + i * .09));
    }
    g.add(box(.42, .12, .38, dark, -.08, .14, .02));
    for (let i = 0; i < 8; i++) for (const sign of [-1, 1]) g.add(box(.035, .035, .08, silver, -.255 + i * .05, .10, sign * .23));
    for (const x of [-.5, .49]) for (const z of [-.34, .34]) g.add(ring(.048, .015, gold, x, .08, z));
    for (let i = 0; i < 4; i++) { g.add(box(.12, .09, .06, dark, .35, .12, -.25 + i * .17)); for (const dx of [-.075, .075]) g.add(box(.03, .04, .065, silver, .35 + dx, .105, -.25 + i * .17)); }
    g.add(box(.17, .16, .46, silver, -.49, .15, .01));
    for (let i = 0; i < 9; i++) g.add(box(.05, .009, .15, gold, -.29 + i * .086, .08, -.39));
  } else if (kind === 'lens') {
    g.add(box(1.12, .10, 1.02, dark, 0, .05, 0));
    g.add(box(.98, .13, .89, silver, 0, .16, 0));
    g.add(cylinder(.425, .15, dark, 0, .29, 0));
    for (const [r, y] of [[.41, .34], [.365, .37], [.325, .39]]) g.add(ring(r, .016, silver, 0, y, 0));
    const glass = new THREE.MeshPhysicalMaterial({ color: 0x143d72, metalness: .35, roughness: .08, clearcoat: 1, clearcoatRoughness: .05, iridescence: .8, iridescenceIOR: 1.3 });
    const lens = mesh(new THREE.SphereGeometry(.315, 48, 24), glass, 0, .38, 0); lens.scale.y = .25; g.add(lens);
    for (const x of [-.42, .42]) for (const z of [-.37, .37]) g.add(cylinder(.026, .026, gold, x, .24, z, 12));
    for (let i = 0; i < 6; i++) g.add(box(.04, .015, .17, gold, -.20 + i * .075, .09, -.54));
  } else {
    const shape = new THREE.Shape(); shape.absarc(0, 0, .51, 0, Math.PI * 2, false);
    const hole = new THREE.Path(); hole.absarc(0, 0, .31, 0, Math.PI * 2, true); shape.holes.push(hole);
    const geo = new THREE.ExtrudeGeometry(shape, { depth: .19, bevelEnabled: true, bevelSegments: 3, steps: 1, bevelSize: .024, bevelThickness: .024, curveSegments: 64 });
    const body = mesh(geo, silver, 0, .24, 0); body.rotation.x = Math.PI / 2; g.add(body);
    g.add(ring(.435, .009, material(0x718494, .9, .3), 0, .267, 0));
    g.add(ring(.329, .012, silver, 0, .267, 0));
    for (let i = 0; i < 12; i++) { const a = i * Math.PI / 6; g.add(cylinder(.013, .006, dark, Math.cos(a) * .463, .269, Math.sin(a) * .463, 10)); }
  }
  return g;
}
function conveyor(scene, mats) {
  const g = new THREE.Group();
  g.add(box(10.2, .26, 1.92, mats.white, -.4, .38, 0, .08));
  g.add(box(10.1, .13, 1.58, mats.rubber, -.4, .57, 0, .06));
  const slats = new THREE.Group();
  for (let i = 0; i < 52; i++) slats.add(box(.012, .005, 1.48, mats.beltSeam, -5.36 + i * .192, .638, 0));
  g.add(slats);
  for (const z of [-.95, .95]) {
    g.add(box(10.4, .17, .13, mats.silver, -.4, .57, z));
    g.add(box(10.4, .045, .045, mats.blue, -.4, .68, z));
    for (let x = -5.1; x < 4.6; x += .75) g.add(cylinder(.024, .022, mats.dark, x, .667, z, 12));
    for (const x of [-4.75, -2.35, .85, 3.95]) {
      g.add(box(.15, .56, .16, mats.silver, x, .08, z));
      g.add(box(.33, .075, .34, mats.dark, x, -.19, z));
      g.add(box(.075, .43, .03, mats.dark, x, .09, z * 1.09));
    }
  }
  for (const x of [-5.43, 4.63]) { const roller = cylinder(.12, 1.65, mats.silver, x, .54, 0); roller.rotation.x = Math.PI / 2; g.add(roller); }
  const motor = cylinder(.19, .5, mats.dark, -4.4, .32, 1.2); motor.rotation.x = Math.PI / 2; g.add(motor);
  for (let i = 0; i < 6; i++) g.add(box(.31, .018, .018, mats.silver, -4.4, .2 + i * .04, 1.45));
  scene.add(g); return slats;
}
function scanner(scene, mats) {
  const g = new THREE.Group();
  for (const z of [-1.23, 1.23]) {
    g.add(box(.25, 2.29, .25, mats.silver, 0, 1.48, z));
    g.add(box(.065, 2.03, .017, mats.dark, .134, 1.48, z));
    g.add(box(.44, .10, .46, mats.white, 0, .34, z));
  }
  g.add(box(.5, .26, 2.78, mats.white, 0, 2.65, 0));
  g.add(box(.31, .028, 2.41, mats.blue, .12, 2.8, 0));
  g.add(box(.55, .57, .61, mats.dark, 0, 2.28, 0, .06));
  for (let i = 0; i < 6; i++) g.add(box(.01, .26, .44, mats.silver, .28, 2.3, 0));
  g.add(cylinder(.18, .25, mats.dark, 0, 1.9, 0));
  g.add(ring(.155, .02, mats.silver, 0, 1.78, 0));
  g.add(cylinder(.125, .018, material(0x183b59, .7, .05), 0, 1.77, 0));
  const glow = new THREE.MeshStandardMaterial({ color: 0xe8fcff, emissive: 0x82e3ff, emissiveIntensity: .6 });
  g.add(ring(.32, .049, glow, 0, 1.76, 0));
  for (const z of [-.65, .65]) { g.add(box(1.34, .13, .19, mats.dark, 0, 1.55, z)); g.add(box(1.19, .025, .13, glow, 0, 1.47, z)); }
  const beam = mesh(new THREE.ConeGeometry(.79, 1.1, 4, 1, true), new THREE.MeshBasicMaterial({ color: 0x23b5dd, transparent: true, opacity: .035, side: THREE.DoubleSide, depthWrite: false }), 0, 1.19, 0); beam.rotation.y = Math.PI / 4; g.add(beam);
  const scan = mesh(new THREE.PlaneGeometry(1.38, .025), new THREE.MeshBasicMaterial({ color: 0x31c6ed, transparent: true, opacity: .4, side: THREE.DoubleSide }), 0, .65, 0); scan.rotation.x = -Math.PI / 2; g.add(scan);
  g.add(label('VISION', .05, 2.66, 1.46, .9)); scene.add(g); return { beam, scan, glow };
}
function workcell(scene, mats) {
  scene.add(box(14.7, .10, 7.1, mats.platform, .35, -.29, 0, .09));
  for (const x of [-5.7, -3, 0, 2.7]) {
    scene.add(box(.10, 1.7, .10, mats.silver, x, .58, -1.65));
    scene.add(box(.25, .06, .27, mats.dark, x, -.20, -1.65));
  }
  scene.add(box(8.48, .08, .08, mats.silver, -1.5, 1.4, -1.65));
  scene.add(box(8.48, .06, .08, mats.silver, -1.5, .1, -1.65));
  const glass = new THREE.MeshPhysicalMaterial({ color: 0xb4e2ed, metalness: .05, roughness: .12, transparent: true, opacity: .12, depthWrite: false, side: THREE.DoubleSide });
  scene.add(box(8.32, 1.18, .025, glass, -1.5, .76, -1.65));
  scene.add(box(.16, 1.57, .16, mats.silver, -2.9, .58, 1.45));
  scene.add(box(.9, .63, .12, mats.dark, -2.9, 1.48, 1.45));
  scene.add(box(.76, .47, .018, material(0x204b68, .15, .4), -2.9, 1.49, 1.52));
  for (let i = 0; i < 3; i++) scene.add(box(.10 + i * .13, .025, .012, mats.blue, -2.99 + i * .06, 1.6 - i * .11, 1.535));
  scene.add(label('QC-01', -2.9, 1.22, 1.54, .56));
  const stack = [];
  scene.add(cylinder(.045, 1.85, mats.silver, 1.46, .70, -1.25));
  for (const [i, color] of [0xe9796c, 0xeac06d, 0x58b9a8].entries()) { const m = new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: .1, roughness: .24 }); scene.add(cylinder(.09, .14, m, 1.46, 1.59 + i * .15, -1.25)); stack.push(m); }
  scene.add(label('INFEED', -4.4, .12, 1.45, 1.15));
  return stack;
}
function sortingCell(scene, mats) {
  for (const [route, z] of Object.entries(ROUTE_Z)) {
    const color = material(COLORS[route], .25, .5);
    scene.add(box(1.52, .12, 1.7, mats.white, 5.98, .15, z));
    scene.add(box(1.35, .035, 1.52, mats.tray, 5.98, .235, z));
    for (const dz of [-.79, .79]) scene.add(box(1.5, .16, .065, color, 5.98, .28, z + dz));
    for (const dx of [-.73, .73]) scene.add(box(.065, .16, 1.59, color, 5.98 + dx, .28, z));
    for (const dx of [-.58, .58]) for (const dz of [-.61, .61]) scene.add(box(.10, .4, .10, mats.silver, 5.98 + dx, -.06, z + dz));
    scene.add(label(route.toUpperCase(), 6.02, .56, z + .85, 1, '#' + COLORS[route].toString(16)));
  }
  for (const x of [3.6, 6.8]) for (const z of [-3.1, 3.1]) {
    scene.add(box(.18, 3, .18, mats.silver, x, 1.2, z)); scene.add(box(.35, .08, .35, mats.dark, x, -.22, z));
  }
  for (const z of [-3.1, 3.1]) { scene.add(box(3.44, .22, .19, mats.white, 5.2, 2.76, z)); scene.add(box(3.4, .04, .06, mats.dark, 5.2, 2.9, z)); }
  const bridge = new THREE.Group(); bridge.add(box(.27, .22, 6.4, mats.silver)); bridge.add(box(.035, .035, 6.1, mats.blue, .15, .12, 0)); bridge.position.set(4.3, 2.95, 0); scene.add(bridge);
  const trolley = new THREE.Group(); trolley.add(box(.48, .3, .43, mats.white)); trolley.add(box(.15, .14, .25, mats.dark, .28, .06, 0));
  const shaft = box(.08, 1, .08, mats.silver, 0, -.5, 0); trolley.add(shaft);
  const jaws = new THREE.Group(); jaws.add(box(.48, .08, .32, mats.dark));
  for (const x of [-.21, .21]) jaws.add(box(.045, .19, .28, mats.silver, x, -.11, 0));
  trolley.add(jaws); scene.add(trolley); return { bridge, trolley, shaft, jaws };
}
const smooth = (a, b, value) => THREE.MathUtils.smoothstep(value, a, b);
function partPosition(phase, p, route) {
  if (phase === 'ready') return [-4.6, .65, 0];
  if (phase === 'feeding') return [THREE.MathUtils.lerp(-4.6, 0, smooth(0, 1, p)), .65, 0];
  if (phase === 'scanning' || phase === 'decision') return [0, .65, 0];
  const t = phase === 'feedback' ? 1 : p;
  const travel = smooth(.76, .94, t); const lift = smooth(.58, .75, t); const drop = smooth(.94, 1, t);
  return [THREE.MathUtils.lerp(0, 4.3, smooth(0, .45, t)) + 1.68 * travel, .65 + .65 * lift - 1.05 * drop, (ROUTE_Z[route] || 0) * travel];
}
function disposeScene(scene) {
  const geometries = new Set(), materials = new Set(), textures = new Set();
  scene.traverse(o => { if (o.geometry) geometries.add(o.geometry); for (const m of (Array.isArray(o.material) ? o.material : o.material ? [o.material] : [])) materials.add(m); });
  materials.forEach(m => { Object.values(m).forEach(v => { if (v?.isTexture) textures.add(v); }); m.dispose(); });
  geometries.forEach(g => g.dispose()); textures.forEach(t => t.dispose());
}
export default function FactoryScene({ kind, phase, route, view, progress, playing }) {
  const surface = useRef(null); const current = useRef({ kind, phase, route, view, progress, playing }); const [unavailable, setUnavailable] = useState(false);
  useEffect(() => { current.current = { kind, phase, route, view, progress, playing }; }, [kind, phase, route, view, progress, playing]);
  useEffect(() => {
    let renderer;
    try { renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' }); } catch { setUnavailable(true); return; }
    const enclosure = surface.current;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.6)); renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
    renderer.domElement.setAttribute('aria-label', '금속 컨베이어, 광학 카메라와 자동 분류 장치의 3D 시뮬레이션'); renderer.domElement.setAttribute('role', 'img'); enclosure.appendChild(renderer.domElement);
    const scene = new THREE.Scene();
    const pmrem = new THREE.PMREMGenerator(renderer); const room = new RoomEnvironment(); const environment = pmrem.fromScene(room, .04); scene.environment = environment.texture; scene.environmentIntensity = .65; room.dispose(); pmrem.dispose();
    const camera = new THREE.PerspectiveCamera(31, 1, .1, 100); camera.position.fromArray(SHOTS.line.eye);
    const controls = new OrbitControls(camera, renderer.domElement); controls.target.fromArray(SHOTS.line.target); controls.enableDamping = true; controls.enablePan = false; controls.minDistance = 4; controls.maxDistance = 27; controls.minPolarAngle = .35; controls.maxPolarAngle = 1.4;
    let settling = false; controls.addEventListener('start', () => { settling = false; }); controls.update();
    scene.add(new THREE.HemisphereLight(0xf1f8ff, 0x8d9ca8, 2.1));
    const sun = new THREE.DirectionalLight(0xfffaf2, 3.4); sun.position.set(-3, 9, 5); sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048); Object.assign(sun.shadow.camera, { left: -10, right: 10, top: 8, bottom: -8, near: .1, far: 30 }); sun.shadow.normalBias = .025; sun.shadow.bias = -.0001; sun.shadow.radius = 4; scene.add(sun);
    const rim = new THREE.DirectionalLight(0xaddbff, 1.5); rim.position.set(6, 6, -6); scene.add(rim);
    const floor = mesh(new THREE.PlaneGeometry(100, 100), new THREE.ShadowMaterial({ opacity: .14 }), 0, -.35, 0); floor.rotation.x = -Math.PI / 2; floor.castShadow = false; scene.add(floor);
    const grid = new THREE.GridHelper(36, 36, 0xa0b4c5, 0xc8d5df); grid.position.y = -.34; grid.material.transparent = true; grid.material.opacity = .18; scene.add(grid);
    const mats = { white: material(0xe4ebf0, .5, .32), silver: material(0xb6c4cf, .9, .24), dark: material(0x25384a, .65, .35), blue: material(0x168dac, .6, .28), rubber: material(0x263641, .05, .85), beltSeam: material(0x3d4b57, .2, .65), tray: material(0xc2d2db, .25, .6), platform: material(0xe6edf3, .05, .8) };
    const stack = workcell(scene, mats), slats = conveyor(scene, mats), scannerParts = scanner(scene, mats), sorter = sortingCell(scene, mats);
    const parts = Object.fromEntries(['ring', 'lens', 'pcb'].map(k => [k, makePart(k)])); Object.values(parts).forEach(p => scene.add(p));
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)'); const eye = new THREE.Vector3(); const target = new THREE.Vector3(); const position = new THREE.Vector3();
    let last = performance.now(), previousView = 'line', belt = 0, inView = true;
    const resize = new ResizeObserver(([entry]) => { const { width, height } = entry.contentRect; if (!width || !height) return; camera.aspect = width / height; camera.fov = width < 480 ? 48 : 31; camera.updateProjectionMatrix(); renderer.setSize(width, height, false); }); resize.observe(enclosure);
    const visibility = new IntersectionObserver(([entry]) => { inView = entry.isIntersecting; }); visibility.observe(enclosure);
    const contextLost = event => { event.preventDefault(); setUnavailable(true); }; renderer.domElement.addEventListener('webglcontextlost', contextLost);
    renderer.setAnimationLoop(time => {
      if (!inView || document.hidden) { last = time; return; }
      const now = current.current, dt = Math.min(.04, Math.max(0, (time - last) / 1000)); last = time;
      const blend = reduced.matches ? 1 : 1 - Math.exp(-5 * dt);
      if (now.view !== previousView) { previousView = now.view; eye.fromArray(SHOTS[now.view].eye); target.fromArray(SHOTS[now.view].target); settling = true; }
      if (settling) { camera.position.lerp(eye, blend); controls.target.lerp(target, blend); settling = camera.position.distanceTo(eye) > .015; }
      position.fromArray(partPosition(now.phase, now.progress, now.route));
      Object.entries(parts).forEach(([key, part]) => { part.visible = key === now.kind; part.position.copy(position); part.rotation.y = .1; });
      if (now.playing && ['feeding', 'routing'].includes(now.phase) && !reduced.matches) belt = (belt + dt * .65) % .192;
      slats.position.x = belt;
      const scan = now.phase === 'scanning'; scannerParts.beam.material.opacity = scan ? .065 : .012; scannerParts.scan.visible = scan;
      scannerParts.scan.position.z = -.6 + 1.2 * (Math.sin(now.progress * Math.PI * 4) + 1) / 2; scannerParts.glow.emissiveIntensity = scan ? 2.1 : .55;
      stack.forEach((m, i) => { m.emissiveIntensity = i === (now.phase === 'routing' ? 0 : scan ? 1 : 2) ? 1.5 : .08; });
      const p = now.progress, held = now.phase === 'routing' && p > .45;
      const returning = now.phase === 'feedback';
      const returnTravel = smooth(.25, .9, p);
      const trolleyX = held ? Math.max(4.3, position.x) : returning ? THREE.MathUtils.lerp(5.98, 4.3, returnTravel) : 4.3;
      const trolleyZ = held ? position.z : returning ? (ROUTE_Z[now.route] || 0) * (1 - returnTravel) : 0;
      sorter.bridge.position.x = trolleyX; sorter.trolley.position.set(trolleyX, 2.88, trolleyZ);
      const reach = held ? THREE.MathUtils.lerp(.35, 2.88 - position.y - .32, smooth(.45, .58, p)) : returning ? THREE.MathUtils.lerp(2.31, .35, smooth(0, .3, p)) : .35;
      sorter.shaft.scale.y = reach; sorter.shaft.position.y = -reach / 2; sorter.jaws.position.y = -reach;
      controls.update(); renderer.render(scene, camera);
    });
    return () => { resize.disconnect(); visibility.disconnect(); renderer.setAnimationLoop(null); renderer.domElement.removeEventListener('webglcontextlost', contextLost); controls.dispose(); disposeScene(scene); environment.dispose(); sun.shadow.dispose(); renderer.dispose(); renderer.domElement.remove(); };
  }, []);
  return <div ref={surface} className="scene-surface">{unavailable && <div className="scene-fallback"><ScanFallback /><strong>3D 그래픽을 사용할 수 없습니다</strong><p>오른쪽 평가 사진과 공정 단계로 시연을 확인하세요.</p></div>}</div>;
}
function ScanFallback() { return <span className="fallback-track">{['투입', '촬영', '결과', '분류'].map(s => <b key={s}>{s}</b>)}</span>; }
