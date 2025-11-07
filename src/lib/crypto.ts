// Client-side encryption utilities using WebCrypto API

const PBKDF2_ITERATIONS = 200000;

/**
 * Generate a random device key and store it in localStorage
 */
export async function getOrCreateDeviceKey(): Promise<string> {
  let deviceKey = localStorage.getItem('device_key');
  
  if (!deviceKey) {
    const keyArray = new Uint8Array(32);
    crypto.getRandomValues(keyArray);
    deviceKey = Array.from(keyArray)
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
    localStorage.setItem('device_key', deviceKey);
  }
  
  return deviceKey;
}

/**
 * Derive an AES-GCM key from the device key using PBKDF2
 */
async function deriveKey(deviceKey: string, purpose: 'encrypt' | 'hmac' = 'encrypt'): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const keyMaterial = encoder.encode(deviceKey);
  
  const importedKey = await crypto.subtle.importKey(
    'raw',
    keyMaterial,
    'PBKDF2',
    false,
    ['deriveBits', 'deriveKey']
  );

  const salt = encoder.encode(`neolia-ha-${purpose}`);

  if (purpose === 'hmac') {
    return crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt,
        iterations: PBKDF2_ITERATIONS,
        hash: 'SHA-256',
      },
      importedKey,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign', 'verify']
    );
  }

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt,
      iterations: PBKDF2_ITERATIONS,
      hash: 'SHA-256',
    },
    importedKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

/**
 * Encrypt data using AES-GCM with HMAC authentication
 */
export async function encryptData(data: string): Promise<string> {
  const deviceKey = await getOrCreateDeviceKey();
  const encryptKey = await deriveKey(deviceKey, 'encrypt');
  const hmacKey = await deriveKey(deviceKey, 'hmac');
  
  const encoder = new TextEncoder();
  const nonce = crypto.getRandomValues(new Uint8Array(12));
  const plaintext = encoder.encode(data);
  
  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: nonce },
    encryptKey,
    plaintext
  );
  
  // Combine nonce + ciphertext
  const combined = new Uint8Array(nonce.length + ciphertext.byteLength);
  combined.set(nonce, 0);
  combined.set(new Uint8Array(ciphertext), nonce.length);
  
  // Generate HMAC for integrity check
  const hmacSignature = await crypto.subtle.sign(
    'HMAC',
    hmacKey,
    combined
  );
  
  // Combine data + HMAC
  const withHmac = new Uint8Array(combined.length + hmacSignature.byteLength);
  withHmac.set(combined, 0);
  withHmac.set(new Uint8Array(hmacSignature), combined.length);
  
  // Convert to base64
  return btoa(String.fromCharCode(...withHmac));
}

/**
 * Decrypt data using AES-GCM with HMAC verification
 */
export async function decryptData(encryptedBase64: string): Promise<string> {
  const deviceKey = await getOrCreateDeviceKey();
  const encryptKey = await deriveKey(deviceKey, 'encrypt');
  const hmacKey = await deriveKey(deviceKey, 'hmac');
  
  // Decode from base64
  const withHmac = Uint8Array.from(atob(encryptedBase64), c => c.charCodeAt(0));
  
  // HMAC is last 32 bytes (SHA-256 output)
  const hmacSize = 32;
  if (withHmac.length < hmacSize + 12) {
    throw new Error('Invalid encrypted data');
  }
  
  const combined = withHmac.slice(0, -hmacSize);
  const storedHmac = withHmac.slice(-hmacSize);
  
  // Verify HMAC
  const isValid = await crypto.subtle.verify(
    'HMAC',
    hmacKey,
    storedHmac,
    combined
  );
  
  if (!isValid) {
    throw new Error('Data integrity check failed - possible tampering detected');
  }
  
  const nonce = combined.slice(0, 12);
  const ciphertext = combined.slice(12);
  
  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: nonce },
    encryptKey,
    ciphertext
  );
  
  const decoder = new TextDecoder();
  return decoder.decode(decrypted);
}

/**
 * Store encrypted HA credentials
 */
export async function storeHACredentials(baseUrl: string, token: string): Promise<void> {
  const data = JSON.stringify({ baseUrl, token });
  const encrypted = await encryptData(data);
  localStorage.setItem('ha_credentials_enc', encrypted);
}

/**
 * Retrieve and decrypt HA credentials
 */
export async function getHACredentials(): Promise<{ baseUrl: string; token: string } | null> {
  const encrypted = localStorage.getItem('ha_credentials_enc');
  if (!encrypted) {
    return null;
  }
  
  try {
    const decrypted = await decryptData(encrypted);
    return JSON.parse(decrypted);
  } catch (error) {
    console.error('Failed to decrypt credentials:', error);
    return null;
  }
}

/**
 * Clear stored credentials
 */
export function clearHACredentials(): void {
  localStorage.removeItem('ha_credentials_enc');
  localStorage.removeItem('device_key');
}