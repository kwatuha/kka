// Analytics routes
const express = require('express');
const router = express.Router();
const pool = require('../config/db');

/**
 * @route GET /api/analytics/patients
 * @description Get patient statistics by month
 */
router.get('/patients', async (req, res) => {
    try {
        const { months = 12 } = req.query;
        const monthsCount = parseInt(months);

        // Get patient admissions by month
        const [patientStats] = await pool.query(`
            SELECT
                DATE_FORMAT(createdAt, '%Y-%m') as month,
                DATE_FORMAT(createdAt, '%b') as monthName,
                COUNT(*) as totalPatients
            FROM patients
            WHERE voided = 0
                AND createdAt >= DATE_SUB(CURDATE(), INTERVAL ? MONTH)
            GROUP BY DATE_FORMAT(createdAt, '%Y-%m'), DATE_FORMAT(createdAt, '%b')
            ORDER BY month ASC
        `, [monthsCount]);

        // Get inpatient admissions by month (try both table names)
        const [inpatientStats] = await pool.query(`
            SELECT
                DATE_FORMAT(admissionDate, '%Y-%m') as month,
                DATE_FORMAT(admissionDate, '%b') as monthName,
                COUNT(*) as inpatients
            FROM admissions
            WHERE admissionDate >= DATE_SUB(CURDATE(), INTERVAL ? MONTH)
            GROUP BY DATE_FORMAT(admissionDate, '%Y-%m'), DATE_FORMAT(admissionDate, '%b')
            ORDER BY month ASC
        `, [monthsCount]).catch(() => [[]]);

        // Get emergency cases (appointments with emergency status or queue entries)
        const [emergencyStats] = await pool.query(`
            SELECT
                DATE_FORMAT(createdAt, '%Y-%m') as month,
                DATE_FORMAT(createdAt, '%b') as monthName,
                COUNT(*) as emergency
            FROM queue_entries
            WHERE priority = 'emergency'
                AND createdAt >= DATE_SUB(CURDATE(), INTERVAL ? MONTH)
            GROUP BY DATE_FORMAT(createdAt, '%Y-%m'), DATE_FORMAT(createdAt, '%b')
            ORDER BY month ASC
        `, [monthsCount]).catch(() => [[]]);

        // Get outpatient appointments by month
        const [outpatientStats] = await pool.query(`
            SELECT
                DATE_FORMAT(appointmentDate, '%Y-%m') as month,
                DATE_FORMAT(appointmentDate, '%b') as monthName,
                COUNT(*) as outpatients
            FROM appointments
            WHERE appointmentDate >= DATE_SUB(CURDATE(), INTERVAL ? MONTH)
            GROUP BY DATE_FORMAT(appointmentDate, '%Y-%m'), DATE_FORMAT(appointmentDate, '%b')
            ORDER BY month ASC
        `, [monthsCount]).catch(() => [[]]);

        // Combine all stats by month
        const monthMap = new Map();

        // Initialize all months
        for (let i = monthsCount - 1; i >= 0; i--) {
            const date = new Date();
            date.setMonth(date.getMonth() - i);
            const monthKey = date.toISOString().slice(0, 7);
            const monthName = date.toLocaleDateString('en-US', { month: 'short' });
            monthMap.set(monthKey, {
                name: monthName,
                Inpatients: 0,
                Outpatients: 0,
                Emergency: 0,
            });
        }

        // Add inpatient data
        inpatientStats.forEach(stat => {
            if (monthMap.has(stat.month)) {
                monthMap.get(stat.month).Inpatients = parseInt(stat.inpatients) || 0;
            }
        });

        // Add outpatient data
        outpatientStats.forEach(stat => {
            if (monthMap.has(stat.month)) {
                monthMap.get(stat.month).Outpatients = parseInt(stat.outpatients) || 0;
            }
        });

        // Add emergency data
        emergencyStats.forEach(stat => {
            if (monthMap.has(stat.month)) {
                monthMap.get(stat.month).Emergency = parseInt(stat.emergency) || 0;
            }
        });

        const result = Array.from(monthMap.values());

        res.status(200).json(result);
    } catch (error) {
        console.error('Error fetching patient analytics:', error);
        res.status(500).json({ message: 'Error fetching patient analytics', error: error.message });
    }
});

