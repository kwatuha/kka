// Authentication routes
const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../config/db');
const { getUserBranchContext } = require('../lib/branchContext');
const { getUserServicePointContext } = require('../lib/queueService');
const { validatePasswordAgainstPolicy, getActivePasswordPolicy } = require('../lib/passwordPolicy');
const { generateTotpSecret, verifyTotp, otpauthUrl } = require('../lib/totp');
const {
    beginLoginOtpChallenge,
    verifyLoginOtpChallenge,
} = require('../lib/loginOtp');
const { auditFromRequest } = require('../lib/auditLog');
const authenticate = require('../middleware/authenticate');
const { getJwtSecret } = require('../lib/jwtSecret');
const publicRateLimit = require('../middleware/publicRateLimit');

const loginRateLimit = publicRateLimit({
  windowMs: 15 * 60 * 1000,
  max: 25,
  message: 'Too many login attempts. Please wait and try again.',
});

function issueLoginToken(user, extras, res, status = 200) {
    const { privileges, branchContext, dashboardCards, landingConfig, servicePointContext, mustSetup2fa } = extras;
    const payload = {
        user: {
            id: user.userId,
            username: user.username,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            roleId: user.roleId,
            roleName: user.role,
            department: user.department,
            privileges,
            landingConfig,
            dashboardCards,
            branches: branchContext.branches,
            defaultBranch: branchContext.defaultBranch,
            currentBranch: branchContext.currentBranch,
            canAccessAllBranches: branchContext.canAccessAllBranches,
            servicePoints: servicePointContext.servicePoints,
            defaultServicePoint: servicePointContext.defaultServicePoint,
            currentServicePoint: servicePointContext.currentServicePoint,
            totpEnabled: Boolean(user.totpEnabled),
            mustSetup2fa: Boolean(mustSetup2fa),
        },
    };

    jwt.sign(payload, getJwtSecret(), { expiresIn: '24h' }, (err, token) => {
        if (err) {
            return res.status(500).json({ error: 'Server error during token generation' });
        }
        res.status(status).json({
            token,
            user: {
                id: user.userId,
                username: user.username,
                email: user.email,
                firstName: user.firstName,
                lastName: user.lastName,
                role: user.role,
                roleId: user.roleId,
                department: user.department,
                privileges,
                landingConfig,
                dashboardCards,
                branches: branchContext.branches,
                defaultBranch: branchContext.defaultBranch,
                currentBranch: branchContext.currentBranch,
                canAccessAllBranches: branchContext.canAccessAllBranches,
                servicePoints: servicePointContext.servicePoints,
                defaultServicePoint: servicePointContext.defaultServicePoint,
                currentServicePoint: servicePointContext.currentServicePoint,
                totpEnabled: Boolean(user.totpEnabled),
                mustSetup2fa: Boolean(mustSetup2fa),
            },
        });
    });
}
/**
 * Helper function to fetch privileges for a given role ID
 */
async function getPrivilegesByRole(roleId) {
    try {
        const [rows] = await pool.query(
            `SELECT p.privilegeName, p.module
             FROM roles r
             JOIN role_privileges rp ON r.roleId = rp.roleId
             JOIN privileges p ON rp.privilegeId = p.privilegeId
             WHERE r.roleId = ?
             ORDER BY p.module, p.privilegeName`,
            [roleId]
        );
        // Return array of objects with privilegeName and module
        return rows.map(row => ({
            privilegeName: row.privilegeName,
            module: row.module || null
        }));
    } catch (error) {
        console.error('Error fetching privileges:', error);
        return [];
    }
}

function parseLandingConfig(config) {
    if (!config) return null;
    let quickLinks = [];
    if (config.landingQuickLinks) {
        try {
            quickLinks = typeof config.landingQuickLinks === 'string'
                ? JSON.parse(config.landingQuickLinks)
                : config.landingQuickLinks;
            if (!Array.isArray(quickLinks)) quickLinks = [];
        } catch {
            quickLinks = [];
        }
    }
    return {
        type: config.landingPageType || 'dashboard',
        label: config.landingPageLabel || null,
        url: config.landingPageUrl || null,
        icon: config.landingPageIcon || 'Home',
        description: config.landingPageDescription || null,
        servicePoint: config.defaultServicePoint || null,
        quickLinks,
    };
}

