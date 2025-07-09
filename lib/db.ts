import { Low } from 'lowdb'
import { JSONFile } from 'lowdb/node'

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

type Data = {
  domains: DomainEntry[];
};

const adapter = new JSONFile<Data>('domains.json');
const db = new Low<Data>(adapter, { domains: [] });

export async function getDomains() {
  await db.read();
  return db.data.domains;
}

export async function addDomain(domain: string, notes?: string) {
  await db.read();
  if (!db.data.domains.find(d => d.domain === domain)) {
    db.data.domains.push({ domain, notes });
    await db.write();
  }
}

export async function removeDomain(domain: string) {
  await db.read();
  db.data.domains = db.data.domains.filter(d => d.domain !== domain);
  await db.write();
}

export async function clearAllDomains() {
  await db.read();
  db.data.domains = [];
  await db.write();
}

export async function updateDomainInfo(domain: string, info: Partial<DomainEntry>) {
  await db.read();
  const idx = db.data.domains.findIndex(d => d.domain === domain);
  if (idx !== -1) {
    db.data.domains[idx] = { ...db.data.domains[idx], ...info };
    await db.write();
  }
}
