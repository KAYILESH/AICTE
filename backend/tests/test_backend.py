"""
Tests for the AICTE Complaint Management System backend.

Run with:
    cd backend
    pytest tests/ -v

These tests use an in-memory mock of Supabase operations.
For integration tests with a real Supabase instance, set up a test
project and provide credentials via environment variables.
"""

import pytest
from unittest.mock import patch, MagicMock, AsyncMock
from fastapi.testclient import TestClient

from app.main import app
from app.routing.engine import RuleBasedRouter, RoutingResult


# ── Routing Engine Tests ───────────────────────────────────────────────────────

class TestRuleBasedRouter:
    def setup_method(self):
        self.router = RuleBasedRouter()

    def test_routes_fee_complaint_to_pgrc(self):
        result = self.router.route(
            category="fee_related",
            subject="Excess fee charged by college",
            description="The institution charged excessive fee beyond approved limit and refused refund.",
        )
        assert result.assigned_bureau == "PGRC"
        assert result.routing_method == "rule_based"
        assert result.confidence_score is not None

    def test_routes_regulatory_complaint_to_rb(self):
        result = self.router.route(
            category="approval_regulatory_compliance",
            subject="Unauthorized branch operating without NOC",
            description="The institution is running a new branch without obtaining AICTE approval and NOC.",
        )
        assert result.assigned_bureau == "RB"
        assert result.routing_method == "rule_based"

    def test_routes_exam_complaint_to_pgrc(self):
        result = self.router.route(
            category="examination_evaluation",
            subject="Incorrect marks in supplementary result",
            description="My supplementary exam result shows incorrect marks. The examiner made an error in evaluation.",
        )
        assert result.assigned_bureau == "PGRC"

    def test_routes_ambiguous_complaint_to_triage(self):
        result = self.router.route(
            category="other",
            subject="General concern",
            description="Something unclear happened at the institution.",
        )
        assert result.assigned_bureau == "triage"
        assert result.routing_method == "fallback"
        assert result.confidence_score is None

    def test_routing_result_has_reason(self):
        result = self.router.route(
            category="fee_related",
            subject="Fee refund denied",
            description="College denied my refund after I withdrew admission.",
        )
        assert result.routing_reason
        assert len(result.routing_reason) > 10

    def test_routing_result_has_timestamp(self):
        result = self.router.route(
            category="academic_grievance",
            subject="Academic issue",
            description="Professor refused to provide study material and harassed students regularly.",
        )
        assert result.timestamp is not None

    def test_facility_complaint_to_pgrc(self):
        result = self.router.route(
            category="student_facilities",
            subject="Poor hostel conditions",
            description="The hostel facility has no clean water and lights do not work in rooms.",
        )
        assert result.assigned_bureau == "PGRC"

    def test_administration_complaint_to_pgrc(self):
        result = self.router.route(
            category="institution_administration",
            subject="Corrupt admission process",
            description="Principal is taking bribes during admission process and showing bias.",
        )
        assert result.assigned_bureau == "PGRC"


# ── Complaint Number Format ────────────────────────────────────────────────────

class TestComplaintNumberFormat:
    def test_format_is_correct(self):
        from app.services.complaint_service import _generate_complaint_number
        number = _generate_complaint_number(1)
        import re
        assert re.match(r"AICTE-SIH-\d{4}-\d{5}", number), f"Unexpected format: {number}"

    def test_sequence_pads_correctly(self):
        from app.services.complaint_service import _generate_complaint_number
        assert _generate_complaint_number(1).endswith("00001")
        assert _generate_complaint_number(99999).endswith("99999")

    def test_different_sequences_are_unique(self):
        from app.services.complaint_service import _generate_complaint_number
        numbers = [_generate_complaint_number(i) for i in range(1, 100)]
        assert len(numbers) == len(set(numbers)), "Complaint numbers are not unique"


# ── API Endpoint Tests (with mock auth) ───────────────────────────────────────

MOCK_USER = {
    "sub": "test-user-uuid-123",
    "email": "test@example.com",
    "role": "authenticated",
}


def mock_auth(_credentials=None):
    return MOCK_USER


