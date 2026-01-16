# backend/schemas.py

from typing import List, Optional
from pydantic import BaseModel


# -------- Device Signals --------
class DeviceSignals(BaseModel):
    hasVirtualCamera: bool
    deviceCount: int
    deviceLabels: List[str]


# -------- Frame Timing Signals --------
class TimingSignals(BaseModel):
    avgFps: float
    jitter: float
    anomalyDetected: bool


# -------- Landmark / Movement Signals --------
class LandmarkSignals(BaseModel):
    faceDetected: bool
    confidenceScore: float
    movementNatural: bool


# -------- Environment Signals --------
class EnvironmentSignals(BaseModel):
    isHeadless: bool
    hasAutomationTools: bool
    suspiciousViewport: bool
    webDriverDetected: bool


# -------- Deepfake Analysis --------
class DeepfakeAnalysis(BaseModel):
    deepfakeProbability: float
    blinkRate: float
    isLikelyDeepfake: bool
    warnings: List[str]


# -------- rPPG Analysis --------
class RppgAnalysis(BaseModel):
    heartRate: float
    hrv: float
    heartbeatDetected: bool
    isPhysiological: bool
    signalQuality: float
    confidence: float
    noHeartbeat: bool


# -------- Aggregated Signals --------
class AllSignals(BaseModel):
    device: DeviceSignals
    timing: TimingSignals
    landmark: LandmarkSignals
    environment: EnvironmentSignals
    deepfake: DeepfakeAnalysis
    rppg: RppgAnalysis


# -------- Trust Evaluation Payload --------
class TrustEvaluationPayload(BaseModel):
    trustScore: float
    signals: AllSignals
    deepfakeAnalysis: DeepfakeAnalysis
    rppgAnalysis: RppgAnalysis
    timestamp: str


# -------- Backend Response --------
class GovernanceResponse(BaseModel):
    risk_level: str
    flags: List[str]
    explanation: Optional[str] = None
