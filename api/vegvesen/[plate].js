import axios from "axios";

export default async function handler(req, res) {
  const { plate } = req.query;

  try {
    // Vegvesen API endpoint
    const url = `https://ws.vegvesen.no/no/vegvesen/kjoretoy/kjoretoyoppslag/v1/kjennemerkeoppslag/kjoretoy/${plate}`;

    const response = await axios.get(url, {
    //   headers: {
    //     'Ocp-Apim-Subscription-Key': process.env.VEGVESEN_KEY
    //   },
      validateStatus: () => true,
    });

    if (response.status !== 200) {
      return res.status(response.status).json({
        error: "Vegvesen returned an error",
        status: response.status,
        data: response.data,
      });
    }

    res.status(200).json(response.data);

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server failed contacting Vegvesen" });
  }
}
