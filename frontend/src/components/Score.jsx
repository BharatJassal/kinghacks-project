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

      // Device signals (weight: 30%)
      if (signals.device.hasVirtualCamera) {
        totalScore -= 30;
        penalties.push({ reason: "Virtual camera detected", points: -30 });
      }
      if (signals.device.deviceCount === 0) {
        totalScore -= 20;
        penalties.push({ reason: "No cameras found", points: -20 });
      }

      // Timing signals (weight: 35%)
      if (signals.timing.anomalyDetected) {
        totalScore -= 25;
        penalties.push({ reason: "Frame timing anomaly", points: -25 });
      }
      if (signals.timing.jitter < 1) {
        totalScore -= 15;
        penalties.push({ reason: "Suspiciously perfect timing", points: -15 });
      } else if (signals.timing.jitter > 20) {
        totalScore -= 10;
        penalties.push({ reason: "High frame jitter", points: -10 });
      }

      // Landmark signals (weight: 35%)
      if (!signals.landmark.faceDetected) {
        totalScore -= 20;
        penalties.push({ reason: "No motion detected", points: -20 });
      }
      if (!signals.landmark.movementNatural) {
        totalScore -= 25;
        penalties.push({ reason: "Unnatural movement pattern", points: -25 });
      }
      if (signals.landmark.confidenceScore < 10) {
        totalScore -= 15;
        penalties.push({ reason: "Very low motion confidence", points: -15 });
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
    if (score >= 80) return 'high';
    if (score >= 60) return 'medium';
    if (score >= 40) return 'low';
    return 'critical';
  };

  const getScoreLabel = () => {
    if (score === null) return 'Calculating...';
    if (score >= 80) return 'High Trust';
    if (score >= 60) return 'Medium Trust';
    if (score >= 40) return 'Low Trust';
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
        <p>⏳ Collecting signals...</p>
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
          <h4>Trust Score Breakdown</h4>
          <ul>
            {breakdown.map((penalty, idx) => (
              <li key={idx} className="penalty-item">
                <span className="penalty-reason">{penalty.reason}</span>
                <span className="penalty-points">{penalty.points}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <button 
        className="evaluate-button"
        onClick={handleEvaluate}
        disabled={isEvaluating}
      >
        {isEvaluating ? '⏳ Evaluating...' : '🔍 Send to Backend for Evaluation'}
      </button>

      <div className="score-info">
        <p className="info-text">
          Trust score is calculated from device authenticity (30%), frame timing patterns (35%), and movement analysis (35%).
        </p>
      </div>
    </div>
  );
}

export default Score;