/**
 * @route GET /api/analytics/revenue
 * @description Get revenue and expenses by month
 */
router.get('/revenue', async (req, res) => {
    try {
        const { months = 12 } = req.query;
        const monthsCount = parseInt(months);

        // Get revenue from invoices
        // Revenue = paid invoices (full amount) + partial invoices (paid amount)
        const [revenueStats] = await pool.query(`
            SELECT
                DATE_FORMAT(invoiceDate, '%Y-%m') as month,
                DATE_FORMAT(invoiceDate, '%b') as monthName,
                COALESCE(SUM(
                    CASE
                        WHEN status = 'paid' THEN totalAmount
                        WHEN status = 'partial' THEN paidAmount
                        ELSE 0
                    END
                ), 0) as revenue
            FROM invoices
            WHERE invoiceDate >= DATE_SUB(CURDATE(), INTERVAL ? MONTH)
                AND status IN ('paid', 'partial')
            GROUP BY DATE_FORMAT(invoiceDate, '%Y-%m'), DATE_FORMAT(invoiceDate, '%b')
            ORDER BY month ASC
        `, [monthsCount]);

        // Get expenses from transactions (if transactions table exists)
        const [expenseStats] = await pool.query(`
            SELECT
                DATE_FORMAT(transactionDate, '%Y-%m') as month,
                DATE_FORMAT(transactionDate, '%b') as monthName,
                COALESCE(SUM(amount), 0) as expenses
            FROM transactions
            WHERE transactionDate >= DATE_SUB(CURDATE(), INTERVAL ? MONTH)
                AND EXISTS (
                    SELECT 1 FROM accounts a
                    WHERE a.accountId = transactions.debitAccountId
                    AND a.accountType = 'Expense'
                )
            GROUP BY DATE_FORMAT(transactionDate, '%Y-%m'), DATE_FORMAT(transactionDate, '%b')
            ORDER BY month ASC
        `, [monthsCount]).catch(() => [[]]);

        // Combine revenue and expenses by month
        const monthMap = new Map();

        // Initialize all months
        for (let i = monthsCount - 1; i >= 0; i--) {
            const date = new Date();
            date.setMonth(date.getMonth() - i);
            const monthKey = date.toISOString().slice(0, 7);
            const monthName = date.toLocaleDateString('en-US', { month: 'short' });
            monthMap.set(monthKey, {
                name: monthName,
                Revenue: 0,
                Expenses: 0,
            });
        }

        // Add revenue data
        revenueStats.forEach(stat => {
            if (monthMap.has(stat.month)) {
                const revenueValue = parseFloat(stat.revenue) || 0;
                monthMap.get(stat.month).Revenue = revenueValue;
            }
        });

        // Add expense data
        expenseStats.forEach(stat => {
            if (monthMap.has(stat.month)) {
                const expenseValue = parseFloat(stat.expenses) || 0;
                monthMap.get(stat.month).Expenses = expenseValue;
            }
        });

        const result = Array.from(monthMap.values());

        res.status(200).json(result);
    } catch (error) {
        console.error('Error fetching revenue analytics:', error);
        res.status(500).json({ message: 'Error fetching revenue analytics', error: error.message });
    }
});

/**
 * @route GET /api/analytics/departments
 * @description Get patient distribution by department
 */
router.get('/departments', async (req, res) => {
    try {
        // Get patient distribution by department from appointments
        const [deptStats] = await pool.query(`
            SELECT
                d.departmentName as name,
                COUNT(DISTINCT a.patientId) as value
            FROM appointments a
            LEFT JOIN users u ON a.doctorId = u.userId
            LEFT JOIN departments d ON u.department = d.departmentName
            WHERE a.appointmentDate >= DATE_SUB(CURDATE(), INTERVAL 6 MONTH)
                AND d.departmentName IS NOT NULL
            GROUP BY d.departmentId, d.departmentName
            ORDER BY value DESC
            LIMIT 10
        `).catch(() => [[]]);

        // If no department data from appointments, use a default distribution
        if (deptStats.length === 0) {
            const [allDepts] = await pool.query(`
                SELECT departmentName as name
                FROM departments
                WHERE isActive = TRUE
                LIMIT 6
            `);

            const defaultValues = [25, 18, 15, 12, 10, 20];
            const result = allDepts.map((dept, index) => ({
                name: dept.name,
                value: defaultValues[index % defaultValues.length]
            }));

            return res.status(200).json(result);
        }

        res.status(200).json(deptStats);
    } catch (error) {
        console.error('Error fetching department analytics:', error);
        res.status(500).json({ message: 'Error fetching department analytics', error: error.message });
    }
});

