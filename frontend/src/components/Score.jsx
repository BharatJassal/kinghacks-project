import { useEffect, useState } from "react";

function Score({
  signals,
  onScoreCalculated,
  onEvaluate,
  isEvaluating,
  showOnlyScore,
  showOnlyBoxes,
}) {
  const [score, setScore] = useState(null);
  const [breakdown, setBreakdown] = useState(null);

  useEffect(() => {
    // Wait for all signal sources to have data
    if (
      !signals.device ||
      !signals.timing ||
      !signals.landmark ||
      !signals.environment
    ) {
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
      } else if (signals.timing.jitter > 25) {
        // Increased threshold from 20 to 25
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
      if (signals.landmark.confidenceScore < 5) {
        // Reduced threshold from 10 to 5
        totalScore -= 10;
        penalties.push({ reason: "Very low motion confidence", points: -10 });
      }

      // AI deepfake signals (optional, suggested weight: 40% equivalent cap)
      if (signals.ai?.modelReady) {
        if (!signals.ai.faceDetected) {
          totalScore -= 10;
          penalties.push({ reason: "AI model: no face detected", points: -10 });
        } else if (signals.ai.pFakeSmoothed != null) {
          const pFake = signals.ai.pFakeSmoothed; // 0..1
          // Convert pFake into a penalty up to 40 points
          const aiPenalty = Math.round(pFake * 40);

          if (aiPenalty > 0) {
            totalScore -= aiPenalty;
            penalties.push({
              reason: `AI deepfake risk detected (${Math.round(
                pFake * 100
              )}% risk)`,
              points: -aiPenalty,
            });
          }
        }

        // Optional: screen recapture flag lowers confidence
        if (signals.ai.flags?.includes("possible_screen_capture")) {
          totalScore -= 8;
          penalties.push({
            reason: "Possible screen re-capture (filming a display)",
            points: -8,
          });
        }
      } else if (signals.ai) {
        // ai object exists but model not ready yet
        penalties.push({
          reason: "AI model loading (not included yet)",
          points: 0,
        });
      }

      // Environment signals (weight: 20%)
      if (signals.environment.isHeadless) {
        totalScore -= 20;
        penalties.push({ reason: "Headless browser detected", points: -20 });
      }
      if (signals.environment.hasAutomationTools) {
        totalScore -= 15;
        penalties.push({ reason: "Automation tools detected", points: -15 });
      }
      if (signals.environment.suspiciousViewport) {
        totalScore -= 8;
        penalties.push({ reason: "Suspicious viewport size", points: -8 });
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
          ai: signals.ai || null,
        },
        timestamp: new Date().toISOString(),
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
    if (score === null) return "unknown";
    if (score >= 75) return "high";
    if (score >= 55) return "medium";
    if (score >= 35) return "low";
    return "critical";
  };

  const getScoreLabel = () => {
    if (score === null) return "Calculating...";
    if (score >= 75) return "High Trust";
    if (score >= 55) return "Medium Trust";
    if (score >= 35) return "Low Trust";
    return "Critical - Do Not Trust";
  };

  const handleEvaluate = () => {
    if (score !== null && onEvaluate) {
      onEvaluate({
        score,
        breakdown,
        signals: signals,
        timestamp: new Date().toISOString(),
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
        <div className="deduction-grid" style={{ marginBottom: "1.25rem" }}>
          {/* All possible deductions as boxes */}
          <div
            className={`deduction-box ${
              breakdown?.find((p) => p.reason.includes("virtual"))
                ? "flagged"
                : "passed"
            }`}
          >
            <div className="deduction-icon">
              {breakdown?.find((p) => p.reason.includes("virtual"))
                ? "⚠️"
                : "✓"}
            </div>
            <div className="deduction-label">Virtual Camera</div>
          </div>

          <div
            className={`deduction-box ${
              breakdown?.find((p) => p.reason.includes("No cameras"))
                ? "flagged"
                : "passed"
            }`}
          >
            <div className="deduction-icon">
              {breakdown?.find((p) => p.reason.includes("No cameras"))
                ? "⚠️"
                : "✓"}
            </div>
            <div className="deduction-label">Camera Present</div>
          </div>

          <div
            className={`deduction-box ${
              breakdown?.find((p) => p.reason.includes("timing"))
                ? "flagged"
                : "passed"
            }`}
          >
            <div className="deduction-icon">
              {breakdown?.find((p) => p.reason.includes("timing")) ? "⚠️" : "✓"}
            </div>
            <div className="deduction-label">Frame Timing</div>
          </div>

          <div
            className={`deduction-box ${
              breakdown?.find((p) => p.reason.includes("jitter"))
                ? "flagged"
                : "passed"
            }`}
          >
            <div className="deduction-icon">
              {breakdown?.find((p) => p.reason.includes("jitter")) ? "⚠️" : "✓"}
            </div>
            <div className="deduction-label">Frame Jitter</div>
          </div>

          <div
            className={`deduction-box ${
              breakdown?.find((p) => p.reason.includes("motion detected"))
                ? "flagged"
                : "passed"
            }`}
          >
            <div className="deduction-icon">
              {breakdown?.find((p) => p.reason.includes("motion detected"))
                ? "⚠️"
                : "✓"}
            </div>
            <div className="deduction-label">Motion Detected</div>
          </div>

          <div
            className={`deduction-box ${
              breakdown?.find((p) => p.reason.includes("movement pattern"))
                ? "flagged"
                : "passed"
            }`}
          >
            <div className="deduction-icon">
              {breakdown?.find((p) => p.reason.includes("movement pattern"))
                ? "⚠️"
                : "✓"}
            </div>
            <div className="deduction-label">Natural Movement</div>
          </div>

          <div
            className={`deduction-box ${
              breakdown?.find((p) => p.reason.includes("confidence"))
                ? "flagged"
                : "passed"
            }`}
          >
            <div className="deduction-icon">
              {breakdown?.find((p) => p.reason.includes("confidence"))
                ? "⚠️"
                : "✓"}
            </div>
            <div className="deduction-label">Motion Quality</div>
          </div>

          <div
            className={`deduction-box ${
              breakdown?.find((p) => p.reason.includes("Headless"))
                ? "flagged"
                : "passed"
            }`}
          >
            <div className="deduction-icon">
              {breakdown?.find((p) => p.reason.includes("Headless"))
                ? "⚠️"
                : "✓"}
            </div>
            <div className="deduction-label">Real Browser</div>
          </div>

          <div
            className={`deduction-box ${
              breakdown?.find((p) => p.reason.includes("Automation"))
                ? "flagged"
                : "passed"
            }`}
          >
            <div className="deduction-icon">
              {breakdown?.find((p) => p.reason.includes("Automation"))
                ? "⚠️"
                : "✓"}
            </div>
            <div className="deduction-label">No Automation</div>
          </div>

          <div
            className={`deduction-box ${
              breakdown?.find((p) => p.reason.includes("viewport"))
                ? "flagged"
                : "passed"
            }`}
          >
            <div className="deduction-icon">
              {breakdown?.find((p) => p.reason.includes("viewport"))
                ? "⚠️"
                : "✓"}
            </div>
            <div className="deduction-label">Normal Viewport</div>
          </div>
        </div>

        <div
          className="score-info"
          style={{
            padding: "0.875rem",
            background: "rgba(59, 130, 246, 0.05)",
            borderRadius: "6px",
            fontSize: "0.8rem",
            color: "#9ca3af",
            lineHeight: "1.5",
            border: "1px solid rgba(59, 130, 246, 0.1)",
            marginBottom: "1rem",
          }}
        >
          <p style={{ margin: 0 }}>
            <strong style={{ color: "#d1d5db" }}>Scoring:</strong> Device (35%)
            • Timing (25%) • Movement (20%) • Environment (20%)
          </p>
        </div>

        <button
          className="evaluate-button"
          onClick={handleEvaluate}
          disabled={isEvaluating}
        >
          {isEvaluating ? "⏳ Evaluating..." : "🔍 Evaluate Trust Score"}
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
          {/* All possible deductions as boxes */}
          <div
            className={`deduction-box ${
              breakdown?.find((p) => p.reason.includes("virtual"))
                ? "flagged"
                : "passed"
            }`}
          >
            <div className="deduction-icon">
              {breakdown?.find((p) => p.reason.includes("virtual"))
                ? "⚠️"
                : "✓"}
            </div>
            <div className="deduction-label">Virtual Camera</div>
          </div>

          <div
            className={`deduction-box ${
              breakdown?.find((p) => p.reason.includes("No cameras"))
                ? "flagged"
                : "passed"
            }`}
          >
            <div className="deduction-icon">
              {breakdown?.find((p) => p.reason.includes("No cameras"))
                ? "⚠️"
                : "✓"}
            </div>
            <div className="deduction-label">Camera Present</div>
          </div>

          <div
            className={`deduction-box ${
              breakdown?.find((p) => p.reason.includes("timing"))
                ? "flagged"
                : "passed"
            }`}
          >
            <div className="deduction-icon">
              {breakdown?.find((p) => p.reason.includes("timing")) ? "⚠️" : "✓"}
            </div>
            <div className="deduction-label">Frame Timing</div>
          </div>

          <div
            className={`deduction-box ${
              breakdown?.find((p) => p.reason.includes("jitter"))
                ? "flagged"
                : "passed"
            }`}
          >
            <div className="deduction-icon">
              {breakdown?.find((p) => p.reason.includes("jitter")) ? "⚠️" : "✓"}
            </div>
            <div className="deduction-label">Frame Jitter</div>
          </div>

          <div
            className={`deduction-box ${
              breakdown?.find((p) => p.reason.includes("motion detected"))
                ? "flagged"
                : "passed"
            }`}
          >
            <div className="deduction-icon">
              {breakdown?.find((p) => p.reason.includes("motion detected"))
                ? "⚠️"
                : "✓"}
            </div>
            <div className="deduction-label">Motion Detected</div>
          </div>

          <div
            className={`deduction-box ${
              breakdown?.find((p) => p.reason.includes("movement pattern"))
                ? "flagged"
                : "passed"
            }`}
          >
            <div className="deduction-icon">
              {breakdown?.find((p) => p.reason.includes("movement pattern"))
                ? "⚠️"
                : "✓"}
            </div>
            <div className="deduction-label">Natural Movement</div>
          </div>

          <div
            className={`deduction-box ${
              breakdown?.find((p) => p.reason.includes("confidence"))
                ? "flagged"
                : "passed"
            }`}
          >
            <div className="deduction-icon">
              {breakdown?.find((p) => p.reason.includes("confidence"))
                ? "⚠️"
                : "✓"}
            </div>
            <div className="deduction-label">Motion Quality</div>
          </div>

          <div
            className={`deduction-box ${
              breakdown?.find((p) => p.reason.includes("Headless"))
                ? "flagged"
                : "passed"
            }`}
          >
            <div className="deduction-icon">
              {breakdown?.find((p) => p.reason.includes("Headless"))
                ? "⚠️"
                : "✓"}
            </div>
            <div className="deduction-label">Real Browser</div>
          </div>

          <div
            className={`deduction-box ${
              breakdown?.find((p) => p.reason.includes("Automation"))
                ? "flagged"
                : "passed"
            }`}
          >
            <div className="deduction-icon">
              {breakdown?.find((p) => p.reason.includes("Automation"))
                ? "⚠️"
                : "✓"}
            </div>
            <div className="deduction-label">No Automation</div>
          </div>

          <div
            className={`deduction-box ${
              breakdown?.find((p) => p.reason.includes("viewport"))
                ? "flagged"
                : "passed"
            }`}
          >
            <div className="deduction-icon">
              {breakdown?.find((p) => p.reason.includes("viewport"))
                ? "⚠️"
                : "✓"}
            </div>
            <div className="deduction-label">Normal Viewport</div>
          </div>
        </div>
      </div>

      <button
        className="evaluate-button"
        onClick={handleEvaluate}
        disabled={isEvaluating}
      >
        {isEvaluating ? "⏳ Evaluating..." : "🔍 Evaluate Trust Score"}
      </button>

      <div
        className="score-info"
        style={{
          marginTop: "1rem",
          padding: "0.875rem",
          background: "rgba(59, 130, 246, 0.05)",
          borderRadius: "6px",
          fontSize: "0.8rem",
          color: "#9ca3af",
          lineHeight: "1.5",
          border: "1px solid rgba(59, 130, 246, 0.1)",
        }}
      >
        <p>
          <strong style={{ color: "#d1d5db" }}>Scoring:</strong> Device (35%) •
          Timing (25%) • Movement (20%) • Environment (20%)
        </p>
      </div>
    </div>
  );
}

export default Score;
