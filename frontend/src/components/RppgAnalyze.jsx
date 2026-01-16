import { useEffect, useState, useRef } from "react";

export default function RppgAnalyze({ stream, onSignalsUpdate }) {
  const [rppgData, setRppgData] = useState({
    heartRate: 0,
    heartRateVariability: 0,
    signalQuality: 0,
    signalStrength: 0,
    heartbeatDetected: false,
    isPhysiological: true,
    confidence: 0,
    sampleCount: 0,
    isAnalyzing: false,
    error: null
  });

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const animationFrameRef = useRef(null);
  const signalBufferRef = useRef([]);
  const peakTimesRef = useRef([]);
  const fftBufferRef = useRef([]);

  useEffect(() => {
    if (!stream) {
      setRppgData(prev => ({ ...prev, isAnalyzing: false }));
      return;
    }

    const video = document.createElement('video');
    video.srcObject = stream;
    video.autoplay = true;
    video.playsInline = true;
    videoRef.current = video;

    const canvas = document.createElement('canvas');
    canvasRef.current = canvas;

    setRppgData(prev => ({ ...prev, isAnalyzing: true, error: null }));

    let frameCount = 0;
    const BUFFER_SIZE = 256; // ~8.5 seconds at 30fps
    const SAMPLING_RATE = 30; // Expected FPS

    function analyzeRppg() {
      if (!videoRef.current || videoRef.current.readyState < 2) {
        animationFrameRef.current = requestAnimationFrame(analyzeRppg);
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

      try {
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        
        // Extract color signal from face region (forehead/cheeks are best)
        const faceRegion = {
          x: Math.floor(canvas.width * 0.3),
          y: Math.floor(canvas.height * 0.25),
          w: Math.floor(canvas.width * 0.4),
          h: Math.floor(canvas.height * 0.2)
        };

        // Calculate average RGB values in face region
        let rSum = 0, gSum = 0, bSum = 0, count = 0;

        for (let y = faceRegion.y; y < faceRegion.y + faceRegion.h; y += 2) {
          for (let x = faceRegion.x; x < faceRegion.x + faceRegion.w; x += 2) {
            const i = (y * canvas.width + x) * 4;
            rSum += imageData.data[i];
            gSum += imageData.data[i + 1];
            bSum += imageData.data[i + 2];
            count++;
          }
        }

        const avgR = rSum / count;
        const avgG = gSum / count;
        const avgB = bSum / count;

        // Green channel is most sensitive to blood volume changes
        // Store the signal value
        signalBufferRef.current.push(avgG);

        // Keep buffer at fixed size
        if (signalBufferRef.current.length > BUFFER_SIZE) {
          signalBufferRef.current.shift();
        }

        // Need enough samples before analysis
        if (signalBufferRef.current.length >= 90 && frameCount % 10 === 0) {
          // Apply detrending to remove slow baseline variations
          const signal = detrend(signalBufferRef.current);
          
          // Apply bandpass filter (0.7-4 Hz = 42-240 BPM)
          const filteredSignal = bandpassFilter(signal, SAMPLING_RATE, 0.7, 4.0);
          
          // Detect peaks (heartbeats)
          const peaks = findPeaks(filteredSignal);
          
          if (peaks.length >= 2) {
            // Calculate inter-beat intervals (IBI)
            const ibis = [];
            for (let i = 1; i < peaks.length; i++) {
              const ibi = (peaks[i] - peaks[i - 1]) / SAMPLING_RATE * 1000; // ms
              ibis.push(ibi);
            }

            // Calculate heart rate from average IBI
            const avgIbi = ibis.reduce((a, b) => a + b, 0) / ibis.length;
            const heartRate = Math.round(60000 / avgIbi);

            // Calculate HRV (SDNN - standard deviation of IBIs)
            const mean = avgIbi;
            const variance = ibis.reduce((sum, ibi) => sum + Math.pow(ibi - mean, 2), 0) / ibis.length;
            const hrv = Math.round(Math.sqrt(variance));

            // Calculate signal quality metrics
            const signalStrength = calculateSignalStrength(filteredSignal);
            const signalQuality = calculateSignalQuality(signal, peaks);

            // Determine if signal is physiologically plausible
            const isPhysiological = 
              heartRate >= 45 && heartRate <= 180 && // Normal human range
              hrv >= 10 && hrv <= 200 && // Normal HRV range
              signalQuality > 30; // Minimum quality threshold

            // Calculate confidence based on signal quality and physiological plausibility
            let confidence = signalQuality;
            if (!isPhysiological) confidence *= 0.5;
            if (heartRate < 50 || heartRate > 150) confidence *= 0.7;

            // Store peak times for display
            const currentTime = Date.now();
            peakTimesRef.current = peaks.slice(-10).map(() => currentTime);

            const newRppgData = {
              heartRate: isPhysiological ? heartRate : 0,
              heartRateVariability: isPhysiological ? hrv : 0,
              signalQuality: Math.round(signalQuality),
              signalStrength: Math.round(signalStrength * 100),
              heartbeatDetected: peaks.length > 0 && isPhysiological,
              isPhysiological,
              confidence: Math.round(confidence),
              sampleCount: signalBufferRef.current.length,
              isAnalyzing: true,
              error: null
            };

            setRppgData(newRppgData);

            if (onSignalsUpdate) {
              onSignalsUpdate({
                heartRate: newRppgData.heartRate,
                hrv: newRppgData.heartRateVariability,
                heartbeatDetected: newRppgData.heartbeatDetected,
                isPhysiological: newRppgData.isPhysiological,
                signalQuality: newRppgData.signalQuality,
                confidence: newRppgData.confidence,
                noHeartbeat: !newRppgData.heartbeatDetected || !newRppgData.isPhysiological
              });
            }
          }
        }

      } catch (error) {
        console.error('rPPG analysis error:', error);
        setRppgData(prev => ({
          ...prev,
          error: error.message,
          isAnalyzing: false
        }));
      }

      animationFrameRef.current = requestAnimationFrame(analyzeRppg);
    }

    video.addEventListener('loadeddata', () => {
      analyzeRppg();
    });

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (videoRef.current) {
        videoRef.current.pause();
        videoRef.current.srcObject = null;
      }
      signalBufferRef.current = [];
      peakTimesRef.current = [];
      fftBufferRef.current = [];
    };
  }, [stream, onSignalsUpdate]);

  // ============ SIGNAL PROCESSING FUNCTIONS ============

  function detrend(signal) {
    // Remove linear trend
    const n = signal.length;
    let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0;
    
    for (let i = 0; i < n; i++) {
      sumX += i;
      sumY += signal[i];
      sumXY += i * signal[i];
      sumXX += i * i;
    }
    
    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;
    
    return signal.map((val, i) => val - (slope * i + intercept));
  }

  function bandpassFilter(signal, fs, lowcut, highcut) {
    // Simple moving average bandpass approximation
    const windowSize = Math.floor(fs / highcut);
    const result = [];
    
    for (let i = 0; i < signal.length; i++) {
      let sum = 0;
      let count = 0;
      
      for (let j = Math.max(0, i - windowSize); j <= Math.min(signal.length - 1, i + windowSize); j++) {
        sum += signal[j];
        count++;
      }
      
      result.push(signal[i] - sum / count);
    }
    
    return result;
  }

  function findPeaks(signal) {
    const peaks = [];
    const threshold = calculateThreshold(signal);
    
    for (let i = 1; i < signal.length - 1; i++) {
      if (signal[i] > signal[i - 1] && 
          signal[i] > signal[i + 1] && 
          signal[i] > threshold) {
        // Ensure minimum distance between peaks (0.4s = 150 BPM max)
        if (peaks.length === 0 || i - peaks[peaks.length - 1] > 12) {
          peaks.push(i);
        }
      }
    }
    
    return peaks;
  }

  function calculateThreshold(signal) {
    // Use median + standard deviation for adaptive threshold
    const sorted = [...signal].sort((a, b) => a - b);
    const median = sorted[Math.floor(sorted.length / 2)];
    
    const variance = signal.reduce((sum, val) => sum + Math.pow(val - median, 2), 0) / signal.length;
    const stdDev = Math.sqrt(variance);
    
    return median + stdDev * 0.5;
  }

  function calculateSignalStrength(signal) {
    // Calculate signal-to-noise ratio approximation
    const mean = signal.reduce((a, b) => a + b, 0) / signal.length;
    const variance = signal.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / signal.length;
    const stdDev = Math.sqrt(variance);
    
    // Normalize to 0-1 range
    return Math.min(1, stdDev / 10);
  }

  function calculateSignalQuality(signal, peaks) {
    if (peaks.length < 2) return 0;
    
    // Quality based on: signal variance, peak regularity, and peak count
    const variance = signal.reduce((sum, val, i) => {
      if (i === 0) return 0;
      return sum + Math.pow(signal[i] - signal[i - 1], 2);
    }, 0) / signal.length;
    
    // Check peak regularity
    const ibis = [];
    for (let i = 1; i < peaks.length; i++) {
      ibis.push(peaks[i] - peaks[i - 1]);
    }
    
    const avgIbi = ibis.reduce((a, b) => a + b, 0) / ibis.length;
    const ibiVariance = ibis.reduce((sum, ibi) => sum + Math.pow(ibi - avgIbi, 2), 0) / ibis.length;
    const regularity = 100 / (1 + ibiVariance / avgIbi);
    
    // Combine metrics
    const peakScore = Math.min(100, peaks.length * 5);
    const quality = (regularity * 0.6) + (peakScore * 0.4);
    
    return Math.min(100, quality);
  }

  // ============ RENDER ============

  if (!stream || !rppgData.isAnalyzing) {
    return (
      <div className="rppg-analyze idle">
        <p>Waiting for video stream...</p>
      </div>
    );
  }

  if (rppgData.error) {
    return (
      <div className="rppg-analyze error">
        <p>Analysis Error: {rppgData.error}</p>
      </div>
    );
  }

  // Waiting for enough samples
  if (rppgData.sampleCount < 90) {
    return (
      <div className="rppg-analyze">
        <div className="signal-card">
          <div style={{ textAlign: 'center', padding: '2rem' }}>
            <div className="spinner" style={{ margin: '0 auto 1rem' }}></div>
            <p style={{ color: '#9ca3af', fontSize: '0.875rem' }}>
              Collecting samples... {rppgData.sampleCount}/90
            </p>
            <p style={{ color: '#6b7280', fontSize: '0.75rem', marginTop: '0.5rem' }}>
              Keep your face visible and well-lit
            </p>
          </div>
        </div>
      </div>
    );
  }

  const getHeartRateClass = () => {
    if (!rppgData.heartbeatDetected) return 'bad';
    if (rppgData.heartRate < 50 || rppgData.heartRate > 150) return 'warning';
    return 'good';
  };

  return (
    <div className="rppg-analyze">
      {/* HEART RATE DISPLAY */}
      <div className="signal-card" style={{ 
        background: !rppgData.heartbeatDetected ? 'rgba(239, 68, 68, 0.15)' : 'rgba(34, 197, 94, 0.1)',
        border: !rppgData.heartbeatDetected ? '2px solid rgba(239, 68, 68, 0.5)' : '2px solid rgba(34, 197, 94, 0.3)',
        marginBottom: '1rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ flex: 1 }}>
            <div style={{ 
              fontSize: '3rem', 
              fontWeight: '700',
              color: !rppgData.heartbeatDetected ? '#f87171' : '#22c55e',
              lineHeight: 1
            }}>
              {rppgData.heartRate || '--'}
            </div>
            <div style={{ 
              fontSize: '0.875rem',
              color: '#9ca3af',
              marginTop: '0.25rem'
            }}>
              BPM
            </div>
          </div>
          
          <div style={{ 
            fontSize: '3rem',
            animation: rppgData.heartbeatDetected ? 'pulse 1s ease-in-out infinite' : 'none'
          }}>
            {rppgData.heartbeatDetected ? 'HR' : 'NO'}
          </div>
        </div>

        <div style={{ 
          marginTop: '1rem',
          paddingTop: '1rem',
          borderTop: '1px solid rgba(75, 85, 99, 0.3)',
          fontSize: '0.875rem',
          fontWeight: '600',
          color: !rppgData.heartbeatDetected ? '#fca5a5' : '#86efac'
        }}>
          {!rppgData.heartbeatDetected ? 'NO HEARTBEAT DETECTED' : 
           !rppgData.isPhysiological ? 'ABNORMAL SIGNAL' :
           'HEARTBEAT DETECTED'}
        </div>
      </div>

      {/* DETAILED METRICS */}
      <div className="signal-card">
        <div style={{ fontWeight: '600', marginBottom: '0.75rem', color: '#ec4899', fontSize: '0.875rem' }}>
          rPPG Metrics
        </div>

        <div className="signal-row">
          <span className="signal-label">Heart Rate</span>
          <span className={`signal-value ${getHeartRateClass()}`}>
            {rppgData.heartRate || '--'} BPM
          </span>
        </div>

        <div className="signal-row">
          <span className="signal-label">HRV (SDNN)</span>
          <span className={`signal-value ${rppgData.heartRateVariability > 0 ? 'good' : 'bad'}`}>
            {rppgData.heartRateVariability || '--'} ms
          </span>
        </div>

        <div className="signal-row">
          <span className="signal-label">Signal Quality</span>
          <span className={`signal-value ${rppgData.signalQuality > 60 ? 'good' : rppgData.signalQuality > 30 ? 'warning' : 'bad'}`}>
            {rppgData.signalQuality}%
          </span>
        </div>

        <div className="signal-row">
          <span className="signal-label">Signal Strength</span>
          <span className={`signal-value ${rppgData.signalStrength > 40 ? 'good' : 'warning'}`}>
            {rppgData.signalStrength}%
          </span>
        </div>

        <div className="signal-row">
          <span className="signal-label">Confidence</span>
          <span className={`signal-value ${rppgData.confidence > 60 ? 'good' : rppgData.confidence > 40 ? 'warning' : 'bad'}`}>
            {rppgData.confidence}%
          </span>
        </div>

        <div className="signal-row">
          <span className="signal-label">Physiological</span>
          <span className={`signal-value ${rppgData.isPhysiological ? 'good' : 'bad'}`}>
            {rppgData.isPhysiological ? 'Yes' : 'No'}
          </span>
        </div>
      </div>

      {!rppgData.heartbeatDetected && (
        <div style={{ 
          marginTop: '1rem', 
          padding: '1rem', 
          background: 'rgba(239, 68, 68, 0.1)', 
          borderRadius: '6px', 
          border: '1px solid rgba(239, 68, 68, 0.2)' 
        }}>
          <div style={{ color: '#fca5a5', fontWeight: '600', marginBottom: '0.5rem', fontSize: '0.875rem' }}>
            No Heartbeat Detected
          </div>
          <div style={{ fontSize: '0.8rem', color: '#9ca3af', lineHeight: '1.5' }}>
            This may indicate:
            <ul style={{ margin: '0.5rem 0 0 1.25rem', padding: 0 }}>
              <li>AI-generated face (no blood flow)</li>
              <li>Pre-recorded video</li>
              <li>Poor lighting conditions</li>
              <li>Face too far from camera</li>
            </ul>
          </div>
        </div>
      )}

      <div className="help-text" style={{ marginTop: '1rem', fontSize: '0.8rem', lineHeight: '1.5' }}>
        rPPG detects subtle color changes in skin caused by blood flow. AI-generated faces lack real circulation.
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.1); opacity: 0.8; }
        }
      `}</style>
    </div>
  );
}