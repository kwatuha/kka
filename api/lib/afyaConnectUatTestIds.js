/**
 * UAT Client Registry identifiers verified against ilm-dev middleware (/patients).
 * @see docs/DHA_UAT_CR_TEST_IDS.md
 * @see https://hie-docs.dha.go.ke/registries/client-registry
 */
const UAT_CR_TEST_CASES = [
  {
    id: 'smoke-national-id',
    identificationNumber: '12345678',
    identificationType: 'National ID',
    expect: 'found',
    expectedCrId: 'CR6724396934727-8',
    label: 'Primary smoke test (DHA eligibility workflow example)',
  },
  {
    id: 'lookup-by-cr-id-parent',
    identificationNumber: 'CR6724396934727-8',
    identificationType: 'ClientRegistry ID',
    expect: 'found',
    expectedCrId: 'CR6724396934727-8',
    label: 'Lookup household head by CR ID',
  },
  {
    id: 'dependant-birth-cert-mary',
    identificationNumber: '3809632980',
    identificationType: 'Birth Certificate',
    expect: 'found',
    expectedCrId: 'CR0490482291444-0',
    label: 'Dependant — birth certificate (sandbox consortium)',
  },
  {
    id: 'dependant-birth-cert-julius',
    identificationNumber: '100000001',
    identificationType: 'Birth Certificate',
    expect: 'found',
    expectedCrId: 'CR6821086326032-8',
    label: 'Dependant — birth certificate (Kericho sandbox)',
  },
  {
    id: 'dependant-cr-id-mary',
    identificationNumber: 'CR0490482291444-0',
    identificationType: 'ClientRegistry ID',
    expect: 'found',
    expectedCrId: 'CR0490482291444-0',
    label: 'Dependant by CR ID',
  },
  {
    id: 'doc-placeholder-not-in-registry',
    identificationNumber: '33333333',
    identificationType: 'National ID',
    expect: 'not_found',
    optional: true,
    label: 'DHA OpenAPI dummy ID — prefer empty registry (optional if UAT seeded)',
  },
];

/** Public list for admin UI / API (no secrets). */
function listUatCrTestCases() {
  return UAT_CR_TEST_CASES.map(
    ({ id, identificationNumber, identificationType, expect, expectedCrId, label }) => ({
      id,
      identificationNumber,
      identificationType,
      expect,
      expectedCrId: expectedCrId || null,
      label,
    })
  );
}

module.exports = { UAT_CR_TEST_CASES, listUatCrTestCases };
