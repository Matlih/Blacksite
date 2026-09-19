/**
 * totp.ts — Native Web Crypto TOTP (RFC 6238) Generator
 * 100% offline, zero-dependency authenticator logic.
 */

// Base32 decoder
function decodeBase32(encoded: string): Uint8Array {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  let bits = 0;
  let value = 0;
  let index = 0;
  
  // Clean string: uppercase, remove spaces/dashes
  const cleanStr = encoded.toUpperCase().replace(/[\s-]/g, "");
  
  const output = new Uint8Array(Math.ceil((cleanStr.length * 5) / 8));
  
  for (let i = 0; i < cleanStr.length; i++) {
    const char = cleanStr[i];
    if (char === "=") break;
    
    const val = alphabet.indexOf(char);
    if (val === -1) throw new Error("Invalid base32 character");
    
    value = (value << 5) | val;
    bits += 5;
    
    if (bits >= 8) {
      output[index++] = (value >>> (bits - 8)) & 255;
      bits -= 8;
    }
  }
  
  return output.slice(0, index);
}

// Convert number to 8-byte buffer
function counterToBytes(counter: number): Uint8Array {
  const buffer = new ArrayBuffer(8);
  const view = new DataView(buffer);
  
  // JavaScript bitwise operations are 32-bit. 
  // We need to write a 64-bit big-endian counter.
  const high = Math.floor(counter / 4294967296);
  const low = counter % 4294967296;
  
  view.setUint32(0, high, false);
  view.setUint32(4, low, false);
  
  return new Uint8Array(buffer);
}

/**
 * Extracts secret from otpauth:// uri or returns the cleaned string if raw base32.
 */
export function extractTotpSecret(input: string): string {
  const trimmed = input.trim();
  if (trimmed.startsWith("otpauth://")) {
    try {
      const url = new URL(trimmed);
      const secret = url.searchParams.get("secret");
      if (secret) return secret.replace(/[\s-]/g, "").toUpperCase();
    } catch {
      // Ignore URL parse error, fallback
    }
  }
  return trimmed.replace(/[\s-]/g, "").toUpperCase();
}

/**
 * Validates if the secret is a valid base32 string.
 */
export function isValidBase32(secret: string): boolean {
  try {
    const s = extractTotpSecret(secret);
    if (!s) return false;
    decodeBase32(s);
    return true;
  } catch {
    return false;
  }
}

/**
 * Generates the 6-digit TOTP code and metadata for the given secret.
 */
export async function generateTotp(secret: string): Promise<{ code: string; remainingSeconds: number; progress: number }> {
  const cleanSecret = extractTotpSecret(secret);
  if (!cleanSecret) throw new Error("Empty secret");
  
  const keyBytes = decodeBase32(cleanSecret);
  
  const key = await crypto.subtle.importKey(
    "raw",
    keyBytes,
    { name: "HMAC", hash: "SHA-1" },
    false,
    ["sign"]
  );
  
  const epochSeconds = Math.floor(Date.now() / 1000);
  const timeStep = 30;
  const counter = Math.floor(epochSeconds / timeStep);
  
  const remainingSeconds = timeStep - (epochSeconds % timeStep);
  const progress = (remainingSeconds / timeStep) * 100;
  
  const counterBytes = counterToBytes(counter);
  const signature = await crypto.subtle.sign("HMAC", key, counterBytes);
  const hmacResult = new Uint8Array(signature);
  
  // Dynamic Truncation
  const offset = hmacResult[19] & 0xf;
  const binary =
    ((hmacResult[offset] & 0x7f) << 24) |
    ((hmacResult[offset + 1] & 0xff) << 16) |
    ((hmacResult[offset + 2] & 0xff) << 8) |
    (hmacResult[offset + 3] & 0xff);
    
  const otp = (binary % 1000000).toString().padStart(6, "0");
  
  return { code: otp, remainingSeconds, progress };
}
