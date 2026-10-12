const { evaluatePrescriptionSafety } = require('./cdsEvaluator');

async function resolveMedicationDetails(executor, items = []) {
  const meds = [];
  for (const item of items) {
    if (item.medicationName) {
      meds.push({
        name: String(item.medicationName),
        hptCode: item.hptCode || null,
      });
      continue;
    }
    const id = item.medicationId ? parseInt(item.medicationId, 10) : null;
    if (!id) continue;
    const [rows] = await executor.execute(
      'SELECT name, hptCode FROM medications WHERE medicationId = ? LIMIT 1',
      [id]
    );
    if (rows[0]?.name) {
      meds.push({
        name: rows[0].name,
        hptCode: rows[0].hptCode || null,
      });
    }
  }
  return meds;
}

async function resolveMedicationNames(executor, items = []) {
  const meds = await resolveMedicationDetails(executor, items);
  return meds.map((m) => m.name).filter(Boolean);
}

/**
 * Run CDS before prescription create. Returns { allowed, result, medicationNames }.
 * If alerts exist and skipAck is false, allowed=false.
 */
async function gatePrescriptionCds(executor, { patientId, items, skipAck = false }) {
  const medications = await resolveMedicationDetails(executor, items);
  const medicationNames = medications.map((m) => m.name);
  const result = await evaluatePrescriptionSafety(executor, {
    patientId,
    medicationNames,
    medications,
  });
  const hasAlerts = (result.alerts || []).length > 0;
  return {
    allowed: !hasAlerts || skipAck,
    result,
    medicationNames,
  };
}

module.exports = { gatePrescriptionCds, resolveMedicationNames, resolveMedicationDetails };
