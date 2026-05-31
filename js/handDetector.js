// ============================================
// Hand Detector Module — MediaPipe Hands wrapper
// ============================================

/**
 * Initialize MediaPipe Hands and return a detection controller.
 * Provides a clean promise-based API on top of the event-driven MediaPipe API.
 *
 * @param {HTMLVideoElement} video - the camera video element
 * @returns {Promise<{ start: () => void, stop: () => void, onResults: (cb: Function) => void }>}
 */
export async function createHandDetector(video) {
  // Dynamically access the global Hands constructor (loaded via CDN <script>)
  const Hands = window.Hands;
  if (!Hands) {
    throw new Error('MediaPipe Hands 库未加载，请检查网络连接。');
  }

  // Canvas for drawing landmarks (overlay on video)
  const canvas = document.getElementById('landmark-canvas');
  const ctx = canvas.getContext('2d');

  // ---- State ----
  let running = false;
  let animationId = null;
  const callbacks = [];

  // ---- Initialize MediaPipe Hands ----
  const hands = new Hands({
    locateFile: (file) =>
      `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`
  });

  hands.setOptions({
    maxNumHands: 2,
    modelComplexity: 1,
    minDetectionConfidence: 0.7,
    minTrackingConfidence: 0.6,
  });

  // ---- Results handler ----
  hands.onResults((results) => {
    // Resize canvas to match video
    if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
    }

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw landmarks
    if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
      for (const landmarks of results.multiHandLandmarks) {
        drawHandLandmarks(ctx, landmarks, canvas.width, canvas.height);
      }
    }

    // Notify all registered callbacks with structured data
    const handsData = buildHandsData(results);
    for (const cb of callbacks) {
      cb(handsData);
    }
  });

  /**
   * Build a clean, structured representation of detection results.
   */
  function buildHandsData(results) {
    const hands = [];
    if (results.multiHandLandmarks) {
      for (let i = 0; i < results.multiHandLandmarks.length; i++) {
        const landmarks = results.multiHandLandmarks[i];
        const handedness = results.multiHandedness?.[i];

        // Convert landmarks to an array of {x, y, z} objects
        // x, y are normalized to [0, 1]; z is relative depth
        const points = landmarks.map(lm => ({
          x: lm.x,
          y: lm.y,
          z: lm.z
        }));

        hands.push({
          handedness: handedness?.label || 'Unknown',
          score: handedness?.score || 0,
          landmarks: points,
          // Landmark index reference (MediaPipe):
          // 0: wrist, 1-4: thumb, 5-8: index, 9-12: middle,
          // 13-16: ring, 17-20: pinky
        });
      }
    }
    return {
      hands,
      timestamp: performance.now(),
      hasHands: hands.length > 0,
    };
  }

  // ---- Public API ----

  /**
   * Start the detection loop.
   */
  async function start() {
    // Wait for Hands model to initialize
    await hands.initialize();
    running = true;
    console.log('[HandDetector] Model loaded, starting detection loop');

    async function detectFrame() {
      if (!running) return;
      if (video.readyState >= 2) {
        await hands.send({ image: video });
      }
      animationId = requestAnimationFrame(detectFrame);
    }
    detectFrame();
  }

  /**
   * Stop the detection loop.
   */
  function stop() {
    running = false;
    if (animationId) {
      cancelAnimationFrame(animationId);
      animationId = null;
    }
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  }

  /**
   * Register a callback that receives structured hand data each frame.
   * @param {function} cb - receives { hands: [], timestamp, hasHands }
   */
  function onResults(cb) {
    callbacks.push(cb);
  }

  return { start, stop, onResults };
}

// ============================================
// Landmark Drawing Helpers
// ============================================

/** MediaPipe hand connections — which landmarks to connect with lines */
const HAND_CONNECTIONS = [
  // Thumb
  [0, 1], [1, 2], [2, 3], [3, 4],
  // Index
  [0, 5], [5, 6], [6, 7], [7, 8],
  // Middle
  [0, 9], [9, 10], [10, 11], [11, 12],
  // Ring
  [0, 13], [13, 14], [14, 15], [15, 16],
  // Pinky
  [0, 17], [17, 18], [18, 19], [19, 20],
  // Palm connections
  [5, 9], [9, 13], [13, 17],
];

const FINGERTIP_INDICES = [4, 8, 12, 16, 20]; // thumb, index, middle, ring, pinky tips
const JOINT_INDICES = [3, 7, 11, 15, 19];      // DIP joints

/**
 * Draw hand landmarks and connections on the given canvas context.
 */
function drawHandLandmarks(ctx, landmarks, width, height) {
  const denormX = (lx) => lx * width;
  const denormY = (ly) => ly * height;

  // Draw connections (pale purple lines)
  ctx.strokeStyle = 'rgba(162, 155, 254, 0.5)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  for (const [i, j] of HAND_CONNECTIONS) {
    ctx.moveTo(denormX(landmarks[i].x), denormY(landmarks[i].y));
    ctx.lineTo(denormX(landmarks[j].x), denormY(landmarks[j].y));
  }
  ctx.stroke();

  // Draw landmarks
  for (let i = 0; i < landmarks.length; i++) {
    const x = denormX(landmarks[i].x);
    const y = denormY(landmarks[i].y);

    const isFingertip = FINGERTIP_INDICES.includes(i);
    const isJoint = JOINT_INDICES.includes(i);
    const isWrist = i === 0;

    ctx.beginPath();
    ctx.arc(x, y, isWrist ? 6 : isFingertip ? 5 : isJoint ? 3.5 : 2.5, 0, 2 * Math.PI);

    if (isWrist) {
      ctx.fillStyle = '#00cec9'; // teal for wrist
    } else if (isFingertip) {
      ctx.fillStyle = '#ff7675'; // coral for fingertips
    } else if (isJoint) {
      ctx.fillStyle = '#fdcb6e'; // amber for joints
    } else {
      ctx.fillStyle = '#a29bfe'; // lavender for intermediate
    }

    ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.3)';
    ctx.lineWidth = 1;
    ctx.stroke();
  }
}
