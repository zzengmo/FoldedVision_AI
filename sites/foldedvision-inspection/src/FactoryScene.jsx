import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const COLOR = {
  graphite: 0x28323f,
  metal: 0x778796,
  belt: 0x171f29,
  lime: 0xcafa67,
  cyan: 0x80d9ed,
  amber: 0xffb666,
  coral: 0xf68275,
};
const SHOTS = {
  line: { eye: [7.9, 7.7, 15.1], target: [.25, .73, 0] },
  camera: { eye: [3.6, 3.85, 6.25], target: [0, 1.28, 0] },
  sort: { eye: [9.5, 5.95, 5.5], target: [4.65, .79, 0] },
};

function box(w, h, d, material, x, y, z, cast = true) {
  const object = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
  object.position.set(x, y, z);
  object.castShadow = cast;
  object.receiveShadow = true;
  return object;
}

const metal = (color, roughness = 0.45) =>
  new THREE.MeshStandardMaterial({ color, roughness, metalness: 0.48 });

function makePart(kind) {
  const part = new THREE.Group();

  if (kind === 'pcb') {
    const board = metal(0x27583f, 0.62);
    const copper = metal(0xe5ae57, 0.36);
    const chip = metal(0x18212a, 0.78);
    part.add(box(1.29, .09, .92, board, 0, .07, 0));
    part.add(box(.37, .13, .38, chip, .04, .18, .04));
    for (let i = 0; i < 5; i += 1) {
      const x = -.13 + i * .087;
      part.add(box(.027, .02, .56, copper, x, .125, .04));
      part.add(box(.46, .024, .024, copper, -.22, .125, -.35 + i * .135));
    }
    for (const x of [-.52, .52]) {
      for (const z of [-.34, .34]) {
        const pad = new THREE.Mesh(new THREE.CylinderGeometry(.055, .055, .023, 16), copper);
        pad.position.set(x, .13, z);
        part.add(pad);
      }
    }
    part.add(box(.20, .14, .48, metal(0xc3cad1), .47, .16, .02));
    return part;
  }

  const rim = new THREE.Mesh(
    new THREE.TorusGeometry(.42, kind === 'ring' ? .115 : .049, 16, 64),
    metal(kind === 'ring' ? 0xc7d3d5 : 0x98deeb, .24),
  );
  rim.rotation.x = Math.PI / 2;
  rim.position.y = .14;
  rim.castShadow = true;
  part.add(rim);

  if (kind === 'lens') {
    const glass = new THREE.Mesh(
      new THREE.SphereGeometry(.405, 48, 24),
      new THREE.MeshPhysicalMaterial({
        color: 0x8ce5f8, metalness: .22, roughness: .12, clearcoat: 1,
        transparent: true, opacity: .68,
      }),
    );
    glass.scale.y = .27;
    glass.position.y = .145;
    part.add(glass);
  }
  return part;
}

function makeConveyor(scene) {
  const body = metal(COLOR.graphite);
  const silver = metal(COLOR.metal);
  const rubber = metal(COLOR.belt, .93);
  const pale = metal(0x989fa2);
  const stripe = new THREE.MeshStandardMaterial({ color: COLOR.lime, emissive: 0x4e671c });
  const frame = new THREE.Group();
  frame.add(box(10.4, .24, 2.22, body, 0, .39, 0));
  frame.add(box(10.18, .12, 1.62, rubber, 0, .56, 0));
  const slats = new THREE.Group();
  for (let i = 0; i < 43; i += 1) {
    slats.add(box(.022, .007, 1.53, silver, -4.98 + i * .237, .625, 0, false));
  }
  frame.add(slats);
  for (const z of [-1.01, 1.01]) {
    frame.add(box(10.45, .20, .15, silver, 0, .61, z));
    frame.add(box(10.5, .043, .06, pale, 0, .724, z));
    for (let i = 0; i < 9; i += 1) {
      frame.add(box(.23, .045, .032, stripe, -4.7 + i * 1.17, .5, z * 1.085));
    }
    for (const x of [-4.45, -2.1, .7, 3.2, 4.6]) {
      frame.add(box(.27, .51, .28, body, x, .1, z));
      frame.add(box(.49, .062, .48, silver, x, -.16, z));
    }
  }
  for (const x of [-5.12, 5.12]) {
    const roller = new THREE.Mesh(new THREE.CylinderGeometry(.16, .16, 1.84, 20), silver);
    roller.rotation.x = Math.PI / 2;
    roller.position.set(x, .50, 0);
    roller.castShadow = true;
    frame.add(roller);
  }
  scene.add(frame);
  return slats;
}

