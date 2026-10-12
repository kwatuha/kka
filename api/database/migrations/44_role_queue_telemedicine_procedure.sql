-- Grant all roles access to new queue service points (same pattern as add_role_queue_access.sql)

INSERT INTO role_queue_access (roleId, servicePoint, isAllowed)
SELECT r.roleId, 'telemedicine', TRUE FROM roles r
ON DUPLICATE KEY UPDATE isAllowed = TRUE;

INSERT INTO role_queue_access (roleId, servicePoint, isAllowed)
SELECT r.roleId, 'procedure', TRUE FROM roles r
ON DUPLICATE KEY UPDATE isAllowed = TRUE;
