import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { doc, getDoc, setDoc, deleteDoc } from "firebase/firestore";
import { db } from "../firebase";
import VehicleInfo from "../components/VehicleInfo";
import ManualDataForm from "../components/ManualDataForm";
import useAI from "../hooks/useAI";
export default function PlateDetailPage() {
  const { plate } = useParams();
  const nav = useNavigate();
  const [apiData, setApiData] = useState(null);
  const [manualData, setManualData] = useState({});
  useAI(apiData, setManualData);
  
  /* ---------- load once ---------- */
  useEffect(() => {
    (async () => {
      const snap = await getDoc(doc(db, "vehicle", plate));
      if (snap.exists()) {
        const d = snap.data();
        setApiData(d.apiData || null);
        setManualData(d.manualData || {});
      }
    })();
  }, [plate]);

  /* ---------- save edits ---------- */
  const saveEdit = async () => {
    await setDoc(doc(db, "vehicle", plate), {
      plate,
      apiData,
      manualData,
      savedAt: new Date().toISOString(),
    });
    alert("Saved changes");
  };

  /* ---------- delete + confirm ---------- */
  const deleteVehicle = async () => {
    if (!window.confirm(`Delete ${plate} permanently?`)) return;
    await deleteDoc(doc(db, "vehicle", plate));
    nav("/list"); // back to list
  };

  return (
    <div className="max-w-5xl mx-auto p-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">Vehicle {plate}</h1>
        <div className="flex gap-2">
          <button className="button" onClick={saveEdit}>Save changes</button>
          <button className="button bg-red-600 hover:bg-red-700" onClick={deleteVehicle}>Delete</button>
          <Link to="/list" className="button bg-gray-600">← List</Link>
        </div>
      </div>

      <VehicleInfo vehicleData={apiData} />
      <ManualDataForm manualData={manualData} setManualData={setManualData} />

      <div className="mt-6">
        <Link to="/" className="button">New search</Link>
      </div>
    </div>
  );
}