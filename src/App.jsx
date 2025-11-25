import React, { useState, useEffect } from "react";
import axios from "axios";
import { Link, Routes, Route } from "react-router-dom";
import Header from "./components/Header";
import VehicleInfo from "./components/VehicleInfo";
import ManualDataForm from "./components/ManualDataForm";
import { db } from "./firebase";
import { doc, getDoc, setDoc, collection, getDocs } from "firebase/firestore"; // Added collection, getDocs

// Import other components (assuming they exist)
import ListPage from "./pages/ListPage";
import PlateDetailPage from "./pages/PlateDetailPage";

function App() {
  const [plate, setPlate] = useState("");
  const [vehicleData, setVehicleData] = useState(null);
  const [manualData, setManualData] = useState({});
  const [loading, setLoading] = useState(false);
  const [allPlates, setAllPlates] = useState([]); // New state for all saved plates

  // New state to hold tire analysis data from ManualDataForm
  const [tireAnalysisData, setTireAnalysisData] = useState(null);

  // 1. Fetch all plates for the dropdown
  useEffect(() => {
    const fetchAllPlates = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, "vehicle"));
        const plates = querySnapshot.docs.map(doc => doc.id).sort();
        setAllPlates(plates);
      } catch (error) {
        console.error("Error fetching all plates:", error);
      }
    };
    fetchAllPlates();
  }, []);

  // 2. Handler for dropdown change
  const handlePlateChange = (e) => {
    const newPlate = e.target.value;
    setPlate(newPlate);
    // Automatically fetch data for the selected plate
    if (newPlate) {
      fetchData(newPlate);
    } else {
      // Clear data if "Select a plate..." is chosen
      setVehicleData(null);
      setManualData({});
      setTireAnalysisData(null);
    }
  };

  // 3. Updated fetchData to accept plate as argument
  const fetchData = async (currentPlate = plate) => {
    if (!currentPlate) return;
    setLoading(true);
    try {
      // Fetch API data
      const { data } = await axios.get(
        `/api/vegvesen/ws/no/vegvesen/kjoretoy/kjoretoyoppslag/v1/kjennemerkeoppslag/kjoretoy/${currentPlate}`
      );
      setVehicleData(data);

      // Fetch Firestore data
      const snap = await getDoc(doc(db, "vehicle", currentPlate));
      const snapData = snap.exists() ? snap.data() : {};
      
      // Load manual data and tire analysis data
      const loadedManualData = snapData.manualData || {};
      setManualData(prev => ({
        ...prev,
        ...loadedManualData,
        maintenance: loadedManualData.maintenance || prev.maintenance,
        lease: loadedManualData.lease || prev.lease,
        insurance: loadedManualData.insurance || prev.insurance,
        liens: loadedManualData.liens || prev.liens,
      }));
      setTireAnalysisData(loadedManualData.tireAnalysis || null);

    } catch (err) {
      console.error(err);
      alert("Error fetching data – check console");
    } finally {
      setLoading(false);
    }
  };

  // 4. Handler to receive analysis data from ManualDataForm
  const handleAnalysisComplete = (analysisResult) => {
    setTireAnalysisData(analysisResult);
  };

  /* ---------- save BOTH api + manual ---------- */
  const saveEverything = async () => {
    if (!plate) {
      alert("Enter a license plate first");
      return;
    }
    try {
      // Combine manualData with the latest tire analysis data
      const dataToSave = {
        ...manualData,
        tireAnalysis: tireAnalysisData, // Save the tire analysis data
      };

      const payload = {
        plate,
        apiData: vehicleData,
        manualData: dataToSave,
        savedAt: new Date().toISOString(),
      };

      await setDoc(doc(db, "vehicle", plate), payload);

      alert("Vehicle + manual data saved");
    } catch (err) {
      console.error(err);
      alert("Error saving everything");
    }
  };

  // Prepare manualData for ManualDataForm, including tire analysis
  const manualDataWithAnalysis = {
    ...manualData,
    tireAnalysis: tireAnalysisData,
  };

  return (
    <Routes>
      <Route path="/" element={
        <div className="min-h-screen bg-gray-50">
          <Header />

          <main className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
            {/* Search bar + Dropdown + nav */}
            <div className="mb-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Input for new plate search */}
              <input
                className="input sm:col-span-2"
                placeholder="Enter license plate (e.g. EF24448)"
                value={plate}
                onChange={(e) => setPlate(e.target.value.toUpperCase())}
              />
              <div className="flex gap-2">
                <button className="button" onClick={() => fetchData()}>
                  {loading ? "Loading…" : "Fetch Vehicle Data"}
                </button>
                <button
                  className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition"
                  onClick={() => {
                    setPlate("");
                    setVehicleData(null);
                    setManualData({});
                    setTireAnalysisData(null);
                  }}
                >
                  Reset
                </button>
                <Link to="/list" className="button bg-green-600 hover:bg-green-700">
                  See saved
                </Link>
              </div>
            </div>

            {/* Dropdown for Saved Vehicles */}
            <div className="mb-6 p-4 bg-white rounded-lg shadow-md border border-slate-200">
              <label htmlFor="plate-select" className="block text-sm font-medium text-slate-700 mb-2">
                Select Saved Vehicle
              </label>
              <select
                id="plate-select"
                value={plate || ''}
                onChange={handlePlateChange}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg bg-white text-lg font-semibold focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Select a plate...</option>
                {allPlates.map(p => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>

            {/* Content grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
             {vehicleData &&<div
              className="lg:col-span-2 space-y-4">
                <ManualDataForm 
                  manualData={manualDataWithAnalysis} 
                  setManualData={setManualData} 
                  plate={plate}
                  onAnalysisComplete={handleAnalysisComplete} // FIX: Pass the required prop
                />
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


            </div>
          </main>
        </div>
      } />
      <Route path="/list" element={<ListPage />} />
      <Route path="/plate/:plate" element={<PlateDetailPage />} /> 
    </Routes>
  );
}

export default App;
