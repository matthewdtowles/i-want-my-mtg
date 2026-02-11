CREATE TABLE IF NOT EXISTS password_reset (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) NOT NULL,
    reset_token VARCHAR(255) UNIQUE NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_password_reset_token ON password_reset(reset_token);
CREATE INDEX IF NOT EXISTS idx_password_reset_expires ON password_reset(expires_at);
