const express = require('express');
const router = express.Router();
const pool = require('../config/db');

function normCounty(v) {
  return String(v || '').trim();
}

function likeCounty(county) {
  return `%${county.replace(/%/g, '')}%`;
}

/**
 * @route GET /api/geography/kenya-wards/counties
 */
router.get('/counties', async (req, res) => {
  try {
    const [rows] = await pool.execute(
      `SELECT DISTINCT county
       FROM kenya_wards
       WHERE voided = 0 AND county IS NOT NULL AND TRIM(county) <> ''
       ORDER BY county ASC`
    );
    res.json({ data: rows.map((r) => r.county).filter(Boolean) });
  } catch (error) {
    console.error('[kenya-wards] counties:', error);
    res.status(500).json({ message: 'Error fetching counties', error: error.message });
  }
});

/**
 * @route GET /api/geography/kenya-wards/subcounties?county=Kakamega
 */
router.get('/subcounties', async (req, res) => {
  try {
    const county = normCounty(req.query.county);
    if (!county) {
      return res.status(400).json({ message: 'county query parameter is required' });
    }
    const [rows] = await pool.execute(
      `SELECT DISTINCT COALESCE(NULLIF(TRIM(subcounty), ''), NULLIF(TRIM(division), '')) AS subcounty
       FROM kenya_wards
       WHERE voided = 0
         AND county LIKE ?
         AND COALESCE(NULLIF(TRIM(subcounty), ''), NULLIF(TRIM(division), '')) IS NOT NULL
       ORDER BY subcounty ASC`,
      [likeCounty(county)]
    );
    res.json({ data: rows.map((r) => r.subcounty).filter(Boolean) });
  } catch (error) {
    console.error('[kenya-wards] subcounties:', error);
    res.status(500).json({ message: 'Error fetching sub-counties', error: error.message });
  }
});

/**
 * @route GET /api/geography/kenya-wards/wards?county=&subcounty=
 */
router.get('/wards', async (req, res) => {
  try {
    const county = normCounty(req.query.county);
    const subcounty = normCounty(req.query.subcounty);
    if (!county || !subcounty) {
      return res.status(400).json({ message: 'county and subcounty query parameters are required' });
    }
    const [rows] = await pool.execute(
      `SELECT wardRefId, iebcWardName, pcode
       FROM kenya_wards
       WHERE voided = 0
         AND county LIKE ?
         AND (
           LOWER(TRIM(COALESCE(subcounty, division))) = LOWER(?)
           OR LOWER(TRIM(division)) = LOWER(?)
         )
         AND iebcWardName IS NOT NULL
         AND TRIM(iebcWardName) <> ''
       ORDER BY iebcWardName ASC`,
      [likeCounty(county), subcounty, subcounty]
    );
    res.json({
      data: rows.map((r) => ({
        id: r.wardRefId,
        name: r.iebcWardName,
        pcode: r.pcode,
      })),
    });
  } catch (error) {
    console.error('[kenya-wards] wards:', error);
    res.status(500).json({ message: 'Error fetching wards', error: error.message });
  }
});

/**
 * @route GET /api/geography/kenya-wards/stats
 */
router.get('/stats', async (req, res) => {
  try {
    const [[row]] = await pool.execute(
      `SELECT
         COUNT(*) AS total,
         COUNT(DISTINCT county) AS counties,
         COUNT(DISTINCT COALESCE(subcounty, division)) AS subcounties
       FROM kenya_wards WHERE voided = 0`
    );
    res.json({ data: row });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
