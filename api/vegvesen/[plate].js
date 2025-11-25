import axios from "axios";

export default async function handler(req, res) {
  const { plate } = req.query;

  try {
    // Call Vegvesen API directly (not your own API)
    const url = `https://ws.vegvesen.no/no/vegvesen/kjoretoy/kjoretoyoppslag/v1/kjennemerkeoppslag/kjoretoy/${plate}`;

    const response = await axios.get(url, {
      validateStatus: () => true,
    });

    console.log("Vegvesen status:", response.status);
    console.log("Vegvesen data:", response.data);

    if (response.status !== 200) {
      return res.status(response.status).json({
        error: "Vegvesen returned an error",
        status: response.status,
        data: response.data,
      });
    }

    res.status(200).json(response.data);
  } catch (error) {
    console.error("Request failed:", error);
    res.status(500).json({ error: "Server crashed contacting Vegvesen" });
  }
}
