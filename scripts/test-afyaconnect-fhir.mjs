#!/usr/bin/env node
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const { runUatFhirSmokeTest } = require('../api/lib/afyaConnectFhirSmokeTest.js');

const report = await runUatFhirSmokeTest();
console.log('FHIR smoke report:', JSON.stringify(report, null, 2));
process.exit(report.ok ? 0 : 1);
