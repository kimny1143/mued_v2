import { config } from 'dotenv';
config({ path: '.env.local' });
const KEY = process.env.RESEND_API_KEY!;
const H = { Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' };
const AUD = '243e06eb-1ddc-441d-a241-1e2044ef4b5f';
async function api(m: string, p: string) {
  const r = await fetch(`https://api.resend.com${p}`, { method: m, headers: H });
  const t = await r.text(); let b: any; try { b = JSON.parse(t); } catch { b = t; }
  return { status: r.status, body: b };
}
(async () => {
  const list = await api('GET', `/audiences/${AUD}/contacts`);
  const contacts = list.body?.data ?? [];
  console.log('before:', contacts.map((c: any) => c.email));
  for (const c of contacts) {
    const del = await api('DELETE', `/audiences/${AUD}/contacts/${c.id}`);
    console.log(`delete ${c.id} -> ${del.status}`);
  }
  const after = await api('GET', `/audiences/${AUD}/contacts`);
  console.log('after count:', (after.body?.data ?? []).length);
})().then(() => process.exit(0));
