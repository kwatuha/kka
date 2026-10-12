/**
 * Password policy checks driven by system_security_settings.passwordPolicy
 */
function validatePasswordAgainstPolicy(password, policy = 'medium') {
  const pwd = String(password || '');
  const errors = [];

  if (policy === 'low') {
    if (pwd.length < 6) errors.push('Password must be at least 6 characters');
  } else if (policy === 'high') {
    if (pwd.length < 12) errors.push('Password must be at least 12 characters');
    if (!/[a-z]/.test(pwd) || !/[A-Z]/.test(pwd)) errors.push('Password must include upper and lower case letters');
    if (!/[0-9]/.test(pwd)) errors.push('Password must include a number');
    if (!/[^A-Za-z0-9]/.test(pwd)) errors.push('Password must include a special character');
  } else {
    // medium (default)
    if (pwd.length < 8) errors.push('Password must be at least 8 characters');
    if (!/[a-z]/.test(pwd) || !/[A-Z]/.test(pwd)) errors.push('Password must include upper and lower case letters');
    if (!/[0-9]/.test(pwd)) errors.push('Password must include a number');
  }

  return { ok: errors.length === 0, errors, policy };
}

async function getActivePasswordPolicy(pool) {
  try {
    const [rows] = await pool.execute(
      `SELECT passwordPolicy FROM system_security_settings WHERE settingId = 1 LIMIT 1`
    );
    return rows[0]?.passwordPolicy || 'medium';
  } catch {
    return 'medium';
  }
}

module.exports = {
  validatePasswordAgainstPolicy,
  getActivePasswordPolicy,
};
