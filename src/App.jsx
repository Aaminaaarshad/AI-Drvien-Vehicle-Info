import React, { useState } from "react";
import axios from "axios";
import { Link } from "react-router-dom";
import Header from "./components/Header";
import VehicleInfo from "./components/VehicleInfo";
import ManualDataForm from "./components/ManualDataForm";
import { db } from "./firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";

function App() {
  const [plate, setPlate] = useState("");
  const [vehicleData, setVehicleData] = useState(null);
  const [manualData, setManualData] = useState({});
  const [loading, setLoading] = useState(false);

  const fetchData = async () => {
    if (!plate) return;
    setLoading(true);
    try {
      const { data } = await axios.get(
        `/api/vegvesen/ws/no/vegvesen/kjoretoy/kjoretoyoppslag/v1/kjennemerkeoppslag/kjoretoy/${plate}`
      );
      console.log("Fetched vehicle data:", data);
      setVehicleData(data);
      const snap = await getDoc(doc(db, "vehicle", plate));

const data1 = snap.exists() ? snap.data() : {};
console.log("🔵 Manual data loaded from Firestore:", data1);

    const snapData = snap.exists() ? snap.data() : {};
    
    // setManualData(snapData.manualData || {});
    setManualData(prev => ({
  ...prev,
  ...snapData.manualData,      // Firestore manual data
  maintenance: snapData.manualData?.maintenance || prev.maintenance,
  lease: snapData.manualData?.lease || prev.lease,
  insurance: snapData.manualData?.insurance || prev.insurance,
  liens: snapData.manualData?.liens || prev.liens,
}));

    } catch (err) {
      console.error(err);
      alert("Error fetching data – check console");
    } finally {
      setLoading(false);
    }
  };

  /* ----------  NEW: save BOTH api + manual  ---------- */
const saveEverything = async () => {
  if (!plate) {
    alert("Enter a license plate first");
    return;
  }
  try {
    const payload = {
      plate,
      apiData: vehicleData,
      manualData,
      savedAt: new Date().toISOString(),
    };

    await setDoc(doc(db, "vehicle", plate), payload);

    alert("Vehicle + manual data saved");
  } catch (err) {
    console.error(err);
    alert("Error saving everything");
  }
};


  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      <main className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
        {/* Search bar + nav */}
        <div className="mb-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
          <input
            className="input sm:col-span-2"
            placeholder="Enter license plate (e.g. EF24448)"
            value={plate}
            onChange={(e) => setPlate(e.target.value.toUpperCase())}
          />
          <div className="flex gap-2">
            <button className="button" onClick={fetchData}>
              {loading ? "Loading…" : "Fetch Vehicle Data"}
            </button>
            <button
              className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition"
              onClick={() => {
                setPlate("");
                setVehicleData(null);
                setManualData({});
              }}
            >
              Reset
            </button>
            <Link to="/list" className="button bg-green-600 hover:bg-green-700">
              See saved
            </Link>
          </div>
        </div>

        {/* Content grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
         {vehicleData &&<div
          className="lg:col-span-2 space-y-4">
            <ManualDataForm manualData={manualData} setManualData={setManualData} />
            <VehicleInfo vehicleData={vehicleData} />
            <div className="mt-4 flex gap-2">
              <button className="button" onClick={saveEverything}>
                Save everything
              </button>
              {/* still keep old manual-only button if you want */}
              <button className="button bg-indigo-600 hover:bg-indigo-700" onClick={saveEverything}>
                Save manual only
              </button>
            </div>
          </div> }

          {/* Sidebar */}
          <aside className="space-y-4">
            <div className="card">
              <h3 className="font-semibold mb-2">Quick Links</h3>
              <ul className="text-sm space-y-1 text-blue-600">
                <li>
                  <a href="https://www.vegvesen.no/en/vehicles/" target="_blank" rel="noreferrer">
                    Vegvesen – Vehicle Info
                  </a>
                </li>
                <li>
                  <a href="https://www.brreg.no/en/registration-of-mortgages/" target="_blank" rel="noreferrer">
                    Brreg – Liens
                  </a>
                </li>
                <li>
                  <a href="https://developer.if-insurance.com/" target="_blank" rel="noreferrer">
                    IF Insurance – API Docs
                  </a>
                </li>
              </ul>
            </div>

            <div className="card">
              <h3 className="font-semibold mb-2">How-to</h3>
              <p className="text-sm text-gray-600">
                Enter a license plate, fetch official data, then fill in liens, lease, insurance
                and maintenance manually. Everything is saved per plate in collection <code>vehicle</code>.
              </p>
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
}

export default App;