# backend/governance.py

from typing import List, Tuple


def evaluate_governance(payload: dict) -> Tuple[List[str], str]:
    """
    Applies governance rules to frontend-provided signals.
    Returns:
        flags: list of string risk indicators
        risk_level: LOW | MEDIUM | HIGH
    """

    flags = []

    trust_score = payload.get("trustScore", 0)
    signals = payload.get("signals", {})

    device = signals.get("device", {})
    timing = signals.get("timing", {})
    landmark = signals.get("landmark", {})
    environment = signals.get("environment", {})
    deepfake = payload.get("deepfakeAnalysis", {})
    rppg = payload.get("rppgAnalysis", {})

    # --- DEVICE RULES ---
    if device.get("hasVirtualCamera"):
        flags.append("VIRTUAL_CAMERA_DETECTED")

    if device.get("deviceCount", 0) > 3:
        flags.append("MULTIPLE_VIDEO_DEVICES")

    # --- FRAME TIMING RULES ---
    if timing.get("anomalyDetected"):
        flags.append("FRAME_TIMING_ANOMALY")

    if timing.get("jitter", 0) > 30:
        flags.append("HIGH_FRAME_JITTER")

    # --- ENVIRONMENT RULES ---
    if environment.get("isHeadless"):
        flags.append("HEADLESS_ENVIRONMENT")

    if environment.get("webDriverDetected"):
        flags.append("AUTOMATION_WEBDRIVER_DETECTED")

    if environment.get("hasAutomationTools"):
        flags.append("AUTOMATION_TOOLING_PRESENT")

    # --- LANDMARK / DEEPFAKE RULES ---
    if deepfake.get("isLikelyDeepfake"):
        flags.append("DEEPFAKE_LIKELY")

    if deepfake.get("blinkRate", 0) < 4:
        flags.append("ABNORMAL_BLINK_RATE")

    # --- rPPG RULES ---
    if rppg.get("noHeartbeat"):
        flags.append("NO_PHYSIOLOGICAL_SIGNAL")

    if not rppg.get("isPhysiological", True):
        flags.append("NON_PHYSIOLOGICAL_RPPG_SIGNAL")

    if rppg.get("signalQuality", 0) < 0.4:
        flags.append("LOW_RPPG_SIGNAL_QUALITY")

    # --- TRUST SCORE GOVERNANCE ---
    if trust_score < 40:
        flags.append("LOW_TRUST_SCORE")

    # --- RISK LEVEL ASSIGNMENT ---
    if (
        "VIRTUAL_CAMERA_DETECTED" in flags
        or "DEEPFAKE_LIKELY" in flags
        or "NO_PHYSIOLOGICAL_SIGNAL" in flags
        or "AUTOMATION_WEBDRIVER_DETECTED" in flags
    ):
        risk_level = "HIGH"
    elif flags:
        risk_level = "MEDIUM"
    else:
        risk_level = "LOW"

    return flags, risk_level