async function getDashboardCardsByRole(roleId) {
    if (!roleId) return null;
    try {
        const [cardRows] = await pool.query(
            `SELECT cardId, isVisible FROM role_dashboard_cards WHERE roleId = ?`,
            [roleId]
        );
        if (cardRows.length === 0) return null;
        const dashboardCards = {};
        cardRows.forEach((row) => {
            dashboardCards[row.cardId] = row.isVisible;
        });
        return dashboardCards;
    } catch (error) {
        console.error('[AUTH] Error fetching dashboard cards:', error);
        return null;
    }
}

/**
 * Privileges, branches, dashboard cards, and landing config in parallel.
 * Landing fields come from the roles join on the user row when present.
 */
async function loadAuthSessionExtras(user) {
    const [privileges, branchContext, dashboardCards] = await Promise.all([
        getPrivilegesByRole(user.roleId),
        getUserBranchContext(pool, user.userId),
        getDashboardCardsByRole(user.roleId),
    ]);

    const servicePointContext = await getUserServicePointContext(
        pool,
        user.userId,
        branchContext.currentBranch?.branchId || branchContext.defaultBranch?.branchId,
    );

    let landingConfig = null;
    if (user.roleId) {
        landingConfig = parseLandingConfig(user);
    }

    return { privileges, branchContext, dashboardCards, landingConfig, servicePointContext };
}

const USER_AUTH_SELECT = `
    SELECT
        u.*,
        r.roleName AS role,
        r.landingPageType,
        r.landingPageLabel,
        r.landingPageUrl,
        r.landingPageIcon,
        r.landingPageDescription,
        r.defaultServicePoint,
        r.landingQuickLinks
    FROM users u
    LEFT JOIN roles r ON u.roleId = r.roleId
`;

/**
 * @route   POST /api/auth/login
 * @desc    Authenticate user & get token
 * @access  Public
 */
router.post('/login', loginRateLimit, async (req, res) => {
    const { username, password, totpCode } = req.body;

    if (!username || !password) {
        return res.status(400).json({ error: 'Please provide username and password' });
    }

    try {
        const query = `
            ${USER_AUTH_SELECT}
            WHERE (u.username = ? OR u.email = ?) AND u.voided = 0 AND u.isActive = 1
        `;
        const [users] = await pool.execute(query, [username, username]);

        if (users.length === 0) {
            return res.status(400).json({ error: 'Invalid credentials' });
        }

        const user = users[0];

        const isMatch = await bcrypt.compare(password, user.passwordHash);
        if (!isMatch) {
            return res.status(400).json({ error: 'Invalid credentials' });
        }

        if (user.totpEnabled && user.totpSecret) {
            if (!totpCode) {
                return res.status(401).json({
                    error: 'totp_required',
                    message: 'Two-factor authentication code required',
                    requiresTotp: true,
                });
            }
            if (!verifyTotp(user.totpSecret, totpCode)) {
                return res.status(401).json({ error: 'Invalid authentication code', requiresTotp: true });
            }
        }

        try {
            const otpChallenge = await beginLoginOtpChallenge(user);
            if (otpChallenge) {
                return res.status(401).json({
                    error: 'login_otp_required',
                    message: 'Enter the verification code sent to your phone and email',
                    requiresLoginOtp: true,
                    challengeId: otpChallenge.challengeId,
                    maskedEmail: otpChallenge.maskedEmail,
                    maskedPhone: otpChallenge.maskedPhone,
                });
            }
        } catch (otpErr) {
            if (otpErr.message === 'login_otp_delivery_failed') {
                return res.status(503).json({
                    error: 'login_otp_delivery_failed',
                    message:
                        'Could not send a login verification code. Check SMS/SMTP configuration and that your account has a valid phone and email.',
                });
            }
            throw otpErr;
        }

        const extras = await loadAuthSessionExtras(user);

        try {
            const [secRows] = await pool.execute(
                'SELECT requireAdmin2fa FROM system_security_settings WHERE settingId = 1 LIMIT 1'
            );
            const requireAdmin2fa = Boolean(secRows[0]?.requireAdmin2fa);
            const roleName = String(user.role || '').toLowerCase();
            const isAdmin =
                roleName.includes('admin') ||
                roleName === 'system administrator' ||
                Number(user.roleId) === 1;
            if (requireAdmin2fa && isAdmin && !user.totpEnabled) {
                extras.mustSetup2fa = true;
            }
        } catch {
            /* settings table may be missing in older envs */
        }

        pool.execute('UPDATE users SET lastLogin = NOW() WHERE userId = ?', [user.userId]).catch((err) => {
            console.warn('[AUTH LOGIN] lastLogin update failed:', err.message || err);
        });

        issueLoginToken(user, extras, res);
    } catch (err) {
        console.error('Login error:', err);
        res.status(500).json({ error: 'Server error during login' });
    }
});

