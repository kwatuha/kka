/**
 * UAT Facility Registry search cases (middleware GET /facilities/search).
 * @see docs/DHA_UAT_FR_TEST_IDS.md
 */
const UAT_FR_TEST_CASES = [
  {
    id: 'tenant-fr-code',
    identifier: 'FID-47-105963-0',
    identifierType: 'fr-code',
    expect: 'found',
    label: 'AfyaConnect tenant facility (from OAuth token fr-code)',
  },
  {
    id: 'legacy-mfl-not-in-fr',
    identifier: '15915',
    identifierType: 'registration-number',
    expect: 'not_found',
    label: 'Legacy sandbox MFL — expect empty array (use fr-code in production)',
  },
];

function listUatFrTestCases() {
  return UAT_FR_TEST_CASES.map(
    ({ id, identifier, identifierType, expect, label }) => ({
      id,
      identifier,
      identifierType,
      expect,
      label,
    })
  );
}

module.exports = { UAT_FR_TEST_CASES, listUatFrTestCases };
