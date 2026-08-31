function mockCharge({ amount, paymentMethod, reference }) {
  const provider = (process.env.PAYMENT_PROVIDER || 'mock').toLowerCase();
  if (provider !== 'mock' && provider !== '') {
    const err = new Error(`Payment provider "${provider}" is not configured`);
    err.statusCode = 503;
    throw err;
  }
  if (paymentMethod === 'test' || process.env.NODE_ENV !== 'production') {
    return {
      status: 'successful',
      providerReference: `MOCK-${reference}`,
      message: 'Development mock payment captured',
    };
  }
  return {
    status: 'pending',
    providerReference: null,
    message: 'Awaiting external payment confirmation',
  };
}

export function getPaymentProvider() {
  return {
    name: process.env.PAYMENT_PROVIDER || 'mock',
    charge: mockCharge,
  };
}
