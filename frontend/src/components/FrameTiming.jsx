import { useEffect, useState, useRef } from "react";

export default function FrameTiming({ stream, onSignalsUpdate }) {
  const [timingData, setTimingData] = useState({
    currentFps: 0,
    avgFps: 0,
    jitter: 0,
    anomalyDetected: false,
    frameCount: 0,
    isAnalyzing: false
  });

  const frameTimesRef = useRef([]);
  const lastFrameTimeRef = useRef(null);
  const videoRef = useRef(null);
  const animationFrameRef = useRef(null);

  useEffect(() => {
    if (!stream) {
      setTimingData(prev => ({ ...prev, isAnalyzing: false }));
      return;
    }

    // Create a hidden video element to track frames
    const video = document.createElement('video');
    video.srcObject = stream;
    video.play();
    videoRef.current = video;

    setTimingData(prev => ({ ...prev, isAnalyzing: true }));

    let frameCount = 0;
    const frameTimes = [];
    const MAX_SAMPLES = 60; // Track last 60 frames (roughly 1-2 seconds)

    function analyzeFrame(timestamp) {
      if (!videoRef.current) return;

      frameCount++;

      // Calculate time since last frame
      if (lastFrameTimeRef.current !== null) {
        const deltaTime = timestamp - lastFrameTimeRef.current;
        frameTimes.push(deltaTime);

        // Keep only recent samples
        if (frameTimes.length > MAX_SAMPLES) {
          frameTimes.shift();
        }

        // Calculate metrics every 10 frames
        if (frameCount % 10 === 0 && frameTimes.length >= 10) {
          const avgFrameTime = frameTimes.reduce((a, b) => a + b, 0) / frameTimes.length;
          const avgFps = 1000 / avgFrameTime; // Convert ms to FPS

          // Calculate jitter (standard deviation of frame times)
          const variance = frameTimes.reduce((sum, time) => {
            return sum + Math.pow(time - avgFrameTime, 2);
          }, 0) / frameTimes.length;
          const jitter = Math.sqrt(variance);

          // Detect anomalies
          // Normal webcams: 25-30 FPS with jitter < 10ms
          // Virtual cameras often have: perfect timing (jitter < 1ms) or erratic timing (jitter > 20ms)
          const anomalyDetected = 
            (jitter < 1 && avgFps > 20) || // Too perfect (likely pre-recorded)
            jitter > 20 || // Too erratic (likely software processing)
            avgFps < 15 || // Too slow (likely not real-time)
            avgFps > 35; // Too fast (unlikely for standard webcams)

          const newTimingData = {
            currentFps: Math.round(1000 / deltaTime),
            avgFps: Math.round(avgFps * 10) / 10,
            jitter: Math.round(jitter * 10) / 10,
            anomalyDetected,
            frameCount,
            isAnalyzing: true
          };

          setTimingData(newTimingData);

          // Send signals to parent
          if (onSignalsUpdate) {
            onSignalsUpdate({
              avgFps: newTimingData.avgFps,
              jitter: newTimingData.jitter,
              anomalyDetected: newTimingData.anomalyDetected,
              frameCount: newTimingData.frameCount
            });
          }
        }
      }

      lastFrameTimeRef.current = timestamp;
      animationFrameRef.current = requestAnimationFrame(analyzeFrame);
    }

    animationFrameRef.current = requestAnimationFrame(analyzeFrame);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (videoRef.current) {
        videoRef.current.pause();
        videoRef.current.srcObject = null;
      }
      frameTimesRef.current = [];
      lastFrameTimeRef.current = null;
    };
  }, [stream, onSignalsUpdate]);

  if (!stream || !timingData.isAnalyzing) {
    return (
      <div className="frame-timing idle">
        <p>⏸️ Waiting for video stream...</p>
      </div>
    );
  }

  const getJitterStatus = () => {
    if (timingData.jitter < 1) return { label: 'Suspiciously Perfect', class: 'warning' };
    if (timingData.jitter < 5) return { label: 'Excellent', class: 'ok' };
    if (timingData.jitter < 10) return { label: 'Normal', class: 'ok' };
    if (timingData.jitter < 20) return { label: 'Moderate', class: 'caution' };
    return { label: 'High Variance', class: 'warning' };
  };

  const getFpsStatus = () => {
    if (timingData.avgFps < 15) return { label: 'Too Low', class: 'warning' };
    if (timingData.avgFps > 35) return { label: 'Too High', class: 'warning' };
    if (timingData.avgFps >= 25 && timingData.avgFps <= 30) return { label: 'Optimal', class: 'ok' };
    return { label: 'Acceptable', class: 'caution' };
  };

  const jitterStatus = getJitterStatus();
  const fpsStatus = getFpsStatus();

  return (
    <div className="frame-timing">
      <div className="timing-stats">
        <div className="stat">
          <span className="label">Current FPS:</span>
          <span className="value">{timingData.currentFps}</span>
        </div>
        
        <div className="stat">
          <span className="label">Average FPS:</span>
          <span className={`value ${fpsStatus.class}`}>
            {timingData.avgFps} <small>({fpsStatus.label})</small>
          </span>
        </div>
        
        <div className="stat">
          <span className="label">Jitter:</span>
          <span className={`value ${jitterStatus.class}`}>
            {timingData.jitter}ms <small>({jitterStatus.label})</small>
          </span>
        </div>

        <div className="stat">
          <span className="label">Frames Analyzed:</span>
          <span className="value">{timingData.frameCount}</span>
        </div>
      </div>

      {timingData.anomalyDetected && (
        <div className="anomaly-alert">
          <p>⚠️ <strong>Timing Anomaly Detected</strong></p>
          <p className="detail">
            Frame timing patterns suggest non-biological source
          </p>
        </div>
      )}

      <div className="timing-info">
        <p className="info-text">
          Real webcams typically run at 25-30 FPS with 5-10ms jitter due to natural head movement and lighting changes.
        </p>
      </div>
    </div>
  );
}