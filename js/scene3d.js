// ============================================
// 3D Scene Module — Character-focused orthographic scene
// ============================================

import * as THREE from 'three';
import { createCharacter } from './character.js';

/**
 * Create and manage the 3D scene featuring the cartoon character.
 * @param {HTMLCanvasElement} canvas - the canvas to render into
 */
export function createScene3D(canvas) {
  // ---- Renderer ----
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.1;

  // ---- Scene ----
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xf5f0e8); // warm off-white, like illustration paper

  // ---- Orthographic Camera ----
  const frustumSize = 5.5;
  let cameraAspect = 2;
  const camera = new THREE.OrthographicCamera(
    frustumSize * cameraAspect / -2,
    frustumSize * cameraAspect / 2,
    frustumSize / 2,
    frustumSize / -2,
    0.1,
    30
  );
  camera.position.set(0, 0.5, 10);
  camera.lookAt(0, 0.5, 0);

  // ---- Lighting (soft, flat for cel-shaded look) ----
  const ambient = new THREE.AmbientLight(0xffffff, 2.5);
  scene.add(ambient);

  const keyLight = new THREE.DirectionalLight(0xffffff, 3);
  keyLight.position.set(1, 3, 5);
  scene.add(keyLight);

  const fillLight = new THREE.DirectionalLight(0xffeedd, 1.5);
  fillLight.position.set(-2, 1, 2);
  scene.add(fillLight);

  const rimLight = new THREE.DirectionalLight(0xccccff, 2);
  rimLight.position.set(0, 0, -1);
  scene.add(rimLight);

  // ---- Character ----
  const character = createCharacter();
  scene.add(character);

  // Allow traversing character parts for interaction
  /** @type {THREE.Mesh[]} */
  const interactiveParts = [];
  character.traverse((child) => {
    if (child.isMesh) {
      interactiveParts.push(child);
    }
  });

  // ---- State ----
  let characterRotY = 0;
  let characterRotX = 0;
  let targetRotY = 0;
  let targetRotX = 0;
  let targetFrustumSize = frustumSize;

  let grabbedPart = null;
  let grabbedOffset = new THREE.Vector3();
  let hoveredPart = null;
  const raycaster = new THREE.Raycaster();
  raycaster.far = 20;

  // ---- Public API ----

  /**
   * Rotate the character (yaw and pitch).
   * @param {number} dx - horizontal rotation delta
   * @param {number} dy - vertical rotation delta
   */
  function rotate(dx, dy) {
    targetRotY += dx;
    targetRotX += dy;
    targetRotX = Math.max(-0.8, Math.min(0.5, targetRotX));
  }

  /**
   * Zoom in/out by adjusting the orthographic frustum.
   * @param {number} delta - positive = zoom in, negative = zoom out
   */
  function zoom(delta) {
    targetFrustumSize += delta;
    targetFrustumSize = Math.max(2.5, Math.min(10, targetFrustumSize));
  }

  /**
   * Try to grab a part of the character.
   */
  function grabAt(nx, ny) {
    if (grabbedPart) return null;

    const rect = canvas.getBoundingClientRect();
    const screenX = (1 - nx) * rect.width;
    const screenY = ny * rect.height;

    const mouse = new THREE.Vector2(
      (screenX / rect.width) * 2 - 1,
      -(screenY / rect.height) * 2 + 1
    );
    raycaster.setFromCamera(mouse, camera);

    const intersects = raycaster.intersectObjects(interactiveParts, false);
    if (intersects.length > 0) {
      grabbedPart = intersects[0].object;
      grabbedOffset.copy(intersects[0].point).sub(grabbedPart.position);
      grabbedPart.material = grabbedPart.material.clone();
      grabbedPart.material.emissive = new THREE.Color(0x333333);
      grabbedPart.material.emissiveIntensity = 0.4;
      console.log(`[Scene3D] Grabbed: ${grabbedPart.name || 'unnamed part'}`);
      return { name: grabbedPart.name || 'part', position: grabbedPart.position.clone() };
    }
    return null;
  }

  function releaseObject() {
    if (!grabbedPart) return;
    grabbedPart.material.emissive = new THREE.Color(0x000000);
    grabbedPart.material.emissiveIntensity = 0;
    grabbedPart = null;
  }

  function moveGrabbed(nx, ny) {
    if (!grabbedPart) return;

    const rect = canvas.getBoundingClientRect();
    const screenX = (1 - nx) * rect.width;
    const screenY = ny * rect.height;

    const mouse = new THREE.Vector2(
      (screenX / rect.width) * 2 - 1,
      -(screenY / rect.height) * 2 + 1
    );
    raycaster.setFromCamera(mouse, camera);

    // Move on a plane at the grabbed part's depth
    const planeNormal = new THREE.Vector3(0, 0, 1);
    const planePoint = grabbedPart.position.clone();
    const plane = new THREE.Plane().setFromNormalAndCoplanarPoint(planeNormal, planePoint);
    const intersection = new THREE.Vector3();
    raycaster.ray.intersectPlane(plane, intersection);

    if (intersection) {
      const target = intersection.sub(grabbedOffset);
      grabbedPart.position.lerp(target, 0.35);
    }
  }

  function hoverAt(nx, ny) {
    if (grabbedPart) return;

    const rect = canvas.getBoundingClientRect();
    const screenX = (1 - nx) * rect.width;
    const screenY = ny * rect.height;

    const mouse = new THREE.Vector2(
      (screenX / rect.width) * 2 - 1,
      -(screenY / rect.height) * 2 + 1
    );
    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(interactiveParts, false);

    if (hoveredPart && (intersects.length === 0 || intersects[0].object !== hoveredPart)) {
      hoveredPart.material.emissive = new THREE.Color(0x000000);
      hoveredPart.material.emissiveIntensity = 0;
      hoveredPart = null;
    }

    if (intersects.length > 0 && intersects[0].object !== hoveredPart) {
      hoveredPart = intersects[0].object;
      hoveredPart.material = hoveredPart.material.clone();
      hoveredPart.material.emissive = new THREE.Color(0x111122);
      hoveredPart.material.emissiveIntensity = 0.2;
    }
  }

  function reset() {
    releaseObject();
    characterRotY = 0;
    characterRotX = 0;
    targetRotY = 0;
    targetRotX = 0;
    targetFrustumSize = 5.5;
    character.rotation.set(0, 0, 0);
  }

  /**
   * Main render loop.
   */
  function startRenderLoop() {
    function animate(time) {
      requestAnimationFrame(animate);

      // Smooth damping on rotation and zoom
      const damping = 0.1;
      characterRotY += (targetRotY - characterRotY) * damping;
      characterRotX += (targetRotX - characterRotX) * damping;

      character.rotation.y = characterRotY;
      character.rotation.x = characterRotX;

      // Smooth zoom
      const currentSize = (camera.right - camera.left) / cameraAspect;
      const newSize = currentSize + (targetFrustumSize - currentSize) * damping;
      camera.left = newSize * cameraAspect / -2;
      camera.right = newSize * cameraAspect / 2;
      camera.top = newSize / 2;
      camera.bottom = newSize / -2;
      camera.updateProjectionMatrix();

      // Gentle idle bobbing
      const t = time * 0.001;
      character.position.y = Math.sin(t * 1.5) * 0.04;

      // Resize handling
      const rect = canvas.getBoundingClientRect();
      const w = rect.width;
      const h = Math.max(rect.height, 1);
      if (canvas.width !== w || canvas.height !== h) {
        renderer.setSize(w, h, false);
        cameraAspect = w / h;
        camera.left = targetFrustumSize * cameraAspect / -2;
        camera.right = targetFrustumSize * cameraAspect / 2;
        camera.top = targetFrustumSize / 2;
        camera.bottom = targetFrustumSize / -2;
        camera.updateProjectionMatrix();
      }

      renderer.render(scene, camera);
    }
    requestAnimationFrame(animate);
    console.log('[Scene3D] Character render loop started');
  }

  // Initial size
  const rect = canvas.getBoundingClientRect();
  renderer.setSize(rect.width, Math.max(rect.height, 1), false);
  cameraAspect = rect.width / Math.max(rect.height, 1);
  camera.left = frustumSize * cameraAspect / -2;
  camera.right = frustumSize * cameraAspect / 2;
  camera.updateProjectionMatrix();

  return {
    rotate,
    zoom,
    grabAt,
    releaseObject,
    moveGrabbed,
    hoverAt,
    reset,
    startRenderLoop,
    getGrabbedObject: () => grabbedPart,
  };
}
