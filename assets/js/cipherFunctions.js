// cipherFunctions.js
// Cifrei 4.0 - Argon2id calibrado por tempo + teto global

const CIFREI_KEY_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";
const CIFREI_KEY_MIN_LENGTH = 8;
const CIFREI_KEY_MAX_LENGTH = 25;
const CIFREI_CODE_VERSION = 4;
const CIFREI_GCM_IV_LENGTH = 12;
const CIFREI_KDF_SALT_LENGTH = 16;
const CIFREI_KDF_TIME_COST = 3;
const CIFREI_KDF_PARALLELISM = 1;
const CIFREI_KDF_HASH_LENGTH = 32;
const CIFREI_KDF_TARGET_MIN_MS = 400;
const CIFREI_KDF_TARGET_MAX_MS = 700;
const CIFREI_KDF_MAX_ACCEPTABLE_MS = 1500;
const CIFREI_KDF_MEMORY_OPTIONS_KIB = [4096, 8192, 12288, 16384, 24576, 32768];
const CIFREI_KDF_LOCALSTORAGE_KEY = 'cifrei.argon2.calibration.v4';
const CIFREI_ARGON2_TYPE_ID = 2; // Argon2id

function getCryptoObject() {
  return (
    (typeof window !== 'undefined' && window.crypto) ||
    (typeof self !== 'undefined' && self.crypto) ||
    null
  );
}

function getSubtleCrypto() {
  const globalCrypto = getCryptoObject();

  if (!globalCrypto || !globalCrypto.subtle) {
    throw new Error(
      'Web Crypto API indisponível. Abra o Cifrei em https:// ou http://localhost.'
    );
  }

  return globalCrypto.subtle;
}

function getSecureRandomBytes(length) {
  const cryptoObj = getCryptoObject();
  if (!cryptoObj || typeof cryptoObj.getRandomValues !== 'function') {
    throw new Error('Fonte criptográfica aleatória indisponível.');
  }

  const bytes = new Uint8Array(length);
  cryptoObj.getRandomValues(bytes);
  return bytes;
}

function bytesToBase64Url(bytes) {
  let binary = '';
  const chunkSize = 0x8000;

  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode(...chunk);
  }

  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

function base64UrlToBytes(base64url) {
  const normalized = String(base64url || '')
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  const paddingLength = (4 - (normalized.length % 4)) % 4;
  const padded = normalized + '='.repeat(paddingLength);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);

  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }

  return bytes;
}

function normalizeSecretInput(value) {
  return String(value || '').trim().normalize('NFC');
}

function sanitizeKeyInput(value) {
  return String(value || '')
    .replace(/[^A-Za-z0-9_-]/g, '')
    .slice(0, CIFREI_KEY_MAX_LENGTH);
}

function isValidKey(value) {
  const key = String(value || '').trim();

  return (
    key.length >= CIFREI_KEY_MIN_LENGTH &&
    key.length <= CIFREI_KEY_MAX_LENGTH &&
    /^[A-Za-z0-9_-]+$/.test(key)
  );
}

function generateKey() {
  const randomBytes = getSecureRandomBytes(CIFREI_KEY_MAX_LENGTH);
  let result = '';

  for (let i = 0; i < CIFREI_KEY_MAX_LENGTH; i++) {
    result += CIFREI_KEY_ALPHABET[randomBytes[i] % CIFREI_KEY_ALPHABET.length];
  }

  return result;
}

function getArgon2Library() {
  if (typeof window !== 'undefined' && window.argon2 && typeof window.argon2.hash === 'function') {
    return window.argon2;
  }

  if (typeof argon2 !== 'undefined' && argon2 && typeof argon2.hash === 'function') {
    return argon2;
  }

  throw new Error('Biblioteca Argon2 indisponível. Verifique o carregamento do script assets/js/vendor/argon2.js ou do CDN configurado no projeto.');
}

function isValidCalibrationObject(value) {
  return !!(
    value &&
    typeof value === 'object' &&
    Number.isInteger(value.memoryKiB) &&
    value.memoryKiB > 0 &&
    Number.isInteger(value.timeCost) &&
    value.timeCost > 0 &&
    Number.isInteger(value.parallelism) &&
    value.parallelism > 0
  );
}

