import "server-only";

const PASSWORD_ALGO = "PBKDF2-SHA256";
export const CLOUDFLARE_PBKDF2_MAX_ITERATIONS = 100000;
const DEFAULT_PASSWORD_ITERATIONS = CLOUDFLARE_PBKDF2_MAX_ITERATIONS;
const HASH_LENGTH_BYTES = 32;

function assertSupportedPbkdf2Iterations(iterations: number, context: "hash" | "verify"): number {
  if (!Number.isInteger(iterations) || iterations <= 0) {
    throw new Error(`PBKDF2 iteration count must be a positive integer for password ${context}.`);
  }

  if (iterations > CLOUDFLARE_PBKDF2_MAX_ITERATIONS) {
    const message =
      context === "hash"
        ? `PBKDF2 iteration count exceeds the Cloudflare Workers limit of ${CLOUDFLARE_PBKDF2_MAX_ITERATIONS}.`
        : `Stored password hash uses PBKDF2 iterations above the Cloudflare Workers limit of ${CLOUDFLARE_PBKDF2_MAX_ITERATIONS}.`;
    throw new Error(message);
  }

  return iterations;
}

function toBase64(buffer: ArrayBuffer): string {
  return Buffer.from(buffer).toString("base64");
}

function fromBase64(input: string): Uint8Array {
  return new Uint8Array(Buffer.from(input, "base64"));
}

export interface PasswordHashResult {
  password_hash: string;
  password_salt: string;
  password_iters: number;
  password_algo: string;
}

export interface PasswordHashInput {
  password_hash: string;
  password_salt: string;
  password_iters: number;
  password_algo: string;
}

async function deriveHash(password: string, salt: Uint8Array, iterations: number): Promise<string> {
  const saltBuffer = salt.buffer.slice(
    salt.byteOffset,
    salt.byteOffset + salt.byteLength,
  ) as ArrayBuffer;
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveBits"],
  );

  const bits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      hash: "SHA-256",
      salt: saltBuffer,
      iterations,
    },
    key,
    HASH_LENGTH_BYTES * 8,
  );

  return toBase64(bits);
}

export async function hashPassword(
  password: string,
  options?: { iterations?: number },
): Promise<PasswordHashResult> {
  const iterations = assertSupportedPbkdf2Iterations(options?.iterations ?? DEFAULT_PASSWORD_ITERATIONS, "hash");
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const passwordHash = await deriveHash(password, salt, iterations);

  return {
    password_hash: passwordHash,
    password_salt: toBase64(salt.buffer),
    password_iters: iterations,
    password_algo: PASSWORD_ALGO,
  };
}

export async function verifyPassword(password: string, stored: PasswordHashInput): Promise<boolean> {
  if (stored.password_algo !== PASSWORD_ALGO) {
    return false;
  }

  const iterations = assertSupportedPbkdf2Iterations(stored.password_iters, "verify");
  const computed = await deriveHash(password, fromBase64(stored.password_salt), iterations);
  return computed === stored.password_hash;
}
