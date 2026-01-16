import { useEffect, useState } from "react";

function Score({ signals, onScoreCalculated, onEvaluate, isEvaluating }) {
  const [score, setScore] = useState(null);
  const [breakdown, setBreakdown] = useState(null);

  useEffect(() => {
    // Wait for all signal sources to have data
    if (!signals.device || !signals.timing || !signals.landmark) {
      return;
    }

    // Deterministic trust scoring algorithm
    const calculateScore = () => {
      let totalScore = 100;
      const penalties = [];

      // Device signals (weight: 35%)
      if (signals.device.hasVirtualCamera) {
        totalScore -= 35;
        penalties.push({ reason: "Active camera is virtual", points: -35 });
      }
      if (signals.device.deviceCount === 0) {
        totalScore -= 15;
        penalties.push({ reason: "No cameras found", points: -15 });
      }

      // Timing signals (weight: 25% - reduced from 35%)
      if (signals.timing.anomalyDetected) {
        totalScore -= 15;
        penalties.push({ reason: "Frame timing anomaly", points: -15 });
      }
      if (signals.timing.jitter < 1) {
        totalScore -= 10;
        penalties.push({ reason: "Suspiciously perfect timing", points: -10 });
      } else if (signals.timing.jitter > 25) { // Increased threshold from 20 to 25
        totalScore -= 8;
        penalties.push({ reason: "High frame jitter", points: -8 });
      }

      // Landmark signals (weight: 20% - reduced from 35%)
      if (!signals.landmark.faceDetected) {
        totalScore -= 10;
        penalties.push({ reason: "No motion detected", points: -10 });
      }
      if (!signals.landmark.movementNatural) {
        totalScore -= 15;
        penalties.push({ reason: "Unnatural movement pattern", points: -15 });
      }
      if (signals.landmark.confidenceScore < 5) { // Reduced threshold from 10 to 5
        totalScore -= 10;
        penalties.push({ reason: "Very low motion confidence", points: -10 });
      }

      // Ensure score doesn't go negative
      totalScore = Math.max(0, totalScore);

      const scoreData = {
        score: totalScore,
        breakdown: penalties,
        signals: {
          device: signals.device,
          timing: signals.timing,
          landmark: signals.landmark
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

  return (
    <div className="score">
      <div className={`score-display ${getScoreClass()}`}>
        <div className="score-value">{score}</div>
        <div className="score-label">{getScoreLabel()}</div>
      </div>

      {breakdown && breakdown.length > 0 && (
        <div className="score-breakdown">
          <h3>Deductions</h3>
          {breakdown.map((penalty, idx) => (
            <div key={idx} className="penalty-item">
              <span className="reason">{penalty.reason}</span>
              <span className="points">{penalty.points}</span>
            </div>
          ))}
        </div>
      )}

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
          <strong style={{ color: '#d1d5db' }}>Scoring:</strong> Device (30%) • Timing (35%) • Movement (35%)
        </p>
      </div>
    </div>
  );
}

export default Score;