// Input Validation Utilities
// Sanitize and validate user inputs

export class Validators {
    /**
     * Validate email format
     */
    static isValidEmail(email) {
        const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return regex.test(email);
    }

    /**
     * Validate password strength
     */
    static isValidPassword(password) {
        if (password.length < 8) {
            return { valid: false, error: 'Password must be at least 8 characters' };
        }

        if (!/[A-Z]/.test(password)) {
            return { valid: false, error: 'Password must contain uppercase letter' };
        }

        if (!/[a-z]/.test(password)) {
            return { valid: false, error: 'Password must contain lowercase letter' };
        }

        if (!/[0-9]/.test(password)) {
            return { valid: false, error: 'Password must contain a number' };
        }

        return { valid: true };
    }

    /**
     * Sanitize string input (prevent XSS)
     */
    static sanitizeString(input) {
        if (typeof input !== 'string') return '';

        return input
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#x27;')
            .replace(/\//g, '&#x2F;');
    }

    /**
     * Validate number range
     */
    static isInRange(value, min, max) {
        const num = Number(value);
        return !isNaN(num) && num >= min && num <= max;
    }

    /**
     * Validate required fields
     */
    static validateRequired(fields) {
        const errors = {};

        for (const [key, value] of Object.entries(fields)) {
            if (!value || (typeof value === 'string' && !value.trim())) {
                errors[key] = `${key} is required`;
            }
        }

        return {
            valid: Object.keys(errors).length === 0,
            errors
        };
    }

    /**
     * Validate US state code
     */
    static isValidState(stateCode) {
        const states = [
            'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
            'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
            'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
            'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
            'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY'
        ];

        return states.includes(stateCode?.toUpperCase());
    }

    /**
     * Validate zip code
     */
    static isValidZipCode(zip) {
        return /^\d{5}(-\d{4})?$/.test(zip);
    }

    /**
     * Validate phone number
     */
    static isValidPhone(phone) {
        const cleaned = phone.replace(/\D/g, '');
        return cleaned.length === 10 || cleaned.length === 11;
    }

    /**
     * Validate URL
     */
    static isValidUrl(url) {
        try {
            new URL(url);
            return true;
        } catch {
            return false;
        }
    }
}
