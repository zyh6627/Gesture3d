// ============================================
// 3D Scene Module — Three.js interactive scene
// ============================================

import * as THREE from 'three';

/**
 * Create and manage the 3D scene.
 * @param {HTMLCanvasElement} canvas - the canvas to render into
 */
export function createScene3D(canvas) {
  // ---- Renderer ----
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.2;

  // ---- Scene ----
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0a0a14);
  scene.fog = new THREE.Fog(0x0a0a14, 8, 40);

  // ---- Camera (orbital) ----
  const camera = new THREE.PerspectiveCamera(55, 2, 0.5, 100);
  let orbitAzimuth = Math.PI / 4;     // horizontal angle
  let orbitElevation = Math.PI / 5;    // vertical angle (from horizon)
  let orbitRadius = 7;
  const orbitTarget = new THREE.Vector3(0, 0.8, 0);

  updateCameraPosition();

  function updateCameraPosition() {
    const x = orbitTarget.x + orbitRadius * Math.cos(orbitElevation) * Math.sin(orbitAzimuth);
    const y = orbitTarget.y + orbitRadius * Math.sin(orbitElevation);
    const z = orbitTarget.z + orbitRadius * Math.cos(orbitElevation) * Math.cos(orbitAzimuth);
    camera.position.set(x, y, z);
    camera.lookAt(orbitTarget);
  }

  // ---- Lights ----
  // Ambient
  const ambient = new THREE.AmbientLight(0x404060, 1.8);
  scene.add(ambient);

  // Key light
  const keyLight = new THREE.DirectionalLight(0xffeedd, 6);
  keyLight.position.set(8, 12, 4);
  keyLight.castShadow = true;
  keyLight.shadow.mapSize.width = 1024;
  keyLight.shadow.mapSize.height = 1024;
  keyLight.shadow.camera.near = 0.5;
  keyLight.shadow.camera.far = 60;
  keyLight.shadow.camera.left = -10;
  keyLight.shadow.camera.right = 10;
  keyLight.shadow.camera.top = 10;
  keyLight.shadow.camera.bottom = -10;
  keyLight.shadow.bias = -0.0004;
  keyLight.shadow.normalBias = 0.02;
  scene.add(keyLight);

  // Rim light
  const rimLight = new THREE.DirectionalLight(0x8888ff, 2.5);
  rimLight.position.set(-4, 2, -4);
  scene.add(rimLight);

  // Ground spotlight
  const spotLight = new THREE.SpotLight(0xaaccff, 15, 20, Math.PI / 5, 0.3, 1);
  spotLight.position.set(0, 6, 0);
  spotLight.castShadow = true;
  spotLight.shadow.mapSize.width = 512;
  spotLight.shadow.mapSize.height = 512;
  scene.add(spotLight);

  // ---- Ground ----
  const groundGeo = new THREE.PlaneGeometry(20, 20);
  const groundMat = new THREE.MeshStandardMaterial({
    color: 0x1a1a2e,
    roughness: 0.7,
    metalness: 0.3,
  });
  const ground = new THREE.Mesh(groundGeo, groundMat);
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -2;
  ground.receiveShadow = true;
  scene.add(ground);

  // Grid helper
  const grid = new THREE.GridHelper(16, 20, 0x333355, 0x1a1a2e);
  grid.position.y = -1.99;
  scene.add(grid);

  // ---- Platform ----
  const platformGeo = new THREE.CylinderGeometry(1.8, 2.0, 0.2, 48);
  const platformMat = new THREE.MeshStandardMaterial({
    color: 0x2d2d44,
    roughness: 0.3,
    metalness: 0.6,
  });
  const platform = new THREE.Mesh(platformGeo, platformMat);
  platform.position.set(0, -1.9, 0);
  platform.castShadow = true;
  platform.receiveShadow = true;
  scene.add(platform);

  // ---- Interactive Objects ----
  const interactiveObjects = [];
  const objectMaterials = []; // store original materials for hover effect

  function createObject(geometry, color, position, name) {
    const mat = new THREE.MeshStandardMaterial({
      color,
      roughness: 0.25,
      metalness: 0.4,
    });
    const mesh = new THREE.Mesh(geometry, mat);
    mesh.position.copy(position);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.name = name;
    mesh.userData = {
      originalPosition: position.clone(),
      originalColor: color,
      isInteractive: true,
    };
    scene.add(mesh);
    interactiveObjects.push(mesh);
    objectMaterials.push(mat);
    return mesh;
  }

  // Create various interactive objects
  createObject(
    new THREE.BoxGeometry(0.8, 0.8, 0.8, 2, 2, 2),
    0xff6b6b, new THREE.Vector3(-1.5, -1.5, 0.5), 'Red Cube'
  );
  createObject(
    new THREE.SphereGeometry(0.5, 32, 32),
    0x48dbfb, new THREE.Vector3(1.2, -1.4, -0.3), 'Blue Sphere'
  );
  createObject(
    new THREE.TorusKnotGeometry(0.35, 0.12, 100, 16),
    0xa29bfe, new THREE.Vector3(0.2, -1.2, 1.3), 'Purple Knot'
  );
  createObject(
    new THREE.ConeGeometry(0.45, 1.0, 6, 1),
    0xfeca57, new THREE.Vector3(-0.8, -1.5, -1.0), 'Yellow Cone'
  );
  createObject(
    new THREE.CylinderGeometry(0.3, 0.3, 0.9, 24),
    0xff9ff3, new THREE.Vector3(1.8, -1.5, -0.8), 'Pink Cylinder'
  );
  createObject(
    new THREE.OctahedronGeometry(0.45, 0),
    0x55efc4, new THREE.Vector3(-1.8, -1.3, -0.6), 'Green Octahedron'
  );

  // ---- Particles ----
  const particlesGeo = new THREE.BufferGeometry();
  const particlesCount = 300;
  const positionsArray = new Float32Array(particlesCount * 3);
  for (let i = 0; i < particlesCount; i++) {
    positionsArray[i * 3] = (Math.random() - 0.5) * 14;
    positionsArray[i * 3 + 1] = Math.random() * 8 - 1;
    positionsArray[i * 3 + 2] = (Math.random() - 0.5) * 14;
  }
  particlesGeo.setAttribute('position', new THREE.BufferAttribute(positionsArray, 3));
  const particlesMat = new THREE.PointsMaterial({
    size: 0.03,
    color: 0x6c5ce7,
    transparent: true,
    opacity: 0.5,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const particles = new THREE.Points(particlesGeo, particlesMat);
  scene.add(particles);

  // ---- State ----
  let grabbedObject = null;
  let grabbedOffset = new THREE.Vector3();
  let hoveredObject = null;
  const raycaster = new THREE.Raycaster();
  raycaster.far = 20;

  // For smooth damping
  let targetAzimuth = orbitAzimuth;
  let targetElevation = orbitElevation;
  let targetRadius = orbitRadius;
  let rotationVelocity = { azimuth: 0, elevation: 0 };

  // ---- Public API ----

  /**
   * Rotate the camera orbit by incremental deltas.
   * @param {number} dx - horizontal rotation delta
   * @param {number} dy - vertical rotation delta
   */
  function rotate(dx, dy) {
    targetAzimuth += dx;
    targetElevation += dy;
    // Clamp elevation to avoid flipping
    targetElevation = Math.max(-Math.PI / 2.8, Math.min(Math.PI / 2.8, targetElevation));
  }

  /**
   * Zoom the camera in/out.
   * @param {number} delta - zoom delta (positive = zoom in, negative = zoom out)
   */
  function zoom(delta) {
    targetRadius += delta;
    targetRadius = Math.max(3, Math.min(15, targetRadius));
  }

  /**
   * Attempt to grab an object at the given normalized hand position.
   * @param {number} nx - normalized x [0, 1] (from webcam)
   * @param {number} ny - normalized y [0, 1] (from webcam)
   * @returns {{ name: string, position: THREE.Vector3 } | null}
   */
  function grabAt(nx, ny) {
    if (grabbedObject) return null; // already grabbing

    // Convert normalized webcam coords to canvas pixel coords
    const rect = canvas.getBoundingClientRect();
    const screenX = (1 - nx) * rect.width;  // flip X to match mirrored webcam
    const screenY = ny * rect.height;

    // Raycast
    const mouse = new THREE.Vector2(
      (screenX / rect.width) * 2 - 1,
      -(screenY / rect.height) * 2 + 1
    );
    raycaster.setFromCamera(mouse, camera);

    const intersects = raycaster.intersectObjects(interactiveObjects, false);
    if (intersects.length > 0) {
      const obj = intersects[0].object;
      grabbedObject = obj;
      // Store offset from grab point to object center
      grabbedOffset.copy(intersects[0].point).sub(obj.position);
      // Highlight
      obj.material.emissive = new THREE.Color(0x444444);
      obj.material.emissiveIntensity = 0.6;
      console.log(`[Scene3D] Grabbed: ${obj.name}`);
      return { name: obj.name, position: obj.position.clone() };
    }
    return null;
  }

  /**
   * Release the currently grabbed object.
   */
  function releaseObject() {
    if (!grabbedObject) return;
    grabbedObject.material.emissive = new THREE.Color(0x000000);
    grabbedObject.material.emissiveIntensity = 0;
    console.log(`[Scene3D] Released: ${grabbedObject.name}`);
    grabbedObject = null;
  }

  /**
   * Move the grabbed object to follow the hand position.
   * @param {number} nx - normalized hand x [0, 1]
   * @param {number} ny - normalized hand y [0, 1]
   */
  function moveGrabbed(nx, ny) {
    if (!grabbedObject) return;

    const rect = canvas.getBoundingClientRect();
    const screenX = (1 - nx) * rect.width;
    const screenY = ny * rect.height;

    // Project the hand position onto a horizontal plane at the object's current height
    const mouse = new THREE.Vector2(
      (screenX / rect.width) * 2 - 1,
      -(screenY / rect.height) * 2 + 1
    );
    raycaster.setFromCamera(mouse, camera);

    // Intersect with a horizontal plane at the object's Y
    const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -grabbedObject.userData.originalPosition.y);
    const intersection = new THREE.Vector3();
    raycaster.ray.intersectPlane(plane, intersection);

    if (intersection) {
      // Smoothly move toward target
      const target = intersection.sub(grabbedOffset);
      grabbedObject.position.lerp(target, 0.4);

      // Keep within bounds
      grabbedObject.position.x = Math.max(-4, Math.min(4, grabbedObject.position.x));
      grabbedObject.position.z = Math.max(-4, Math.min(4, grabbedObject.position.z));
    }
  }

  /**
   * Hover highlight — call every frame with hand position to show what would be grabbed.
   */
  function hoverAt(nx, ny) {
    if (grabbedObject) return; // don't hover while grabbing

    const rect = canvas.getBoundingClientRect();
    const screenX = (1 - nx) * rect.width;
    const screenY = ny * rect.height;

    const mouse = new THREE.Vector2(
      (screenX / rect.width) * 2 - 1,
      -(screenY / rect.height) * 2 + 1
    );
    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(interactiveObjects, false);

    // Clear previous hover
    if (hoveredObject && (intersects.length === 0 || intersects[0].object !== hoveredObject)) {
      hoveredObject.material.emissive = new THREE.Color(0x000000);
      hoveredObject.material.emissiveIntensity = 0;
      hoveredObject = null;
    }

    // Set new hover
    if (intersects.length > 0 && intersects[0].object !== hoveredObject) {
      hoveredObject = intersects[0].object;
      hoveredObject.material.emissive = new THREE.Color(0x222244);
      hoveredObject.material.emissiveIntensity = 0.3;
    }
  }

  /**
   * Reset all objects to their original positions.
   */
  function reset() {
    releaseObject();
    for (const obj of interactiveObjects) {
      obj.position.copy(obj.userData.originalPosition);
      obj.rotation.set(0, 0, 0);
    }
    targetAzimuth = Math.PI / 4;
    targetElevation = Math.PI / 5;
    targetRadius = 7;
    console.log('[Scene3D] Scene reset');
  }

  /**
   * Main render loop — call once to start.
   */
  function startRenderLoop() {
    function animate(time) {
      requestAnimationFrame(animate);

      // Smooth damping on camera orbit
      const damping = 0.12;
      orbitAzimuth += (targetAzimuth - orbitAzimuth) * damping;
      orbitElevation += (targetElevation - orbitElevation) * damping;
      orbitRadius += (targetRadius - orbitRadius) * damping;

      updateCameraPosition();

      // Animate objects slightly
      const t = time * 0.001;
      for (const obj of interactiveObjects) {
        if (obj !== grabbedObject) {
          obj.rotation.y += 0.003;
          // Gentle bobbing
          const origY = obj.userData.originalPosition.y;
          obj.position.y = origY + Math.sin(t * 2 + obj.position.x) * 0.08;
        }
      }

      // Rotate particles slowly
      particles.rotation.y += 0.0004;
      particles.rotation.x += 0.0002;

      // Resize handling
      const rect = canvas.getBoundingClientRect();
      if (canvas.width !== rect.width || canvas.height !== rect.height) {
        renderer.setSize(rect.width, rect.height, false);
        camera.aspect = rect.width / Math.max(rect.height, 1);
        camera.updateProjectionMatrix();
      }

      renderer.render(scene, camera);
    }
    requestAnimationFrame(animate);
    console.log('[Scene3D] Render loop started');
  }

  // Initialize renderer size
  const rect = canvas.getBoundingClientRect();
  renderer.setSize(rect.width, rect.height, false);
  camera.aspect = rect.width / Math.max(rect.height, 1);
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
    getOrbitState: () => ({ azimuth: orbitAzimuth, elevation: orbitElevation, radius: orbitRadius }),
    getGrabbedObject: () => grabbedObject,
  };
}
