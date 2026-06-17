export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const { prompt } = req.body;
  if (!prompt) return res.status(400).json({ error: 'Missing prompt' });
  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': process.env.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({ model: 'claude-haiku-4-5-20251001', max_tokens: 1200, messages: [{ role: 'user', content: prompt }] }),
    });
    if (!response.ok) throw new Error(await response.text());
    const data = await response.json();
    const raw = data.content[0]?.text || '';
    const clean = raw.replace(/```json\n?|\n?```/g, '').trim();
    res.status(200).json({ content: JSON.parse(clean) });
  } catch (err) { res.status(500).json({ error: err.message }); }
}