// import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
// import { storage } from "../firebase";

// export default async function uploadFile(path, file) {
//   const snap = await uploadBytesResumable(ref(storage, path), file);
//   return getDownloadURL(snap.ref);
// }