// ============================================
// Character Module — Cartoon bust character
// Cel-shaded, low-poly, outlined style
// ============================================

import * as THREE from 'three';

// ---- Color Palette ----
const C = {
  skin:      0xFAD7C7,
  hair:      0x1A1A1A,
  pajama:    0xE6D4F2,
  pajamaBlue:0x73B8F0,
  cup:       0xFFD93D,
  blush:     0xF8B4C4,
  hpRed:     0xFF3333,
  white:     0xFFFFFF,
  black:     0x1A1A1A,
  eyeWhite:  0xFFFFFF,
  mouth:     0xC4957A,
  nose:      0xF0B8A8,
  innerShirt:0xD4E8F8,
};

/** Quick toon material helper */
function toonMat(color, opts = {}) {
  return new THREE.MeshToonMaterial({
    color,
    gradientMap: null,
    ...opts,
  });
}

// ============================================
// Main Character Builder
// ============================================

export function createCharacter() {
  const character = new THREE.Group();
  character.name = 'Character';

  // ---- HEAD ----
  const headGroup = buildHead();
  headGroup.position.set(0, 1.5, 0);
  character.add(headGroup);

  // ---- BODY (Pajamas) ----
  const bodyGroup = buildBody();
  bodyGroup.position.set(0, 0.25, 0);
  character.add(bodyGroup);

  // ---- HANDS ----
  const rightHand = buildHand();
  rightHand.position.set(0.85, -0.05, 0.85);
  character.add(rightHand);

  const leftHand = buildHand();
  leftHand.position.set(-0.85, -0.15, 0.85);
  leftHand.rotation.z = 0.15;
  character.add(leftHand);

  // ---- CUP ----
  const cupGroup = buildCup();
  cupGroup.position.set(0.55, -0.2, 1.15);
  character.add(cupGroup);

  return character;
}

// ============================================
// HEAD
// ============================================

function buildHead() {
  const headGroup = new THREE.Group();

  // -- Skull (ellipsoid) --
  const headGeo = new THREE.SphereGeometry(0.7, 48, 40);
  headGeo.scale(1.0, 1.05, 0.88);
  const headMat = toonMat(C.skin);
  headGroup.add(new THREE.Mesh(headGeo, headMat));

  // -- Hair --
  const hairGroup = buildHair();
  hairGroup.position.set(0, 0.25, 0.05);
  headGroup.add(hairGroup);

  // -- Face Features (all positioned on front of face) --
  const faceZ = 0.58; // front surface of face

  // Eyes
  headGroup.add(buildEye(-0.22, 0.08, faceZ));   // left (from character's perspective)
  headGroup.add(buildEye(0.22, 0.08, faceZ));    // right

  // Eyebrows
  headGroup.add(buildEyebrow(-0.22, 0.32, faceZ));
  headGroup.add(buildEyebrow(0.22, 0.32, faceZ));

  // Nose
  const noseGeo = new THREE.SphereGeometry(0.06, 16, 12);
  const noseMat = toonMat(C.nose);
  const nose = new THREE.Mesh(noseGeo, noseMat);
  nose.position.set(0, -0.05, faceZ + 0.04);
  headGroup.add(nose);

  // Mouth
  headGroup.add(buildMouth(0, -0.22, faceZ));

  // Blush
  headGroup.add(buildBlush(-0.35, -0.08, faceZ));
  headGroup.add(buildBlush(0.35, -0.08, faceZ));

  // -- Glasses --
  const glassesGroup = buildGlasses();
  glassesGroup.position.set(0, 0.08, faceZ - 0.02);
  headGroup.add(glassesGroup);

  // -- Headphones --
  const hpGroup = buildHeadphones();
  hpGroup.position.set(0, 0.0, 0);
  headGroup.add(hpGroup);

  return headGroup;
}

// ============================================
// HAIR
// ============================================

