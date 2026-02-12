(function () {
    'use strict';

    var USERNAME_MIN = 6;
    var USERNAME_MAX = 50;
    var USERNAME_PATTERN = /^[a-zA-Z0-9 _-]+$/;
    var PASSWORD_MIN = 8;
    var PASSWORD_MAX = 128;
    var EMAIL_MAX = 255;
    var EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    function validateUsername(value) {
        if (!value || !value.trim()) return 'Username is required';
        value = value.trim();
        if (value.length < USERNAME_MIN)
            return 'Username must be at least ' + USERNAME_MIN + ' characters';
        if (value.length > USERNAME_MAX)
            return 'Username must be at most ' + USERNAME_MAX + ' characters';
        if (!USERNAME_PATTERN.test(value))
            return 'Username may only contain letters, numbers, spaces, hyphens, and underscores';
        return null;
    }

    function validateEmail(value) {
        if (!value || !value.trim()) return 'Email is required';
        value = value.trim();
        if (value.length > EMAIL_MAX) return 'Email must be at most ' + EMAIL_MAX + ' characters';
        if (!EMAIL_PATTERN.test(value)) return 'Please provide a valid email address';
        return null;
    }

    function validatePassword(value) {
        if (!value) return 'Password is required';
        if (value.length < PASSWORD_MIN)
            return 'Password must be at least ' + PASSWORD_MIN + ' characters';
        if (value.length > PASSWORD_MAX)
            return 'Password must be at most ' + PASSWORD_MAX + ' characters';
        if (!/[A-Z]/.test(value)) return 'Password must contain at least 1 uppercase letter';
        if (!/[a-z]/.test(value)) return 'Password must contain at least 1 lowercase letter';
        if (!/[0-9]/.test(value)) return 'Password must contain at least 1 number';
        if (!/[^a-zA-Z0-9]/.test(value))
            return 'Password must contain at least 1 special character';
        return null;
    }

    function validatePasswordMatch(password, confirm) {
        if (!confirm) return 'Please confirm your password';
        if (password !== confirm) return 'Passwords do not match';
        return null;
    }

    function showFieldError(inputEl, msg) {
        clearFieldError(inputEl);
        inputEl.classList.add('input-field-error');
        var errorEl = document.createElement('p');
        errorEl.className = 'field-error';
        errorEl.textContent = msg;
        inputEl.parentNode.appendChild(errorEl);
    }

    function clearFieldError(inputEl) {
        inputEl.classList.remove('input-field-error');
        var existing = inputEl.parentNode.querySelector('.field-error');
        if (existing) existing.remove();
    }

    function validateField(inputEl, validatorFn) {
        var error = validatorFn(inputEl.value);
        if (error) {
            showFieldError(inputEl, error);
            return false;
        }
        clearFieldError(inputEl);
        return true;
    }

    function attachBlurValidation(inputEl, validatorFn) {
        inputEl.addEventListener('blur', function () {
            validateField(inputEl, validatorFn);
        });
        inputEl.addEventListener('input', function () {
            if (inputEl.parentNode.querySelector('.field-error')) {
                validateField(inputEl, validatorFn);
            }
        });
    }

    window.FormValidator = {
        validateUsername: validateUsername,
        validateEmail: validateEmail,
        validatePassword: validatePassword,
        validatePasswordMatch: validatePasswordMatch,
        showFieldError: showFieldError,
        clearFieldError: clearFieldError,
        validateField: validateField,
        attachBlurValidation: attachBlurValidation,
    };
})();
