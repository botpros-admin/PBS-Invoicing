import CryptoJS from 'crypto-js';

// Encryption service for PII/PHI data
class FieldEncryptionService {
  private encryptionKey: string;
  private algorithm = 'AES';
  
  constructor() {
    // In production, this should come from a secure key management service
    this.encryptionKey = import.meta.env.VITE_ENCRYPTION_KEY || 
      this.generateDefaultKey();
  }

  /**
   * Generate a default encryption key (for development only)
   */
  private generateDefaultKey(): string {
    if (import.meta.env.DEV) {
      console.warn('Using default encryption key - DO NOT USE IN PRODUCTION');
      return 'dev-key-replace-in-production-with-secure-key-management';
    }
    throw new Error('Encryption key not configured');
  }

  /**
   * Encrypt sensitive field data
   */
  encrypt(plainText: string | null | undefined): string | null {
    if (!plainText) return null;
    
    try {
      const encrypted = CryptoJS.AES.encrypt(plainText, this.encryptionKey).toString();
      return encrypted;
    } catch (error) {
      console.error('Encryption error:', error);
      throw new Error('Failed to encrypt data');
    }
  }

  /**
   * Decrypt sensitive field data
   */
  decrypt(cipherText: string | null | undefined): string | null {
    if (!cipherText) return null;
    
    try {
      const decrypted = CryptoJS.AES.decrypt(cipherText, this.encryptionKey);
      return decrypted.toString(CryptoJS.enc.Utf8);
    } catch (error) {
      console.error('Decryption error:', error);
      throw new Error('Failed to decrypt data');
    }
  }

  /**
   * Encrypt an entire object's PII fields
   */
  encryptObject<T extends Record<string, any>>(
    obj: T,
    fieldsToEncrypt: (keyof T)[]
  ): T {
    const encrypted = { ...obj };
    
    for (const field of fieldsToEncrypt) {
      if (encrypted[field]) {
        encrypted[field] = this.encrypt(String(encrypted[field])) as any;
      }
    }
    
    return encrypted;
  }

  /**
   * Decrypt an entire object's PII fields
   */
  decryptObject<T extends Record<string, any>>(
    obj: T,
    fieldsToDecrypt: (keyof T)[]
  ): T {
    const decrypted = { ...obj };
    
    for (const field of fieldsToDecrypt) {
      if (decrypted[field]) {
        decrypted[field] = this.decrypt(String(decrypted[field])) as any;
      }
    }
    
    return decrypted;
  }

  /**
   * Hash data for comparison without storing plaintext
   */
  hash(data: string): string {
    return CryptoJS.SHA256(data).toString();
  }

  /**
   * Compare plaintext with hash
   */
  compareHash(plainText: string, hash: string): boolean {
    return this.hash(plainText) === hash;
  }

  /**
   * Mask sensitive data for display (e.g., SSN: ***-**-1234)
   */
  mask(data: string, visibleChars: number = 4): string {
    if (!data || data.length <= visibleChars) return data;
    
    const masked = '*'.repeat(data.length - visibleChars);
    const visible = data.slice(-visibleChars);
    
    // Special formatting for common PII types
    if (data.length === 9 && /^\d+$/.test(data)) {
      // SSN format
      return `***-**-${visible}`;
    } else if (data.length === 16 && /^\d+$/.test(data)) {
      // Credit card format
      return `****-****-****-${visible}`;
    }
    
    return masked + visible;
  }

  /**
   * Tokenize sensitive data for secure reference
   */
  tokenize(data: string): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2);
    const hash = this.hash(data + timestamp + random);
    return `tok_${hash.substring(0, 24)}`;
  }

  /**
   * Generate encryption key for client-specific data
   */
  generateClientKey(clientId: string): string {
    return CryptoJS.PBKDF2(
      clientId,
      this.encryptionKey,
      { keySize: 256/32, iterations: 1000 }
    ).toString();
  }

  /**
   * Encrypt with client-specific key
   */
  encryptForClient(plainText: string, clientId: string): string {
    const clientKey = this.generateClientKey(clientId);
    return CryptoJS.AES.encrypt(plainText, clientKey).toString();
  }

  /**
   * Decrypt with client-specific key
   */
  decryptForClient(cipherText: string, clientId: string): string {
    const clientKey = this.generateClientKey(clientId);
    const decrypted = CryptoJS.AES.decrypt(cipherText, clientKey);
    return decrypted.toString(CryptoJS.enc.Utf8);
  }
}

// PII field definitions for automatic encryption
export const PII_FIELDS = {
  patient: [
    'patient_first_name',
    'patient_last_name',
    'patient_dob',
    'patient_ssn',
    'patient_address',
    'patient_phone',
    'patient_email'
  ],
  payment: [
    'card_number',
    'account_number',
    'routing_number',
    'cvv'
  ],
  clinic: [
    'tax_id',
    'bank_account',
    'billing_contact_ssn'
  ]
};

// Singleton instance
export const fieldEncryption = new FieldEncryptionService();

// React hook for field encryption
export const useFieldEncryption = () => {
  const encryptPatientData = (data: any) => {
    return fieldEncryption.encryptObject(data, PII_FIELDS.patient);
  };

  const decryptPatientData = (data: any) => {
    return fieldEncryption.decryptObject(data, PII_FIELDS.patient);
  };

  const encryptPaymentData = (data: any) => {
    return fieldEncryption.encryptObject(data, PII_FIELDS.payment);
  };

  const decryptPaymentData = (data: any) => {
    return fieldEncryption.decryptObject(data, PII_FIELDS.payment);
  };

  const maskSSN = (ssn: string) => {
    return fieldEncryption.mask(ssn, 4);
  };

  const maskCardNumber = (cardNumber: string) => {
    return fieldEncryption.mask(cardNumber, 4);
  };

  return {
    encrypt: fieldEncryption.encrypt.bind(fieldEncryption),
    decrypt: fieldEncryption.decrypt.bind(fieldEncryption),
    encryptPatientData,
    decryptPatientData,
    encryptPaymentData,
    decryptPaymentData,
    maskSSN,
    maskCardNumber,
    hash: fieldEncryption.hash.bind(fieldEncryption),
    tokenize: fieldEncryption.tokenize.bind(fieldEncryption)
  };
};