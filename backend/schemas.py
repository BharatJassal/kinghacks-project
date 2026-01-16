from typing import List, Optional
from pydantic import BaseModel


class DeviceSignals(BaseModel):
    hasVirtualCamera: bool
    deviceCount: int
    deviceLabels: List[str]


class TimingSignals(BaseModel):
    avgFps: float
    jitter: float
    anomalyDetected: bool


class LandmarkSignals(BaseModel):
    faceDetected: bool
    confidenceScore: float
    movementNatural: bool


class EnvironmentSignals(BaseModel):
    isHeadless: bool
    hasAutomationTools: bool
    suspiciousViewport: bool
    webDriverDetected: bool


class DeepfakeAnalysis(BaseModel):
    deepfakeProbability: float
    blinkRate: float
    isLikelyDeepfake: bool
    warnings: List[str]


class RppgAnalysis(BaseModel):
    heartRate: float
    hrv: float
    heartbeatDetected: bool
    isPhysiological: bool
    signalQuality: float
    confidence: float
    noHeartbeat: bool


class AllSignals(BaseModel):
    device: DeviceSignals
    timing: TimingSignals
    landmark: LandmarkSignals
    environment: EnvironmentSignals
    deepfake: DeepfakeAnalysis
    rppg: RppgAnalysis


class TrustEvaluationPayload(BaseModel):
    trustScore: float
    signals: AllSignals
    deepfakeAnalysis: DeepfakeAnalysis
    rppgAnalysis: RppgAnalysis
    timestamp: str


class GovernanceResponse(BaseModel):
    risk_level: str
    flags: List[str]
    explanation: Optional[str] = None
