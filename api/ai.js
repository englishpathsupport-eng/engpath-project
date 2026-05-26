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

  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "AI API key not configured." });
  }

  try {
    const messages = Array.isArray(body.messages) ? [...body.messages] : [];
    if (body.system) {
      messages.unshift({ role: "system", content: body.system });
    }

    const aiRes = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
        "HTTP-Referer": "https://engpath-project.vercel.app",
        "X-Title": "EngPath"
      },
      body: JSON.stringify({
        model: "meta-llama/llama-3.3-70b-instruct:free",
        messages,
        max_tokens: body.max_tokens || 500,
        temperature: body.temperature ?? 0.7,
      }),
    });

    const data = await aiRes.json();
    if (!aiRes.ok) {
      console.error("[api/ai] OpenRouter error", aiRes.status, JSON.stringify(data));
      return res.status(aiRes.status).json({ error: data?.error?.message || "AI request failed." });
    }

    const text = data?.choices?.[0]?.message?.content || "";
    if (!text) {
      console.error("[api/ai] Empty response from OpenRouter", JSON.stringify(data));
      return res.status(500).json({ error: "Empty response from AI." });
    }

    return res.status(200).json({
      choices: [{ message: { role: "assistant", content: text } }]
    });

  } catch (err) {
    console.error("[api/ai] Unexpected error:", err.message);
    res.status(500).json({ error: "Server error: " + err.message });
  }
}