function buildHair() {
  const hairGroup = new THREE.Group();
  const hairMat = toonMat(C.hair);

  // Main hair dome — a squashed sphere on top
  const mainGeo = new THREE.SphereGeometry(0.72, 32, 24, 0, Math.PI * 2, 0, Math.PI * 0.55);
  mainGeo.scale(1.02, 1.05, 0.95);
  const main = new THREE.Mesh(mainGeo, hairMat);
  main.position.set(0, 0.15, -0.04);
  hairGroup.add(main);

  // Side hair tufts
  for (let side = -1; side <= 1; side += 2) {
    const tuftGeo = new THREE.SphereGeometry(0.3, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.6);
    tuftGeo.scale(0.7, 0.8, 0.6);
    const tuft = new THREE.Mesh(tuftGeo, hairMat);
    tuft.position.set(side * 0.58, -0.15, 0.0);
    tuft.rotation.z = side * 0.3;
    hairGroup.add(tuft);

    // Back side hair
    const backGeo = new THREE.SphereGeometry(0.28, 16, 12);
    backGeo.scale(0.6, 0.7, 0.5);
    const back = new THREE.Mesh(backGeo, hairMat);
    back.position.set(side * 0.5, -0.05, -0.35);
    back.rotation.z = side * 0.25;
    hairGroup.add(back);
  }

  // Top bangs / fringe
  const fringeGeo = new THREE.SphereGeometry(0.35, 20, 14);
  fringeGeo.scale(1.2, 0.35, 0.5);
  const fringe = new THREE.Mesh(fringeGeo, hairMat);
  fringe.position.set(0, 0.45, 0.35);
  hairGroup.add(fringe);

  // A few irregular hair spikes
  for (let i = 0; i < 5; i++) {
    const spikeGeo = new THREE.ConeGeometry(0.08, 0.2, 4, 1);
    const spike = new THREE.Mesh(spikeGeo, hairMat);
    const angle = (i - 2) * 0.25;
    spike.position.set(Math.sin(angle) * 0.5, 0.55, 0.38 + Math.cos(angle) * 0.1);
    spike.rotation.x = -0.3;
    spike.rotation.z = angle * 0.6;
    hairGroup.add(spike);
  }

  return hairGroup;
}

// ============================================
// EYES
// ============================================

function buildEye(x, y, z) {
  const eyeGroup = new THREE.Group();
  eyeGroup.position.set(x, y, z);

  // White of eye
  const whiteGeo = new THREE.CircleGeometry(0.1, 24);
  const whiteMat = new THREE.MeshBasicMaterial({ color: C.eyeWhite, side: THREE.DoubleSide });
  const white = new THREE.Mesh(whiteGeo, whiteMat);
  eyeGroup.add(white);

  // Pupil
  const pupilGeo = new THREE.CircleGeometry(0.055, 24);
  const pupilMat = new THREE.MeshBasicMaterial({ color: C.black, side: THREE.DoubleSide });
  const pupil = new THREE.Mesh(pupilGeo, pupilMat);
  pupil.position.z = 0.001;
  eyeGroup.add(pupil);

  return eyeGroup;
}

// ============================================
// EYEBROWS
// ============================================

function buildEyebrow(x, y, z) {
  const browGroup = new THREE.Group();
  browGroup.position.set(x, y, z);

  // Simple thick arc using a box
  const browGeo = new THREE.BoxGeometry(0.14, 0.025, 0.02);
  const browMat = new THREE.MeshBasicMaterial({ color: C.black });
  const brow = new THREE.Mesh(browGeo, browMat);
  brow.rotation.z = x > 0 ? -0.1 : 0.1;
  browGroup.add(brow);

  return browGroup;
}

// ============================================
// MOUTH
// ============================================

function buildMouth(x, y, z) {
  const mouthGroup = new THREE.Group();
  mouthGroup.position.set(x, y, z);

  // A gentle smile arc using a thin torus segment
  const mouthGeo = new THREE.TorusGeometry(0.1, 0.015, 8, 16, Math.PI);
  const mouthMat = new THREE.MeshBasicMaterial({ color: C.mouth, side: THREE.DoubleSide });
  const mouth = new THREE.Mesh(mouthGeo, mouthMat);
  mouth.rotation.z = Math.PI; // flip so arc curves upward
  mouthGroup.add(mouth);

  return mouthGroup;
}

