import { useEffect, useState, useRef } from "react";

export default function LandmarkAnalyze({ stream, onSignalsUpdate, onDeepfakeUpdate }) {
  const [landmarkData, setLandmarkData] = useState({
    faceDetected: false,
    confidenceScore: 0,
    movementNatural: true,
    landmarkCount: 0,
    lastDetectionTime: null,
    isAnalyzing: false,
    error: null
  });

  const [deepfakeData, setDeepfakeData] = useState({
    blinkRate: 0,
    blinkCount: 0,
    facialSymmetry: 100,
    edgeConsistency: 100,
    colorConsistency: 100,
    microExpressionScore: 0,
    deepfakeProbability: 0,
    warnings: []
  });

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const animationFrameRef = useRef(null);
  const previousFrameRef = useRef(null);
  const detectionHistoryRef = useRef([]);
  const blinkHistoryRef = useRef([]);
  const edgeHistoryRef = useRef([]);
  const colorHistoryRef = useRef([]);

  useEffect(() => {
    if (!stream) {
      setLandmarkData(prev => ({ ...prev, isAnalyzing: false }));
      return;
    }

    const video = document.createElement('video');
    video.srcObject = stream;
    video.autoplay = true;
    video.playsInline = true;
    videoRef.current = video;

    const canvas = document.createElement('canvas');
    canvasRef.current = canvas;

    setLandmarkData(prev => ({ ...prev, isAnalyzing: true, error: null }));

    let previousFrame = null;
    let frameCount = 0;
    let blinkCount = 0;

    function analyzeFrame() {
      if (!videoRef.current || videoRef.current.readyState < 2) {
        animationFrameRef.current = requestAnimationFrame(analyzeFrame);
        return;
      }

      const video = videoRef.current;
      const canvas = canvasRef.current;
      
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
            // ============ MOTION DETECTION ============
            let diffSum = 0;
            const threshold = 30;
            const sampleRate = 4;

            for (let i = 0; i < currentFrame.data.length; i += sampleRate * 4) {
              const rDiff = Math.abs(currentFrame.data[i] - previousFrame.data[i]);
              const gDiff = Math.abs(currentFrame.data[i + 1] - previousFrame.data[i + 1]);
              const bDiff = Math.abs(currentFrame.data[i + 2] - previousFrame.data[i + 2]);
              const avgDiff = (rDiff + gDiff + bDiff) / 3;
              
              if (avgDiff > threshold) {
                diffSum += avgDiff;
              }
            }

            motionScore = Math.min(100, (diffSum / (currentFrame.data.length / 4)) * 10);
            motionDetected = motionScore > 5;

            detectionHistoryRef.current.push({
              timestamp: Date.now(),
              motionScore,
              detected: motionDetected
            });

            if (detectionHistoryRef.current.length > 20) {
              detectionHistoryRef.current.shift();
            }

            const recentDetections = detectionHistoryRef.current.slice(-10);
            const avgMotion = recentDetections.reduce((sum, d) => sum + d.motionScore, 0) / recentDetections.length;
            
            const motionVariance = recentDetections.reduce((sum, d) => {
              return sum + Math.pow(d.motionScore - avgMotion, 2);
            }, 0) / recentDetections.length;

            const movementNatural = 
              motionVariance > 5 &&
              motionVariance < 500 &&
              avgMotion > 3 &&
              avgMotion < 60;

            // ============ DEEPFAKE DETECTION ============
            const warnings = [];

            // 1. BLINK DETECTION
            const blinkDetected = detectBlink(currentFrame, canvas.width, canvas.height);
            if (blinkDetected) {
              blinkCount++;
              blinkHistoryRef.current.push(Date.now());
            }

            if (blinkHistoryRef.current.length > 20) {
              blinkHistoryRef.current.shift();
            }

            const blinkRate = calculateBlinkRate(blinkHistoryRef.current);
            if (blinkRate < 8 || blinkRate > 30) {
              warnings.push("Abnormal blink rate");
            }

            // 2. EDGE CONSISTENCY
            const edgeScore = analyzeEdgeConsistency(currentFrame, canvas.width, canvas.height);
            edgeHistoryRef.current.push(edgeScore);
            if (edgeHistoryRef.current.length > 30) edgeHistoryRef.current.shift();
            
            const avgEdgeScore = edgeHistoryRef.current.reduce((a, b) => a + b, 0) / edgeHistoryRef.current.length;
            if (avgEdgeScore < 70) {
              warnings.push("Inconsistent face edges");
            }

            // 3. COLOR CONSISTENCY
            const colorScore = analyzeColorConsistency(currentFrame, canvas.width, canvas.height);
            colorHistoryRef.current.push(colorScore);
            if (colorHistoryRef.current.length > 30) colorHistoryRef.current.shift();
            
            const avgColorScore = colorHistoryRef.current.reduce((a, b) => a + b, 0) / colorHistoryRef.current.length;
            if (avgColorScore < 75) {
              warnings.push("Inconsistent skin tone");
            }

            // 4. FACIAL SYMMETRY
            const symmetryScore = analyzeFacialSymmetry(currentFrame, canvas.width, canvas.height);
            if (symmetryScore > 95) {
              warnings.push("Unnaturally perfect symmetry");
            }

            // 5. MICRO-EXPRESSIONS
            const microExpScore = detectMicroExpressions(currentFrame, previousFrameRef.current, canvas.width, canvas.height);
            if (microExpScore < 20) {
              warnings.push("Lack of micro-expressions");
            }

            // Calculate deepfake probability
            let deepfakeProbability = 0;
            
            if (blinkRate < 8 || blinkRate > 30) deepfakeProbability += 30;
            else if (blinkRate < 12 || blinkRate > 25) deepfakeProbability += 15;
            
            if (avgEdgeScore < 70) deepfakeProbability += 25;
            else if (avgEdgeScore < 80) deepfakeProbability += 12;
            
            if (avgColorScore < 75) deepfakeProbability += 20;
            else if (avgColorScore < 85) deepfakeProbability += 10;
            
            if (symmetryScore > 95) deepfakeProbability += 15;
            else if (symmetryScore > 90) deepfakeProbability += 8;
            
            if (microExpScore < 20) deepfakeProbability += 10;
            else if (microExpScore < 35) deepfakeProbability += 5;

            // Update motion analysis state
            const newLandmarkData = {
              faceDetected: motionDetected,
              confidenceScore: Math.round(motionScore),
              movementNatural,
              landmarkCount: recentDetections.length,
              lastDetectionTime: new Date().toISOString(),
              isAnalyzing: true,
              error: null
            };

            // Update deepfake analysis state
            const newDeepfakeData = {
              blinkRate: Math.round(blinkRate),
              blinkCount,
              facialSymmetry: Math.round(symmetryScore),
              edgeConsistency: Math.round(avgEdgeScore),
              colorConsistency: Math.round(avgColorScore),
              microExpressionScore: Math.round(microExpScore),
              deepfakeProbability: Math.min(100, Math.round(deepfakeProbability)),
              warnings
            };

            setLandmarkData(newLandmarkData);
            setDeepfakeData(newDeepfakeData);

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

            if (onDeepfakeUpdate) {
              onDeepfakeUpdate({
                deepfakeProbability: newDeepfakeData.deepfakeProbability,
                blinkRate: newDeepfakeData.blinkRate,
                isLikelyDeepfake: newDeepfakeData.deepfakeProbability > 60,
                warnings: newDeepfakeData.warnings
              });
            }

            previousFrameRef.current = currentFrame;
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
      blinkHistoryRef.current = [];
      edgeHistoryRef.current = [];
      colorHistoryRef.current = [];
      previousFrameRef.current = null;
    };
  }, [stream, onSignalsUpdate, onDeepfakeUpdate]);

  // ============ HELPER FUNCTIONS ============

  function detectBlink(imageData, width, height) {
    const eyeRegionY = Math.floor(height * 0.35);
    const eyeRegionHeight = Math.floor(height * 0.15);
    let darkPixels = 0;
    let totalPixels = 0;

    for (let y = eyeRegionY; y < eyeRegionY + eyeRegionHeight; y++) {
      for (let x = Math.floor(width * 0.3); x < Math.floor(width * 0.7); x++) {
        const i = (y * width + x) * 4;
        const brightness = (imageData.data[i] + imageData.data[i + 1] + imageData.data[i + 2]) / 3;
        if (brightness < 60) darkPixels++;
        totalPixels++;
      }
    }

    return (darkPixels / totalPixels) > 0.4;
  }

  function calculateBlinkRate(blinkHistory) {
    if (blinkHistory.length < 2) return 0;
    const timeSpan = (blinkHistory[blinkHistory.length - 1] - blinkHistory[0]) / 1000 / 60;
    return timeSpan > 0 ? blinkHistory.length / timeSpan : 0;
  }

  function analyzeEdgeConsistency(imageData, width, height) {
    let edgeScore = 100;
    const data = imageData.data;
    let edgeStrength = 0;
    let edgeCount = 0;

    for (let y = 10; y < height - 10; y += 5) {
      for (let x = 10; x < width - 10; x += 5) {
        const i = (y * width + x) * 4;
        const iRight = (y * width + (x + 5)) * 4;
        const iDown = ((y + 5) * width + x) * 4;

        const gradX = Math.abs(data[i] - data[iRight]);
        const gradY = Math.abs(data[i] - data[iDown]);
        const gradient = gradX + gradY;

        if (gradient > 30) {
          edgeStrength += gradient;
          edgeCount++;
        }
      }
    }

    const avgEdgeStrength = edgeCount > 0 ? edgeStrength / edgeCount : 0;
    if (avgEdgeStrength < 40) edgeScore -= 30;
    else if (avgEdgeStrength > 120) edgeScore -= 15;

    return Math.max(0, edgeScore);
  }

  function analyzeColorConsistency(imageData, width, height) {
    const data = imageData.data;
    const faceRegion = {
      x: Math.floor(width * 0.25),
      y: Math.floor(height * 0.25),
      w: Math.floor(width * 0.5),
      h: Math.floor(height * 0.5)
    };

    let rSum = 0, gSum = 0, bSum = 0, count = 0;

    for (let y = faceRegion.y; y < faceRegion.y + faceRegion.h; y += 5) {
      for (let x = faceRegion.x; x < faceRegion.x + faceRegion.w; x += 5) {
        const i = (y * width + x) * 4;
        rSum += data[i];
        gSum += data[i + 1];
        bSum += data[i + 2];
        count++;
      }
    }

    const avgR = rSum / count;
    const avgG = gSum / count;
    const avgB = bSum / count;

    let variance = 0;
    for (let y = faceRegion.y; y < faceRegion.y + faceRegion.h; y += 5) {
      for (let x = faceRegion.x; x < faceRegion.x + faceRegion.w; x += 5) {
        const i = (y * width + x) * 4;
        const dr = data[i] - avgR;
        const dg = data[i + 1] - avgG;
        const db = data[i + 2] - avgB;
        variance += (dr * dr + dg * dg + db * db) / 3;
      }
    }
    variance /= count;

    let score = 100;
    if (variance < 100) score -= 30;
    if (variance > 2000) score -= 25;

    return Math.max(0, score);
  }

  function analyzeFacialSymmetry(imageData, width, height) {
    const data = imageData.data;
    const centerX = Math.floor(width / 2);
    let symmetryScore = 0;
    let count = 0;

    for (let y = Math.floor(height * 0.2); y < Math.floor(height * 0.8); y += 5) {
      for (let offset = 10; offset < Math.floor(width * 0.4); offset += 5) {
        const iLeft = (y * width + (centerX - offset)) * 4;
        const iRight = (y * width + (centerX + offset)) * 4;

        const diffR = Math.abs(data[iLeft] - data[iRight]);
        const diffG = Math.abs(data[iLeft + 1] - data[iRight + 1]);
        const diffB = Math.abs(data[iLeft + 2] - data[iRight + 2]);
        const avgDiff = (diffR + diffG + diffB) / 3;

        symmetryScore += Math.max(0, 100 - avgDiff);
        count++;
      }
    }

    return count > 0 ? symmetryScore / count : 50;
  }

  function detectMicroExpressions(currentFrame, previousFrame, width, height) {
    if (!previousFrame) return 50;

    const current = currentFrame.data;
    const previous = previousFrame.data;
    let changeCount = 0;
    let totalChecked = 0;

    const faceY = Math.floor(height * 0.3);
    const faceH = Math.floor(height * 0.4);

    for (let y = faceY; y < faceY + faceH; y += 8) {
      for (let x = Math.floor(width * 0.3); x < Math.floor(width * 0.7); x += 8) {
        const i = (y * width + x) * 4;
        const diff = Math.abs(current[i] - previous[i]) +
                     Math.abs(current[i + 1] - previous[i + 1]) +
                     Math.abs(current[i + 2] - previous[i + 2]);
        
        if (diff > 15 && diff < 80) changeCount++;
        totalChecked++;
      }
    }

    return totalChecked > 0 ? (changeCount / totalChecked) * 100 : 0;
  }

  // ============ RENDER ============

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
      {/* DEEPFAKE RISK INDICATOR */}
      <div className="signal-card" style={{ 
        background: deepfakeData.deepfakeProbability > 60 ? 'rgba(239, 68, 68, 0.15)' : 'rgba(31, 41, 55, 0.4)',
        border: deepfakeData.deepfakeProbability > 60 ? '2px solid rgba(239, 68, 68, 0.5)' : '1px solid rgba(75, 85, 99, 0.3)',
        marginBottom: '1rem'
      }}>
        <div style={{ 
          fontSize: '1.75rem', 
          fontWeight: '700', 
          textAlign: 'center',
          marginBottom: '0.5rem',
          color: deepfakeData.deepfakeProbability > 60 ? '#f87171' : deepfakeData.deepfakeProbability > 30 ? '#fbbf24' : '#34d399'
        }}>
          {deepfakeData.deepfakeProbability}%
        </div>
        <div style={{ 
          textAlign: 'center', 
          fontSize: '0.875rem',
          color: '#9ca3af',
          fontWeight: '600'
        }}>
          {deepfakeData.deepfakeProbability > 60 ? '🚨 HIGH RISK - Likely AI Generated' :
           deepfakeData.deepfakeProbability > 30 ? '⚡ MODERATE RISK' :
           '✓ LOW RISK - Likely Real Person'}
        </div>
      </div>

      {/* DEEPFAKE METRICS */}
      <div className="signal-card" style={{ marginBottom: '1rem' }}>
        <div style={{ fontWeight: '600', marginBottom: '0.75rem', color: '#60a5fa', fontSize: '0.875rem' }}>
          🤖 Deepfake Indicators
        </div>

        <div className="signal-row">
          <span className="signal-label">Blink Rate</span>
          <span className={`signal-value ${deepfakeData.blinkRate < 8 || deepfakeData.blinkRate > 30 ? 'bad' : 'good'}`}>
            {deepfakeData.blinkRate}/min
          </span>
        </div>

        <div className="signal-row">
          <span className="signal-label">Face Symmetry</span>
          <span className={`signal-value ${deepfakeData.facialSymmetry > 95 ? 'bad' : deepfakeData.facialSymmetry > 90 ? 'warning' : 'good'}`}>
            {deepfakeData.facialSymmetry}%
          </span>
        </div>

        <div className="signal-row">
          <span className="signal-label">Edge Quality</span>
          <span className={`signal-value ${deepfakeData.edgeConsistency < 70 ? 'bad' : deepfakeData.edgeConsistency < 85 ? 'warning' : 'good'}`}>
            {deepfakeData.edgeConsistency}%
          </span>
        </div>

        <div className="signal-row">
          <span className="signal-label">Skin Tone</span>
          <span className={`signal-value ${deepfakeData.colorConsistency < 75 ? 'bad' : deepfakeData.colorConsistency < 85 ? 'warning' : 'good'}`}>
            {deepfakeData.colorConsistency}%
          </span>
        </div>

        <div className="signal-row">
          <span className="signal-label">Micro-Expressions</span>
          <span className={`signal-value ${deepfakeData.microExpressionScore < 20 ? 'bad' : deepfakeData.microExpressionScore < 35 ? 'warning' : 'good'}`}>
            {deepfakeData.microExpressionScore}%
          </span>
        </div>
      </div>

      {/* MOTION DETECTION METRICS */}
      <div className="signal-card">
        <div style={{ fontWeight: '600', marginBottom: '0.75rem', color: '#34d399', fontSize: '0.875rem' }}>
          👤 Motion Analysis
        </div>

        <div className="signal-row">
          <span className="signal-label">Motion Detected</span>
          <span className={`signal-value ${landmarkData.faceDetected ? 'good' : 'bad'}`}>
            {landmarkData.faceDetected ? '✓ Yes' : '✗ No'}
          </span>
        </div>

        <div className="signal-row">
          <span className="signal-label">Motion Score</span>
          <span className="signal-value">{landmarkData.confidenceScore}%</span>
        </div>

        <div className="signal-row">
          <span className="signal-label">Movement Pattern</span>
          <span className={`signal-value ${landmarkData.movementNatural ? 'good' : 'bad'}`}>
            {landmarkData.movementNatural ? '✓ Natural' : '⚠️ Suspicious'}
          </span>
        </div>

        <div className="signal-row">
          <span className="signal-label">Samples</span>
          <span className="signal-value">{landmarkData.landmarkCount}</span>
        </div>
      </div>

      {/* WARNINGS */}
      {deepfakeData.warnings.length > 0 && (
        <div style={{ 
          marginTop: '1rem', 
          padding: '1rem', 
          background: 'rgba(239, 68, 68, 0.1)', 
          borderRadius: '6px', 
          border: '1px solid rgba(239, 68, 68, 0.2)' 
        }}>
          <div style={{ color: '#fca5a5', fontWeight: '600', marginBottom: '0.5rem', fontSize: '0.875rem' }}>
            🚨 Deepfake Indicators Detected
          </div>
          <ul style={{ margin: 0, paddingLeft: '1.25rem', fontSize: '0.8rem', color: '#9ca3af' }}>
            {deepfakeData.warnings.map((warning, idx) => (
              <li key={idx}>{warning}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="help-text" style={{ marginTop: '1rem', fontSize: '0.8rem', lineHeight: '1.5' }}>
        💡 Detects: Blink patterns • Edge artifacts • Color consistency • Facial symmetry • Micro-expressions
      </div>
    </div>
  );
}