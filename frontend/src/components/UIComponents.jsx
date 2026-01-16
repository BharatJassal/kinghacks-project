// Status Badge Component
export const StatusBadge = ({ type, children }) => {
  const getClassName = () => {
    switch (type) {
      case 'success':
        return 'badge success';
      case 'warning':
        return 'badge warning';
      case 'error':
        return 'badge error';
      case 'info':
        return 'badge info';
      default:
        return 'badge';
    }
  };

  return <span className={getClassName()}>{children}</span>;
};

// Signal Indicator Component
export const SignalIndicator = ({ active = false }) => {
  return (
    <span className={`status-indicator ${active ? 'active' : ''}`} />
  );
};

// Card Component
export const Card = ({ children, className = '', hover = true }) => {
  return (
    <div className={`card ${className} ${hover ? 'card-hover' : ''}`}>
      {children}
    </div>
  );
};

// Metric Display Component
export const MetricDisplay = ({ label, value, status = 'neutral', unit = '' }) => {
  const getStatusClass = () => {
    switch (status) {
      case 'good':
      case 'success':
        return 'signal-value good';
      case 'warning':
        return 'signal-value warning';
      case 'bad':
      case 'error':
        return 'signal-value bad';
      default:
        return 'signal-value';
    }
  };

  return (
    <div className="signal-row">
      <span className="signal-label">{label}</span>
      <span className={getStatusClass()}>
        {value}{unit}
      </span>
    </div>
  );
};

// Loading Spinner Component
export const LoadingSpinner = ({ message = 'Loading...' }) => {
  return (
    <div className="loading-state">
      <div className="spinner" />
      {message && <p>{message}</p>}
    </div>
  );
};

// Progress Bar Component
export const ProgressBar = ({ value, max = 100, color = 'primary' }) => {
  const percentage = (value / max) * 100;
  
  const getColor = () => {
    switch (color) {
      case 'success':
        return 'var(--color-success)';
      case 'warning':
        return 'var(--color-warning)';
      case 'danger':
        return 'var(--color-danger)';
      case 'primary':
      default:
        return 'var(--color-accent-primary)';
    }
  };

  return (
    <div style={{
      width: '100%',
      height: '8px',
      background: 'var(--color-border)',
      borderRadius: 'var(--radius-sm)',
      overflow: 'hidden'
    }}>
      <div style={{
        width: `${percentage}%`,
        height: '100%',
        background: getColor(),
        transition: 'width var(--transition-base)',
        borderRadius: 'var(--radius-sm)'
      }} />
    </div>
  );
};

// Icon Component for consistent icon rendering
export const Icon = ({ name, size = 20, color = 'currentColor' }) => {
  const icons = {
    check: '✓',
    cross: '✗',
    warning: '⚠',
    info: 'ℹ',
    camera: '📷',
    heart: '❤',
    shield: '🛡',
    eye: '👁',
    lock: '🔒',
    unlock: '🔓',
  };

  return (
    <span style={{ fontSize: `${size}px`, color }}>
      {icons[name] || name}
    </span>
  );
};
