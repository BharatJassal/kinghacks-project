import { useEffect } from "react";
import { useWebcam } from "../hooks/webcam";

function WebCamFeed({ onStreamReady }) {
  const { videoRef, ready, stream, error } = useWebcam();

  // Notify parent when stream is ready
  useEffect(() => {
    if (stream && onStreamReady) {
      onStreamReady(stream);
    }
  }, [stream, onStreamReady]);

  if (error) {
    return (
      <div className="webcam-feed error">
        <div className="error-message">
          <p><strong>Camera Access Error</strong></p>
          <p>{error}</p>
          <p className="help-text">
            Please ensure camera permissions are granted and no other application is using the camera.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="webcam-feed">
      <div className="video-container">
        <video 
          ref={videoRef} 
          autoPlay 
          playsInline 
          muted 
          className={ready ? 'ready' : 'loading'}
        />
        {!ready && (
          <div className="loading-overlay">
            <p>Requesting camera access...</p>
            <p className="help-text">Please allow camera permissions in your browser</p>
          </div>
        )}
      </div>
      {ready && (
        <div className="stream-status">
          <span className="status-indicator active"></span>
          <span>Live Feed Active</span>
        </div>
      )}
    </div>
  );
}

export default WebCamFeed;