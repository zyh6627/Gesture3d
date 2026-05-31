// ============================================
// Main Module — App orchestration
// ============================================

import { createCamera } from './camera.js';
import { createHandDetector } from './handDetector.js';
import { createGestureRecognizer, Gesture, getGestureIcon, getGestureLabel } from './gestureRecognizer.js';
import { createScene3D } from './scene3d.js';

// ---- DOM Elements ----
const gestureIcon = document.getElementById('gesture-icon');
const gestureLabel = document.getElementById('gesture-label');
const gestureBadge = document.getElementById('gesture-badge');
const fpsCounter = document.getElementById('fps-counter');
const loadingOverlay = document.getElementById('loading-overlay');
const cameraStatus = document.getElementById('camera-status');
const hintItems = document.querySelectorAll('.hint-item');

// ---- State ----
let previousHandPos = null;       // { x, y } for tracking movement delta
let previousTwoHandDist = null;   // for two-hand zoom
let currentGesture = Gesture.NONE;
let isGrabbing = false;

// ---- FPS Tracking ----
let frameCount = 0;
let lastFpsTime = performance.now();
let currentFps = 0;

function updateFps(now) {
  frameCount++;
  if (now - lastFpsTime >= 1000) {
    currentFps = Math.round(frameCount / ((now - lastFpsTime) / 1000));
    frameCount = 0;
    lastFpsTime = now;
    fpsCounter.textContent = `FPS: ${currentFps}`;
  }
}

// ---- UI Updates ----
function updateGestureUI(gesture) {
  if (gesture !== currentGesture) {
    currentGesture = gesture;
    gestureIcon.textContent = getGestureIcon(gesture);
    gestureLabel.textContent = getGestureLabel(gesture);

    if (gesture !== Gesture.NONE) {
      gestureBadge.classList.add('active');
    } else {
      gestureBadge.classList.remove('active');
    }

    // Highlight active hint
    hintItems.forEach(item => {
      item.classList.remove('active');
      if (item.dataset.gesture === gesture) {
        item.classList.add('active');
      }
    });
  }
}

function setLoading(visible, text = '正在加载...') {
  if (!loadingOverlay) return;
  if (visible) {
    loadingOverlay.classList.remove('hidden');
    const textEl = document.getElementById('loading-text');
    if (textEl) textEl.textContent = text;
  } else {
    loadingOverlay.classList.add('hidden');
  }
}

// ---- Gesture-to-Interaction Mapping ----
function handleGestureResult(result, scene3D) {
  updateGestureUI(result.dominantGesture);

  if (!result.hasHands || !result.dominantHand) {
    // No hands detected — reset tracking
    previousHandPos = null;
    previousTwoHandDist = null;
    if (isGrabbing) {
      scene3D.releaseObject();
      isGrabbing = false;
    }
    return;
  }

  const hand = result.dominantHand;
  const handPos = { x: hand.center.x, y: hand.center.y };

  switch (result.dominantGesture) {
    case Gesture.PEACE:
      // ✌️ Rotate scene based on hand movement
      handleRotate(handPos, scene3D);
      // Release if was grabbing
      if (isGrabbing) {
        scene3D.releaseObject();
        isGrabbing = false;
      }
      break;

    case Gesture.PINCH:
      // 🤏 Grab + drag objects, or two-hand zoom
      if (result.hands.length >= 2 && result.twoHandDistance !== null) {
        handleTwoHandZoom(result.twoHandDistance, scene3D);
      } else {
        handleGrabAndDrag(handPos, result, scene3D);
      }
      break;

    case Gesture.FIST:
      // ✊ Grab object at hand position (one-shot on gesture change)
      if (!isGrabbing && result.isStable) {
        const grabbed = scene3D.grabAt(handPos.x, handPos.y);
        if (grabbed) {
          isGrabbing = true;
        }
      }
      if (isGrabbing) {
        scene3D.moveGrabbed(handPos.x, handPos.y);
      }
      previousHandPos = handPos;
      break;

    case Gesture.OPEN_PALM:
      // 🖐️ Release everything
      if (isGrabbing) {
        scene3D.releaseObject();
        isGrabbing = false;
      }
      previousHandPos = null;
      previousTwoHandDist = null;
      break;

    case Gesture.POINT:
      // 👆 Hover preview
      scene3D.hoverAt(handPos.x, handPos.y);
      if (isGrabbing) {
        scene3D.releaseObject();
        isGrabbing = false;
      }
      previousHandPos = handPos;
      break;

    case Gesture.THUMBS_UP:
      // 👍 Zoom in
      scene3D.zoom(-0.03);
      if (isGrabbing) {
        scene3D.releaseObject();
        isGrabbing = false;
      }
      previousHandPos = null;
      break;

    case Gesture.THUMBS_DOWN:
      // 👎 Zoom out
      scene3D.zoom(0.03);
      if (isGrabbing) {
        scene3D.releaseObject();
        isGrabbing = false;
      }
      previousHandPos = null;
      break;

    default:
      // NONE or unknown — track position but no action
      previousHandPos = handPos;
      if (isGrabbing) {
        scene3D.releaseObject();
        isGrabbing = false;
      }
      break;
  }
}