// ============================================
// BLUSH
// ============================================

function buildBlush(x, y, z) {
  const blushGroup = new THREE.Group();
  blushGroup.position.set(x, y, z);

  const blushGeo = new THREE.CircleGeometry(0.09, 20);
  const blushMat = new THREE.MeshBasicMaterial({
    color: C.blush,
    transparent: true,
    opacity: 0.45,
    side: THREE.DoubleSide,
  });
  const blush = new THREE.Mesh(blushGeo, blushMat);
  blushGroup.add(blush);

  return blushGroup;
}

// ============================================
// GLASSES
// ============================================

function buildGlasses() {
  const glassesGroup = new THREE.Group();
  const frameMat = new THREE.MeshBasicMaterial({ color: C.black });

  // Left & right frames (toruses)
  for (let side = -1; side <= 1; side += 2) {
    const frameGeo = new THREE.TorusGeometry(0.14, 0.018, 8, 24);
    const frame = new THREE.Mesh(frameGeo, frameMat);
    frame.position.set(side * 0.22, 0, 0);
    glassesGroup.add(frame);

    // Lens (slightly transparent)
    const lensGeo = new THREE.CircleGeometry(0.12, 24);
    const lensMat = new THREE.MeshBasicMaterial({
      color: C.white,
      transparent: true,
      opacity: 0.25,
      side: THREE.DoubleSide,
    });
    const lens = new THREE.Mesh(lensGeo, lensMat);
    lens.position.set(side * 0.22, 0, 0.001);
    glassesGroup.add(lens);
  }

  // Bridge
  const bridgeGeo = new THREE.CylinderGeometry(0.015, 0.015, 0.16, 8);
  const bridge = new THREE.Mesh(bridgeGeo, frameMat);
  bridge.rotation.z = Math.PI / 2;
  bridge.position.set(0, 0.02, 0);
  glassesGroup.add(bridge);

  return glassesGroup;
}

// ============================================
// HEADPHONES
// ============================================

function buildHeadphones() {
  const hpGroup = new THREE.Group();

  // Headband — curved arc over the head
  const bandCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-0.62, -0.05, -0.05),
    new THREE.Vector3(-0.35, 0.55, -0.05),
    new THREE.Vector3(0, 0.72, -0.05),
    new THREE.Vector3(0.35, 0.55, -0.05),
    new THREE.Vector3(0.62, -0.05, -0.05),
  ]);
  const bandGeo = new THREE.TubeGeometry(bandCurve, 40, 0.03, 8, false);
  const bandMat = toonMat(C.black);
  const band = new THREE.Mesh(bandGeo, bandMat);
  hpGroup.add(band);

  // Red accent stripe on headband
  const stripeCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-0.50, 0.15, -0.08),
    new THREE.Vector3(0, 0.45, -0.08),
    new THREE.Vector3(0.50, 0.15, -0.08),
  ]);
  const stripeGeo = new THREE.TubeGeometry(stripeCurve, 30, 0.01, 6, false);
  const stripeMat = new THREE.MeshBasicMaterial({ color: C.hpRed });
  const stripe = new THREE.Mesh(stripeGeo, stripeMat);
  hpGroup.add(stripe);

  // Ear cups
  for (let side = -1; side <= 1; side += 2) {
    const cupGroup = new THREE.Group();
    cupGroup.position.set(side * 0.62, -0.05, 0);

    // Main cup
    const cupGeo = new THREE.CylinderGeometry(0.14, 0.14, 0.1, 24);
    const cup = new THREE.Mesh(cupGeo, toonMat(C.black));
    cup.rotation.z = Math.PI / 2;
    cupGroup.add(cup);

    // Red rim
    const rimGeo = new THREE.TorusGeometry(0.14, 0.022, 8, 24);
    const rim = new THREE.Mesh(rimGeo, new THREE.MeshBasicMaterial({ color: C.hpRed }));
    rim.rotation.y = Math.PI / 2;
    rim.position.x = side * 0.06;
    cupGroup.add(rim);

    hpGroup.add(cupGroup);
  }

  // Microphone (left side)
  const micGroup = new THREE.Group();
  micGroup.position.set(-0.62, -0.05, 0);

  // Mic arm
  const armCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, -0.05, 0),
    new THREE.Vector3(-0.1, -0.25, 0.3),
    new THREE.Vector3(0.0, -0.35, 0.55),
  ]);
  const armGeo = new THREE.TubeGeometry(armCurve, 20, 0.022, 8, false);
  const arm = new THREE.Mesh(armGeo, toonMat(C.black));
  micGroup.add(arm);

  // Mic head
  const micHeadGeo = new THREE.SphereGeometry(0.07, 16, 12);
  const micHead = new THREE.Mesh(micHeadGeo, toonMat(C.black));
  micHead.position.copy(armCurve.getPointAt(1));
  micGroup.add(micHead);

  hpGroup.add(micGroup);

  // Cable (left side, hanging down)
  const cableCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-0.62, -0.15, 0.05),
    new THREE.Vector3(-0.65, -0.55, 0.15),
    new THREE.Vector3(-0.55, -1.0, 0.05),
  ]);
  const cableGeo = new THREE.TubeGeometry(cableCurve, 20, 0.012, 6, false);
  const cable = new THREE.Mesh(cableGeo, toonMat(C.black));
  hpGroup.add(cable);

  return hpGroup;
}

