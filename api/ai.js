// /api/ai.js
// Server-side proxy for AI requests.
// Set one of these in Vercel Environment Variables:
// - AI_STUDIO_API_KEY for Google Gemini / AI Studio
// - OPENAI_API_KEY for OpenAI as fallback

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
  const openAiKey = process.env.OPENAI_API_KEY;

  if (!aiStudioKey && !openAiKey) {
    console.error("[api/ai] Missing AI_STUDIO_API_KEY and OPENAI_API_KEY");
    return res.status(500).json({ error: "AI API key not configured." });
  }

  try {
    if (aiStudioKey) {
      const model = body.model || "gemini-1.5-pro";
      const messages = Array.isArray(body.messages) ? [...body.messages] : [];
      if (body.system) {
        messages.unshift({ role: "system", content: body.system });
      }

      const promptText = messages.map(message => {
        const role = message.role === "assistant" ? "Assistant" : message.role === "system" ? "System" : "User";
        return `${role}: ${message.content}`;
      }).join("\n\n");

      const aiBody = {
        prompt: { text: promptText },
        max_output_tokens: body.max_tokens || 500,
        temperature: body.temperature ?? 0.7,
      };

      const aiRes = await fetch(`https://api.generativelanguage.googleapis.com/v1beta2/models/${model}:generateText`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${aiStudioKey}`,
        },
        body: JSON.stringify(aiBody),
      });

      const text = await aiRes.text();
      if (!aiRes.ok) {
        console.error("[api/ai] AI Studio error", aiRes.status, text);
        return res.status(aiRes.status).json({ error: text || "AI Studio request failed." });
      }

      return res.status(200).setHeader("Content-Type", "application/json").send(text);
    }

    const messages = Array.isArray(body.messages) ? [...body.messages] : [];
    if (body.system) {
      messages.unshift({ role: "system", content: body.system });
    }

    const openaiBody = {
      model: body.model || "gpt-3.5-turbo",
      messages,
      max_tokens: body.max_tokens || 500,
    };

    const openaiRes = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${openAiKey}`,
      },
      body: JSON.stringify(openaiBody),
    });

    const text = await openaiRes.text();
    if (!openaiRes.ok) {
      console.error("[api/ai] OpenAI error", openaiRes.status, text);
      return res.status(openaiRes.status).json({ error: text || "OpenAI request failed." });
    }

    res.status(200).setHeader("Content-Type", "application/json").send(text);
  } catch (err) {
    console.error("[api/ai] Unexpected error:", err);
    res.status(500).json({ error: "Server error while proxying AI request." });
  }
}
