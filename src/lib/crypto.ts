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
async function deriveKey(deviceKey: string): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const keyMaterial = encoder.encode(deviceKey);
  
  const importedKey = await crypto.subtle.importKey(
    'raw',
    keyMaterial,
    'PBKDF2',
    false,
    ['deriveBits', 'deriveKey']
  );

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: encoder.encode('neolia-ha-salt'), // Static salt is OK here since deviceKey is random
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
 * Encrypt data using AES-GCM
 */
export async function encryptData(data: string): Promise<string> {
  const deviceKey = await getOrCreateDeviceKey();
  const key = await deriveKey(deviceKey);
  
  const encoder = new TextEncoder();
  const nonce = crypto.getRandomValues(new Uint8Array(12));
  const plaintext = encoder.encode(data);
  
  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: nonce },
    key,
    plaintext
  );
  
  // Combine nonce + ciphertext
  const combined = new Uint8Array(nonce.length + ciphertext.byteLength);
  combined.set(nonce, 0);
  combined.set(new Uint8Array(ciphertext), nonce.length);
  
  // Convert to base64
  return btoa(String.fromCharCode(...combined));
}

/**
 * Decrypt data using AES-GCM
 */
export async function decryptData(encryptedBase64: string): Promise<string> {
  const deviceKey = await getOrCreateDeviceKey();
  const key = await deriveKey(deviceKey);
  
  // Decode from base64
  const combined = Uint8Array.from(atob(encryptedBase64), c => c.charCodeAt(0));
  
  const nonce = combined.slice(0, 12);
  const ciphertext = combined.slice(12);
  
  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: nonce },
    key,
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