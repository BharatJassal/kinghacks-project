import { useEffect, useRef, useState } from "react";

export function useWebcam() {
  const videoRef = useRef(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    async function init() {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: false
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setReady(true);
      }
    }
    init();
  }, []);

  return { videoRef, ready };
}
