// ============================================
// Gesture Recognizer — Classify gestures from
// MediaPipe hand landmarks
// ============================================

/** Landmark indices */
const WRIST = 0;
const THUMB_TIP = 4;
const INDEX_TIP = 8;
const MIDDLE_TIP = 12;
const RING_TIP = 16;
const PINKY_TIP = 20;

// PIP joints (proximal interphalangeal)
const THUMB_IP = 3;
const INDEX_PIP = 6;
const MIDDLE_PIP = 10;
const RING_PIP = 14;
const PINKY_PIP = 18;

const FINGER_TIPS = [THUMB_TIP, INDEX_TIP, MIDDLE_TIP, RING_TIP, PINKY_TIP];
const FINGER_PIPS = [THUMB_IP, INDEX_PIP, MIDDLE_PIP, RING_PIP, PINKY_PIP];

// Finger names for clarity
const INDEX = 'index';
const MIDDLE = 'middle';
const RING = 'ring';
const PINKY = 'pinky';
const THUMB = 'thumb';

// ---- Export gesture enum ----
export const Gesture = {
  NONE: 'none',
  OPEN_PALM: 'open_palm',       // 🖐️
  FIST: 'fist',                 // ✊
  POINT: 'point',               // 👆 index pointing
  PEACE: 'peace',               // ✌️ index + middle
  PINCH: 'pinch',               // 🤏 thumb + index touch
  THUMBS_UP: 'thumbs_up',      // 👍
  THUMBS_DOWN: 'thumbs_down',  // 👎
};

const GESTURE_ICONS = {
  [Gesture.NONE]: '👋',
  [Gesture.OPEN_PALM]: '🖐️',
  [Gesture.FIST]: '✊',
  [Gesture.POINT]: '👆',
  [Gesture.PEACE]: '✌️',
  [Gesture.PINCH]: '🤏',
  [Gesture.THUMBS_UP]: '👍',
  [Gesture.THUMBS_DOWN]: '👎',
};

export function getGestureIcon(gesture) {
  return GESTURE_ICONS[gesture] || '👋';
}

export function getGestureLabel(gesture) {
  const labels = {
    [Gesture.NONE]: '无手势',
    [Gesture.OPEN_PALM]: '张开手掌',
    [Gesture.FIST]: '握拳',
    [Gesture.POINT]: '食指指向',
    [Gesture.PEACE]: '双指伸出',
    [Gesture.PINCH]: '捏合',
    [Gesture.THUMBS_UP]: '赞',
    [Gesture.THUMBS_DOWN]: '踩',
  };
  return labels[gesture] || '未知';
}

/**
 * Create a gesture recognizer.
 *
 * @returns {{
 *   update: (handsData: object) => GestureResult,
 *   onChange: (cb: (result: GestureResult) => void) => void,
 * }}
 *
 * GestureResult = {
 *   hands: HandGesture[],        // per-hand gesture info
 *   dominantGesture: string,     // primary gesture for interaction
 *   dominantHand: HandGesture|null, // the hand driving interaction
 *   twoHandDistance: number|null,  // distance between two hand centers (if 2 hands)
 * }
 *
 * HandGesture = {
 *   gesture: string,
 *   handedness: string,
 *   landmarks: object[],
 *   center: {x, y, z},           // palm center (wrist position)
 *   confidence: number,
 * }
 */
export function createGestureRecognizer() {
  const changeCallbacks = [];
  let lastDominantGesture = Gesture.NONE;
  let gestureStableFrames = 0;
  const STABILITY_THRESHOLD = 3; // frames before firing change event

  /**
   * Process hand detection data and classify gestures.
   * Call this every frame with the data from handDetector.
   */
  function update(handsData) {
    const handGestures = handsData.hands.map(hand => {
      const gesture = classifyGesture(hand.landmarks);
      return {
        gesture,
        handedness: hand.handedness,
        landmarks: hand.landmarks,
        center: hand.landmarks[WRIST],
        confidence: hand.score,
      };
    });

    // Determine dominant hand (prefer right hand, then first detected)
    let dominantHand = null;
    if (handGestures.length === 1) {
      dominantHand = handGestures[0];
    } else if (handGestures.length >= 2) {
      // Prefer right hand
      dominantHand = handGestures.find(h => h.handedness === 'Right') || handGestures[0];
    }

    const dominantGesture = dominantHand?.gesture || Gesture.NONE;

    // Compute two-hand distance (for zoom gestures)
    let twoHandDistance = null;
    if (handGestures.length >= 2) {
      const c1 = handGestures[0].center;
      const c2 = handGestures[1].center;
      twoHandDistance = Math.sqrt(
        (c2.x - c1.x) ** 2 + (c2.y - c1.y) ** 2 + (c2.z - c1.z) ** 2
      );
    }

    // Stability check: only fire change when gesture persists for N frames
    if (dominantGesture === lastDominantGesture) {
      gestureStableFrames++;
    } else {
      gestureStableFrames = 0;
      lastDominantGesture = dominantGesture;
    }

    const result = {
      hands: handGestures,
      dominantGesture,
      dominantHand,
      twoHandDistance,
      hasHands: handGestures.length > 0,
      isStable: gestureStableFrames >= STABILITY_THRESHOLD,
      timestamp: handsData.timestamp,
    };

    // Fire change callbacks on stable gesture switch
    if (gestureStableFrames === STABILITY_THRESHOLD) {
      for (const cb of changeCallbacks) {
        cb(result);
      }
    }

    return result;
  }

  /**
   * Register a callback for gesture *changes* (debounced with stability threshold).
   */
  function onChange(cb) {
    changeCallbacks.push(cb);
  }

  return { update, onChange };
}

