export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const body = req.body;
  if (!body || typeof body !== "object") {
    return res.status(400).json({ error: "Request body must be JSON." });
  }

  const aiStudioKey = process.env.AI_STUDIO_API_KEY;
  if (!aiStudioKey) {
    console.error("[api/ai] Missing AI_STUDIO_API_KEY");
    return res.status(500).json({ error: "AI API key not configured." });
  }

  try {
    const model = body.model || "gemini-2.0-flash";
    const messages = Array.isArray(body.messages) ? [...body.messages] : [];
    if (body.system) {
      messages.unshift({ role: "user", content: body.system });
    }

    const contents = messages.map(m => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }]
    }));

    const aiBody = {
      contents,
      generationConfig: {
        maxOutputTokens: body.max_tokens || 500,
        temperature: body.temperature ?? 0.7,
      }
    };

    const aiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${aiStudioKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(aiBody),
      }
    );

    const data = await aiRes.json();
    if (!aiRes.ok) {
      console.error("[api/ai] Gemini error", aiRes.status, data);
      return res.status(aiRes.status).json({ error: data?.error?.message || "Gemini request failed." });
    }

    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || "";
    return res.status(200).json({
      choices: [{ message: { role: "assistant", content: text } }]
    });

  } catch (err) {
    console.error("[api/ai] Unexpected error:", err);
    res.status(500).json({ error: "Server error while proxying AI request." });
  }
}