/**
 * Handle scene rotation via hand movement delta.
 */
function handleRotate(handPos, scene3D) {
  if (previousHandPos) {
    const dx = handPos.x - previousHandPos.x;
    const dy = handPos.y - previousHandPos.y;

    // Apply dead zone to reduce jitter
    const deadZone = 0.005;
    const rotX = Math.abs(dx) > deadZone ? dx * 5 : 0;
    const rotY = Math.abs(dy) > deadZone ? dy * 3 : 0;

    if (rotX !== 0 || rotY !== 0) {
      scene3D.rotate(rotX, rotY);
    }
  }
  previousHandPos = handPos;
}

/**
 * Handle grabbing and dragging an object.
 */
function handleGrabAndDrag(handPos, result, scene3D) {
  if (!isGrabbing && result.isStable) {
    // Try to grab
    const grabbed = scene3D.grabAt(handPos.x, handPos.y);
    if (grabbed) {
      isGrabbing = true;
      console.log(`[Main] Grabbed: ${grabbed.name}`);
    }
  }

  if (isGrabbing) {
    scene3D.moveGrabbed(handPos.x, handPos.y);
  } else if (previousHandPos) {
    // If not grabbing, use pinch movement for zoom
    const dx = handPos.x - previousHandPos.x;
    const dy = handPos.y - previousHandPos.y;
    if (Math.abs(dy) > 0.008) {
      scene3D.zoom(dy * 3);
    }
    if (Math.abs(dx) > 0.008) {
      scene3D.rotate(dx * 2, 0);
    }
  }

  previousHandPos = handPos;
}

/**
 * Handle two-hand distance change → zoom.
 */
function handleTwoHandZoom(currentDist, scene3D) {
  if (previousTwoHandDist !== null) {
    const delta = previousTwoHandDist - currentDist;
    if (Math.abs(delta) > 0.003) {
      scene3D.zoom(delta * 8);
    }
  }
  previousTwoHandDist = currentDist;
}

// ============================================
// App Initialization
// ============================================

async function init() {
  console.log('[Main] Starting Gesture 3D Interaction app...');
  setLoading(true, '正在初始化摄像头...');

  try {
    // 1. Start camera
    const camera = createCamera({ width: 640, height: 480 });
    await camera.ready;
    console.log('[Main] Camera ready');

    // 2. Initialize hand detector
    setLoading(true, '正在加载手部识别模型...');
    const detector = await createHandDetector(camera.video);
    console.log('[Main] Hand detector created');

    // 3. Initialize gesture recognizer
    const recognizer = createGestureRecognizer();

    // 4. Initialize 3D scene
    const threeCanvas = document.getElementById('three-canvas');
    const scene3D = createScene3D(threeCanvas);
    scene3D.startRenderLoop();
    console.log('[Main] 3D scene initialized');

    // 5. Connect pipeline: detector → recognizer → scene
    detector.onResults((handsData) => {
      const result = recognizer.update(handsData);
      handleGestureResult(result, scene3D);
    });

    // Register for gesture change events (for one-shot actions)
    recognizer.onChange((result) => {
      console.log('[Main] Gesture changed:', result.dominantGesture,
        result.dominantHand ? `(${result.dominantHand.handedness})` : '');
    });

    // 6. Start detection loop
    await detector.start();
    console.log('[Main] Detection loop started');

    // Hide loading overlay
    setLoading(false);

    // 7. FPS tracking loop
    function fpsLoop(now) {
      updateFps(now);
      requestAnimationFrame(fpsLoop);
    }
    requestAnimationFrame(fpsLoop);

    // Keyboard shortcuts
    window.addEventListener('keydown', (e) => {
      switch (e.key.toLowerCase()) {
        case 'r':
          scene3D.reset();
          isGrabbing = false;
          previousHandPos = null;
          previousTwoHandDist = null;
          console.log('[Main] Reset via keyboard');
          break;
        case 'f':
          // Toggle fullscreen
          if (!document.fullscreenElement) {
            document.body.requestFullscreen().catch(() => {});
          } else {
            document.exitFullscreen();
          }
          break;
      }
    });

    console.log('[Main] ✅ App fully initialized!');
    console.log('[Main] Gestures: ✌️rotate 🖐️release ✊/🤏grab 👆hover 👍/👎zoom');
    console.log('[Main] Keyboard: R=reset F=fullscreen');

  } catch (err) {
    console.error('[Main] Initialization failed:', err);
    setLoading(true, `初始化失败：${err.message}`);
    // Keep overlay visible with error message
    if (loadingOverlay) {
      loadingOverlay.style.background = 'rgba(255, 118, 117, 0.15)';
    }
  }
}

// ---- Handle window resize ----
window.addEventListener('resize', () => {
  // The 3D scene handles its own resize in the render loop.
  // Just ensure camera canvas overlay is repositioned.
});

// ---- Boot ----
init().catch(err => {
  console.error('[Main] Fatal error:', err);
});