function makeScanner(scene) {
  const housing = metal(0x242a30);
  const green = metal(0xbddc76, .48);
  const edge = metal(0x4b5a58);
  const diode = new THREE.MeshStandardMaterial({ color: 0xd8ff9f, emissive: 0x6f9c2c });
  for (const z of [-1.3, 1.3]) {
    scene.add(box(.22, 2.28, .26, housing, 0, 1.43, z));
    scene.add(box(.39, .085, .43, edge, 0, .265, z));
    scene.add(box(.11, 1.59, .036, green, .014, 1.53, z * 1.108));
  }
  scene.add(box(.41, .31, 2.88, green, 0, 2.68, 0));
  scene.add(box(.62, .37, .70, housing, 0, 2.37, 0));
  scene.add(box(.54, .07, .63, edge, 0, 2.16, 0));
  scene.add(box(.38, .022, .43, diode, 0, 2.11, 0));
  scene.add(box(.17, .065, .28, diode, 0, 2.89, 0));
  const light = new THREE.MeshStandardMaterial({ color: 0xd6f7ff, emissive: 0x8bbfd6, emissiveIntensity: .8 });
  for (const z of [-.48, .48]) {
    scene.add(box(1.13, .15, .16, housing, 0, 2.01, z));
    scene.add(box(.94, .026, .12, light, 0, 1.922, z));
  }
  const lens = new THREE.Mesh(new THREE.CylinderGeometry(.14, .11, .13, 24), metal(0x2e6f89, .2));
  lens.position.set(0, 2.01, 0);
  scene.add(lens);
  const beam = new THREE.Mesh(
    new THREE.CylinderGeometry(.17, .85, 1.48, 4, 1, true),
    new THREE.MeshBasicMaterial({ color: COLOR.lime, transparent: true, opacity: .075, side: THREE.DoubleSide, depthWrite: false }),
  );
  beam.position.set(0, 1.36, 0);
  beam.rotation.y = Math.PI / 4;
  scene.add(beam);
  const scanPlane = new THREE.Mesh(
    new THREE.PlaneGeometry(1.35, 1.42),
    new THREE.MeshBasicMaterial({ color: COLOR.lime, transparent: true, opacity: .16, side: THREE.DoubleSide, depthWrite: false }),
  );
  scanPlane.rotation.x = -Math.PI / 2;
  scanPlane.position.set(0, .649, 0);
  scene.add(scanPlane);
  return { beam, scanPlane, diode, light };
}

const ROUTE_Z = { pass: -1.92, review: 0, reject: 1.92 };
const SORT_END = 5.72;

function makeTrays(scene) {
  const dark = metal(0x202c34, .72);
  for (const [i, color] of [COLOR.cyan, COLOR.amber, COLOR.coral].entries()) {
    const z = (i - 1) * 1.92;
    const side = metal(color, .48);
    scene.add(box(1.32, .19, 1.50, dark, SORT_END, .10, z));
    scene.add(box(1.38, .07, 1.44, side, SORT_END, .22, z));
    for (const dz of [-.67, .67]) scene.add(box(1.35, .14, .069, side, SORT_END, .30, z + dz));
    scene.add(box(.072, .14, 1.41, side, SORT_END + .65, .30, z));
    for (const x of [SORT_END - .46, SORT_END + .46]) {
      scene.add(box(.17, .32, .18, dark, x, -.045, z - .54));
      scene.add(box(.17, .32, .18, dark, x, -.045, z + .54));
    }
    scene.add(box(.35, .05, 1.35, side, SORT_END + .78, -.16, z, false));
  }
}

function makeWorkcell(scene) {
  const base = metal(0x32414d, .81);
  const pylon = metal(0x6c818c, .38);
  const yellow = new THREE.MeshStandardMaterial({ color: 0xe1ab46, roughness: .72 });
  const motor = metal(0x356a78, .51);
  scene.add(box(14.45, .09, 6.45, base, .33, -.21, 0));
  for (let x = -6.4; x < 7.2; x += .48) {
    for (const z of [-3.06, 3.06]) scene.add(box(.24, .021, .10, yellow, x, -.15, z, false));
  }
  for (const x of [-5.85, -3.4, .98, 3.18]) {
    scene.add(box(.14, 1.9, .14, pylon, x, .81, -2.24));
    scene.add(box(.32, .05, .33, yellow, x, -.133, -2.24));
  }
  scene.add(box(9.23, .10, .08, pylon, -1.34, 1.68, -2.24));
  scene.add(box(9.23, .10, .08, pylon, -1.34, .83, -2.24));
  const screen = new THREE.MeshStandardMaterial({ color: 0x4ed6d1, emissive: 0x2a8279, emissiveIntensity: .8 });
  scene.add(box(.12, 1.62, .16, pylon, -2.30, .7, 1.32));
  scene.add(box(.56, .42, .13, base, -2.30, 1.51, 1.34));
  scene.add(box(.43, .29, .018, screen, -2.30, 1.54, 1.42));
  scene.add(box(.49, .35, .33, motor, -3.85, .29, .94));
  for (let i = 0; i < 5; i += 1) scene.add(box(.032, .28, .020, pylon, -4 + i * .078, .29, 1.115));
  const lights = [0xf37e66, 0xf9bd66, 0x8eecad].map((color, i) => {
    const material = new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: .22 });
    const lamp = new THREE.Mesh(new THREE.CylinderGeometry(.095, .095, .13, 24), material);
    lamp.position.set(1.87, 1.9 + i * .139, -1.25);
    scene.add(lamp);
    return material;
  });
  scene.add(box(.12, 2.0, .12, base, 1.87, .84, -1.25));
  return lights;
}

