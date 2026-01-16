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

  // Aggregate all signals for trust scoring
  const allSignals = {
    device: deviceSignals,
    timing: timingSignals,
    landmark: landmarkSignals,
    environment: environmentSignals,
    deepfake: deepfakeSignals,
    rppg: rppgSignals
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
    } catch (error) {
      console.error('Backend evaluation failed:', error);
      setBackendResponse({
        error: 'Failed to connect to backend',
        details: error.message
      });
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

        {/* Backend response - Full width at bottom */}
        {backendResponse && (
          <section className="response-section">
            <h2>Backend Governance Decision</h2>
            <div className="response-card">
              <pre>{JSON.stringify(backendResponse, null, 2)}</pre>
            </div>
          </section>
        )}
      </div>

      <footer className="dashboard-footer">
        <p>All video processing happens client-side — No raw video transmitted</p>
      </footer>
    </div>
  );
}

export default Dashboard;