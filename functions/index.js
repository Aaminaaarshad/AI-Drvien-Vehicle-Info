const functions = require("firebase-functions");
const admin = require("firebase-admin");
const axios = require("axios");

admin.initializeApp();

/* ----------  LongCat AI helper  ---------- */
const LONGCAT_KEY = process.env.LONGCAT_KEY;   // set via CLI or hard-code here
async function askLongCat(prompt, max = 300) {
  const res = await axios.post(
    "https://api.longcat.ai/v1/completions",   // ←-- fixed URL (no space)
    {
      model: "longcat-gpt-35-turbo",
      messages: [{ role: "user", content: prompt }],
      max_tokens: max,
      temperature: 0.3,
    },
    { headers: { Authorization: `Bearer ${LONGCAT_KEY}` } }
  );
  return res.data.choices[0].message.content.trim();
}

/* ----------  AI-only cloud functions  ---------- */
exports.summariseLeaseDoc = functions.https.onCall(async (req) => {
  const { downloadURL } = req.data;
  if (!downloadURL) throw new functions.https.HttpsError("invalid-argument", "Missing URL");
  const txt = await axios.get(downloadURL).then((r) => r.data);
  const prompt = `Oppsummer følgende leiekontrakt på norsk i 5 setninger:\n${txt}`;
  return { summary: await askLongCat(prompt, 250) };
});

exports.tyreAdvice = functions.https.onCall(async (req) => {
  const { imageUrl } = req.data;
  const prompt = `Se på bildet: ${imageUrl} – vurder dekkmønster-dybde og anbefal om dekk bør skiftes (norsk, kort).`;
  return { recommendation: await askLongCat(prompt, 120) };
});

exports.nextServiceHint = functions.https.onCall(async (req) => {
  const { currentKm, lastServiceKm, lastServiceDate, model, year } = req.data;
  const prompt = `Bilen er en ${model} (${year}), siste service ved ${lastServiceKm} km ${lastServiceDate}, nåværende km ${currentKm}. Anbefal neste service-dato og kilometer-stand (norsk, kort).`;
  return { hint: await askLongCat(prompt, 120) };
});

exports.knownFaults = functions.https.onCall(async (req) => {
  const { make, model, year } = req.data;
  const prompt = `Finn vanlige feil og problemer for en ${make} ${model} år ${year} på norsk (maks 5 punkter).`;
  return { faults: await askLongCat(prompt, 300) };
});