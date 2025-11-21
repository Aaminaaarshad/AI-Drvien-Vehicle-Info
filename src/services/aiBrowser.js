const CLOUD_NAME = import.meta.env.VITE_CLOUD_NAME || "dkv1zwjfe";

/* ----------  fake LongCat – returns instantly  ---------- */
export async function askLongCat(prompt) {
  // mock replies
  if (prompt.includes("leiekontrakt")) return "Leieavtalen ser standard ut. Ingen spesielle avvik.";
  if (prompt.includes("dekkmønster"))  return "Dekkene har ca. 4 mm mønster – bytt om 5 000 km.";
  if (prompt.includes("service"))      return "Anbefal service om 8 000 km / 6 måneder.";
  if (prompt.includes("feil"))         return "1. Tidlig EGR-ventil problemer\n2. Svake fjærer bak\n3. Katalysator ved 150 000 km";
  return "Ingen spesielle anbefalinger.";
}

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