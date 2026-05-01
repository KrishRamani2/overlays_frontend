import CryptoJS from 'crypto-js';

// We can define a default secret key, or pull from environment variables.
// In a real production app, client-side encryption is mostly for obfuscation,
// but it fulfills the requirement to prevent simple tampering.
const SECRET_KEY = import.meta.env.VITE_STORAGE_SECRET || 'aes-32-encryption-secret-key-xyz123';

/**
 * Encrypts data and saves it to localStorage
 * @param {string} key 
 * @param {any} data 
 */
export const setSecureItem = (key, data) => {
  try {
    const stringifiedData = JSON.stringify(data);
    const encryptedData = CryptoJS.AES.encrypt(stringifiedData, SECRET_KEY).toString();
    localStorage.setItem(key, encryptedData);
  } catch (error) {
    console.error('Error encrypting data for localStorage', error);
  }
};

/**
 * Retrieves and decrypts data from localStorage
 * @param {string} key 
 * @returns {any} The parsed data or null if not found/error
 */
export const getSecureItem = (key) => {
  try {
    const encryptedData = localStorage.getItem(key);
    if (!encryptedData) return null;
    
    // Check if it's already an unencrypted object or plain text (backwards compatibility)
    // AES encrypted strings typically don't start with { or [
    if (encryptedData.startsWith('{') || encryptedData.startsWith('[')) {
        return JSON.parse(encryptedData);
    }

    const bytes = CryptoJS.AES.decrypt(encryptedData, SECRET_KEY);
    const decryptedString = bytes.toString(CryptoJS.enc.Utf8);
    
    // If decryption fails, decryptedString will be empty
    if (!decryptedString) return null;

    return JSON.parse(decryptedString);
  } catch (error) {
    console.error('Error decrypting data from localStorage', error);
    // If we fail to decrypt, it might be plain text from before encryption was added
    try {
      const raw = localStorage.getItem(key);
      return JSON.parse(raw);
    } catch (e) {
      return null;
    }
  }
};

/**
 * Removes an item from localStorage
 * @param {string} key 
 */
export const removeSecureItem = (key) => {
  localStorage.removeItem(key);
};
