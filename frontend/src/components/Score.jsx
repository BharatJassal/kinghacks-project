import { useEffect, useState } from "react";

function Score({ signals, onScoreCalculated, onEvaluate, isEvaluating, showOnlyScore, showOnlyBoxes }) {
  const [score, setScore] = useState(null);
  const [breakdown, setBreakdown] = useState(null);

  useEffect(() => {
    // Wait for all signal sources to have data
    if (!signals.device || !signals.timing || !signals.landmark || !signals.environment) {
      return;
    }

    // Deterministic trust scoring algorithm
    const calculateScore = () => {
      let totalScore = 100;
      const penalties = [];

      // Device signals (weight: 25% - reduced to make room for deepfake)
      if (signals.device.hasVirtualCamera) {
        totalScore -= 25;
        penalties.push({ reason: "Active camera is virtual", points: -25 });
      }
      if (signals.device.deviceCount === 0) {
        totalScore -= 10;
        penalties.push({ reason: "No cameras found", points: -10 });
      }

      // Timing signals (weight: 20% - reduced)
      if (signals.timing.anomalyDetected) {
        totalScore -= 12;
        penalties.push({ reason: "Frame timing anomaly", points: -12 });
      }
      if (signals.timing.jitter < 1) {
        totalScore -= 8;
        penalties.push({ reason: "Suspiciously perfect timing", points: -8 });
      } else if (signals.timing.jitter > 25) {
        totalScore -= 6;
        penalties.push({ reason: "High frame jitter", points: -6 });
      }

      // Landmark signals (weight: 15% - reduced)
      if (!signals.landmark.faceDetected) {
        totalScore -= 8;
        penalties.push({ reason: "No motion detected", points: -8 });
      }
      if (!signals.landmark.movementNatural) {
        totalScore -= 12;
        penalties.push({ reason: "Unnatural movement pattern", points: -12 });
      }
      if (signals.landmark.confidenceScore < 5) {
        totalScore -= 8;
        penalties.push({ reason: "Very low motion confidence", points: -8 });
      }

      // Environment signals (weight: 15%)
      if (signals.environment.isHeadless) {
        totalScore -= 15;
        penalties.push({ reason: "Headless browser detected", points: -15 });
      }
      if (signals.environment.hasAutomationTools) {
        totalScore -= 12;
        penalties.push({ reason: "Automation tools detected", points: -12 });
      }
      if (signals.environment.suspiciousViewport) {
        totalScore -= 6;
        penalties.push({ reason: "Suspicious viewport size", points: -6 });
      }

      // DEEPFAKE DETECTION (weight: 20% - CRITICAL)
      if (signals.deepfake) {
        const dfProb = signals.deepfake.deepfakeProbability || 0;
        
        if (dfProb >= 70) {
          totalScore -= 20;
          penalties.push({ reason: "High deepfake probability", points: -20 });
        } else if (dfProb >= 50) {
          totalScore -= 14;
          penalties.push({ reason: "Moderate deepfake probability", points: -14 });
        } else if (dfProb >= 30) {
          totalScore -= 8;
          penalties.push({ reason: "Low deepfake probability", points: -8 });
        }

        // Individual deepfake indicators
        if (signals.deepfake.blinkRate < 8 || signals.deepfake.blinkRate > 30) {
          totalScore -= 4;
          penalties.push({ reason: "Abnormal blink rate", points: -4 });
        }
      }

      // rPPG HEARTBEAT DETECTION (weight: 20% - CRITICAL FOR AI DETECTION)
      if (signals.rppg) {
        if (signals.rppg.noHeartbeat || !signals.rppg.heartbeatDetected) {
          totalScore -= 20;
          penalties.push({ reason: "No heartbeat detected (likely AI)", points: -20 });
        } else if (!signals.rppg.isPhysiological) {
          totalScore -= 15;
          penalties.push({ reason: "Abnormal heart signal", points: -15 });
        } else if (signals.rppg.confidence < 50) {
          totalScore -= 8;
          penalties.push({ reason: "Low rPPG confidence", points: -8 });
        }

        // Additional rPPG quality checks
        if (signals.rppg.signalQuality < 30) {
          totalScore -= 5;
          penalties.push({ reason: "Poor rPPG signal quality", points: -5 });
        }
      }

      // Ensure score doesn't go negative
      totalScore = Math.max(0, totalScore);

      const scoreData = {
        score: totalScore,
        breakdown: penalties,
        signals: {
          device: signals.device,
          timing: signals.timing,
          landmark: signals.landmark,
          environment: signals.environment,
          deepfake: signals.deepfake,
          rppg: signals.rppg
        },
        timestamp: new Date().toISOString()
      };

      setScore(totalScore);
      setBreakdown(penalties);

      if (onScoreCalculated) {
        onScoreCalculated(scoreData);
      }

      return scoreData;
    };

    const scoreData = calculateScore();
    
    // Auto-recalculate every 2 seconds
    const interval = setInterval(calculateScore, 2000);

    return () => clearInterval(interval);
  }, [signals, onScoreCalculated]);

  const getScoreClass = () => {
    if (score === null) return 'unknown';
    if (score >= 75) return 'high';
    if (score >= 55) return 'medium';
    if (score >= 35) return 'low';
    return 'critical';
  };

  const getScoreLabel = () => {
    if (score === null) return 'Calculating...';
    if (score >= 75) return 'High Trust';
    if (score >= 55) return 'Medium Trust';
    if (score >= 35) return 'Low Trust';
    return 'Critical - Do Not Trust';
  };

  const handleEvaluate = () => {
    if (score !== null && onEvaluate) {
      onEvaluate({
        score,
        breakdown,
        signals: signals,
        timestamp: new Date().toISOString()
      });
    }
  };

  if (score === null) {
    return (
      <div className="score calculating">
        <div className="loading-state">
          <div className="spinner"></div>
          <p>⏳ Collecting signals...</p>
        </div>
      </div>
    );
  }

  // Show only the score number
  if (showOnlyScore) {
    return (
      <div className="score">
        <div className={`score-display ${getScoreClass()}`}>
          <div className="score-value">{score}</div>
          <div className="score-label">{getScoreLabel()}</div>
        </div>
      </div>
    );
  }

  // Show only the signal boxes
  if (showOnlyBoxes) {
    return (
      <div className="score">
        <div className="deduction-grid" style={{ marginBottom: '1.25rem' }}>
          {/* All possible deductions as boxes */}
          <div className={`deduction-box ${breakdown?.find(p => p.reason.includes('virtual')) ? 'flagged' : 'passed'}`}>
            <div className="deduction-icon">{breakdown?.find(p => p.reason.includes('virtual')) ? '⚠️' : '✓'}</div>
            <div className="deduction-label">Virtual Camera</div>
          </div>
          
          <div className={`deduction-box ${breakdown?.find(p => p.reason.includes('No cameras')) ? 'flagged' : 'passed'}`}>
            <div className="deduction-icon">{breakdown?.find(p => p.reason.includes('No cameras')) ? '⚠️' : '✓'}</div>
            <div className="deduction-label">Camera Present</div>
          </div>
          
          <div className={`deduction-box ${breakdown?.find(p => p.reason.includes('timing')) ? 'flagged' : 'passed'}`}>
            <div className="deduction-icon">{breakdown?.find(p => p.reason.includes('timing')) ? '⚠️' : '✓'}</div>
            <div className="deduction-label">Frame Timing</div>
          </div>
          
          <div className={`deduction-box ${breakdown?.find(p => p.reason.includes('jitter')) ? 'flagged' : 'passed'}`}>
            <div className="deduction-icon">{breakdown?.find(p => p.reason.includes('jitter')) ? '⚠️' : '✓'}</div>
            <div className="deduction-label">Frame Jitter</div>
          </div>
          
          <div className={`deduction-box ${breakdown?.find(p => p.reason.includes('motion detected')) ? 'flagged' : 'passed'}`}>
            <div className="deduction-icon">{breakdown?.find(p => p.reason.includes('motion detected')) ? '⚠️' : '✓'}</div>
            <div className="deduction-label">Motion Detected</div>
          </div>
          
          <div className={`deduction-box ${breakdown?.find(p => p.reason.includes('movement pattern')) ? 'flagged' : 'passed'}`}>
            <div className="deduction-icon">{breakdown?.find(p => p.reason.includes('movement pattern')) ? '⚠️' : '✓'}</div>
            <div className="deduction-label">Natural Movement</div>
          </div>
          
          <div className={`deduction-box ${breakdown?.find(p => p.reason.includes('confidence')) ? 'flagged' : 'passed'}`}>
            <div className="deduction-icon">{breakdown?.find(p => p.reason.includes('confidence')) ? '⚠️' : '✓'}</div>
            <div className="deduction-label">Motion Quality</div>
          </div>
          
          <div className={`deduction-box ${breakdown?.find(p => p.reason.includes('Headless')) ? 'flagged' : 'passed'}`}>
            <div className="deduction-icon">{breakdown?.find(p => p.reason.includes('Headless')) ? '⚠️' : '✓'}</div>
            <div className="deduction-label">Real Browser</div>
          </div>
          
          <div className={`deduction-box ${breakdown?.find(p => p.reason.includes('Automation')) ? 'flagged' : 'passed'}`}>
            <div className="deduction-icon">{breakdown?.find(p => p.reason.includes('Automation')) ? '⚠️' : '✓'}</div>
            <div className="deduction-label">No Automation</div>
          </div>
          
          <div className={`deduction-box ${breakdown?.find(p => p.reason.includes('viewport')) ? 'flagged' : 'passed'}`}>
            <div className="deduction-icon">{breakdown?.find(p => p.reason.includes('viewport')) ? '⚠️' : '✓'}</div>
            <div className="deduction-label">Normal Viewport</div>
          </div>

          {/* NEW DEEPFAKE INDICATOR BOX */}
          <div className={`deduction-box ${breakdown?.find(p => p.reason.includes('deepfake')) ? 'flagged' : 'passed'}`} style={{
            gridColumn: 'span 2',
            background: breakdown?.find(p => p.reason.includes('deepfake')) ? 'rgba(239, 68, 68, 0.15)' : undefined,
            border: breakdown?.find(p => p.reason.includes('deepfake')) ? '2px solid rgba(239, 68, 68, 0.5)' : undefined
          }}>
            <div className="deduction-icon" style={{ fontSize: '1.5rem' }}>
              {breakdown?.find(p => p.reason.includes('deepfake')) ? '🤖' : '✓'}
            </div>
            <div className="deduction-label" style={{ fontWeight: '700' }}>
              {breakdown?.find(p => p.reason.includes('deepfake')) ? 'AI DEEPFAKE DETECTED' : 'Real Human'}
            </div>
          </div>

          <div className={`deduction-box ${breakdown?.find(p => p.reason.includes('blink')) ? 'flagged' : 'passed'}`}>
            <div className="deduction-icon">{breakdown?.find(p => p.reason.includes('blink')) ? '⚠️' : '✓'}</div>
            <div className="deduction-label">Blink Pattern</div>
          </div>

          {/* NEW rPPG HEARTBEAT BOX */}
          <div className={`deduction-box ${breakdown?.find(p => p.reason.includes('heartbeat')) ? 'flagged' : 'passed'}`} style={{
            gridColumn: 'span 2',
            background: breakdown?.find(p => p.reason.includes('heartbeat')) ? 'rgba(239, 68, 68, 0.15)' : 'rgba(34, 197, 94, 0.1)',
            border: breakdown?.find(p => p.reason.includes('heartbeat')) ? '2px solid rgba(239, 68, 68, 0.5)' : '2px solid rgba(34, 197, 94, 0.3)'
          }}>
            <div className="deduction-icon" style={{ fontSize: '1.5rem' }}>
              {breakdown?.find(p => p.reason.includes('heartbeat')) ? '💔' : '❤️'}
            </div>
            <div className="deduction-label" style={{ fontWeight: '700' }}>
              {breakdown?.find(p => p.reason.includes('heartbeat')) ? 'NO HEARTBEAT - AI DETECTED' : 'Real Human Heartbeat'}
            </div>
          </div>

          <div className={`deduction-box ${breakdown?.find(p => p.reason.includes('rPPG')) ? 'flagged' : 'passed'}`}>
            <div className="deduction-icon">{breakdown?.find(p => p.reason.includes('rPPG')) ? '⚠️' : '✓'}</div>
            <div className="deduction-label">rPPG Quality</div>
          </div>
        </div>

        <div className="score-info" style={{ 
          padding: '0.875rem', 
          background: 'rgba(59, 130, 246, 0.05)', 
          borderRadius: '6px',
          fontSize: '0.8rem',
          color: '#9ca3af',
          lineHeight: '1.5',
          border: '1px solid rgba(59, 130, 246, 0.1)',
          marginBottom: '1rem'
        }}>
          <p style={{ margin: 0 }}>
            <strong style={{ color: '#d1d5db' }}>Scoring:</strong> Device (25%) • Deepfake (20%) • rPPG (20%) • Timing (20%) • Movement (15%)
          </p>
        </div>

        <button 
          className="evaluate-button"
          onClick={handleEvaluate}
          disabled={isEvaluating}
        >
          {isEvaluating ? '⏳ Evaluating...' : '🔍 Evaluate Trust Score'}
        </button>
      </div>
    );
  }

  // Default: show everything (shouldn't be used with new layout)
  return (
    <div className="score">
      <div className={`score-display ${getScoreClass()}`}>
        <div className="score-value">{score}</div>
        <div className="score-label">{getScoreLabel()}</div>
      </div>

      <div className="score-breakdown">
        <h3>Signal Status</h3>
        <div className="deduction-grid">
          {/* Same boxes as above */}
        </div>
      </div>

      <button 
        className="evaluate-button"
        onClick={handleEvaluate}
        disabled={isEvaluating}
      >
        {isEvaluating ? '⏳ Evaluating...' : '🔍 Evaluate Trust Score'}
      </button>

      <div className="score-info" style={{ 
        marginTop: '1rem', 
        padding: '0.875rem', 
        background: 'rgba(59, 130, 246, 0.05)', 
        borderRadius: '6px',
        fontSize: '0.8rem',
        color: '#9ca3af',
        lineHeight: '1.5',
        border: '1px solid rgba(59, 130, 246, 0.1)'
      }}>
        <p>
          <strong style={{ color: '#d1d5db' }}>Scoring:</strong> Device (25%) • Deepfake (20%) • rPPG (20%) • Timing (20%) • Movement (15%)
        </p>
      </div>
    </div>
  );
}

export default Score;