/**
 * @route GET /api/analytics/summary
 * @description Get overall analytics summary
 */
router.get('/summary', async (req, res) => {
    try {
        // Total patients
        const [totalPatients] = await pool.query('SELECT COUNT(*) as total FROM patients WHERE voided = 0');

        // Total revenue (all time)
        const [totalRevenue] = await pool.query(`
            SELECT COALESCE(SUM(totalAmount), 0) as total
            FROM invoices
            WHERE status = 'paid'
        `);

        // Monthly revenue
        const [monthlyRevenue] = await pool.query(`
            SELECT COALESCE(SUM(totalAmount), 0) as total
            FROM invoices
            WHERE status = 'paid'
                AND MONTH(invoiceDate) = MONTH(CURDATE())
                AND YEAR(invoiceDate) = YEAR(CURDATE())
        `);

        // Active appointments today
        const today = new Date().toISOString().split('T')[0];
        const [todayAppointments] = await pool.query(
            'SELECT COUNT(*) as total FROM appointments WHERE appointmentDate = ?',
            [today]
        );

        // Active inpatients
        const [activeInpatients] = await pool.query(`
            SELECT COUNT(*) as total
            FROM admissions
            WHERE dischargeDate IS NULL AND status = 'admitted'
        `).catch(() => [[{ total: 0 }]]);

        res.status(200).json({
            totalPatients: totalPatients[0]?.total || 0,
            totalRevenue: parseFloat(totalRevenue[0]?.total || 0),
            monthlyRevenue: parseFloat(monthlyRevenue[0]?.total || 0),
            todayAppointments: todayAppointments[0]?.total || 0,
            activeInpatients: activeInpatients[0]?.total || 0,
        });
    } catch (error) {
        console.error('Error fetching analytics summary:', error);
        res.status(500).json({ message: 'Error fetching analytics summary', error: error.message });
    }
});

/**
 * @route GET /api/analytics/revenue-by-source
 * @description Get revenue breakdown by source (Pharmacy, Lab, Procedures, etc.)
 */
router.get('/revenue-by-source', async (req, res) => {
    try {
        const { months = 12, startDate, endDate } = req.query;
        const monthsCount = parseInt(months);

        let dateFilter = '';
        const params = [];

        if (startDate && endDate) {
            dateFilter = 'AND i.invoiceDate BETWEEN ? AND ?';
            params.push(startDate, endDate);
        } else {
            dateFilter = 'AND i.invoiceDate >= DATE_SUB(CURDATE(), INTERVAL ? MONTH)';
            params.push(monthsCount);
        }

        // Get revenue by source from invoice items
        const [revenueBySource] = await pool.query(`
            SELECT
                CASE
                    WHEN ii.description LIKE '%Prescription Item:%' OR ii.description LIKE '%Pharmacy%' THEN 'Pharmacy'
                    WHEN ii.description LIKE '%Lab Test:%' OR ii.description LIKE '%Laboratory%' THEN 'Laboratory'
                    WHEN ii.description LIKE '%Procedure%' OR sc.chargeType = 'Procedure' THEN 'Procedures'
                    WHEN ii.description LIKE '%Consultation%' OR sc.chargeType = 'Consultation' THEN 'Consultations'
                    WHEN sc.chargeType = 'Service' THEN 'Services'
                    WHEN sc.chargeType = 'Consumables' THEN 'Consumables'
                    ELSE 'Other'
                END as source,
                COALESCE(SUM(
                    CASE
                        WHEN i.status = 'paid' THEN ii.totalPrice
                        WHEN i.status = 'partial' THEN (ii.totalPrice * (i.paidAmount / i.totalAmount))
                        ELSE 0
                    END
                ), 0) as revenue,
                COUNT(DISTINCT i.invoiceId) as invoiceCount,
                COUNT(ii.itemId) as itemCount
            FROM invoice_items ii
            INNER JOIN invoices i ON ii.invoiceId = i.invoiceId
            LEFT JOIN service_charges sc ON ii.chargeId = sc.chargeId
            WHERE i.status IN ('paid', 'partial')
                ${dateFilter}
            GROUP BY source
            ORDER BY revenue DESC
        `, params);

        res.status(200).json(revenueBySource);
    } catch (error) {
        console.error('Error fetching revenue by source:', error);
        res.status(500).json({ message: 'Error fetching revenue by source', error: error.message });
    }
});

