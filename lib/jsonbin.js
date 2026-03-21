const JSONBIN_API_KEY = '$2a$10$c0bLQOqmsEryYQo08I55qOkwPLpAqQguVwG..Q95rNnYWPcLQukAK';
const JSONBIN_BIN_ID = '69b7cb91b7ec241ddc71d73e';

export async function getBinData() {
  const res = await fetch(`https://api.jsonbin.io/v3/b/${JSONBIN_BIN_ID}/latest`, {
    headers: { 'X-Master-Key': JSONBIN_API_KEY },
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(`JSONBin read error: ${res.status}`);
  const json = await res.json();
  return json.record;
}

export async function updateBinData(record) {
  const res = await fetch(`https://api.jsonbin.io/v3/b/${JSONBIN_BIN_ID}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'X-Master-Key': JSONBIN_API_KEY,
    },
    body: JSON.stringify(record),
  });
  if (!res.ok) throw new Error(`JSONBin write error: ${res.status}`);
  return res.json();
}
