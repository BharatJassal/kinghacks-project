import json
from datetime import datetime


def log_decision_to_cos(payload, decision):
    """
    Logs a governance decision for audit purposes.

    In production, this would write to IBM Cloud Object Storage (COS).
    For hackathon/demo purposes, this function logs locally.
    """

    record = {
        "timestamp": datetime.utcnow().isoformat(),
        "input": payload,
        "decision": decision
    }

    # Demo-safe logging
    print("=== AUDIT LOG (IBM COS STUB) ===")
    print(json.dumps(record, indent=2))
    print("=== END AUDIT LOG ===")

    return True