/**
 * @route   POST /api/auth/login/verify-otp
 * @desc    Complete login after SMS/email OTP (when login OTP is enabled)
 * @access  Public
 */
router.post('/login/verify-otp', loginRateLimit, async (req, res) => {
    const { challengeId, loginOtpCode, code } = req.body || {};
    const otpCode = loginOtpCode || code;

    try {
        const verified = await verifyLoginOtpChallenge(challengeId, otpCode);
        if (!verified.ok) {
            const messages = {
                invalid_code: 'Invalid verification code',
                expired: 'Verification code expired. Sign in again.',
                too_many_attempts: 'Too many attempts. Sign in again.',
                challenge_not_found: 'Session expired. Sign in again.',
                invalid_request: 'Verification code required',
            };
            return res.status(401).json({
                error: verified.error || 'invalid_code',
                message: messages[verified.error] || 'Invalid verification code',
                requiresLoginOtp: Boolean(verified.requiresLoginOtp),
                challengeId: verified.requiresLoginOtp ? challengeId : undefined,
            });
        }

        const [users] = await pool.execute(
            `${USER_AUTH_SELECT}
             WHERE u.userId = ? AND u.voided = 0 AND u.isActive = 1`,
            [verified.userId]
        );
        if (!users.length) {
            return res.status(401).json({ error: 'User not found' });
        }
        const user = users[0];
        const extras = await loadAuthSessionExtras(user);

        try {
            const [secRows] = await pool.execute(
                'SELECT requireAdmin2fa FROM system_security_settings WHERE settingId = 1 LIMIT 1'
            );
            const requireAdmin2fa = Boolean(secRows[0]?.requireAdmin2fa);
            const roleName = String(user.role || '').toLowerCase();
            const isAdmin =
                roleName.includes('admin') ||
                roleName === 'system administrator' ||
                Number(user.roleId) === 1;
            if (requireAdmin2fa && isAdmin && !user.totpEnabled) {
                extras.mustSetup2fa = true;
            }
        } catch {
            /* settings table may be missing */
        }

        pool.execute('UPDATE users SET lastLogin = NOW() WHERE userId = ?', [user.userId]).catch((err) => {
            console.warn('[AUTH LOGIN OTP] lastLogin update failed:', err.message || err);
        });

        issueLoginToken(user, extras, res);
    } catch (err) {
        console.error('Login OTP verify error:', err);
        res.status(500).json({ error: 'Server error during login verification' });
    }
});

/**
 * @route   POST /api/auth/register
 * @desc    Register a new user
 * @access  Public (should be protected in production)
 */
