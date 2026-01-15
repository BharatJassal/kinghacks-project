import WebcamFeed from "./components/WebCamFeed";
import DeviceInspector from "./components/DeviceInspect";

export default function App() {
  return (
    <div style={{ padding: 20 }}>
      <h1>Human Presence Trust</h1>
      <WebcamFeed />
      <DeviceInspector />
    </div>
  );
}
