#!/usr/bin/env python3
"""Generate sample PDFs for SHA eClaims attachment UAT (CASE_NOTE, IMAGING_RESULT)."""

from __future__ import annotations

from datetime import date
from pathlib import Path

from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.pdfgen import canvas

OUT = Path(__file__).resolve().parent
TODAY = date.today().isoformat()

FACILITY = "Kakamega HMIS UAT Facility"
PATIENT = "CORNELIUS KOECH (UAT test member)"
NUPI = "CR6724396934727-8"


def draw_header(c: canvas.Canvas, title: str) -> None:
    w, h = A4
    c.setFont("Helvetica-Bold", 14)
    c.drawString(20 * mm, h - 25 * mm, title)
    c.setFont("Helvetica", 9)
    c.drawString(20 * mm, h - 32 * mm, FACILITY)
    c.drawString(20 * mm, h - 38 * mm, f"Patient: {PATIENT}")
    c.drawString(20 * mm, h - 44 * mm, f"NUPI: {NUPI}  ·  Date: {TODAY}")
    c.line(20 * mm, h - 48 * mm, w - 20 * mm, h - 48 * mm)


def write_consultation_case_note(path: Path) -> None:
    c = canvas.Canvas(str(path), pagesize=A4)
    draw_header(c, "Outpatient consultation — case note (UAT sample)")
    y = A4[1] - 58 * mm
    c.setFont("Helvetica-Bold", 10)
    c.drawString(20 * mm, y, "Intervention: SHA-12-001 — Consultation")
    y -= 8 * mm
    c.setFont("Helvetica", 10)
    lines = [
        "Chief complaint: Patient presents for SHIF outpatient review.",
        "History: No acute distress. Vitals stable at triage.",
        "Examination: General condition fair; systemic review unremarkable for demo.",
        "Assessment: Condition suitable for outpatient management under SHA OP benefit.",
        "Plan: Counselling, prescribed symptomatic care, follow up PRN.",
        "",
        "Clinician: Dr UAT Demo · Reg No DEMO-001",
        "This document is synthetic data for AfyaConnect eClaims attachment testing only.",
    ]
    for line in lines:
        c.drawString(20 * mm, y, line)
        y -= 6 * mm
    c.showPage()
    c.save()


def write_radiology_report(path: Path) -> None:
    c = canvas.Canvas(str(path), pagesize=A4)
    draw_header(c, "Basic radiological examination report (UAT sample)")
    y = A4[1] - 58 * mm
    c.setFont("Helvetica-Bold", 10)
    c.drawString(20 * mm, y, "Intervention: SHA-12-003 — Basic radiological examinations")
    y -= 8 * mm
    c.setFont("Helvetica", 10)
    lines = [
        "Study: Chest X-ray (PA view) — UAT sample.",
        "Indication: Outpatient review per referring clinician.",
        "Findings: Demo film — no acute cardiopulmonary abnormality described for test.",
        "Impression: Unremarkable study for UAT purposes.",
        "",
        "Radiographer: UAT Rad Tech · Report signed electronically.",
        "Attach with document_type IMAGING_RESULT when billing SHA-12-003.",
        "Synthetic document — not for clinical use.",
    ]
    for line in lines:
        c.drawString(20 * mm, y, line)
        y -= 6 * mm
    c.showPage()
    c.save()


def write_combined_visit_summary(path: Path) -> None:
    c = canvas.Canvas(str(path), pagesize=A4)
    draw_header(c, "Visit summary — attach to all interventions (UAT)")
    y = A4[1] - 58 * mm
    c.setFont("Helvetica", 10)
    lines = [
        "Single PDF for quick UAT when using “Attach to all missing” or “Upload PDF to claim”.",
        "",
        "Lines on visit (example):",
        "  · SHA-12-001 Consultation — see consultation case note section below.",
        "  · SHA-12-003 Basic radiological examinations — imaging summary included.",
        "",
        "Consultation summary: Outpatient SHIF visit completed; patient stable; plan documented.",
        "Imaging summary: Basic radiological study performed; report filed for SHA billing.",
        "",
        "Use document_type CASE_NOTE or TREATMENT_PLAN if national rejects IMAGING for consult line;",
        "prefer separate PDFs in this folder for production-like tests.",
        "",
        "Synthetic UAT pack — Kakamega HMIS / AfyaConnect eClaims.",
    ]
    for line in lines:
        c.drawString(20 * mm, y, line)
        y -= 6 * mm
    c.showPage()
    c.save()


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    specs = [
        ("consultation-case-note-SHA-12-001.pdf", write_consultation_case_note),
        ("radiology-report-SHA-12-003.pdf", write_radiology_report),
        ("combined-visit-summary-all-lines.pdf", write_combined_visit_summary),
    ]
    for name, fn in specs:
        out = OUT / name
        fn(out)
        print(f"  {out}")


if __name__ == "__main__":
    main()
