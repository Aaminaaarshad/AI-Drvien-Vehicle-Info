import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../firebase";
import PlateDetailPage from "../pages/PlateDetailPage"; // Import the original component

export default function SavedVehicleWrapper() {
  const { plate: urlPlate } = useParams();
  const nav = useNavigate();
  
  const [allPlates, setAllPlates] = useState([]);
  const [selectedPlate, setSelectedPlate] = useState(urlPlate);
  const [isLoading, setIsLoading] = useState(true);

  // 1. Fetch all plates on mount
  useEffect(() => {
    const fetchAllPlates = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, "vehicle"));
        const plates = querySnapshot.docs.map(doc => doc.id).sort();
        setAllPlates(plates);
        
        // If no plate is in the URL, select the first one from the list
        if (!urlPlate && plates.length > 0) {
            setSelectedPlate(plates[0]);
            // Navigate to the URL of the first plate to keep the URL in sync
            nav(`/plate/${plates[0]}`, { replace: true });
        } else if (urlPlate) {
            setSelectedPlate(urlPlate);
        }
      } catch (error) {
        console.error("Error fetching all plates:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchAllPlates();
  }, [urlPlate, nav]);

  // 2. Handle dropdown change
  const handlePlateChange = (e) => {
    const newPlate = e.target.value;
    setSelectedPlate(newPlate);
    // Navigate to the new plate's URL to trigger PlateDetailPage's data load
    nav(`/plate/${newPlate}`);
  };

  if (isLoading) {
    return (
      <div className="max-w-5xl mx-auto p-6 text-center">
        <p className="text-lg text-slate-600">Loading saved vehicles...</p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto p-6">
      {/* Dropdown for Plate Selection */}
      <div className="mb-6 p-4 bg-white rounded-lg shadow-md border border-slate-200">
        <label htmlFor="plate-select" className="block text-sm font-medium text-slate-700 mb-2">
          Select Vehicle Plate
        </label>
        <select
          id="plate-select"
          value={selectedPlate || ''}
          onChange={handlePlateChange}
          className="w-full px-4 py-2 border border-slate-300 rounded-lg bg-white text-lg font-semibold focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="" disabled>Select a plate...</option>
          {allPlates.map(p => (
            <option key={p} value={p}>{p}</option>
          ))}
        </select>
      </div>

      {/* Render PlateDetailPage, which will use the plate from the URL */}
      {selectedPlate ? (
        <PlateDetailPage />
      ) : (
        <div className="text-center p-10 border-2 border-dashed border-slate-300 rounded-lg bg-slate-50">
          <p className="text-lg text-slate-600">No saved vehicles found. Please use the search page to add one.</p>
        </div>
      )}
    </div>
  );
}
