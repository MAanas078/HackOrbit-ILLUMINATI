import crypto from 'crypto';

export class SecurityService {
    // Generate 6-digit numeric verification code
    static generateNumericCode() {
        return Math.floor(100000 + Math.random() * 900000).toString();
    }

    // Generate secure token for password reset
    static generateSecurityToken() {
        return crypto.randomBytes(32).toString('hex');
    }

    // Generate secure token (alternative method)
    static generateSecureToken() {
        return crypto.randomBytes(20).toString('hex');
    }

    // Generate random string of specified length
    static generateRandomString(length = 32) {
        return crypto.randomBytes(Math.ceil(length / 2)).toString('hex').slice(0, length);
    }

    // Hash sensitive data
    static hashData(data) {
        return crypto.createHash('sha256').update(data).digest('hex');
    }

    // Generate CSRF token
    static generateCSRFToken() {
        return crypto.randomBytes(16).toString('hex');
    }
}