/**
 * Form Validation Utilities
 * Provides reusable validation rules and error messages for all forms across the app
 */

/**
 * Validate phone number - must be 10 digits, numbers only
 */
export const validatePhone = (phone) => {
  if (!phone) {
    return { valid: false, error: "Phone number is required" };
  }

  const cleaned = String(phone).replace(/\D/g, "");
  
  if (cleaned.length !== 10) {
    return { valid: false, error: "Phone number must be 10 digits" };
  }

  return { valid: true, error: null };
};

/**
 * Validate email format
 */
export const validateEmail = (email) => {
  if (!email) {
    return { valid: false, error: "Email is required" };
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  
  if (!emailRegex.test(email)) {
    return { valid: false, error: "Please enter a valid email address" };
  }

  return { valid: true, error: null };
};

/**
 * Validate password strength
 */
export const validatePassword = (password) => {
  if (!password) {
    return { valid: false, error: "Password is required" };
  }

  if (password.length < 8) {
    return { valid: false, error: "Password must be at least 8 characters" };
  }

  if (!/[A-Z]/.test(password)) {
    return { valid: false, error: "Password must contain at least one uppercase letter" };
  }

  if (!/[a-z]/.test(password)) {
    return { valid: false, error: "Password must contain at least one lowercase letter" };
  }

  if (!/[0-9]/.test(password)) {
    return { valid: false, error: "Password must contain at least one number" };
  }

  return { valid: true, error: null };
};

/**
 * Validate name - letters, spaces, hyphens only
 */
export const validateName = (name) => {
  if (!name || !name.trim()) {
    return { valid: false, error: "Name is required" };
  }

  if (name.trim().length < 2) {
    return { valid: false, error: "Name must be at least 2 characters" };
  }

  if (!/^[a-zA-Z\s\-']+$/.test(name)) {
    return { valid: false, error: "Name can only contain letters, spaces, and hyphens" };
  }

  return { valid: true, error: null };
};

/**
 * Validate city/location
 */
export const validateCity = (city) => {
  if (!city || !city.trim()) {
    return { valid: false, error: "City is required" };
  }

  if (city.trim().length < 2) {
    return { valid: false, error: "Please enter a valid city name" };
  }

  return { valid: true, error: null };
};

/**
 * Validate text field - not empty, min length
 */
export const validateTextField = (text, minLength = 1, fieldName = "Field") => {
  if (!text || !String(text).trim()) {
    return { valid: false, error: `${fieldName} is required` };
  }

  if (String(text).trim().length < minLength) {
    return { valid: false, error: `${fieldName} must be at least ${minLength} characters` };
  }

  return { valid: true, error: null };
};

/**
 * Validate number - must be numeric, optionally within range
 */
export const validateNumber = (value, fieldName = "Number", min = null, max = null) => {
  if (value === null || value === undefined || value === "") {
    return { valid: false, error: `${fieldName} is required` };
  }

  const num = Number(value);

  if (isNaN(num)) {
    return { valid: false, error: `${fieldName} must be a valid number` };
  }

  if (min !== null && num < min) {
    return { valid: false, error: `${fieldName} must be at least ${min}` };
  }

  if (max !== null && num > max) {
    return { valid: false, error: `${fieldName} cannot exceed ${max}` };
  }

  return { valid: true, error: null };
};

/**
 * Validate date - not in past, optionally required
 */
export const validateDate = (date, allowPast = false) => {
  if (!date) {
    return { valid: false, error: "Date is required" };
  }

  const selectedDate = new Date(date);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (!allowPast && selectedDate < today) {
    return { valid: false, error: "Date cannot be in the past" };
  }

  return { valid: true, error: null };
};

/**
 * Validate time (HH:MM format)
 */
export const validateTime = (time) => {
  if (!time) {
    return { valid: false, error: "Time is required" };
  }

  const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
  
  if (!timeRegex.test(time)) {
    return { valid: false, error: "Please enter time in HH:MM format" };
  }

  return { valid: true, error: null };
};

/**
 * Validate experience years
 */
export const validateExperience = (years) => {
  const result = validateNumber(years, "Experience", 0, 70);
  
  if (!result.valid) {
    return result;
  }

  if (!Number.isInteger(Number(years))) {
    return { valid: false, error: "Experience must be a whole number" };
  }

  return { valid: true, error: null };
};

/**
 * Validate rating (1-5 stars)
 */
export const validateRating = (rating) => {
  return validateNumber(rating, "Rating", 1, 5);
};

/**
 * Validate URL
 */
export const validateUrl = (url) => {
  if (!url || !url.trim()) {
    return { valid: false, error: "URL is required" };
  }

  try {
    new URL(url);
    return { valid: true, error: null };
  } catch {
    return { valid: false, error: "Please enter a valid URL" };
  }
};

/**
 * Sanitize phone input - remove non-numeric characters
 */
export const sanitizePhone = (phone) => {
  return String(phone || "").replace(/\D/g, "").slice(0, 10);
};

/**
 * Trim and normalize text input
 */
export const normalizeText = (text) => {
  return String(text || "").trim();
};

/**
 * Format phone number for display (XXX-XXX-XXXX)
 */
export const formatPhone = (phone) => {
  const cleaned = sanitizePhone(phone);
  if (cleaned.length !== 10) return cleaned;
  return `${cleaned.slice(0, 3)}-${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
};

/**
 * Run multiple validations at once and return all errors
 */
export const validateForm = (formData, rules) => {
  const errors = {};
  let isValid = true;

  Object.keys(rules).forEach((fieldName) => {
    const validator = rules[fieldName];
    const value = formData[fieldName];
    const result = validator(value);

    if (!result.valid) {
      errors[fieldName] = result.error;
      isValid = false;
    }
  });

  return { isValid, errors };
};
