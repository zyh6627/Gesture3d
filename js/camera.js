// ============================================
// Camera Module — Webcam capture & video feed
// ============================================

/**
 * Initialize the webcam and return a video element + a ready promise.
 * @param {Object} options
 * @param {number} options.width  - requested video width
 * @param {number} options.height - requested video height
 * @returns {{ video: HTMLVideoElement, ready: Promise<void>, stop: () => void }}
 */
export function createCamera(options = {}) {
  const {
    width = 640,
    height = 480,
    facingMode = 'user'
  } = options;

  const video = document.getElementById('webcam-video');
  const statusEl = document.getElementById('camera-status');
  const wrapperEl = document.getElementById('camera-wrapper');
  const panelEl = document.getElementById('camera-panel');

  let stream = null;

  function setStatus(text, isError = false) {
    if (statusEl) {
      statusEl.textContent = text;
    }
    if (isError) {
      panelEl?.classList.add('error');
      wrapperEl?.classList.remove('active');
    } else {
      panelEl?.classList.remove('error');
    }
  }

  const ready = (async () => {
    try {
      // Check browser support
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('您的浏览器不支持摄像头访问。请使用 Chrome / Edge / Firefox 的最新版本。');
      }

      setStatus('📷 正在请求摄像头权限...');

      stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: width },
          height: { ideal: height },
          facingMode: facingMode
        },
        audio: false
      });

      video.srcObject = stream;

      // Wait for video metadata to load, then play
      await new Promise((resolve, reject) => {
        video.onloadedmetadata = () => {
          video.play()
            .then(resolve)
            .catch(reject);
        };
        video.onerror = () => reject(new Error('视频加载失败'));
      });

      setStatus('📷 摄像头就绪');
      wrapperEl?.classList.add('active');
      console.log(`[Camera] Started — ${video.videoWidth}x${video.videoHeight}`);

    } catch (err) {
      const msg = mapCameraError(err);
      setStatus(msg, true);
      console.error('[Camera] Error:', err);
      throw new Error(msg);
    }
  })();

  function stop() {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      stream = null;
      video.srcObject = null;
      setStatus('📷 摄像头已停止');
      wrapperEl?.classList.remove('active');
    }
  }

  return { video, ready, stop };
}

/**
 * Map common getUserMedia errors to Chinese messages.
 */
function mapCameraError(err) {
  const map = {
    NotAllowedError: '❌ 摄像头权限被拒绝，请在浏览器设置中允许摄像头访问。',
    PermissionDeniedError: '❌ 摄像头权限被拒绝，请在浏览器设置中允许摄像头访问。',
    NotFoundError: '❌ 未检测到摄像头设备，请确认摄像头已连接。',
    NotReadableError: '❌ 摄像头被其他应用占用，请关闭其他使用摄像头的程序。',
    OverconstrainedError: '❌ 未找到符合要求的摄像头配置。',
    AbortError: '❌ 摄像头请求被中断。',
  };

  if (err.name && map[err.name]) {
    return map[err.name];
  }
  return `❌ 摄像头错误：${err.message || '未知错误'}`;
}
