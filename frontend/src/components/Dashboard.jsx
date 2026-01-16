import { useState, useEffect } from 'react';
import WebCamFeed from './WebCamFeed';
import DeviceInspect from './DeviceInspect';
import FrameTiming from './FrameTiming';
import LandmarkAnalyze from './LandmarkAnalyze';
import EnvironmentAnalyze from './EnvironmentAnalyze';
import RppgAnalyze from './RppgAnalyze';
import Score from './Score';

function Dashboard() {
  const [stream, setStream] = useState(null);
  const [deviceSignals, setDeviceSignals] = useState({
    hasVirtualCamera: false,
    deviceCount: 0,
    deviceLabels: []
  });
  const [timingSignals, setTimingSignals] = useState({
    avgFps: 0,
    jitter: 0,
    anomalyDetected: false
  });
  const [landmarkSignals, setLandmarkSignals] = useState({
    faceDetected: false,
    confidenceScore: 0,
    movementNatural: true
  });
  const [environmentSignals, setEnvironmentSignals] = useState({
    isHeadless: false,
    hasAutomationTools: false,
    suspiciousViewport: false,
    webDriverDetected: false
  });
  const [deepfakeSignals, setDeepfakeSignals] = useState({
    deepfakeProbability: 0,
    blinkRate: 0,
    isLikelyDeepfake: false,
    warnings: []
  });
  const [rppgSignals, setRppgSignals] = useState({
    heartRate: 0,
    hrv: 0,
    heartbeatDetected: false,
    isPhysiological: true,
    signalQuality: 0,
    confidence: 0,
    noHeartbeat: false
  });
  const [trustScore, setTrustScore] = useState(null);
  const [backendResponse, setBackendResponse] = useState(null);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [showPopup, setShowPopup] = useState(false);
  const [sessionStart] = useState(Date.now());
  const [sessionDuration, setSessionDuration] = useState('00:00');
  const [previousScore, setPreviousScore] = useState(null);

  // Aggregate all signals for trust scoring
  const allSignals = {
    device: deviceSignals,
    timing: timingSignals,
    landmark: landmarkSignals,
    environment: environmentSignals,
    deepfake: deepfakeSignals,
    rppg: rppgSignals
  };

  // Update session duration every 2 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - sessionStart) / 1000);
      const minutes = Math.floor(elapsed / 60);
      const seconds = elapsed % 60;
      setSessionDuration(`${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`);
    }, 2000);
    return () => clearInterval(interval);
  }, [sessionStart]);

  // Track score changes for risk trend
  useEffect(() => {
    if (trustScore !== null && trustScore !== previousScore) {
      setPreviousScore(trustScore);
    }
  }, [trustScore, previousScore]);

  // Derive presence summary data
  const getPresenceState = () => {
    if (!stream) return 'Inactive';
    if (trustScore === null) return 'Initializing';
    if (trustScore >= 70) return 'Active / Stable';
    if (trustScore >= 50) return 'Active / Monitoring';
    return 'Active / Warning';
  };

  const getMotionPattern = () => {
    if (!landmarkSignals.faceDetected) return 'No motion detected';
    if (landmarkSignals.movementNatural) return 'Natural';
    return 'Irregular';
  };

  const getFrameStability = () => {
    if (!timingSignals.jitter) return 'Measuring...';
    if (timingSignals.jitter < 5) return 'Very stable';
    if (timingSignals.jitter < 15) return 'Stable';
    if (timingSignals.jitter < 25) return 'Moderate variance';
    return 'High variance';
  };

  const getRiskTrend = () => {
    if (previousScore === null || trustScore === null) return 'Initializing';
    const diff = trustScore - previousScore;
    if (Math.abs(diff) < 5) return 'Stable';
    if (diff > 0) return 'Improving';
    return 'Declining';
  };

  // Handle evaluation request to backend
  const handleEvaluate = async (scoreData) => {
    setIsEvaluating(true);
    try {
      const response = await fetch('http://localhost:8000/evaluate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          trustScore: scoreData.score,
          signals: scoreData.signals,
          deepfakeAnalysis: deepfakeSignals,
          rppgAnalysis: rppgSignals,
          timestamp: new Date().toISOString()
        })
      });
      
      const result = await response.json();
      setBackendResponse(result);
      setShowPopup(true); // Show popup instead of bottom section
    } catch (error) {
      console.error('Backend evaluation failed:', error);
      setBackendResponse({
        error: 'Failed to connect to backend',
        details: error.message
      });
      setShowPopup(true); // Show popup even on error
    } finally {
      setIsEvaluating(false);
    }
  };

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <h1>Human Presence Trust System</h1>
        <p className="subtitle">
          Privacy-first biometric verification with AI deepfake detection & rPPG heartbeat analysis
        </p>
      </header>

      <div className="dashboard-grid">
        {/* Main webcam feed - Large left section */}
        <section className="feed-section">
          <h2>Live Camera Feed</h2>
          <WebCamFeed onStreamReady={setStream} />
          
          {stream && (
            <div className="presence-summary">
              <h3>Live Presence Summary</h3>
              <div className="summary-grid">
                <div className="summary-item">
                  <span className="summary-label">Presence state:</span>
                  <span className="summary-value">{getPresenceState()}</span>
                </div>
                <div className="summary-item">
                  <span className="summary-label">Session duration:</span>
                  <span className="summary-value">{sessionDuration}</span>
                </div>
                <div className="summary-item">
                  <span className="summary-label">Motion pattern:</span>
                  <span className="summary-value">{getMotionPattern()}</span>
                </div>
                <div className="summary-item">
                  <span className="summary-label">Frame stability:</span>
                  <span className="summary-value">{getFrameStability()}</span>
                </div>
                <div className="summary-item">
                  <span className="summary-label">Risk trend:</span>
                  <span className="summary-value">{getRiskTrend()}</span>
                </div>
              </div>
            </div>
          )}
        </section>

        {/* Trust score display - Top right */}
        <section className="score-section">
          <h2>Trust Score</h2>
          <Score 
            signals={allSignals}
            onScoreCalculated={setTrustScore}
            onEvaluate={handleEvaluate}
            isEvaluating={isEvaluating}
            showOnlyScore={true}
          />
        </section>

        {/* Signal Status Boxes - Right column */}
        <section className="signal-boxes-section">
          <h2>Signal Status</h2>
          <Score 
            signals={allSignals}
            onScoreCalculated={setTrustScore}
            onEvaluate={handleEvaluate}
            isEvaluating={isEvaluating}
            showOnlyBoxes={true}
          />
        </section>

        {/* Individual analysis sections */}
        <section className="signal-section">
          <h2>Device Analysis</h2>
          <DeviceInspect 
            stream={stream} 
            onSignalsUpdate={setDeviceSignals}
          />
        </section>

        <section className="signal-section">
          <h2>Frame Timing</h2>
          <FrameTiming 
            stream={stream}
            onSignalsUpdate={setTimingSignals}
          />
        </section>

        <section className="signal-section">
          <h2>AI Deepfake Detection</h2>
          <LandmarkAnalyze 
            stream={stream}
            onSignalsUpdate={setLandmarkSignals}
            onDeepfakeUpdate={setDeepfakeSignals}
          />
        </section>

        <section className="signal-section">
          <h2>rPPG Heartbeat</h2>
          <RppgAnalyze 
            stream={stream}
            onSignalsUpdate={setRppgSignals}
          />
        </section>

        <section className="signal-section">
          <h2>Environment Check</h2>
          <EnvironmentAnalyze 
            onSignalsUpdate={setEnvironmentSignals}
          />
        </section>
      </div>

      {/* Popup Modal for Backend Response */}
      {showPopup && backendResponse && (
        <div className="modal-overlay" onClick={() => setShowPopup(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Backend Governance Decision</h2>
              <button className="modal-close" onClick={() => setShowPopup(false)}>×</button>
            </div>
            <div className="modal-body">
              <pre>{JSON.stringify(backendResponse, null, 2)}</pre>
            </div>
          </div>
        </div>
      )}

      <footer className="dashboard-footer">
        <p>All video processing happens client-side — No raw video transmitted</p>
      </footer>
    </div>
  );
}

export default Dashboard;