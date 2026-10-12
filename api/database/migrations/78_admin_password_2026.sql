-- Rotate default admin password (replace legacy weak default from early schema seeds)

UPDATE users
SET passwordHash = '$2a$10$mtrKAipPNLIfShTb/P4hs.YEpFe0wT/udAxYg98/vipHJI5ebFfwe'
WHERE username = 'admin';
