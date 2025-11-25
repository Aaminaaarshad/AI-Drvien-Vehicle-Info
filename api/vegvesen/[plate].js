import axios from "axios";

export default async function handler(req, res) {
  const { plate } = req.query;

  try {
    const url =
      `https://www.vegvesen.no/ws/no/vegvesen/kjoretoy/kjoretoyoppslag/v1/kjennemerkeoppslag/kjoretoy/${plate}`;

    const response = await axios.get(url);

    res.status(200).json(response.data);

  } catch (error) {
    console.error("API error:", error?.response?.data || error);
    res.status(500).json({ error: "Unable to fetch vehicle data." });
  }
}
