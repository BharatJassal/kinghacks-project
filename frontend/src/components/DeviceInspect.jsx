import { useEffect, useState } from "react";
import { detectVirtualCamera } from "../utils/detectVirt";

export default function DeviceInspector() {
  const [info, setInfo] = useState(null);

  useEffect(() => {
    async function inspect() {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const cam = devices.find(d => d.kind === "videoinput");
      if (!cam) return;

      setInfo({
        label: cam.label,
        isVirtual: detectVirtualCamera(cam.label)
      });
    }
    inspect();
  }, []);

  if (!info) return null;

  return (
    <div>
      <h3>Device Inspection</h3>
      <p><b>Camera:</b> {info.label}</p>
      <p><b>Virtual Camera:</b> {info.isVirtual ? "Yes" : "No"}</p>
    </div>
  );
}
