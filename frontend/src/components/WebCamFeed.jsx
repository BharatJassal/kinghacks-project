import { useWebcam } from "../hooks/webcam";

export default function WebcamFeed() {
  const { videoRef, ready } = useWebcam();

  return (
    <div>
      <h3>Webcam</h3>
      <video ref={videoRef} autoPlay playsInline muted />
      {!ready && <p>Waiting for camera permission...</p>}
    </div>
  );
}
