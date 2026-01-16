import json
from datetime import datetime


def log_decision_to_cos(payload, decision):
    record = {
        "timestamp": datetime.utcnow().isoformat(),
        "input": payload,
        "decision": decision
    }

    print("=== AUDIT LOG (IBM COS STUB) ===")
    print(json.dumps(record, indent=2))
    print("=== END AUDIT LOG ===")

    return True