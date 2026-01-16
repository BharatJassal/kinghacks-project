import { useState, useEffect } from 'react';
import WebCamFeed from './WebCamFeed';
import DeviceInspect from './DeviceInspect';
import FrameTiming from './FrameTiming';
import LandmarkAnalyze from './LandmarkAnalyze';
import EnvironmentAnalyze from './EnvironmentAnalyze';
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
  const [trustScore, setTrustScore] = useState(null);
  const [backendResponse, setBackendResponse] = useState(null);
  const [isEvaluating, setIsEvaluating] = useState(false);

  // Aggregate all signals for trust scoring
  const allSignals = {
    device: deviceSignals,
    timing: timingSignals,
    landmark: landmarkSignals,
    environment: environmentSignals
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
        <p className="subtitle">Privacy-first biometric verification</p>
      </header>

      <div className="dashboard-grid">
        {/* Main webcam feed */}
        <section className="feed-section">
          <h2>Live Feed</h2>
          <WebCamFeed onStreamReady={setStream} />
        </section>

        {/* Trust score calculator */}
        <section className="score-section">
          <h2>Trust Score</h2>
          <Score 
            signals={allSignals}
            onScoreCalculated={setTrustScore}
            onEvaluate={handleEvaluate}
            isEvaluating={isEvaluating}
          />
        </section>

        {/* Device inspection */}
        <section className="signal-section">
          <h2>Device Analysis</h2>
          <DeviceInspect 
            stream={stream} 
            onSignalsUpdate={setDeviceSignals}
          />
        </section>

        {/* Frame timing analysis */}
        <section className="signal-section">
          <h2>Frame Timing</h2>
          <FrameTiming 
            stream={stream}
            onSignalsUpdate={setTimingSignals}
          />
        </section>

        {/* Landmark analysis */}
        <section className="signal-section">
          <h2>Movement Analysis</h2>
          <LandmarkAnalyze 
            stream={stream}
            onSignalsUpdate={setLandmarkSignals}
          />
        </section>

        {/* Environment analysis */}
        <section className="signal-section">
          <h2>Environment Check</h2>
          <EnvironmentAnalyze 
            onSignalsUpdate={setEnvironmentSignals}
          />
        </section>

        {/* Backend response display */}
        {backendResponse && (
          <section className="response-section">
            <h2>Backend Decision</h2>
            <div className="response-card">
              <pre>{JSON.stringify(backendResponse, null, 2)}</pre>
            </div>
          </section>
        )}
      </div>

      <footer className="dashboard-footer">
        <p>🔒 All video processing happens client-side • No raw video transmitted</p>
      </footer>
    </div>
  );
}

export default Dashboard;