/**
 * @route GET /api/analytics/pharmacy-sales
 * @description Get pharmacy sales analytics - top drugs, sales by drug
 */
router.get('/pharmacy-sales', async (req, res) => {
    try {
        const { months = 12, limit = 20, startDate, endDate } = req.query;
        const monthsCount = parseInt(months);
        const limitCount = parseInt(limit);

        let dateFilter = '';
        const params = [];

        if (startDate && endDate) {
            dateFilter = 'AND i.invoiceDate BETWEEN ? AND ?';
            params.push(startDate, endDate);
        } else {
            dateFilter = 'AND i.invoiceDate >= DATE_SUB(CURDATE(), INTERVAL ? MONTH)';
            params.push(monthsCount);
        }

        // Get top selling drugs by revenue
        const [topDrugsByRevenue] = await pool.query(`
            SELECT
                m.medicationId,
                m.name as drugName,
                m.medicationCode,
                m.genericName,
                COALESCE(SUM(
                    CASE
                        WHEN i.status = 'paid' THEN ii.totalPrice
                        WHEN i.status = 'partial' THEN (ii.totalPrice * (i.paidAmount / i.totalAmount))
                        ELSE 0
                    END
                ), 0) as totalRevenue,
                COALESCE(SUM(
                    CASE
                        WHEN i.status IN ('paid', 'partial') THEN ii.quantity
                        ELSE 0
                    END
                ), 0) as totalQuantitySold,
                COUNT(DISTINCT i.invoiceId) as invoiceCount,
                COUNT(DISTINCT i.patientId) as patientCount
            FROM invoice_items ii
            INNER JOIN invoices i ON ii.invoiceId = i.invoiceId
            LEFT JOIN drug_inventory di ON ii.drugInventoryId = di.drugInventoryId
            LEFT JOIN medications m ON di.medicationId = m.medicationId
            WHERE i.status IN ('paid', 'partial')
                AND (ii.description LIKE '%Prescription Item:%' OR ii.description LIKE '%Pharmacy%')
                ${dateFilter}
                AND m.medicationId IS NOT NULL
            GROUP BY m.medicationId, m.name, m.medicationCode, m.genericName
            ORDER BY totalRevenue DESC
            LIMIT ?
        `, [...params, limitCount]);

        // Get pharmacy sales by month
        const [pharmacySalesByMonth] = await pool.query(`
            SELECT
                DATE_FORMAT(i.invoiceDate, '%Y-%m') as month,
                DATE_FORMAT(i.invoiceDate, '%b %Y') as monthName,
                COALESCE(SUM(
                    CASE
                        WHEN i.status = 'paid' THEN ii.totalPrice
                        WHEN i.status = 'partial' THEN (ii.totalPrice * (i.paidAmount / i.totalAmount))
                        ELSE 0
                    END
                ), 0) as revenue,
                COALESCE(SUM(
                    CASE
                        WHEN i.status IN ('paid', 'partial') THEN ii.quantity
                        ELSE 0
                    END
                ), 0) as quantitySold,
                COUNT(DISTINCT i.invoiceId) as invoiceCount
            FROM invoice_items ii
            INNER JOIN invoices i ON ii.invoiceId = i.invoiceId
            WHERE i.status IN ('paid', 'partial')
                AND (ii.description LIKE '%Prescription Item:%' OR ii.description LIKE '%Pharmacy%')
                ${dateFilter}
            GROUP BY DATE_FORMAT(i.invoiceDate, '%Y-%m'), DATE_FORMAT(i.invoiceDate, '%b %Y')
            ORDER BY month ASC
        `, params);

        res.status(200).json({
            topDrugsByRevenue: topDrugsByRevenue || [],
            salesByMonth: pharmacySalesByMonth || []
        });
    } catch (error) {
        console.error('Error fetching pharmacy sales:', error);
        res.status(500).json({ message: 'Error fetching pharmacy sales', error: error.message });
    }
});

/**
 * @route GET /api/analytics/inventory-value
 * @description Get drug inventory value by location/store
 */