router.post('/register', async (req, res) => {
    if (
      process.env.NODE_ENV === 'production' &&
      String(process.env.ALLOW_PUBLIC_USER_REGISTRATION || '') !== '1'
    ) {
      return res.status(403).json({ error: 'Public registration is disabled on this deployment.' });
    }

    const { username, email, password, firstName, lastName, roleId, department } = req.body;

    if (!username || !email || !password || !firstName || !lastName || !roleId) {
        return res.status(400).json({ error: 'Please enter all required fields' });
    }

    const policy = await getActivePasswordPolicy(pool);
    const check = validatePasswordAgainstPolicy(password, policy);
    if (!check.ok) {
        return res.status(400).json({ error: check.errors.join('; '), passwordPolicy: policy });
    }

    let connection;
    try {
        const [existingUsers] = await pool.execute(
            'SELECT userId FROM users WHERE username = ? OR email = ?',
            [username, email]
        );

        if (existingUsers.length > 0) {
            return res.status(400).json({ error: 'User with that username or email already exists' });
        }

        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(password, salt);

        connection = await pool.getConnection();
        await connection.beginTransaction();

        const [userResult] = await connection.execute(
            'INSERT INTO users (username, email, passwordHash, firstName, lastName, roleId, department, passwordChangedAt) VALUES (?, ?, ?, ?, ?, ?, ?, NOW())',
            [username, email, passwordHash, firstName, lastName, roleId, department || null]
        );
        const userId = userResult.insertId;

        const privileges = await getPrivilegesByRole(roleId);

        await connection.commit();

        const payload = {
            user: {
                id: userId,
                username: username,
                email: email,
                roleId: roleId,
                privileges: privileges
            }
        };

        jwt.sign(
            payload,
            getJwtSecret(),
            { expiresIn: '24h' },
            (err, token) => {
                if (err) {
                    return res.status(500).json({ error: 'Server error during token generation' });
                }
                res.status(201).json({
                    message: 'User registered successfully',
                    token
                });
            }
        );

    } catch (err) {
        if (connection) {
            await connection.rollback();
        }

        console.error('Registration error:', err);
        if (err.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ error: 'User with that username or email already exists' });
        }
        res.status(500).json({ error: 'Server error during registration' });
    } finally {
        if (connection) {
            connection.release();
        }
    }
});

/**
 * @route POST /api/auth/change-password
 */
router.post('/change-password', authenticate, async (req, res) => {
    try {
        const userId = req.user?.id || req.user?.userId;
        const { currentPassword, newPassword } = req.body || {};
        if (!userId || !currentPassword || !newPassword) {
            return res.status(400).json({ error: 'currentPassword and newPassword are required' });
        }

        const policy = await getActivePasswordPolicy(pool);
        const check = validatePasswordAgainstPolicy(newPassword, policy);
        if (!check.ok) {
            return res.status(400).json({ error: check.errors.join('; '), passwordPolicy: policy });
        }

        const [users] = await pool.execute(
            'SELECT userId, passwordHash FROM users WHERE userId = ? AND voided = 0 AND isActive = 1',
            [userId]
        );
        if (!users.length) return res.status(404).json({ error: 'User not found' });

        const ok = await bcrypt.compare(currentPassword, users[0].passwordHash);
        if (!ok) return res.status(400).json({ error: 'Current password is incorrect' });

        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(newPassword, salt);
        await pool.execute(
            'UPDATE users SET passwordHash = ?, passwordChangedAt = NOW() WHERE userId = ?',
            [passwordHash, userId]
        );

        await auditFromRequest(req, {
            action: 'update',
            resourceType: 'user_password',
            resourceId: String(userId),
            summary: 'Password changed',
        });

        res.json({ message: 'Password updated' });
    } catch (err) {
        console.error('change-password:', err);
        res.status(500).json({ error: 'Failed to change password' });
    }
});

/**
 * @route POST /api/auth/2fa/setup
 * Begin TOTP enrollment — returns otpauth URL + secret
 */
router.post('/2fa/setup', authenticate, async (req, res) => {
    try {
        const userId = req.user?.id || req.user?.userId;
        const username = req.user?.username || 'user';
        const secret = generateTotpSecret();
        await pool.execute(
            'UPDATE users SET totpSecret = ?, totpEnabled = 0 WHERE userId = ?',
            [secret, userId]
        );
        res.json({
            secret,
            otpauthUrl: otpauthUrl({ secret, username }),
            message: 'Scan with authenticator app, then confirm with /api/auth/2fa/enable',
        });
    } catch (err) {
        console.error('2fa setup:', err);
        res.status(500).json({ error: 'Failed to start 2FA setup' });
    }
});

/**
 * @route POST /api/auth/2fa/enable
 * body: { totpCode }
 */
