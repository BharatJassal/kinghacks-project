import { useEffect, useState } from "react";
import { detectVirtualCamera } from "../utils/detectVirt";

export default function DeviceInspect({ stream, onSignalsUpdate }) {
  const [deviceInfo, setDeviceInfo] = useState({
    devices: [],
    activeCamera: null,
    hasVirtualCamera: false,
    deviceCount: 0,
    deviceLabels: [],
    isLoading: true,
    error: null
  });

  useEffect(() => {
    let mounted = true;

    async function inspectDevices() {
      try {
        // Enumerate all media devices
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoInputs = devices.filter(d => d.kind === "videoinput");

        if (!mounted) return;

        // Check each camera for virtual camera signatures
        const virtualCameras = videoInputs.filter(cam => 
          detectVirtualCamera(cam.label)
        );

        // Find the active camera from the stream
        let activeCamera = null;
        let activeDeviceIsVirtual = false;
        if (stream) {
          const tracks = stream.getVideoTracks();
          if (tracks.length > 0) {
            const activeLabel = tracks[0].label;
            activeCamera = videoInputs.find(d => d.label === activeLabel);
            // Check if the ACTIVE camera is virtual
            if (activeCamera) {
              activeDeviceIsVirtual = detectVirtualCamera(activeCamera.label);
            }
          }
        }

        const info = {
          devices: videoInputs,
          activeCamera: activeCamera,
          hasVirtualCamera: activeDeviceIsVirtual, // Changed: only true if active camera is virtual
          deviceCount: videoInputs.length,
          deviceLabels: videoInputs.map(d => d.label),
          isLoading: false,
          error: null
        };

        setDeviceInfo(info);

        // Send signals to parent Dashboard
        if (onSignalsUpdate) {
          onSignalsUpdate({
            hasVirtualCamera: activeDeviceIsVirtual, // Changed: only check active camera
            deviceCount: info.deviceCount,
            deviceLabels: info.deviceLabels,
            activeDeviceIsVirtual: activeDeviceIsVirtual
          });
        }

      } catch (error) {
        console.error("Device inspection failed:", error);
        if (!mounted) return;
        
        setDeviceInfo(prev => ({
          ...prev,
          isLoading: false,
          error: error.message
        }));

        if (onSignalsUpdate) {
          onSignalsUpdate({
            hasVirtualCamera: false,
            deviceCount: 0,
            deviceLabels: [],
            error: error.message
          });
        }
      }
    }

    inspectDevices();

    // Re-inspect when devices change (camera plugged/unplugged)
    navigator.mediaDevices.addEventListener('devicechange', inspectDevices);

    return () => {
      mounted = false;
      navigator.mediaDevices.removeEventListener('devicechange', inspectDevices);
    };
  }, [stream, onSignalsUpdate]);

  if (deviceInfo.isLoading) {
    return (
      <div className="device-inspect loading">
        <p>Inspecting devices...</p>
      </div>
    );
  }

  if (deviceInfo.error) {
    return (
      <div className="device-inspect error">
        <p>Error: {deviceInfo.error}</p>
      </div>
    );
  }

  return (
    <div className="device-inspect">
      <div className="signal-card">
        <div className="signal-row">
          <span className="signal-label">Total Cameras</span>
          <span className="signal-value">{deviceInfo.deviceCount}</span>
        </div>
        <div className="signal-row">
          <span className="signal-label">Virtual Camera</span>
          <span className={`signal-value ${deviceInfo.hasVirtualCamera ? 'bad' : 'good'}`}>
            {deviceInfo.hasVirtualCamera ? 'Detected' : 'None'}
          </span>
        </div>
      </div>

      {deviceInfo.activeCamera && (
        <div className="signal-card" style={{ marginTop: '1rem', background: 'rgba(59, 130, 246, 0.1)', border: '1px solid rgba(59, 130, 246, 0.3)' }}>
          <div style={{ fontWeight: '600', color: '#60a5fa', marginBottom: '0.5rem', fontSize: '0.875rem' }}>Active Camera</div>
          <div style={{ fontSize: '0.85rem', color: '#d1d5db' }}>{deviceInfo.activeCamera.label}</div>
          {detectVirtualCamera(deviceInfo.activeCamera.label) && (
            <div style={{ marginTop: '0.5rem', padding: '0.5rem', background: 'rgba(239, 68, 68, 0.1)', borderRadius: '6px', color: '#fca5a5', fontSize: '0.8rem', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
              Virtual camera detected
            </div>
          )}
        </div>
      )}

      <details className="device-list">
        <summary>All Detected Cameras ({deviceInfo.deviceCount})</summary>
        <ul>
          {deviceInfo.devices.map((device, idx) => (
            <li key={device.deviceId || idx} className="device-item">
              <span className="device-name">{device.label || `Camera ${idx + 1}`}</span>
              {detectVirtualCamera(device.label) && (
                <span className="badge virtual">Virtual</span>
              )}
              {device.deviceId === deviceInfo.activeCamera?.deviceId && (
                <span className="badge active">Active</span>
              )}
            </li>
          ))}
        </ul>
      </details>
    </div>
  );
}