function makeSorter(scene) {
  const steel = metal(0xa5b7be, .35);
  const frame = metal(0x26343f, .57);
  const safety = metal(0xc6844c, .49);
  for (const z of [-2.74, 2.74]) {
    scene.add(box(.22, 2.69, .22, frame, 4.82, 1.18, z));
    scene.add(box(.49, .10, .48, safety, 4.82, -.13, z));
  }
  scene.add(box(.38, .25, 5.58, steel, 4.82, 2.53, 0));
  scene.add(box(.046, .046, 5.40, safety, 5.015, 2.59, 0));
  scene.add(box(.57, .27, .45, frame, 4.82, 2.81, -2.14));
  const trolley = new THREE.Group();
  trolley.add(box(.58, .30, .45, steel, 0, 0, 0));
  trolley.add(box(.11, .15, .22, safety, .33, .04, 0));
  const shaft = box(.105, 1, .105, steel, 0, -.5, 0);
  trolley.add(shaft);
  const jaws = new THREE.Group();
  jaws.add(box(.42, .085, .28, frame, 0, 0, 0));
  for (const x of [-.165, .165]) jaws.add(box(.063, .17, .22, safety, x, -.104, 0));
  trolley.add(jaws);
  scene.add(trolley);
  return { trolley, shaft, jaws };
}

function disposeScene(scene) {
  const materials = new Set();
  scene.traverse((object) => {
    object.geometry?.dispose();
    if (object.material) materials.add(object.material);
  });
  materials.forEach((material) => material.dispose());
}

