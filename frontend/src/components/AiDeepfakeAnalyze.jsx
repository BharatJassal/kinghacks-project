import { useEffect, useRef, useState } from "react";
import * as ort from "onnxruntime-web";
import { FaceDetector, FilesetResolver } from "@mediapipe/tasks-vision";

const CFG = {
  // ONNX model served by Vite from /public
  onnxModelPath: "/models/deepfake.onnx",

  // MediaPipe FaceDetector assets (fastest way to get working in Vite)
  wasmRoot: "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3/wasm",
  faceModel:
    "https://storage.googleapis.com/mediapipe-models/face_detector/blaze_face_short_range/float16/1/blaze_face_short_range.tflite",

  // inference cadence
  intervalMs: 900,

  // smoothing (EWMA)
  alpha: 0.25,
};

function clamp(v, lo, hi) {
  return Math.max(lo, Math.min(hi, v));
}

function softmax2(logits) {
  // logits length 2
  const a = logits[0];
  const b = logits[1];
  const m = Math.max(a, b);
  const ea = Math.exp(a - m);
  const eb = Math.exp(b - m);
  const s = ea + eb;
  return [ea / s, eb / s];
}

function imageDataToCHWFloat32(imgData) {
  // ViTFeatureExtractor: rescale_factor=1/255, mean=0.5, std=0.5, size=224
  // normalized = (pixel/255 - 0.5) / 0.5  => pixel/127.5 - 1
  const { data, width, height } = imgData; // RGBA
  const chw = new Float32Array(3 * width * height);
  const hw = width * height;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];

      const rr = r / 127.5 - 1.0;
      const gg = g / 127.5 - 1.0;
      const bb = b / 127.5 - 1.0;

      const j = y * width + x;
      chw[j] = rr; // C0
      chw[hw + j] = gg; // C1
      chw[2 * hw + j] = bb; // C2
    }
  }
  return chw;
}

export default function AiDeepfakeAnalyze({ stream, onUpdate }) {
  const videoRef = useRef(null);
  const workCanvasRef = useRef(null);

  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!stream) return;

    const v = videoRef.current;
    if (!v) return;

    v.srcObject = stream;
    v.muted = true;
    v.playsInline = true;

    const play = async () => {
      try {
        await v.play();
      } catch {
        // user gesture may be required in some browsers; WebCamFeed likely already handled it
      }
    };
    play();
  }, [stream]);

  useEffect(() => {
    let cancelled = false;

    let faceDetector = null;
    let session = null;
    let inputName = null;
    let outputName = null;

    let timer = null;
    let prevSmoothed = null;

    async function init() {
      // Keep ORT simple (no threads) so you don't need COOP/COEP headers
      ort.env.wasm.numThreads = 1;

      // If Vite ever fails to locate ORT wasm files, uncomment and set your installed version:
      // ort.env.wasm.wasmPaths = "https://cdn.jsdelivr.net/npm/onnxruntime-web@1.23.2/dist/";

      const vision = await FilesetResolver.forVisionTasks(CFG.wasmRoot);
      faceDetector = await FaceDetector.createFromOptions(vision, {
        baseOptions: { modelAssetPath: CFG.faceModel },
        runningMode: "VIDEO",
      });

      session = await ort.InferenceSession.create(CFG.onnxModelPath, {
        executionProviders: ["wasm"],
        graphOptimizationLevel: "all",
      });

      inputName = session.inputNames[0];
      outputName = session.outputNames[0];

      if (!cancelled) {
        setReady(true);
        onUpdate?.({
          modelReady: true,
          faceDetected: false,
          pFake: null,
          pFakeSmoothed: null,
          aiTrust: null,
          note: "AI model loaded",
        });
      }
    }

    async function tick() {
      if (cancelled) return;
      const v = videoRef.current;
      const canvas = workCanvasRef.current;
      if (!v || !canvas || !ready || !faceDetector || !session) return;

      // Guard: video not ready
      if (v.videoWidth === 0 || v.videoHeight === 0) return;

      const ts = performance.now();
      const det = faceDetector.detectForVideo(v, ts);
      const faces = det?.detections || [];

      if (faces.length === 0) {
        prevSmoothed = null;
        onUpdate?.({
          modelReady: true,
          faceDetected: false,
          pFake: null,
          pFakeSmoothed: null,
          aiTrust: null,
          note: "No face detected",
        });
        return;
      }

      // Use first face (you can later pick “largest face”)
      const bb = faces[0].boundingBox;
      const vw = v.videoWidth;
      const vh = v.videoHeight;

      // Expand bbox slightly (helps with jaw/edges)
      const pad = 0.15;
      const cx = bb.originX + bb.width / 2;
      const cy = bb.originY + bb.height / 2;
      const w = bb.width * (1 + pad);
      const h = bb.height * (1 + pad);

      const x1 = clamp(cx - w / 2, 0, vw - 1);
      const y1 = clamp(cy - h / 2, 0, vh - 1);
      const x2 = clamp(cx + w / 2, 1, vw);
      const y2 = clamp(cy + h / 2, 1, vh);

      // Draw cropped face to 224x224
      const SIZE = 224;
      canvas.width = SIZE;
      canvas.height = SIZE;
      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      ctx.drawImage(v, x1, y1, x2 - x1, y2 - y1, 0, 0, SIZE, SIZE);

      const img = ctx.getImageData(0, 0, SIZE, SIZE);
      const chw = imageDataToCHWFloat32(img);

      const input = new ort.Tensor("float32", chw, [1, 3, SIZE, SIZE]);

      const t0 = performance.now();
      const out = await session.run({ [inputName]: input });
      const t1 = performance.now();

      const logits = out[outputName].data; // [Realism, Deepfake]
      const probs = softmax2(logits);
      const pFake = probs[1];

      const smoothed =
        prevSmoothed == null
          ? pFake
          : CFG.alpha * pFake + (1 - CFG.alpha) * prevSmoothed;
      prevSmoothed = smoothed;

      onUpdate?.({
        modelReady: true,
        faceDetected: true,
        faces: faces.length,
        pFake,
        pFakeSmoothed: smoothed,
        aiTrust: 1 - smoothed,
        latencyMs: Math.round(t1 - t0),
        note: faces.length > 1 ? "Multiple faces detected" : "OK",
      });
    }

    init()
      .then(() => {
        timer = setInterval(() => {
          tick().catch((e) => {
            onUpdate?.({
              modelReady: false,
              faceDetected: false,
              pFake: null,
              pFakeSmoothed: null,
              aiTrust: null,
              note: `AI error: ${String(e?.message || e)}`,
            });
          });
        }, CFG.intervalMs);
      })
      .catch((e) => {
        onUpdate?.({
          modelReady: false,
          faceDetected: false,
          pFake: null,
          pFakeSmoothed: null,
          aiTrust: null,
          note: `Init failed: ${String(e?.message || e)}`,
        });
      });

    return () => {
      cancelled = true;
      if (timer) clearInterval(timer);
      try {
        faceDetector?.close?.();
      } catch {}
    };
  }, [stream, ready, onUpdate]);

  return (
    <div style={{ display: "none" }}>
      <video ref={videoRef} />
      <canvas ref={workCanvasRef} />
    </div>
  );
}
