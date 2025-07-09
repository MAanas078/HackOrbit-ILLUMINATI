export class AuthValidationService {
    
    // Signup validation
    static validateSignup(data) {
        const errors = [];
        const { name, email, password } = data;

        // Name validation
        if (!name || name.trim().length === 0) {
            errors.push("Name is required");
        }
        if (name && name.trim().length < 2) {
            errors.push("Name must be at least 2 characters long");
        }
        if (name && name.trim().length > 50) {
            errors.push("Name must be less than 50 characters");
        }

        // Email validation
        if (!this.isValidEmail(email)) {
            errors.push("Please provide a valid email address");
        }

        // Password validation
        const passwordValidation = this.validatePassword(password);
        if (!passwordValidation.isValid) {
            errors.push(...passwordValidation.errors);
        }

        return {
            isValid: errors.length === 0,
            errors
        };
    }

    // Login validation
    static validateLogin(data) {
        const errors = [];
        const { email, password } = data;

        if (!email) {
            errors.push("Email is required");
        } else if (!this.isValidEmail(email)) {
            errors.push("Please provide a valid email address");
        }

        if (!password) {
            errors.push("Password is required");
        }

        return {
            isValid: errors.length === 0,
            errors
        };
    }

    // Password validation
    static validatePassword(password) {
        const errors = [];
        
        if (!password || password.length < 8) {
            errors.push("Password must be at least 8 characters long");
        }
        if (!/(?=.*[a-z])/.test(password)) {
            errors.push("Password must contain at least one lowercase letter");
        }
        if (!/(?=.*[A-Z])/.test(password)) {
            errors.push("Password must contain at least one uppercase letter");
        }
        if (!/(?=.*\d)/.test(password)) {
            errors.push("Password must contain at least one number");
        }
        if (!/(?=.*[@$!%*?&])/.test(password)) {
            errors.push("Password must contain at least one special character (@$!%*?&)");
        }
        if (password.length > 128) {
            errors.push("Password must be less than 128 characters");
        }
        
        return {
            isValid: errors.length === 0,
            errors
        };
    }

    // Email validation
    static isValidEmail(email) {
        const emailRegex = /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/;
        return email && emailRegex.test(email);
    }

    // Name validation
    static isValidName(name) {
        if (!name || typeof name !== 'string') return false;
        const trimmedName = name.trim();
        return trimmedName.length >= 2 && trimmedName.length <= 50;
    }

    // Generic field validation
    static validateRequired(fields) {
        const errors = [];
        
        Object.entries(fields).forEach(([fieldName, value]) => {
            if (!value || (typeof value === 'string' && value.trim().length === 0)) {
                errors.push(`${fieldName} is required`);
            }
        });

        return {
            isValid: errors.length === 0,
            errors
        };
    }
}