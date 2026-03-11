// pages/api/triage.js
// Serverless function — calls Anthropic API server-side to avoid CORS.

const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { symptoms, age, vitals } = req.body;
  if (!symptoms || !age) return res.status(400).json({ error: "Missing symptoms or age" });

  try {
    const response = await fetch(ANTHROPIC_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 800,
        messages: [{
          role: "user",
          content: `Hospital triage AI. Return ONLY JSON, no markdown.
Patient: Age ${age}, Symptoms: ${symptoms}, Vitals: ${vitals || "not provided"}
{"triage_level":"CRITICAL"|"URGENT"|"MODERATE"|"ROUTINE","priority_score":<1-100>,"reasoning":"<1-2 sentences>","recommended_action":"<brief>","estimated_wait_minutes":<number>}`
        }]
      }),
    });

    const data = await response.json();
    const text = data.content?.[0]?.text || "{}";
    const clean = text.replace(/```json|```/g, "").trim();
    const result = JSON.parse(clean);
    return res.status(200).json(result);

  } catch (err) {
    console.error("[Triage error]", err);
    // Safe fallback so registration still works even if AI fails
    return res.status(200).json({
      triage_level: "ROUTINE",
      priority_score: 10,
      reasoning: "Manual assessment needed.",
      recommended_action: "Standard consultation",
      estimated_wait_minutes: 45,
    });
  }
}
