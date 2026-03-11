// pages/api/send-sms.js
// Vercel serverless function — calls Africa's Talking sandbox from
// Node.js server-side, so there are zero browser CORS restrictions.

const AT_KEY      = "atsk_a6fbe872a06c5dd77b78b10cdd066f276af63e22b14393aadc8d1683e74500eb658e847f";
const AT_USERNAME = "sandbox";
const AT_URL      = "https://api.sandbox.africastalking.com/version1/messaging";

export default async function handler(req, res) {
  // CORS headers — allow calls from any origin (needed for the browser)
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { to, message } = req.body;
  if (!to || !message) return res.status(400).json({ error: "Missing 'to' or 'message'" });

  // Normalise phone number — ensure Namibia country code
  const num = to.startsWith("+") ? to : `+264${to.replace(/^0/, "")}`;

  const body = new URLSearchParams();
  body.append("username", AT_USERNAME);
  body.append("to", num);
  body.append("message", message);

  try {
    const atRes = await fetch(AT_URL, {
      method: "POST",
      headers: {
        "Accept":       "application/json",
        "Content-Type": "application/x-www-form-urlencoded",
        "apiKey":       AT_KEY,
      },
      body,
    });

    const data = await atRes.json();
    console.log("[QFlowAI SMS]", JSON.stringify(data));

    const recipient = data?.SMSMessageData?.Recipients?.[0];

    if (recipient && (recipient.statusCode === 101 || recipient.status === "Success")) {
      return res.status(200).json({
        ok:        true,
        messageId: recipient.messageId,
        cost:      recipient.cost,
        number:    num,
      });
    }

    return res.status(200).json({
      ok:    false,
      error: data?.SMSMessageData?.Message || "Unexpected AT response",
      raw:   data,
    });

  } catch (err) {
    console.error("[QFlowAI SMS] Error:", err);
    return res.status(500).json({ ok: false, error: err.message });
  }
}
