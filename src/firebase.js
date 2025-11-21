import { initializeApp } from "firebase/app";
import { getFirestore, connectFirestoreEmulator, disableNetwork, enableNetwork } from "firebase/firestore";

import { getFunctions, connectFunctionsEmulator } from "firebase/functions";




const firebaseConfig = {
  apiKey: "AIzaSyAYaDvljj4U0xZ9cJRf5oUqzXB8FU7-hZw",
  authDomain: "vehicle-data-76a54.firebaseapp.com",
  projectId: "vehicle-data-76a54",
  storageBucket: "vehicle-data-76a54.firebasestorage.app",
  messagingSenderId: "808496701476",
  appId: "1:808496701476:web:83baae04e2d5877853b8b1",
  measurementId: "G-V4QG4WR2GE"
};


const app = initializeApp(firebaseConfig);
const functions = getFunctions(app);
if (location.hostname === "localhost") connectFunctionsEmulator(functions, "localhost", 5174);
export { functions };
export const db = getFirestore(app);

/* --------------- optional: force online while developing --------------- */
// disableNetwork(db);   // go fully offline
enableNetwork(db);       // make sure we are online