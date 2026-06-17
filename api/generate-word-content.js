import Anthropic from "@anthropic-ai/sdk";

const LANG_NAMES = {ml:"Malayalam",hi:"Hindi",ta:"Tamil",te:"Telugu",ar:"Arabic",fr:"French",de:"German",es:"Spanish",zh:"Chinese",ja:"Japanese",ko:"Korean",pt:"Portuguese"};

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();

  const { word, level, category, lang } = req.query;
  if (!word) return res.status(400).json({ error: "word required" });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return res.status(500).json({ error: "API key not configured" });

  const nativeLang = LANG_NAMES[lang] || "Malayalam";
  const client = new Anthropic({ apiKey });

  try {
    const message = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 1000,
      messages: [{
        role: "user",
        content: `Generate vocabulary content for the English word "${word}" (CEFR level: ${level||"A1"}, category: ${category||"General"}).
The native language for this user is ${nativeLang}.
Return ONLY valid JSON, no markdown, no extra text:
{
  "english_meaning": "clear simple definition in 1-2 sentences",
  "native_meaning": "accurate ${nativeLang} translation and brief explanation in ${nativeLang} script",
  "malayalam_meaning": "accurate ${nativeLang} translation (same as native_meaning)",
  "synonyms": ["word1", "word2", "word3"],
  "antonyms": ["word1", "word2"],
  "collocations": ["collocation 1", "collocation 2", "collocation 3"],
  "common_phrases": ["phrase 1", "phrase 2"],
  "examples": [
    {"sentence": "natural example sentence 1", "context": "daily conversation"},
    {"sentence": "natural example sentence 2", "context": "work"},
    {"sentence": "natural example sentence 3", "context": "social"}
  ],
  "usage_notes": "important usage patterns in 2 sentences",
  "common_mistakes": "most common mistake learners make with this word",
  "memory_tip": "creative memorable tip to remember this word"
}`
      }]
    });

    const raw = message.content[0].text.trim();
    const clean = raw.replace(/^```json\n?/, "").replace(/\n?```$/, "").trim();
    const data = JSON.parse(clean);
    res.status(200).json(data);
  } catch (e) {
    console.error("generate-word-content error:", e);
    res.status(500).json({ error: "Generation failed: " + e.message });
  }
}