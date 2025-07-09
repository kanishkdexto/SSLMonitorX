import type { NextApiRequest, NextApiResponse } from 'next';
import { getDomains, updateDomainInfo } from '../../lib/db';
import { getSSLInfo } from '../../lib/ssl';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const domains = await getDomains();
  const results = [];
  for (const d of domains) {
    const info = await getSSLInfo(d.domain);
    await updateDomainInfo(d.domain, info);
    results.push(info);
  }
  res.status(200).json(results);
}
