import { useEffect, useState, useRef } from "react";

export default function LandmarkAnalyze({ stream, onSignalsUpdate }) {
  const [landmarkData, setLandmarkData] = useState({
    faceDetected: false,
    confidenceScore: 0,
    movementNatural: true,
    landmarkCount: 0,
    lastDetectionTime: null,
    isAnalyzing: false,
    error: null
  });

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const animationFrameRef = useRef(null);
  const detectionHistoryRef = useRef([]);

  useEffect(() => {
    if (!stream) {
      setLandmarkData(prev => ({ ...prev, isAnalyzing: false }));
      return;
    }

    // Create hidden video and canvas for analysis
    const video = document.createElement('video');
    video.srcObject = stream;
    video.autoplay = true;
    video.playsInline = true;
    videoRef.current = video;

    const canvas = document.createElement('canvas');
    canvasRef.current = canvas;

    setLandmarkData(prev => ({ ...prev, isAnalyzing: true, error: null }));

    // Basic motion detection using canvas frame differencing
    // This is a placeholder for future ML model integration (e.g., MediaPipe, TensorFlow.js)
    let previousFrame = null;
    let frameCount = 0;

    function analyzeFrame() {
      if (!videoRef.current || videoRef.current.readyState < 2) {
        animationFrameRef.current = requestAnimationFrame(analyzeFrame);
        return;
      }

      const video = videoRef.current;
      const canvas = canvasRef.current;
      
      // Set canvas size to match video
      if (canvas.width !== video.videoWidth) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
      }

      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      ctx.drawImage(video, 0, 0);

      frameCount++;

      // Analyze every 15 frames (~0.5 seconds at 30fps)
      if (frameCount % 15 === 0) {
        try {
          const currentFrame = ctx.getImageData(0, 0, canvas.width, canvas.height);
          
          let motionDetected = false;
          let motionScore = 0;

          if (previousFrame) {
            // Calculate frame difference for motion detection
            let diffSum = 0;
            const threshold = 30; // Sensitivity threshold
            const sampleRate = 4; // Sample every 4th pixel for performance

            for (let i = 0; i < currentFrame.data.length; i += sampleRate * 4) {
              const rDiff = Math.abs(currentFrame.data[i] - previousFrame.data[i]);
              const gDiff = Math.abs(currentFrame.data[i + 1] - previousFrame.data[i + 1]);
              const bDiff = Math.abs(currentFrame.data[i + 2] - previousFrame.data[i + 2]);
              const avgDiff = (rDiff + gDiff + bDiff) / 3;
              
              if (avgDiff > threshold) {
                diffSum += avgDiff;
              }
            }

            // Normalize motion score (0-100)
            motionScore = Math.min(100, (diffSum / (currentFrame.data.length / 4)) * 10);
            motionDetected = motionScore > 5; // At least 5% motion

            // Track detection history
            detectionHistoryRef.current.push({
              timestamp: Date.now(),
              motionScore,
              detected: motionDetected
            });

            // Keep last 20 detections
            if (detectionHistoryRef.current.length > 20) {
              detectionHistoryRef.current.shift();
            }

            // Analyze movement patterns
            const recentDetections = detectionHistoryRef.current.slice(-10);
            const avgMotion = recentDetections.reduce((sum, d) => sum + d.motionScore, 0) / recentDetections.length;
            
            // Natural movement has variance; static or perfectly smooth is suspicious
            const motionVariance = recentDetections.reduce((sum, d) => {
              return sum + Math.pow(d.motionScore - avgMotion, 2);
            }, 0) / recentDetections.length;

            const movementNatural = 
              motionVariance > 5 && // Some variance expected
              motionVariance < 500 && // But not erratic
              avgMotion > 3 && // Some motion present
              avgMotion < 60; // But not excessive

            const newLandmarkData = {
              faceDetected: motionDetected,
              confidenceScore: Math.round(motionScore),
              movementNatural,
              landmarkCount: recentDetections.length,
              lastDetectionTime: new Date().toISOString(),
              isAnalyzing: true,
              error: null
            };

            setLandmarkData(newLandmarkData);

            // Send signals to parent
            if (onSignalsUpdate) {
              onSignalsUpdate({
                faceDetected: newLandmarkData.faceDetected,
                confidenceScore: newLandmarkData.confidenceScore,
                movementNatural: newLandmarkData.movementNatural,
                avgMotion: Math.round(avgMotion),
                motionVariance: Math.round(motionVariance)
              });
            }
          }

          previousFrame = currentFrame;

        } catch (error) {
          console.error('Frame analysis error:', error);
          setLandmarkData(prev => ({
            ...prev,
            error: error.message,
            isAnalyzing: false
          }));
        }
      }

      animationFrameRef.current = requestAnimationFrame(analyzeFrame);
    }

    // Wait for video to be ready
    video.addEventListener('loadeddata', () => {
      analyzeFrame();
    });

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (videoRef.current) {
        videoRef.current.pause();
        videoRef.current.srcObject = null;
      }
      detectionHistoryRef.current = [];
    };
  }, [stream, onSignalsUpdate]);

  if (!stream || !landmarkData.isAnalyzing) {
    return (
      <div className="landmark-analyze idle">
        <p>⏸️ Waiting for video stream...</p>
      </div>
    );
  }

  if (landmarkData.error) {
    return (
      <div className="landmark-analyze error">
        <p>⚠️ Analysis Error: {landmarkData.error}</p>
      </div>
    );
  }

  return (
    <div className="landmark-analyze">
      <div className="landmark-stats">
        <div className="stat">
          <span className="label">Motion Detected:</span>
          <span className={`value ${landmarkData.faceDetected ? 'ok' : 'warning'}`}>
            {landmarkData.faceDetected ? '✓ Yes' : '✗ No'}
          </span>
        </div>

        <div className="stat">
          <span className="label">Motion Score:</span>
          <span className="value">{landmarkData.confidenceScore}%</span>
        </div>

        <div className="stat">
          <span className="label">Movement Pattern:</span>
          <span className={`value ${landmarkData.movementNatural ? 'ok' : 'warning'}`}>
            {landmarkData.movementNatural ? '✓ Natural' : '⚠️ Suspicious'}
          </span>
        </div>

        <div className="stat">
          <span className="label">Samples:</span>
          <span className="value">{landmarkData.landmarkCount}</span>
        </div>
      </div>

      {!landmarkData.movementNatural && (
        <div className="anomaly-alert">
          <p>⚠️ <strong>Unnatural Movement Pattern</strong></p>
          <p className="detail">
            Motion patterns suggest static image or pre-recorded video
          </p>
        </div>
      )}

      <div className="landmark-info">
        <p className="info-text">
          <strong>Current Implementation:</strong> Basic motion detection using frame differencing.
        </p>
        <p className="info-text">
          <strong>Future Enhancement:</strong> Integrate MediaPipe or TensorFlow.js for 468-point facial landmark tracking, blink detection, and micro-expression analysis.
        </p>
      </div>
    </div>
  );
}