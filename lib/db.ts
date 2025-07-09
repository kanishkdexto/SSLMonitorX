type DomainEntry = {
  domain: string;
  issuer?: string;
  validFrom?: string;
  validTo?: string;
  daysRemaining?: number;
  status?: string;
  lastChecked?: string;
  error?: string;
  notes?: string;
};

// In-memory storage that works on Vercel
let domains: DomainEntry[] = [];

export async function getDomains() {
  return domains;
}

export async function addDomain(domain: string, notes?: string) {
  if (!domains.find(d => d.domain === domain)) {
    domains.push({ domain, notes });
  }
}

export async function removeDomain(domain: string) {
  domains = domains.filter(d => d.domain !== domain);
}

export async function clearAllDomains() {
  domains = [];
}

export async function updateDomainInfo(domain: string, info: Partial<DomainEntry>) {
  const idx = domains.findIndex(d => d.domain === domain);
  if (idx !== -1) {
    domains[idx] = { ...domains[idx], ...info };
  }
}
