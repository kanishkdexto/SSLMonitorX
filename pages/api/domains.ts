import type { NextApiRequest, NextApiResponse } from 'next';
import { getDomains, addDomain, removeDomain, clearAllDomains } from '../../lib/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    const domains = await getDomains();
    res.status(200).json(domains);
  } else if (req.method === 'POST') {
    const { domain, notes } = req.body;
    if (!domain) return res.status(400).json({ error: 'Domain required' });
    await addDomain(domain, notes);
    res.status(200).json({ success: true });
  } else if (req.method === 'DELETE') {
    const { domain, clearAll } = req.body;
    if (clearAll) {
      await clearAllDomains();
      res.status(200).json({ success: true });
    } else if (domain) {
      await removeDomain(domain);
      res.status(200).json({ success: true });
    } else {
      return res.status(400).json({ error: 'Domain or clearAll required' });
    }
  } else {
    res.status(405).end();
  }
}
