const jwt = require('jsonwebtoken');
const { getJwtSecret } = require('./jwtSecret');

const VIEW_TOKEN_TTL_SEC = 300;

function isPatientDocumentDownloadPath(pathname = '') {
  const p = pathname.split('?')[0];
  return /^\/api\/patients\/[^/]+\/documents\/\d+\/download$/.test(p);
}

function signPatientDocumentViewToken({ patientId, documentId, userId }) {
  const uid = userId != null ? Number(userId) : null;
  return jwt.sign(
    {
      typ: 'patient-doc-view',
      patientId: String(patientId),
      documentId: Number(documentId),
      userId: uid,
    },
    getJwtSecret(),
    { expiresIn: VIEW_TOKEN_TTL_SEC }
  );
}

function verifyPatientDocumentViewToken(token) {
  const decoded = jwt.verify(token, getJwtSecret());
  if (decoded.typ !== 'patient-doc-view') {
    throw new Error('Invalid view token type');
  }
  return decoded;
}

function attachUserFromPatientDocumentViewToken(req) {
  const raw = req.query?.viewToken;
  if (!raw || typeof raw !== 'string') return false;
  const path = (req.originalUrl || req.path || '').split('?')[0];
  if (!isPatientDocumentDownloadPath(path)) return false;
  try {
    const decoded = verifyPatientDocumentViewToken(raw);
    req.user = {
      userId: decoded.userId,
      id: decoded.userId,
      roleName: 'patient-doc-view',
    };
    req.patientDocumentView = {
      patientId: decoded.patientId,
      documentId: decoded.documentId,
    };
    return true;
  } catch {
    return false;
  }
}

module.exports = {
  VIEW_TOKEN_TTL_SEC,
  isPatientDocumentDownloadPath,
  signPatientDocumentViewToken,
  verifyPatientDocumentViewToken,
  attachUserFromPatientDocumentViewToken,
};
