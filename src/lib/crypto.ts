const ENCRYPTION_KEY_SECRET = "YOUR_SUPER_SECRET_AND_LONG_KEY_HERE_DO_NOT_CHANGE_AFTER_DEPLOYMENT"; // 이 값은 배포 후 변경하지 마세요!

async function getKeyMaterial(password: string): Promise<CryptoKey> {
  const enc = new TextEncoder();
  return window.crypto.subtle.importKey(
    "raw",
    enc.encode(password),
    { name: "PBKDF2" },
    false,
    ["deriveBits", "deriveKey"]
  );
}

async function getDerivedKey(keyMaterial: CryptoKey, salt: Uint8Array): Promise<CryptoKey> {
  return window.crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: salt,
      iterations: 100000, // 충분히 높은 반복 횟수
      hash: "SHA-256",
    },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    true,
    ["encrypt", "decrypt"]
  );
}

export async function encryptData(data: string): Promise<{ encryptedData: string; iv: string; salt: string }> {
  const enc = new TextEncoder();
  const dataBuffer = enc.encode(data);
  const salt = window.crypto.getRandomValues(new Uint8Array(16)); // 16바이트 솔트
  const iv = window.crypto.getRandomValues(new Uint8Array(12)); // 12바이트 IV (AES-GCM 권장)

  const keyMaterial = await getKeyMaterial(ENCRYPTION_KEY_SECRET);
  const key = await getDerivedKey(keyMaterial, salt);

  const encryptedBuffer = await window.crypto.subtle.encrypt(
    { name: "AES-GCM", iv: iv },
    key,
    dataBuffer
  );

  return {
    encryptedData: btoa(String.fromCharCode(...new Uint8Array(encryptedBuffer))),
    iv: btoa(String.fromCharCode(...iv)),
    salt: btoa(String.fromCharCode(...salt)),
  };
}

export async function decryptData(encryptedData: string, iv: string, salt: string): Promise<string> {
  const dec = new TextDecoder();
  const encryptedBuffer = Uint8Array.from(atob(encryptedData), c => c.charCodeAt(0));
  const ivBuffer = Uint8Array.from(atob(iv), c => c.charCodeAt(0));
  const saltBuffer = Uint8Array.from(atob(salt), c => c.charCodeAt(0));

  const keyMaterial = await getKeyMaterial(ENCRYPTION_KEY_SECRET);
  const key = await getDerivedKey(keyMaterial, saltBuffer);

  const decryptedBuffer = await window.crypto.subtle.decrypt(
    { name: "AES-GCM", iv: ivBuffer },
    key,
    encryptedBuffer
  );

  return dec.decode(decryptedBuffer);
}