router.post('/2fa/enable', authenticate, async (req, res) => {
    try {
        const userId = req.user?.id || req.user?.userId;
        const { totpCode } = req.body || {};
        const [users] = await pool.execute(
            'SELECT totpSecret FROM users WHERE userId = ?',
            [userId]
        );
        if (!users[0]?.totpSecret) {
            return res.status(400).json({ error: 'Call /api/auth/2fa/setup first' });
        }
        if (!verifyTotp(users[0].totpSecret, totpCode)) {
            return res.status(400).json({ error: 'Invalid authentication code' });
        }
        await pool.execute('UPDATE users SET totpEnabled = 1 WHERE userId = ?', [userId]);
        await auditFromRequest(req, {
            action: 'enable',
            resourceType: 'user_2fa',
            resourceId: String(userId),
            summary: 'TOTP 2FA enabled',
        });
        res.json({ message: 'Two-factor authentication enabled', totpEnabled: true });
    } catch (err) {
        console.error('2fa enable:', err);
        res.status(500).json({ error: 'Failed to enable 2FA' });
    }
});

/**
 * @route POST /api/auth/2fa/disable
 * body: { password, totpCode }
 */
router.post('/2fa/disable', authenticate, async (req, res) => {
    try {
        const userId = req.user?.id || req.user?.userId;
        const { password, totpCode } = req.body || {};
        const [users] = await pool.execute(
            'SELECT passwordHash, totpSecret, totpEnabled FROM users WHERE userId = ?',
            [userId]
        );
        if (!users.length) return res.status(404).json({ error: 'User not found' });
        const user = users[0];
        const ok = await bcrypt.compare(password || '', user.passwordHash);
        if (!ok) return res.status(400).json({ error: 'Password incorrect' });
        if (user.totpEnabled && !verifyTotp(user.totpSecret, totpCode)) {
            return res.status(400).json({ error: 'Invalid authentication code' });
        }
        await pool.execute(
            'UPDATE users SET totpEnabled = 0, totpSecret = NULL WHERE userId = ?',
            [userId]
        );
        await auditFromRequest(req, {
            action: 'disable',
            resourceType: 'user_2fa',
            resourceId: String(userId),
            summary: 'TOTP 2FA disabled',
        });
        res.json({ message: 'Two-factor authentication disabled', totpEnabled: false });
    } catch (err) {
        console.error('2fa disable:', err);
        res.status(500).json({ error: 'Failed to disable 2FA' });
    }
});

/**
 * @route   GET /api/auth/verify
 * @desc    Verify token and get user info
 * @access  Public
 */
router.get('/verify', async (req, res) => {
    const token = req.header('Authorization')?.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: 'No token provided' });
    }

    try {
        const decoded = jwt.verify(token, getJwtSecret());
        
        // Get fresh user data (include landing fields to avoid a second roles query)
        const [users] = await pool.execute(
            `${USER_AUTH_SELECT}
             WHERE u.userId = ? AND u.voided = 0 AND u.isActive = 1`,
            [decoded.user.id]
        );

        if (users.length === 0) {
            return res.status(401).json({ error: 'User not found' });
        }

        const user = users[0];
        const { privileges, branchContext, dashboardCards, landingConfig, servicePointContext } =
            await loadAuthSessionExtras(user);

        res.json({
            user: {
                id: user.userId,
                username: user.username,
                email: user.email,
                firstName: user.firstName,
                lastName: user.lastName,
                role: user.role,
                roleId: user.roleId,
                department: user.department,
                privileges: privileges,
                landingConfig: landingConfig,
                dashboardCards: dashboardCards,
                branches: branchContext.branches,
                defaultBranch: branchContext.defaultBranch,
                currentBranch: branchContext.currentBranch,
                canAccessAllBranches: branchContext.canAccessAllBranches,
                servicePoints: servicePointContext.servicePoints,
                defaultServicePoint: servicePointContext.defaultServicePoint,
                currentServicePoint: servicePointContext.currentServicePoint,
            }
        });
    } catch (err) {
        res.status(401).json({ error: 'Invalid token' });
    }
});

module.exports = router;