// ============================================
// BODY (Pajamas)
// ============================================

function buildBody() {
  const bodyGroup = new THREE.Group();

  // Main torso — bell/flare shape using lathe
  const profile = [];
  const segments = 24;
  // From bottom to top: wider at shoulders, narrower at waist
  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const y = -0.6 + t * 1.3; // y from -0.6 to 0.7
    // Width: narrow at waist (bottom), wide at shoulders, slight taper
    let r;
    if (t < 0.3) {
      r = 0.65 + t * 0.6; // bottom flare
    } else if (t < 0.7) {
      r = 0.83 + (t - 0.3) * 0.5; // midsection
    } else {
      r = 1.03; // shoulders
    }
    profile.push(new THREE.Vector2(r, y));
  }
  const bodyGeo = new THREE.LatheGeometry(profile, 32);
  const bodyMat = toonMat(C.pajama);
  bodyGroup.add(new THREE.Mesh(bodyGeo, bodyMat));

  // V-neck inner shirt
  const innerGeo = new THREE.SphereGeometry(0.52, 24, 16, 0, Math.PI * 2, 0, Math.PI * 0.35);
  innerGeo.scale(0.65, 0.5, 0.5);
  const innerMat = toonMat(C.innerShirt);
  const inner = new THREE.Mesh(innerGeo, innerMat);
  inner.position.set(0, 0.52, 0.28);
  bodyGroup.add(inner);

  // Left chest pocket / decorative patch (right side from viewer = character's left)
  const patchGeo = new THREE.BoxGeometry(0.22, 0.2, 0.03);
  const patchMat = toonMat(C.pajamaBlue);
  const patch = new THREE.Mesh(patchGeo, patchMat);
  patch.position.set(0.35, 0.28, 0.75);
  bodyGroup.add(patch);

  // Right shoulder pink dot
  const dotGeo = new THREE.CircleGeometry(0.07, 16);
  const dotMat = new THREE.MeshBasicMaterial({ color: C.blush, side: THREE.DoubleSide });
  const dot = new THREE.Mesh(dotGeo, dotMat);
  dot.position.set(-0.55, 0.5, 0.65);
  bodyGroup.add(dot);

  // Pajama collar / lapel lines
  const lapelCurve1 = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 0.58, 0.5),
    new THREE.Vector3(-0.25, 0.35, 0.55),
    new THREE.Vector3(-0.45, 0.15, 0.5),
  ]);
  const lapelGeo1 = new THREE.TubeGeometry(lapelCurve1, 20, 0.015, 6, false);
  const lapel1 = new THREE.Mesh(lapelGeo1, toonMat(C.white));
  bodyGroup.add(lapel1);

  const lapelCurve2 = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 0.58, 0.5),
    new THREE.Vector3(0.25, 0.35, 0.55),
    new THREE.Vector3(0.45, 0.15, 0.5),
  ]);
  const lapelGeo2 = new THREE.TubeGeometry(lapelCurve2, 20, 0.015, 6, false);
  const lapel2 = new THREE.Mesh(lapelGeo2, toonMat(C.white));
  bodyGroup.add(lapel2);

  // Sleeves
  for (let side = -1; side <= 1; side += 2) {
    const sleeveGeo = new THREE.CylinderGeometry(0.22, 0.28, 0.7, 20);
    const sleeveMat = toonMat(C.pajama);
    const sleeve = new THREE.Mesh(sleeveGeo, sleeveMat);
    sleeve.position.set(side * 0.8, -0.05, 0.15);
    sleeve.rotation.z = side * 0.35;
    sleeve.rotation.x = 0.25;
    bodyGroup.add(sleeve);
  }

  return bodyGroup;
}