// ============================================
// Gesture Classification Logic
// ============================================

/**
 * Classify a single hand's landmarks into a gesture.
 */
function classifyGesture(landmarks) {
  const extended = getExtendedFingers(landmarks);
  const extendedCount = countExtended(extended);

  // --- Pinch: thumb tip close to index tip ---
  if (isPinching(landmarks)) {
    return Gesture.PINCH;
  }

  // --- Check thumbs up/down before other gestures ---
  const thumbDir = getThumbDirection(landmarks);
  if (extended[THUMB] && !extended[INDEX] && !extended[MIDDLE] && thumbDir === 'up') {
    return Gesture.THUMBS_UP;
  }
  if (extended[THUMB] && !extended[INDEX] && !extended[MIDDLE] && thumbDir === 'down') {
    return Gesture.THUMBS_DOWN;
  }

  // --- Point: only index extended ---
  if (extended[INDEX] && !extended[MIDDLE] && !extended[RING] && !extended[PINKY]) {
    return Gesture.POINT;
  }

  // --- Peace: only index + middle extended ---
  if (extended[INDEX] && extended[MIDDLE] && !extended[RING] && !extended[PINKY]) {
    return Gesture.PEACE;
  }

  // --- Open palm: 4+ fingers extended ---
  if (extendedCount >= 4) {
    return Gesture.OPEN_PALM;
  }

  // --- Fist: 0-1 fingers extended ---
  if (extendedCount <= 1 && !extended[THUMB]) {
    return Gesture.FIST;
  }

  return Gesture.NONE;
}

/**
 * Determine which fingers are extended.
 * A finger is "extended" if the tip is farther from the wrist than the PIP joint.
 * Returns an object keyed by finger name.
 */
function getExtendedFingers(landmarks) {
  const wrist = landmarks[WRIST];

  function isExtended(tipIdx, pipIdx) {
    const tipDist = dist(wrist, landmarks[tipIdx]);
    const pipDist = dist(wrist, landmarks[pipIdx]);
    // Tip must be at least 15% farther from wrist than PIP
    return tipDist > pipDist * 1.15;
  }

  return {
    [THUMB]: isExtended(THUMB_TIP, THUMB_IP),
    [INDEX]: isExtended(INDEX_TIP, INDEX_PIP),
    [MIDDLE]: isExtended(MIDDLE_TIP, MIDDLE_PIP),
    [RING]: isExtended(RING_TIP, RING_PIP),
    [PINKY]: isExtended(PINKY_TIP, PINKY_PIP),
  };
}

function countExtended(extended) {
  return Object.values(extended).filter(Boolean).length;
}

/**
 * Check if thumb and index fingertips are very close (pinching).
 */
function isPinching(landmarks) {
  const d = dist(landmarks[THUMB_TIP], landmarks[INDEX_TIP]);
  return d < 0.06; // normalized coordinate threshold
}

/**
 * Determine thumb direction: 'up', 'down', or 'neutral'.
 * Compares thumb tip y-position to index/middle finger base y-positions.
 */
function getThumbDirection(landmarks) {
  const thumbTipY = landmarks[THUMB_TIP].y;

  // Reference: average y of index and middle MCP joints
  const refY = (landmarks[5].y + landmarks[9].y) / 2;

  // In image coords, y=0 is top. So "up" means smaller y.
  const diff = refY - thumbTipY;

  if (diff > 0.12) return 'up';       // thumb is clearly above reference
  if (diff < -0.08) return 'down';    // thumb is clearly below reference
  return 'neutral';
}

/**
 * Euclidean distance between two 3D points (normalized coords).
 */
function dist(a, b) {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  const dz = (a.z || 0) - (b.z || 0);
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}
