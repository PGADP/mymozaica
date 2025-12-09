/**
 * VALIDATORS
 * Fonctions de validation
 */

/**
 * Valide un email
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Valide une date (format YYYY-MM-DD ou timestamp)
 */
export function isValidDate(date: string): boolean {
  const timestamp = Date.parse(date);
  return !isNaN(timestamp);
}

/**
 * Valide que le texte n'est pas vide
 */
export function isNotEmpty(text: string): boolean {
  return text.trim().length > 0;
}

/**
 * Valide la longueur d'un texte
 */
export function isValidLength(
  text: string,
  min: number,
  max: number
): boolean {
  const length = text.trim().length;
  return length >= min && length <= max;
}
