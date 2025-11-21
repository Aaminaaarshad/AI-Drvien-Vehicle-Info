import { getCloudinarySignature } from "../services/cloudinary";

export default async function uploadCloudinary(file, folder = "vehicle-app") {
  const url = `https://api.cloudinary.com/v1_1/${process.env.VITE_CLOUD_NAME}/auto/upload`;

  const form = new FormData();
  form.append("file", file);
  form.append("folder", folder);
  form.append("timestamp", String(Date.now()));
  form.append("upload_preset", "vehicle-app");   // the signed preset you created

  const { signature, api_key } = await getCloudinarySignature({ params: Object.fromEntries(form) });
  form.append("signature", signature);
  form.append("api_key", api_key);

  const res = await fetch(url, { method: "POST", body: form });
  const data = await res.json();
  return data.secure_url;   // https://res.cloudinary.com/...
}