export default function FactoryScene({ kind, phase, route, view }) {
  const surface = useRef(null);
  const current = useRef({ kind, phase, route, view });
  const [unavailable, setUnavailable] = useState(false);

  useEffect(() => {
    current.current = { kind, phase, route, view };
  }, [kind, phase, route, view]);

  useEffect(() => {
    let renderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    } catch {
      setUnavailable(true);
      return undefined;
    }

    const enclosure = surface.current;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    renderer.domElement.setAttribute('aria-label', '드래그하여 회전할 수 있는 3D 컨베이어');
    renderer.domElement.setAttribute('role', 'img');
    enclosure.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(30, 1, .1, 100);
    camera.position.fromArray(SHOTS.line.eye);
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.fromArray(SHOTS.line.target);
    controls.enableDamping = true;
    controls.enablePan = false;
    controls.minDistance = 4.5;
    controls.maxDistance = 24;
    controls.minPolarAngle = .45;
    controls.maxPolarAngle = 1.36;
    let cameraSettling = false;
    controls.addEventListener('start', () => { cameraSettling = false; });
    controls.update();

    const ambient = new THREE.HemisphereLight(0xeff7ff, 0x2a3942, 2.0);
    const sun = new THREE.DirectionalLight(0xf2f8ff, 3.1);
    sun.position.set(-4, 8, 5);
    sun.castShadow = true;
    sun.shadow.mapSize.set(1024, 1024);
    Object.assign(sun.shadow.camera, { left: -8, right: 8, top: 7, bottom: -7, near: .1, far: 25 });
    sun.shadow.normalBias = .028;
    const rim = new THREE.DirectionalLight(0x94b8dc, 2.2);
    rim.position.set(5, 2, -5);
    scene.add(ambient, sun, rim);

    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(250, 250),
      new THREE.ShadowMaterial({ opacity: .26 }),
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -.205;
    floor.receiveShadow = true;
    scene.add(floor);
    const grid = new THREE.GridHelper(22, 44, 0x5a6973, 0x3a464c);
    grid.position.y = -.195;
    grid.material.transparent = true;
    grid.material.opacity = .42;
    scene.add(grid);

    const stack = makeWorkcell(scene);
    const slats = makeConveyor(scene);
    const scanner = makeScanner(scene);
    makeTrays(scene);
    const sorter = makeSorter(scene);
    const parts = Object.fromEntries(['ring', 'lens', 'pcb'].map((k) => [k, makePart(k)]));
    for (const part of Object.values(parts)) scene.add(part);
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const pos = new THREE.Vector3(-4.12, .65, 0);
    let last = performance.now();
    let previousKind;
    let previousPhase;
    let previousView = 'line';
    const shotEye = new THREE.Vector3();
    const shotTarget = new THREE.Vector3();
    let beltOffset = 0;
    let inView = true;

    const resize = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      if (!width || !height) return;
      camera.aspect = width / height;
      camera.fov = width < 480 ? 46 : 30;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height, false);
    });
    resize.observe(enclosure);
    const visibility = new IntersectionObserver(([entry]) => {
      inView = entry.isIntersecting;
    });
    visibility.observe(enclosure);

    renderer.setAnimationLoop((time) => {
      if (!inView || document.hidden) {
        last = time;
        return;
      }
      const now = current.current;
      const part = parts[now.kind];
      if (now.kind !== previousKind || (now.phase === 'ready' && previousPhase !== 'ready')) {
        pos.set(-4.12, .65, 0);
      }
      previousKind = now.kind;
      previousPhase = now.phase;
      const dt = Math.min(.040, (time - last) / 1000);
      last = time;
      const sorting = now.phase === 'routing' || now.phase === 'feedback';
      const moving = now.phase === 'feeding' || now.phase === 'routing';
      const scan = now.phase === 'scanning' || now.phase === 'decision';
      const blend = reducedMotion.matches ? 1 : 1 - Math.exp(-6.8 * Math.max(0, dt));
      if (now.view !== previousView) {
        previousView = now.view;
        shotEye.fromArray(SHOTS[now.view].eye);
        shotTarget.fromArray(SHOTS[now.view].target);
        cameraSettling = true;
      }
      if (cameraSettling) {
        camera.position.lerp(shotEye, blend * (reducedMotion.matches ? 1 : .64));
        controls.target.lerp(shotTarget, blend * (reducedMotion.matches ? 1 : .64));
        cameraSettling = camera.position.distanceTo(shotEye) > .025;
      }
      const target = sorting
        ? [SORT_END, .32, ROUTE_Z[now.route] || 0]
        : now.phase === 'ready' ? [-4.12, .65, 0] : [0, .65, 0];
      pos.x += (target[0] - pos.x) * blend;
      if (sorting) {
        const progress = THREE.MathUtils.smoothstep(pos.x, 4.25, SORT_END);
        const drop = THREE.MathUtils.smoothstep(pos.x, 4.9, SORT_END);
        const lift = reducedMotion.matches ? 0 : Math.sin(Math.PI * progress) * .56;
        pos.z = target[2] * progress;
        pos.y = THREE.MathUtils.lerp(.65, target[1], drop) + lift;
      } else {
        pos.z += (target[2] - pos.z) * blend;
        pos.y += (target[1] - pos.y) * blend;
      }
      for (const [key, mesh] of Object.entries(parts)) mesh.visible = key === now.kind;
      part.position.copy(pos);
      part.rotation.y = .24;

      if (moving && !reducedMotion.matches) beltOffset = (beltOffset + dt * 1.75) % .237;
      slats.position.x = beltOffset;
      const pulse = reducedMotion.matches ? .5 : (Math.sin(time / 92) + 1) / 2;
      scanner.beam.material.opacity = scan ? .12 + pulse * .11 : .032;
      scanner.scanPlane.material.opacity = scan ? .20 + pulse * .22 : .08;
      scanner.diode.emissiveIntensity = scan ? 1.9 : .65;
      scanner.light.emissiveIntensity = scan ? 2.2 : .65;
      stack.forEach((m, i) => { m.emissiveIntensity = i === (sorting ? 0 : scan ? 1 : 2) ? 1.75 : .19; });
      const held = now.phase === 'routing' && pos.x > 3.88;
      sorter.trolley.position.set(held ? THREE.MathUtils.clamp(pos.x, 4.4, 5.2) : 4.82, 2.32, held ? pos.z : 0);
      const shaftLength = held ? Math.max(.25, 1.94 - pos.y) : .38;
      sorter.shaft.scale.y = shaftLength;
      sorter.shaft.position.y = -shaftLength / 2;
      sorter.jaws.position.y = -shaftLength;
      controls.update();
      renderer.render(scene, camera);
    });

    return () => {
      resize.disconnect();
      visibility.disconnect();
      renderer.setAnimationLoop(null);
      controls.dispose();
      disposeScene(scene);
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, []);

  return (
    <div ref={surface} className="scene-surface">
      {unavailable && (
        <div className="scene-fallback">
          <div className="fallback-track"><span className={'fallback-part ' + phase}>{kind.toUpperCase()}</span></div>
          <span>간략 공정 보기</span>
        </div>
      )}
    </div>
  );
}
