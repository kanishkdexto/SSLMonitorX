const sslChecker = require('ssl-checker');

export async function getSSLInfo(domain: string) {
  try {
    const data = await sslChecker(domain);
    return {
      domain,
      issuer: data.issuer || 'Unknown',
      validFrom: data.valid_from,
      validTo: data.valid_to,
      daysRemaining: data.days_remaining,
      status: data.days_remaining > 7
        ? 'valid'
        : data.days_remaining > 0
        ? 'expiring'
        : 'expired',
      lastChecked: new Date().toISOString(),
    };
  } catch (e: any) {
    return {
      domain,
      error: e.message,
      status: 'error',
      lastChecked: new Date().toISOString(),
    };
  }
}
