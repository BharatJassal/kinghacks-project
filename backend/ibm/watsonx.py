def generate_explanation(flags, trust_score):
    if not flags:
        return (
            "✓ No integrity risks detected\n"
            "The session appears consistent with a live human presence."
        )

    # Map flags to human-readable descriptions
    flag_descriptions = {
        "VIRTUAL_CAMERA_DETECTED": "Virtual camera software detected",
        "MULTIPLE_VIDEO_DEVICES": "Suspicious number of video input devices",
        "FRAME_TIMING_ANOMALY": "Irregular frame timing patterns",
        "HIGH_FRAME_JITTER": "Excessive frame rate instability",
        "HEADLESS_ENVIRONMENT": "Browser running in headless mode",
        "AUTOMATION_WEBDRIVER_DETECTED": "WebDriver automation detected",
        "AUTOMATION_TOOLING_PRESENT": "Automation tools present",
        "DEEPFAKE_LIKELY": "Potential deepfake detection",
        "ABNORMAL_BLINK_RATE": "Abnormal eye blink frequency",
        "NO_PHYSIOLOGICAL_SIGNAL": "No vital signs detected",
        "NON_PHYSIOLOGICAL_RPPG_SIGNAL": "Heart rate signal appears synthetic",
        "LOW_RPPG_SIGNAL_QUALITY": "Poor physiological signal quality",
        "LOW_TRUST_SCORE": "Overall trust score below threshold"
    }

    if trust_score < 40:
        severity = "HIGH"
        risk_emoji = "🔴"
    elif trust_score < 70:
        severity = "MEDIUM"
        risk_emoji = "🟡"
    else:
        severity = "LOW"
        risk_emoji = "🟢"

    # Build detailed flag list
    flag_list = []
    for flag in flags:
        description = flag_descriptions.get(flag, flag.replace("_", " ").title())
        flag_list.append(f"  • {description}")
    
    flags_text = "\n".join(flag_list)

    return (
        f"{risk_emoji} Risk Assessment: {severity}\n"
        f"Trust Score: {trust_score}/100\n\n"
        f"Detected Issues ({len(flags)}):\n"
        f"{flags_text}\n\n"
        "⚠️ These indicators suggest the input may be non-live, manipulated, or automated."
    )