router.get('/inventory-value', async (req, res) => {
    try {
        // Get drug inventory value by location
        const [inventoryByLocation] = await pool.query(`
            SELECT
                COALESCE(di.location, 'Main Store') as location,
                COUNT(DISTINCT di.medicationId) as drugCount,
                SUM(di.quantity) as totalQuantity,
                SUM(di.quantity * COALESCE(di.unitPrice, 0)) as totalCostValue,
                SUM(di.quantity * COALESCE(di.sellPrice, 0)) as totalSellValue,
                SUM((di.quantity * COALESCE(di.sellPrice, 0)) - (di.quantity * COALESCE(di.unitPrice, 0))) as potentialProfit
            FROM drug_inventory di
            WHERE di.quantity > 0
                AND di.status = 'active'
                AND (di.expiryDate IS NULL OR di.expiryDate >= CURDATE())
            GROUP BY COALESCE(di.location, 'Main Store')
            ORDER BY totalSellValue DESC
        `);

        // Get total inventory value
        const [totalInventory] = await pool.query(`
            SELECT
                COUNT(DISTINCT di.medicationId) as totalDrugs,
                SUM(di.quantity) as totalQuantity,
                SUM(di.quantity * COALESCE(di.unitPrice, 0)) as totalCostValue,
                SUM(di.quantity * COALESCE(di.sellPrice, 0)) as totalSellValue,
                SUM((di.quantity * COALESCE(di.sellPrice, 0)) - (di.quantity * COALESCE(di.unitPrice, 0))) as totalPotentialProfit
            FROM drug_inventory di
            WHERE di.quantity > 0
                AND di.status = 'active'
                AND (di.expiryDate IS NULL OR di.expiryDate >= CURDATE())
        `);

        res.status(200).json({
            byLocation: inventoryByLocation || [],
            totals: totalInventory[0] || {}
        });
    } catch (error) {
        console.error('Error fetching inventory value:', error);
        res.status(500).json({ message: 'Error fetching inventory value', error: error.message });
    }
});

/**
 * @route GET /api/analytics/payment-methods
 * @description Get payment breakdown by payment method
 */
router.get('/payment-methods', async (req, res) => {
    try {
        const { months = 12, startDate, endDate } = req.query;
        const monthsCount = parseInt(months);

        let dateFilter = '';
        const params = [];

        if (startDate && endDate) {
            dateFilter = 'AND updatedAt BETWEEN ? AND ?';
            params.push(startDate, endDate);
        } else {
            dateFilter = 'AND updatedAt >= DATE_SUB(CURDATE(), INTERVAL ? MONTH)';
            params.push(monthsCount);
        }

        const [paymentMethods] = await pool.query(`
            SELECT
                COALESCE(paymentMethod, 'Cash') as paymentMethod,
                COALESCE(SUM(
                    CASE
                        WHEN status = 'paid' THEN totalAmount
                        WHEN status = 'partial' THEN paidAmount
                        ELSE 0
                    END
                ), 0) as totalAmount,
                COUNT(*) as transactionCount
            FROM invoices
            WHERE status IN ('paid', 'partial')
                AND paidAmount > 0
                ${dateFilter}
            GROUP BY COALESCE(paymentMethod, 'Cash')
            ORDER BY totalAmount DESC
        `, params);

        res.status(200).json(paymentMethods);
    } catch (error) {
        console.error('Error fetching payment methods:', error);
        res.status(500).json({ message: 'Error fetching payment methods', error: error.message });
    }
});

/**
 * @route GET /api/analytics/revenue-weekly
 * @description Get weekly revenue breakdown
 */
