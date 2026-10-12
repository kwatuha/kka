-- ============================================
-- PATIENT DOCUMENTS
-- ============================================
-- This table stores documents for patients

CREATE TABLE IF NOT EXISTS patient_documents (
    documentId INT NOT NULL AUTO_INCREMENT,
    patientId INT NOT NULL,
    documentName VARCHAR(200) NOT NULL,
    documentType VARCHAR(100), -- Discharge Summary, Diagnostic Report, Imaging, Laboratory Report, Administrative, Procedure Report, Billing, etc.
    category VARCHAR(100), -- Same as documentType for backward compatibility
    filePath VARCHAR(500),
    fileSize INT, -- Size in bytes
    mimeType VARCHAR(100),
    uploadDate DATE NOT NULL,
    uploadedBy INT,
    notes TEXT,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (documentId),
    FOREIGN KEY (patientId) REFERENCES patients(patientId) ON DELETE CASCADE,
    FOREIGN KEY (uploadedBy) REFERENCES users(userId) ON DELETE SET NULL,
    INDEX idx_patient (patientId),
    INDEX idx_document_type (documentType),
    INDEX idx_category (category),
    INDEX idx_upload_date (uploadDate)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
