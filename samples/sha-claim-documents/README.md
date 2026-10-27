# Sample SHA claim attachment PDFs (UAT)

Synthetic clinical PDFs for testing **AfyaConnect eClaims** attachment upload on Kakamega HMIS. Not real patient data.

## Files

| PDF | Use with intervention | Suggested `document_type` |
|-----|------------------------|---------------------------|
| `consultation-case-note-SHA-12-001.pdf` | SHA-12-001 Consultation | `CASE_NOTE` |
| `radiology-report-SHA-12-003.pdf` | SHA-12-003 Basic radiological examinations | `IMAGING_RESULT` |
| `combined-visit-summary-all-lines.pdf` | All lines on visit (“Attach to all missing”) | `CASE_NOTE` or `TREATMENT_PLAN` |

Regenerate PDFs (updates date stamp):

```bash
python3 samples/sha-claim-documents/generate_sample_pdfs.py
```

## How to test in HMIS

1. Open the patient with an **active national SHA visit** (eClaims strip on chart).
2. **Option A — Patient documents**
   - Patient chart → **Documents** → upload one or more PDFs from this folder.
   - On the SHA card → **Reload docs** → select file → **Attach to all missing** (or **Attach doc to line**).
3. **Option B — Direct to claim**
   - SHA card → **Claim attachments** → **Upload PDF to claim** → pick a file from this folder.
4. **Refresh preview** — expect `doc` rows for each intervention.
5. **Submit national claim** (discharge OTP as required).

National UAT may reject a `document_type` if it is not in the intervention’s allowed list; switch type in the dropdown and retry.

## Reference

- [Adding attachments (DHA)](https://hie-docs.dha.go.ke/docs/claims/guides/adding-attachments)
- HMIS integration: `api/lib/afyaConnectClaimsAttachments.js`, SHA card on patient page
