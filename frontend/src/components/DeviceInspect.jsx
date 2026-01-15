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
        if (stream) {
          const tracks = stream.getVideoTracks();
          if (tracks.length > 0) {
            const activeLabel = tracks[0].label;
            activeCamera = videoInputs.find(d => d.label === activeLabel);
          }
        }

        const info = {
          devices: videoInputs,
          activeCamera: activeCamera,
          hasVirtualCamera: virtualCameras.length > 0,
          deviceCount: videoInputs.length,
          deviceLabels: videoInputs.map(d => d.label),
          isLoading: false,
          error: null
        };

        setDeviceInfo(info);

        // Send signals to parent Dashboard
        if (onSignalsUpdate) {
          onSignalsUpdate({
            hasVirtualCamera: info.hasVirtualCamera,
            deviceCount: info.deviceCount,
            deviceLabels: info.deviceLabels,
            activeDeviceIsVirtual: activeCamera ? detectVirtualCamera(activeCamera.label) : false
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
        <p>🔍 Inspecting devices...</p>
      </div>
    );
  }

  if (deviceInfo.error) {
    return (
      <div className="device-inspect error">
        <p>⚠️ Error: {deviceInfo.error}</p>
      </div>
    );
  }

  return (
    <div className="device-inspect">
      <div className="device-summary">
        <div className="stat">
          <span className="label">Total Cameras:</span>
          <span className="value">{deviceInfo.deviceCount}</span>
        </div>
        <div className="stat">
          <span className="label">Virtual Detected:</span>
          <span className={`value ${deviceInfo.hasVirtualCamera ? 'warning' : 'ok'}`}>
            {deviceInfo.hasVirtualCamera ? '⚠️ Yes' : '✓ No'}
          </span>
        </div>
      </div>

      {deviceInfo.activeCamera && (
        <div className="active-device">
          <h4>Active Camera</h4>
          <p className="device-label">{deviceInfo.activeCamera.label}</p>
          {detectVirtualCamera(deviceInfo.activeCamera.label) && (
            <p className="warning-text">⚠️ This appears to be a virtual camera</p>
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