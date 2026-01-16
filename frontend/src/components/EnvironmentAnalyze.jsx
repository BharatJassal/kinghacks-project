import { useEffect, useState } from "react";

export default function EnvironmentAnalyze({ onSignalsUpdate }) {
  const [envData, setEnvData] = useState({
    isHeadless: false,
    hasAutomationTools: false,
    screenResolution: { width: 0, height: 0 },
    userAgent: '',
    webDriverDetected: false,
    isAnalyzing: false
  });

  useEffect(() => {
    const analyzeEnvironment = () => {
      // Check for headless browser
      const isHeadless = 
        navigator.webdriver === true ||
        !navigator.plugins?.length ||
        !navigator.languages?.length;

      // Check for automation tools
      const hasAutomationTools = 
        window.navigator.webdriver ||
        window.document.__selenium_unwrapped ||
        window.document.__webdriver_evaluate ||
        window.document.__driver_evaluate ||
        window.callPhantom ||
        window._phantom ||
        window.Cypress;

      // Get screen resolution
      const screenResolution = {
        width: window.screen.width,
        height: window.screen.height
      };

      // Check if viewport is suspiciously small or exact common bot sizes
      const suspiciousViewport = 
        (window.innerWidth === 800 && window.innerHeight === 600) || // Common headless size
        (window.innerWidth === 1024 && window.innerHeight === 768) || // Another common size
        window.innerWidth < 800 || 
        window.innerHeight < 600;

      // Check for WebDriver
      const webDriverDetected = navigator.webdriver === true;

      // Check user agent
      const userAgent = navigator.userAgent;
      const suspiciousUA = 
        userAgent.includes('HeadlessChrome') ||
        userAgent.includes('PhantomJS') ||
        userAgent.includes('Selenium');

      const newEnvData = {
        isHeadless: isHeadless || suspiciousUA,
        hasAutomationTools: hasAutomationTools || webDriverDetected,
        screenResolution,
        suspiciousViewport,
        userAgent: userAgent.substring(0, 50) + '...', // Truncate for display
        webDriverDetected,
        isAnalyzing: true
      };

      setEnvData(newEnvData);

      // Send signals to parent
      if (onSignalsUpdate) {
        onSignalsUpdate({
          isHeadless: newEnvData.isHeadless,
          hasAutomationTools: newEnvData.hasAutomationTools,
          suspiciousViewport: newEnvData.suspiciousViewport,
          webDriverDetected: newEnvData.webDriverDetected
        });
      }
    };

    analyzeEnvironment();

    // Re-check on window resize
    window.addEventListener('resize', analyzeEnvironment);

    return () => {
      window.removeEventListener('resize', analyzeEnvironment);
    };
  }, [onSignalsUpdate]);

  if (!envData.isAnalyzing) {
    return (
      <div className="environment-analyze idle">
        <p>Initializing environment check...</p>
      </div>
    );
  }

  return (
    <div className="environment-analyze">
      <div className="signal-card">
        <div className="signal-row">
          <span className="signal-label">Headless Browser</span>
          <span className={`signal-value ${envData.isHeadless ? 'bad' : 'good'}`}>
            {envData.isHeadless ? 'Detected' : 'None'}
          </span>
        </div>

        <div className="signal-row">
          <span className="signal-label">Automation Tools</span>
          <span className={`signal-value ${envData.hasAutomationTools ? 'bad' : 'good'}`}>
            {envData.hasAutomationTools ? 'Detected' : 'None'}
          </span>
        </div>

        <div className="signal-row">
          <span className="signal-label">Screen Size</span>
          <span className={`signal-value ${envData.suspiciousViewport ? 'warning' : 'good'}`}>
            {envData.screenResolution.width}×{envData.screenResolution.height}
          </span>
        </div>

        <div className="signal-row">
          <span className="signal-label">WebDriver</span>
          <span className={`signal-value ${envData.webDriverDetected ? 'bad' : 'good'}`}>
            {envData.webDriverDetected ? 'Active' : 'Inactive'}
          </span>
        </div>
      </div>

      {(envData.isHeadless || envData.hasAutomationTools) && (
        <div style={{ 
          marginTop: '1rem', 
          padding: '1rem', 
          background: 'rgba(239, 68, 68, 0.1)', 
          borderRadius: '6px', 
          border: '1px solid rgba(239, 68, 68, 0.2)' 
        }}>
          <div style={{ color: '#fca5a5', fontWeight: '600', marginBottom: '0.25rem', fontSize: '0.875rem' }}>
            Suspicious Environment
          </div>
          <div style={{ fontSize: '0.8rem', color: '#9ca3af' }}>
            Automation or headless browser detected
          </div>
        </div>
      )}

      <div className="help-text" style={{ marginTop: '1rem', fontSize: '0.8rem', lineHeight: '1.5' }}>
        Checks for automation tools & bot indicators
      </div>
    </div>
  );
}
