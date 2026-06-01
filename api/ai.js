export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  let body = req.body;
  if (typeof body === "string") {
    try { body = JSON.parse(body); } catch { return res.status(400).json({ error: "Invalid JSON." }); }
  }
  if (!body || typeof body !== "object") {
    return res.status(400).json({ error: "Request body must be JSON." });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "AI API key not configured." });
  }

  try {
    const messages = Array.isArray(body.messages) ? [...body.messages] : [];
    if (messages.length === 0) {
      messages.push({ role: "user", content: body.prompt || "Hello" });
    }

    const aiRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: body.max_tokens || 500,
        system: body.system || "You are a helpful English tutor.",
        messages,
      }),
    });

    const data = await aiRes.json();
    if (!aiRes.ok) {
      console.error("[api/ai] Anthropic error", aiRes.status, JSON.stringify(data));
      return res.status(aiRes.status).json({ error: data?.error?.message || "AI request failed." });
    }

    return res.status(200).json(data);

  } catch (err) {
    console.error("[api/ai] Unexpected error:", err.message);
    res.status(500).json({ error: "Server error: " + err.message });
  }
}