// ============================================
// HAND
// ============================================

function buildHand() {
  const handGroup = new THREE.Group();

  // Palm — a squashed sphere
  const palmGeo = new THREE.SphereGeometry(0.2, 20, 16);
  palmGeo.scale(0.8, 0.9, 0.5);
  const palmMat = toonMat(C.skin);
  handGroup.add(new THREE.Mesh(palmGeo, palmMat));

  // Fingers — 4 small cylinders
  for (let i = 0; i < 4; i++) {
    const fingerGeo = new THREE.CapsuleGeometry(0.045, 0.25, 8, 8);
    const finger = new THREE.Mesh(fingerGeo, palmMat);
    finger.position.set(-0.1 + i * 0.07, 0.18, 0.04);
    finger.rotation.x = -0.15;
    handGroup.add(finger);
  }

  // Two small dots (moles) on back of hand
  for (const [dx, dy] of [[0.05, 0.08], [-0.03, 0.01]]) {
    const dotGeo = new THREE.SphereGeometry(0.025, 8, 8);
    const dotMat = new THREE.MeshBasicMaterial({ color: 0xB8956A });
    const dot = new THREE.Mesh(dotGeo, dotMat);
    dot.position.set(dx, dy, 0.1);
    handGroup.add(dot);
  }

  return handGroup;
}

// ============================================
// CUP
// ============================================

function buildCup() {
  const cupGroup = new THREE.Group();

  // Cup body — cylinder, slightly tapered
  const cupGeo = new THREE.CylinderGeometry(0.22, 0.2, 0.65, 32);
  const cupMat = toonMat(C.cup);
  cupGroup.add(new THREE.Mesh(cupGeo, cupMat));

  // Highlight stripe on cup
  const highlightGeo = new THREE.PlaneGeometry(0.12, 0.4);
  const highlightMat = new THREE.MeshBasicMaterial({
    color: C.white,
    transparent: true,
    opacity: 0.5,
    side: THREE.DoubleSide,
  });
  const highlight = new THREE.Mesh(highlightGeo, highlightMat);
  highlight.position.set(0.1, 0.05, 0.21);
  cupGroup.add(highlight);

  // Small highlight dot
  const dotGeo = new THREE.CircleGeometry(0.04, 12);
  const dot = new THREE.Mesh(dotGeo, highlightMat.clone());
  dot.position.set(0.08, 0.2, 0.22);
  cupGroup.add(dot);

  // Cup rim
  const rimGeo = new THREE.TorusGeometry(0.22, 0.02, 8, 32);
  const rimMat = new THREE.MeshBasicMaterial({ color: C.cup });
  const rim = new THREE.Mesh(rimGeo, rimMat);
  rim.rotation.x = Math.PI / 2;
  rim.position.y = 0.33;
  cupGroup.add(rim);

  return cupGroup;
}
