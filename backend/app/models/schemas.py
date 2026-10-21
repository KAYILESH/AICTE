"""
Pydantic models for the AICTE Complaint Management System.
These define request/response schemas for the API layer.
"""

from __future__ import annotations

from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, EmailStr, Field, field_validator
import re


# ── Enumerations (stored as string in DB) ─────────────────────────────────────

COMPLAINANT_TYPES = ["student", "faculty", "parent_guardian", "institution_rep", "other"]

COMPLAINT_CATEGORIES = [
    "approval_regulatory_compliance",
    "institution_administration",
    "academic_grievance",
    "student_facilities",
    "examination_evaluation",
    "fee_related",
    "other",
]

COMPLAINT_STATUSES = [
    "submitted",
    "routing_completed",
    "assigned",
    "under_review",
    "under_process",
    "additional_info_required",
    "transferred",
    "escalated",
    "resolved",
    "closed",
]

BUREAU_TYPES = ["RB", "PGRC", "triage", "pending"]


# ── Profile ───────────────────────────────────────────────────────────────────

class ProfileOut(BaseModel):
    id: UUID
    full_name: str
    email: EmailStr
    mobile: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


class ProfileUpdate(BaseModel):
    full_name: Optional[str] = Field(None, min_length=2, max_length=120)
    mobile: Optional[str] = Field(None, max_length=20)

    @field_validator("mobile")
    @classmethod
    def validate_mobile(cls, v: Optional[str]) -> Optional[str]:
        if v and not re.match(r"^\+?[0-9\s\-]{7,20}$", v):
            raise ValueError("Invalid mobile number format.")
        return v


# ── Institution ───────────────────────────────────────────────────────────────

class InstitutionOut(BaseModel):
    id: UUID
    permanent_id: str
    name: str
    state: str
    district: str
    is_synthetic: bool = True

    class Config:
        from_attributes = True


# ── Complaint ─────────────────────────────────────────────────────────────────

class ComplaintCreate(BaseModel):
    # Complainant
    complainant_type: str = Field(..., description="One of: " + ", ".join(COMPLAINANT_TYPES))
    mobile: Optional[str] = Field(None, max_length=20)

    # Institution
    institution_id: UUID
    course_or_department: Optional[str] = Field(None, max_length=200)

    # Details
    category: str = Field(..., description="One of: " + ", ".join(COMPLAINT_CATEGORIES))
    subject: str = Field(..., min_length=5, max_length=200)
    description: str = Field(..., min_length=20, max_length=5000)
    date_of_incident: Optional[str] = None          # ISO date string
    academic_year: Optional[str] = Field(None, max_length=20)
    previous_complaint: str = Field("no", pattern="^(yes|no|not_sure)$")
    previous_complaint_id: Optional[str] = Field(None, max_length=50)

    # Declaration
    declaration_accepted: bool

    # Idempotency
    idempotency_key: str = Field(..., max_length=128)

    @field_validator("declaration_accepted")
    @classmethod
    def must_accept_declaration(cls, v: bool) -> bool:
        if not v:
            raise ValueError("You must accept the declaration before submitting.")
        return v

    @field_validator("complainant_type")
    @classmethod
    def validate_complainant_type(cls, v: str) -> str:
        if v not in COMPLAINANT_TYPES:
            raise ValueError(f"Invalid complainant type. Must be one of: {COMPLAINANT_TYPES}")
        return v

    @field_validator("category")
    @classmethod
    def validate_category(cls, v: str) -> str:
        if v not in COMPLAINT_CATEGORIES:
            raise ValueError(f"Invalid category. Must be one of: {COMPLAINT_CATEGORIES}")
        return v


class ComplaintSummary(BaseModel):
    id: UUID
    complaint_number: str
    institution_name: str
    subject: str
    category: str
    status: str
    assigned_bureau: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class StatusHistoryEntry(BaseModel):
    status: str
    note: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


class RoutingDecisionOut(BaseModel):
    assigned_bureau: str
    confidence_score: Optional[float] = None
    routing_reason: str
    routing_method: str
    ruleset_version: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


class AttachmentOut(BaseModel):
    id: UUID
    filename: str
    content_type: str
    size_bytes: int
    created_at: datetime

    class Config:
        from_attributes = True


class ComplaintDetail(BaseModel):
    id: UUID
    complaint_number: str
    complainant_type: str
    institution: InstitutionOut
    course_or_department: Optional[str] = None
    category: str
    subject: str
    description: str
    date_of_incident: Optional[str] = None
    academic_year: Optional[str] = None
    previous_complaint: str
    previous_complaint_id: Optional[str] = None
    status: str
    assigned_bureau: Optional[str] = None
    public_remarks: Optional[str] = None
    resolution_summary: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    status_history: list[StatusHistoryEntry] = []
    routing_decision: Optional[RoutingDecisionOut] = None
    attachments: list[AttachmentOut] = []

    class Config:
        from_attributes = True


class ComplaintListResponse(BaseModel):
    total: int
    page: int
    page_size: int
    items: list[ComplaintSummary]


class DashboardStats(BaseModel):
    total: int
    submitted: int
    under_process: int
    resolved: int


# ── Notifications ─────────────────────────────────────────────────────────────

class NotificationOut(BaseModel):
    id: UUID
    message: str
    complaint_id: Optional[UUID] = None
    complaint_number: Optional[str] = None
    is_read: bool
    created_at: datetime

    class Config:
        from_attributes = True


# ── Routing ───────────────────────────────────────────────────────────────────

class RoutingRequest(BaseModel):
    complaint_id: UUID
    category: str
    subject: str
    description: str
    institution_permanent_id: str


class RoutingResult(BaseModel):
    assigned_bureau: str
    confidence_score: Optional[float] = None
    routing_reason: str
    routing_method: str
    ruleset_version: str = "1.0.0"
