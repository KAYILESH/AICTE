"""
AI-based complaint routing engine.

Architecture:
- Primary: Rule-based classifier using configurable keyword/category rules.
- Optional: NLP model (scikit-learn) loaded from ROUTING_ENGINE=nlp_model.
- Fallback: If no rule matches or confidence is below threshold, assigns to 'triage'.

⚠️ DEMO NOTE:
These routing rules are illustrative. They must be validated against official
AICTE Bureau/Cell responsibilities before use in a real deployment.
"""

from __future__ import annotations

import re
import json
import logging
from dataclasses import dataclass, field
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

logger = logging.getLogger(__name__)

# ── Configurable rule set (v1.0.0) ────────────────────────────────────────────
# Each rule: { "bureau": "RB"|"PGRC", "categories": [...], "keywords": [...] }
# Rules are evaluated in order; first match wins.
RULE_BASED_RULES: list[dict] = [
    {
        "bureau": "RB",
        "categories": [
            "approval_regulatory_compliance",
        ],
        "keywords": [
            "approval", "regulation", "noc", "affiliation", "permit",
            "accreditation", "naac", "nba", "violation", "unauthorized",
        ],
        "reason": "Complaint falls under Regulation Bureau (RB) — regulatory/approval matters.",
    },
    {
        "bureau": "PGRC",
        "categories": [
            "fee_related",
            "student_facilities",
            "academic_grievance",
            "examination_evaluation",
        ],
        "keywords": [
            "fee", "refund", "hostel", "facilities", "harassment", "ragging",
            "result", "marks", "grade", "exam", "scholarship", "stipend",
        ],
        "reason": "Complaint falls under Public Grievance Redressal Cell (PGRC) — student welfare matters.",
    },
    {
        "bureau": "PGRC",
        "categories": ["institution_administration"],
        "keywords": [
            "management", "principal", "director", "admission", "corruption",
        ],
        "reason": "Complaint falls under PGRC — institution administration grievance.",
    },
]

RULESET_VERSION = "1.0.0"


@dataclass
class RoutingResult:
    assigned_bureau: str        # "RB", "PGRC", "triage"
    confidence_score: Optional[float]
    routing_reason: str
    routing_method: str         # "rule_based", "nlp_model", "fallback"
    ruleset_version: str = RULESET_VERSION
    timestamp: datetime = field(default_factory=lambda: datetime.now(timezone.utc))


class RuleBasedRouter:
    """
    Transparent, configurable rule-based complaint router.
    Returns a triage assignment when no rule matches clearly.
    """

    def route(self, category: str, subject: str, description: str) -> RoutingResult:
        text = f"{subject} {description}".lower()
        for rule in RULE_BASED_RULES:
            category_match = category in rule["categories"]
            keyword_match = any(kw in text for kw in rule["keywords"])
            if category_match and keyword_match:
                return RoutingResult(
                    assigned_bureau=rule["bureau"],
                    confidence_score=0.85 if category_match and keyword_match else 0.65,
                    routing_reason=rule["reason"],
                    routing_method="rule_based",
                )
            if category_match:
                # Category alone is a weaker signal — still route but lower confidence
                return RoutingResult(
                    assigned_bureau=rule["bureau"],
                    confidence_score=0.65,
                    routing_reason=rule["reason"] + " (category match only)",
                    routing_method="rule_based",
                )
        # No clear match → triage
        return RoutingResult(
            assigned_bureau="triage",
            confidence_score=None,
            routing_reason=(
                "No confident rule match. Complaint routed to triage queue "
                "for manual review by an authorized officer."
            ),
            routing_method="fallback",
        )


class NLPRouter:
    """
    Optional NLP-based router. Loads a pre-trained sklearn pipeline from disk.
    Falls back to RuleBasedRouter if the model is unavailable or confidence
    is below the configured threshold.
    """

    def __init__(self, model_path: str, confidence_threshold: float = 0.70):
        self._model_path = model_path
        self._threshold = confidence_threshold
        self._model = None
        self._fallback = RuleBasedRouter()
        self._load_model()

    def _load_model(self):
        try:
            import joblib  # type: ignore
            path = Path(self._model_path)
            if path.exists():
                self._model = joblib.load(path)
                logger.info("NLP routing model loaded from %s", self._model_path)
            else:
                logger.warning(
                    "NLP model path %s not found; falling back to rule-based router.",
                    self._model_path,
                )
        except Exception as exc:
            logger.error("Failed to load NLP model: %s", exc)

    def route(self, category: str, subject: str, description: str) -> RoutingResult:
        if self._model is None:
            logger.debug("NLP model not available, using rule-based fallback.")
            result = self._fallback.route(category, subject, description)
            result.routing_method = "rule_based_fallback"
            return result

        text = f"{category} {subject} {description}"
        try:
            proba = self._model.predict_proba([text])[0]
            classes = self._model.classes_
            best_idx = int(proba.argmax())
            confidence = float(proba[best_idx])
            bureau = classes[best_idx]

            if confidence < self._threshold:
                return RoutingResult(
                    assigned_bureau="triage",
                    confidence_score=confidence,
                    routing_reason=(
                        f"NLP confidence {confidence:.0%} below threshold "
                        f"{self._threshold:.0%}. Routed to triage for review."
                    ),
                    routing_method="nlp_model_low_confidence",
                )
            return RoutingResult(
                assigned_bureau=bureau,
                confidence_score=confidence,
                routing_reason=f"NLP classifier assigned bureau with {confidence:.0%} confidence.",
                routing_method="nlp_model",
            )
        except Exception as exc:
            logger.error("NLP routing failed: %s", exc)
            result = self._fallback.route(category, subject, description)
            result.routing_method = "rule_based_after_nlp_error"
            return result


def get_router():
    """Returns the configured routing engine based on environment settings."""
    from app.config import get_settings
    settings = get_settings()
    if settings.routing_engine == "nlp_model" and settings.nlp_model_path:
        return NLPRouter(
            model_path=settings.nlp_model_path,
            confidence_threshold=settings.routing_confidence_threshold,
        )
    return RuleBasedRouter()