class TestHealthEndpoint:
    def test_health_returns_ok(self):
        client = TestClient(app)
        response = client.get("/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "ok"
        assert "prototype_notice" in data


class TestInstitutionEndpoint:
    def test_requires_authentication(self):
        client = TestClient(app)
        response = client.get("/api/v1/institutions")
        assert response.status_code == 403  # No auth header

    @patch("app.api.institutions.get_supabase_admin")
    @patch("app.api.institutions.require_student_role", side_effect=mock_auth)
    def test_search_returns_institutions(self, mock_role, mock_db):
        mock_supabase = MagicMock()
        mock_supabase.table().select().limit().execute.return_value = MagicMock(
            data=[{"id": "inst-1", "permanent_id": "SYNTH-MH-001", "name": "Demo Institute", "state": "Maharashtra", "district": "Pune", "is_synthetic": True}]
        )
        mock_db.return_value = mock_supabase
        client = TestClient(app)
        response = client.get("/api/v1/institutions", headers={"Authorization": "Bearer mock-token"})
        assert response.status_code == 200


class TestDashboardStatsEndpoint:
    def test_requires_authentication(self):
        client = TestClient(app)
        response = client.get("/api/v1/complaints/dashboard-stats")
        assert response.status_code == 403


class TestComplaintSubmissionPayload:
    """Unit tests for payload validation (no DB calls)."""

    def test_rejects_empty_subject(self):
        from app.models.schemas import ComplaintCreate
        import uuid
        with pytest.raises(Exception):
            ComplaintCreate(
                complainant_type="student",
                institution_id=uuid.uuid4(),
                category="fee_related",
                subject="ab",  # Too short
                description="A sufficiently long description for the test complaint scenario.",
                previous_complaint="no",
                declaration_accepted=True,
                idempotency_key="test-key-123",
            )

    def test_rejects_false_declaration(self):
        from app.models.schemas import ComplaintCreate
        import uuid
        with pytest.raises(Exception):
            ComplaintCreate(
                complainant_type="student",
                institution_id=uuid.uuid4(),
                category="fee_related",
                subject="Valid subject here",
                description="A sufficiently long description for the test complaint scenario.",
                previous_complaint="no",
                declaration_accepted=False,  # Must be True
                idempotency_key="test-key-456",
            )

    def test_accepts_valid_payload(self):
        from app.models.schemas import ComplaintCreate
        import uuid
        payload = ComplaintCreate(
            complainant_type="student",
            institution_id=uuid.uuid4(),
            category="fee_related",
            subject="Excess fee charged",
            description="The institution charged excessive fees well beyond the approved fee structure for this academic year.",
            previous_complaint="no",
            declaration_accepted=True,
            idempotency_key="test-key-789",
        )
        assert payload.subject == "Excess fee charged"
        assert payload.declaration_accepted is True

    def test_rejects_invalid_category(self):
        from app.models.schemas import ComplaintCreate
        import uuid
        with pytest.raises(Exception):
            ComplaintCreate(
                complainant_type="student",
                institution_id=uuid.uuid4(),
                category="invalid_category_xyz",
                subject="Valid subject here",
                description="A sufficiently long description for the test complaint scenario.",
                previous_complaint="no",
                declaration_accepted=True,
                idempotency_key="test-key-000",
            )

    def test_rejects_short_description(self):
        from app.models.schemas import ComplaintCreate
        import uuid
        with pytest.raises(Exception):
            ComplaintCreate(
                complainant_type="student",
                institution_id=uuid.uuid4(),
                category="fee_related",
                subject="Valid subject here",
                description="Too short.",
                previous_complaint="no",
                declaration_accepted=True,
                idempotency_key="test-key-111",
            )


# ── NLP Router Fallback Test ───────────────────────────────────────────────────

class TestNLPRouterFallback:
    def test_falls_back_when_model_path_missing(self):
        from app.routing.engine import NLPRouter
        router = NLPRouter(model_path="/nonexistent/path/model.joblib")
        result = router.route(
            category="fee_related",
            subject="Fee issue",
            description="Excessive fees charged and refund denied by institution.",
        )
        # Should fall back to rule-based
        assert result.assigned_bureau in ("PGRC", "triage")
        assert "fallback" in result.routing_method or "rule_based" in result.routing_method
