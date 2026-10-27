#!/usr/bin/env node
/**
 * Print resolved eClaims API paths (no secrets) — compare to AfyaConnect Postman.
 */
const { getEclaimsConfigHints } = require('../lib/afyaConnectEclaimsConfigHints');

const hints = getEclaimsConfigHints();
console.log(JSON.stringify({ ok: true, ...hints }, null, 2));
