const CLOUD_NAME = import.meta.env.VITE_CLOUD_NAME || "dkv1zwjfe";
import axios from "axios";

/* ----------  fake LongCat – returns instantly  ---------- */
// export async function askLongCat(prompt) {
//   // mock replies
//   if (prompt.includes("leiekontrakt")) return "Leieavtalen ser standard ut. Ingen spesielle avvik.";
//   if (prompt.includes("dekkmønster"))  return "Dekkene har ca. 4 mm mønster – bytt om 5 000 km.";
//   if (prompt.includes("service"))      return "Anbefal service om 8 000 km / 6 måneder.";
//   if (prompt.includes("feil"))         return "1. Tidlig EGR-ventil problemer\n2. Svake fjærer bak\n3. Katalysator ved 150 000 km";
//   return "Ingen spesielle anbefalinger.";
// }








export const askLongCat = async (prompt, context = null) => {
  // Accepts a prompt (the user's question or instruction) and an optional
  // context object containing vehicle data. We combine these into a single
  // message that will be sent to LongCat so the AI can provide context-aware answers.
  let finalPrompt = prompt
  if (context && typeof context === "object") {
    try {
      const ctxLines = []
      if (context.plate) ctxLines.push(`Plate: ${context.plate}`)
      if (context.lease && Object.keys(context.lease || {}).length) ctxLines.push(`Lease: ${JSON.stringify(context.lease)}`)
      if (context.insurance && Object.keys(context.insurance || {}).length) ctxLines.push(`Insurance: ${JSON.stringify(context.insurance)}`)
      if (context.maintenance && Array.isArray(context.maintenance) && context.maintenance.length) ctxLines.push(`Maintenance: ${JSON.stringify(context.maintenance)}`)
      if (context.liens && Object.keys(context.liens || {}).length) ctxLines.push(`Liens: ${JSON.stringify(context.liens)}`)

      const ctxStr = ctxLines.length ? `Context:\n${ctxLines.join('\n')}` : ""
      finalPrompt = ctxStr ? `${ctxStr}\n\nUser request:\n${prompt}` : prompt
    } catch (e) {
      console.warn("Failed to stringify context for LongCat prompt", e)
      finalPrompt = `${prompt}`
    }
  }
  console.log(finalPrompt, 'prompt')
  try {
    const apiKey = import.meta.env.VITE_LONGCAT_API_KEY;
    const url = "https://api.longcat.chat/openai/v1/chat/completions";

    const body = {
      model: "LongCat-Flash-Chat",
      messages: [
        {
          role: "user",
          content: finalPrompt
        }
      ],
      max_tokens: 300
    };

    const headers = {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    };

    const resp = await axios.post(url, body, { headers });
    console.log(resp.data.choices?.[0]?.message?.content)

    return resp.data.choices?.[0]?.message?.content || "No response from AI.";
  } catch (err) {
    console.error("LongCat API error:", err.response?.data || err);
    return "Kunne ikke hente svar fra LongCat.";
  }
};


/* ----------  Cloudinary UNSIGNED (works locally)  ---------- */
export async function uploadCloudinaryUnsigned(file, folder = "vehicle-app") {
  const url = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/auto/upload`;
  const form = new FormData();
  form.append("file", file);
  form.append("upload_preset", "vehicle-unsigned"); // create once in console
  form.append("folder", folder);

  const res = await fetch(url, { method: "POST", body: form });
  const data = await res.json();
  return data.secure_url;
}