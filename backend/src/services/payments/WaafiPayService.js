import crypto from 'crypto';
import { env } from '../../config/env.js';
import { maskPhone } from '../../utils/phone.js';
import { roundMoney, toCents } from '../../utils/money.js';

const PLACEHOLDER_KEYS = new Set(['', 'YOUR_API_KEY', 'your_api_key', 'REPLACE_ME', 'replace_me']);

function formatTimestamp() {
  const now = new Date();
  const pad = (n, len = 2) => String(n).padStart(len, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}.${pad(now.getMilliseconds(), 3)}`;
}

function generateRequestId() {
  return crypto.randomUUID();
}

function sanitizeWaafiToken(value, fallback = 'PAY') {
  const cleaned = String(value || '')
    .replace(/[^A-Za-z0-9._-]/g, '')
    .slice(0, 48);
  return cleaned || fallback;
}

function generateReference(prefix = 'WED-PAY') {
  const stamp = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const suffix = crypto.randomBytes(3).toString('hex').toUpperCase();
  return `${sanitizeWaafiToken(prefix, 'WED-PAY')}-${stamp}-${suffix}`;
}

function isPlaceholderApiKey(key) {
  const normalized = String(key || '').trim();
  return PLACEHOLDER_KEYS.has(normalized);
}

export function isWaafiConfigured() {
  return Boolean(
    env.waafi.baseUrl
    && env.waafi.merchantUid
    && env.waafi.apiUserId
    && env.waafi.apiKey
    && !isPlaceholderApiKey(env.waafi.apiKey),
  );
}

function assertWaafiConfigured() {
  if (!env.waafi.baseUrl) {
    const err = new Error('WaafiPay API credentials are not configured.');
    err.statusCode = 503;
    throw err;
  }
  if (!env.waafi.merchantUid || !env.waafi.apiUserId || !env.waafi.apiKey || isPlaceholderApiKey(env.waafi.apiKey)) {
    const err = new Error('WaafiPay API credentials are not configured.');
    err.statusCode = 503;
    throw err;
  }
}

export function logWaafiStartupStatus() {
  const configured = isWaafiConfigured();
  const mode = env.waafi.baseUrl?.includes('waafipay.net') ? 'production' : 'custom';
  console.log(`WaafiPay environment: ${mode}`);
  console.log(`WaafiPay merchant configured: ${configured ? 'yes' : 'no'}`);
}

function mapProviderState(responseCode, state) {
  if (String(responseCode) !== '2001') return 'failed';
  const normalized = String(state || '').toUpperCase();
  if (normalized === 'APPROVED') return 'successful';
  if (['REJECTED', 'FAILED', 'DECLINED', 'CANCELLED', 'EXPIRED'].includes(normalized)) return 'failed';
  return 'pending';
}

function amountsMatch(expected, providerAmount) {
  if (providerAmount == null || providerAmount === '') return true;
  const expectedCents = toCents(roundMoney(expected));
  const providerCents = toCents(roundMoney(Number(providerAmount)));
  return expectedCents === providerCents;
}

export function mapWaafiUserMessage(responseCode, providerState, responseMessage) {
  const code = String(responseCode || '');
  const state = String(providerState || '').toUpperCase();
  const msg = String(responseMessage || '').toLowerCase();

  if (code === '503' || msg.includes('timeout') || msg.includes('network')) {
    return 'Payment could not be completed due to a network issue. Please try again.';
  }
  if (msg.includes('credential') || msg.includes('unauthorized') || code === '5001') {
    return 'Payment could not be completed. Please contact support.';
  }
  if (msg.includes('insufficient') || msg.includes('balance')) {
    return 'Payment was not completed. Insufficient wallet balance.';
  }
  if (msg.includes('wallet') || msg.includes('account') || msg.includes('invalid')) {
    return 'Payment was not completed. Please check the payment number and try again.';
  }
  if (state && state !== 'APPROVED') {
    return 'Payment was not completed. Please check the payment number and try again.';
  }
  if (code !== '2001') {
    return 'Payment was not completed. Please check the payment number and try again.';
  }
  return 'Payment was not completed. Please verify the payment number and try again.';
}

export async function initiateWaafiPurchase({
  normalizedPhone,
  description,
  internalReference,
  localInvoiceId,
  amount,
}) {
  assertWaafiConfigured();

  const chargeAmount = roundMoney(amount);
  if (!Number.isFinite(chargeAmount) || chargeAmount <= 0) {
    const err = new Error('Payment amount must be greater than zero');
    err.statusCode = 400;
    throw err;
  }

  const requestId = generateRequestId();
  const referenceId = sanitizeWaafiToken(internalReference, 'WED-PAY') || generateReference();
  const invoiceId = sanitizeWaafiToken(localInvoiceId, 'INV') || generateReference('INV');
  const currency = env.waafi.currency || 'USD';

  const payload = {
    schemaVersion: '1.0',
    requestId,
    timestamp: formatTimestamp(),
    channelName: env.waafi.channelName,
    serviceName: env.waafi.serviceName,
    serviceParams: {
      merchantUid: env.waafi.merchantUid,
      apiUserId: env.waafi.apiUserId,
      apiKey: env.waafi.apiKey,
      paymentMethod: 'MWALLET_ACCOUNT',
      payerInfo: {
        accountNo: normalizedPhone,
      },
      transactionInfo: {
        referenceId,
        invoiceId,
        amount: String(chargeAmount),
        currency,
        description: description || 'Wedding Planning Payment',
      },
    },
  };

  console.log('[WAAFI] initiating purchase', {
    requestId,
    referenceId,
    invoiceId,
    phone: maskPhone(normalizedPhone),
    amount: chargeAmount,
    currency,
  });

  let response;
  let body = {};
  try {
    response = await fetch(env.waafi.baseUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    body = await response.json().catch(() => ({}));
  } catch (networkError) {
    console.error('[WAAFI] network error', { requestId, message: networkError.message });
    const err = new Error('Payment could not be completed due to a network issue. Please try again.');
    err.statusCode = 503;
    throw err;
  }

  const responseCode = String(body.responseCode ?? '');
  const providerState = body.params?.state;
  let status = mapProviderState(responseCode, providerState);
  const txAmount = body.params?.txAmount;

  if (status === 'successful' && !amountsMatch(chargeAmount, txAmount)) {
    console.error('[WAAFI] amount mismatch', {
      requestId,
      expected: chargeAmount,
      txAmount,
      transactionId: body.params?.transactionId || null,
    });
    status = 'failed';
  }

  console.log('[WAAFI] provider response', {
    requestId,
    referenceId,
    responseCode,
    state: providerState,
    status,
    transactionId: body.params?.transactionId || null,
    httpStatus: response.status,
  });

  return {
    requestId,
    referenceId,
    invoiceId,
    amount: chargeAmount,
    providerTxAmount: txAmount != null ? roundMoney(Number(txAmount)) : null,
    currency,
    status,
    responseCode,
    responseMessage: body.responseMsg || body.responseMessage || '',
    providerReference: body.params?.transactionId || body.params?.issuerTransactionId || '',
    issuerTransactionId: body.params?.issuerTransactionId || '',
    providerState,
    userMessage: mapWaafiUserMessage(responseCode, providerState, body.responseMsg || body.responseMessage),
    rawParams: body.params || {},
  };
}

export { generateReference, mapProviderState };