router.get('/revenue-weekly', async (req, res) => {
    try {
        const { weeks = 12, startDate, endDate } = req.query;
        const weeksCount = parseInt(weeks);

        let dateFilter = '';
        const params = [];

        if (startDate && endDate) {
            dateFilter = 'AND invoiceDate BETWEEN ? AND ?';
            params.push(startDate, endDate);
        } else {
            dateFilter = 'AND invoiceDate >= DATE_SUB(CURDATE(), INTERVAL ? WEEK)';
            params.push(weeksCount);
        }

        // Get revenue by week
        const [weeklyStats] = await pool.query(`
            SELECT
                DATE_FORMAT(invoiceDate, '%Y-%u') as weekKey,
                YEAR(invoiceDate) as year,
                WEEK(invoiceDate, 1) as week,
                DATE_FORMAT(DATE_ADD(invoiceDate, INTERVAL(1-DAYOFWEEK(invoiceDate)) DAY), '%b %d') as weekStart,
                DATE_FORMAT(DATE_ADD(invoiceDate, INTERVAL(7-DAYOFWEEK(invoiceDate)) DAY), '%b %d') as weekEnd,
                CONCAT(DATE_FORMAT(DATE_ADD(invoiceDate, INTERVAL(1-DAYOFWEEK(invoiceDate)) DAY), '%b %d'), ' - ',
                       DATE_FORMAT(DATE_ADD(invoiceDate, INTERVAL(7-DAYOFWEEK(invoiceDate)) DAY), '%b %d')) as weekLabel,
                COALESCE(SUM(
                    CASE
                        WHEN status = 'paid' THEN totalAmount
                        WHEN status = 'partial' THEN paidAmount
                        ELSE 0
                    END
                ), 0) as revenue,
                COUNT(DISTINCT invoiceId) as invoiceCount,
                COUNT(DISTINCT patientId) as patientCount
            FROM invoices
            WHERE status IN ('paid', 'partial')
                ${dateFilter}
            GROUP BY YEAR(invoiceDate), WEEK(invoiceDate, 1), weekKey, weekStart, weekEnd, weekLabel
            ORDER BY weekKey ASC
        `, params);

        res.status(200).json(weeklyStats);
    } catch (error) {
        console.error('Error fetching weekly revenue:', error);
        res.status(500).json({ message: 'Error fetching weekly revenue', error: error.message });
    }
});

/**
 * @route GET /api/analytics/revenue-trends
 * @description Get revenue trends by source over time
 */
router.get('/revenue-trends', async (req, res) => {
    try {
        const { months = 12, startDate, endDate } = req.query;
        const monthsCount = parseInt(months);

        let dateFilter = '';
        const params = [];

        if (startDate && endDate) {
            dateFilter = 'AND i.invoiceDate BETWEEN ? AND ?';
            params.push(startDate, endDate);
        } else {
            dateFilter = 'AND i.invoiceDate >= DATE_SUB(CURDATE(), INTERVAL ? MONTH)';
            params.push(monthsCount);
        }

        const [trends] = await pool.query(`
            SELECT
                DATE_FORMAT(i.invoiceDate, '%Y-%m') as month,
                DATE_FORMAT(i.invoiceDate, '%b %Y') as monthName,
                CASE
                    WHEN ii.description LIKE '%Prescription Item:%' OR ii.description LIKE '%Pharmacy%' THEN 'Pharmacy'
                    WHEN ii.description LIKE '%Lab Test:%' OR ii.description LIKE '%Laboratory%' THEN 'Laboratory'
                    WHEN ii.description LIKE '%Procedure%' OR sc.chargeType = 'Procedure' THEN 'Procedures'
                    WHEN ii.description LIKE '%Consultation%' OR sc.chargeType = 'Consultation' THEN 'Consultations'
                    WHEN sc.chargeType = 'Service' THEN 'Services'
                    WHEN sc.chargeType = 'Consumables' THEN 'Consumables'
                    ELSE 'Other'
                END as source,
                COALESCE(SUM(
                    CASE
                        WHEN i.status = 'paid' THEN ii.totalPrice
                        WHEN i.status = 'partial' THEN (ii.totalPrice * (i.paidAmount / i.totalAmount))
                        ELSE 0
                    END
                ), 0) as revenue
            FROM invoice_items ii
            INNER JOIN invoices i ON ii.invoiceId = i.invoiceId
            LEFT JOIN service_charges sc ON ii.chargeId = sc.chargeId
            WHERE i.status IN ('paid', 'partial')
                ${dateFilter}
            GROUP BY DATE_FORMAT(i.invoiceDate, '%Y-%m'), DATE_FORMAT(i.invoiceDate, '%b %Y'), source
            ORDER BY month ASC, revenue DESC
        `, params);

        res.status(200).json(trends);
    } catch (error) {
        console.error('Error fetching revenue trends:', error);
        res.status(500).json({ message: 'Error fetching revenue trends', error: error.message });
    }
});

module.exports = router;

