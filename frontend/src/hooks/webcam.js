import { useEffect, useRef, useState } from "react";

export function useWebcam() {
  const videoRef = useRef(null);
  const [ready, setReady] = useState(false);
  const [stream, setStream] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let mounted = true;
    let currentStream = null;

    async function initCamera() {
      try {
        const mediaStream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 1280 },
            height: { ideal: 720 },
            facingMode: "user"
          },
          audio: false
        });

        if (!mounted) {
          mediaStream.getTracks().forEach(track => track.stop());
          return;
        }

        currentStream = mediaStream;

        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
          setStream(mediaStream);
          setReady(true);
          setError(null);
        }
      } catch (err) {
        console.error("Camera access error:", err);
        if (!mounted) return;

        let errorMessage = "Failed to access camera";
        
        if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
          errorMessage = "Camera permission denied. Please allow camera access and refresh the page.";
        } else if (err.name === "NotFoundError" || err.name === "DevicesNotFoundError") {
          errorMessage = "No camera found. Please connect a camera and refresh the page.";
        } else if (err.name === "NotReadableError" || err.name === "TrackStartError") {
          errorMessage = "Camera is already in use by another application.";
        } else if (err.name === "OverconstrainedError") {
          errorMessage = "Camera doesn't support the requested settings.";
        }

        setError(errorMessage);
        setReady(false);
      }
    }

    initCamera();

    return () => {
      mounted = false;
      if (currentStream) {
        currentStream.getTracks().forEach(track => track.stop());
      }
      setReady(false);
      setStream(null);
    };
  }, []);

  return { videoRef, ready, stream, error };
}