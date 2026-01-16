def generate_explanation(flags, trust_score):
    """
    Generates a human-readable explanation for a governance decision.

    In production, this function would call IBM watsonx.ai (Granite).
    For hackathon/demo purposes, this provides a deterministic fallback.
    """

    if not flags:
        return (
            "No integrity risks were detected. "
            "The session appears consistent with a live human presence."
        )

    reasons = ", ".join(flags)

    if trust_score < 40:
        severity = "high"
    elif trust_score < 70:
        severity = "medium"
    else:
        severity = "low"

    return (
        f"The session was classified as {severity} risk with a trust score of {trust_score}. "
        f"The following governance signals contributed to this decision: {reasons}. "
        "These indicators may suggest non-live, manipulated, or automated input."
    )