function getStoredArgon2Calibration() {
  try {
    const raw = localStorage.getItem(CIFREI_KDF_LOCALSTORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return isValidCalibrationObject(parsed) ? parsed : null;
  } catch (err) {
    console.warn('[Cifrei] Não foi possível ler calibração Argon2 do localStorage:', err);
    return null;
  }
}

function storeArgon2Calibration(calibration) {
  try {
    localStorage.setItem(CIFREI_KDF_LOCALSTORAGE_KEY, JSON.stringify(calibration));
  } catch (err) {
    console.warn('[Cifrei] Não foi possível gravar calibração Argon2 no localStorage:', err);
  }
}

async function runArgon2Hash(keyMaterialString, saltBytes, params) {
  const argon2Lib = getArgon2Library();
  const hashType = (
    argon2Lib.ArgonType &&
    (argon2Lib.ArgonType.Argon2id ?? argon2Lib.ArgonType.Argon2ID ?? argon2Lib.ArgonType.ID)
  ) ?? CIFREI_ARGON2_TYPE_ID;

  const result = await argon2Lib.hash({
    pass: keyMaterialString,
    salt: saltBytes,
    time: params.timeCost,
    mem: params.memoryKiB,
    hashLen: CIFREI_KDF_HASH_LENGTH,
    parallelism: params.parallelism,
    type: hashType
  });

  if (!result || !result.hash) {
    throw new Error('Falha ao derivar chave com Argon2id.');
  }

  return result.hash instanceof Uint8Array ? result.hash : new Uint8Array(result.hash);
}

async function calibrateArgon2IfNeeded() {
  const cached = getStoredArgon2Calibration();
  if (cached) return cached;

  const calibrationSalt = getSecureRandomBytes(CIFREI_KDF_SALT_LENGTH);
  const calibrationInput = 'CIFREI4|CALIBRATION|DEVICE';

  let selected = {
    memoryKiB: CIFREI_KDF_MEMORY_OPTIONS_KIB[0],
    timeCost: CIFREI_KDF_TIME_COST,
    parallelism: CIFREI_KDF_PARALLELISM,
    measuredMs: null
  };

  for (const memoryKiB of CIFREI_KDF_MEMORY_OPTIONS_KIB) {
    const candidate = {
      memoryKiB,
      timeCost: CIFREI_KDF_TIME_COST,
      parallelism: CIFREI_KDF_PARALLELISM
    };

    const startedAt = performance.now();
    await runArgon2Hash(calibrationInput, calibrationSalt, candidate);
    const elapsedMs = Math.round(performance.now() - startedAt);

    selected = {
      memoryKiB,
      timeCost: CIFREI_KDF_TIME_COST,
      parallelism: CIFREI_KDF_PARALLELISM,
      measuredMs: elapsedMs
    };

    if (elapsedMs >= CIFREI_KDF_TARGET_MIN_MS && elapsedMs <= CIFREI_KDF_TARGET_MAX_MS) {
      break;
    }

    if (elapsedMs > CIFREI_KDF_MAX_ACCEPTABLE_MS) {
      break;
    }
  }

  storeArgon2Calibration(selected);
  return selected;
}

function encodeUint16(value) {
  if (!Number.isInteger(value) || value < 0 || value > 0xffff) {
    throw new Error('Valor uint16 inválido.');
  }

  return new Uint8Array([(value >> 8) & 0xff, value & 0xff]);
}

function decodeUint16(bytes, offset) {
  return ((bytes[offset] << 8) | bytes[offset + 1]) >>> 0;
}

async function deriveAesKeyFromPassphraseAndKey(passphrase, chave, saltBytes, params) {
  const subtle = getSubtleCrypto();
  const keyMaterialString = `CIFREI4|${normalizeSecretInput(passphrase)}|${sanitizeKeyInput(chave)}`;
  const rawKeyBytes = await runArgon2Hash(keyMaterialString, saltBytes, params);

  return subtle.importKey(
    'raw',
    rawKeyBytes,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

async function encrypt(textoAberto, chave, passphrase) {
  const normalizedSecret = normalizeSecretInput(passphrase);
  const normalizedKey = sanitizeKeyInput(chave);

  if (!normalizedSecret) throw new Error('Frase segredo inválida ou vazia.');
  if (!isValidKey(normalizedKey)) throw new Error('Chave inválida.');

  const subtle = getSubtleCrypto();
  const enc = new TextEncoder();
  const salt = getSecureRandomBytes(CIFREI_KDF_SALT_LENGTH);
  const iv = getSecureRandomBytes(CIFREI_GCM_IV_LENGTH);
  const kdfParams = await calibrateArgon2IfNeeded();
  const aesKey = await deriveAesKeyFromPassphraseAndKey(normalizedSecret, normalizedKey, salt, kdfParams);

  const cipherBuffer = await subtle.encrypt(
    {
      name: 'AES-GCM',
      iv,
      additionalData: enc.encode('C4'),
      tagLength: 128
    },
    aesKey,
    enc.encode(String(textoAberto || '').normalize('NFC'))
  );

  const cipherBytes = new Uint8Array(cipherBuffer);
  const headerLength = 1 + 2 + 1 + 1 + salt.length + iv.length;
  const payload = new Uint8Array(headerLength + cipherBytes.length);

  let offset = 0;
  payload[offset++] = CIFREI_CODE_VERSION;
  payload.set(encodeUint16(kdfParams.memoryKiB), offset);
  offset += 2;
  payload[offset++] = kdfParams.timeCost & 0xff;
  payload[offset++] = kdfParams.parallelism & 0xff;
  payload.set(salt, offset);
  offset += salt.length;
  payload.set(iv, offset);
  offset += iv.length;
  payload.set(cipherBytes, offset);

  return bytesToBase64Url(payload);
}

function tryParseCompactCode(textoCifrado) {
  const payload = base64UrlToBytes(String(textoCifrado || '').trim());
  const minimumLength = 1 + 2 + 1 + 1 + CIFREI_KDF_SALT_LENGTH + CIFREI_GCM_IV_LENGTH + 16;

  if (payload.length < minimumLength) throw new Error('Código muito curto.');
  if (payload[0] !== CIFREI_CODE_VERSION) throw new Error('Versão de código incompatível.');

  let offset = 1;
  const memoryKiB = decodeUint16(payload, offset);
  offset += 2;
  const timeCost = payload[offset++];
  const parallelism = payload[offset++];
  const salt = payload.slice(offset, offset + CIFREI_KDF_SALT_LENGTH);
  offset += CIFREI_KDF_SALT_LENGTH;
  const iv = payload.slice(offset, offset + CIFREI_GCM_IV_LENGTH);
  offset += CIFREI_GCM_IV_LENGTH;
  const ciphertext = payload.slice(offset);

  if (!memoryKiB || !timeCost || !parallelism || !ciphertext.length) {
    throw new Error('Código inválido.');
  }

  return {
    params: {
      memoryKiB,
      timeCost,
      parallelism
    },
    salt,
    iv,
    ciphertext
  };
}

async function decrypt(textoCifrado, chave, passphrase) {
  const normalizedSecret = normalizeSecretInput(passphrase);
  const normalizedKey = sanitizeKeyInput(chave);

  if (!normalizedSecret) throw new Error('Frase segredo inválida ou vazia.');
  if (!isValidKey(normalizedKey)) throw new Error('Chave inválida.');

  const parsed = tryParseCompactCode(textoCifrado);
  const aesKey = await deriveAesKeyFromPassphraseAndKey(normalizedSecret, normalizedKey, parsed.salt, parsed.params);
  const subtle = getSubtleCrypto();
  const enc = new TextEncoder();

  const plainBuffer = await subtle.decrypt(
    { name: 'AES-GCM', iv: parsed.iv, additionalData: enc.encode('C4'), tagLength: 128 },
    aesKey,
    parsed.ciphertext
  );

  return new TextDecoder().decode(plainBuffer);
}
