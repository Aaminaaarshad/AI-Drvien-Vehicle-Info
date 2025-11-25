import React, { useState, useEffect } from "react";
import axios from "axios";
import { Link } from "react-router-dom";
import Header from "./components/Header";
import VehicleInfo from "./components/VehicleInfo";
import ManualDataForm from "./components/ManualDataForm";
import { db } from "./firebase";
import { doc, getDoc, setDoc, collection, getDocs } from "firebase/firestore";
import { useTranslation } from "react-i18next";
import LanguageSwitcher from "./components/LanguageSwitcher";

function App() {
  const { t } = useTranslation('app');

  const [plate, setPlate] = useState("");
  const [vehicleData, setVehicleData] = useState(null);
  const [manualData, setManualData] = useState({});
  const [loading, setLoading] = useState(false);
  const [savedPlates, setSavedPlates] = useState([]);

  useEffect(() => {
    (async () => {
      const snap = await getDocs(collection(db, "vehicle"));
      setSavedPlates(snap.docs.map((d) => d.id));
    })();
  }, []);

  const fetchData = async () => {
    if (!plate) return;
    setLoading(true);
    try {
const { data } = await axios.get(`/api/vegvesen/${plate}`);
setVehicleData(data);


      const snap = await getDoc(doc(db, "vehicle", plate));
      const snapData = snap.exists() ? snap.data() : {};

      setManualData((prev) => ({
        ...prev,
        ...snapData.manualData,
        maintenance: snapData.manualData?.maintenance || prev.maintenance,
        lease: snapData.manualData?.lease || prev.lease,
        insurance: snapData.manualData?.insurance || prev.insurance,
        liens: snapData.manualData?.liens || prev.liens,
      }));
    } catch (err) {
      console.error(err);
      alert(t("error_fetch"));
    } finally {
      setLoading(false);
    }
  };

  const saveEverything = async () => {
    if (!plate) {
      alert(t("enter_plate_first"));
      return;
    }

    try {
      const payload = {
        plate,
        apiData: vehicleData,
        manualData,
        savedAt: new Date().toISOString()
      };
      await setDoc(doc(db, "vehicle", plate), payload);
      alert(t("success_save"));
    } catch (err) {
      console.error(err);
      alert(t("error_save"));
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      


      <main className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">

        <div className="mb-6 grid grid-cols-1 sm:grid-cols-4 gap-4 items-end">

          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-slate-700 mb-2">
              {t("license_plate_label")}
            </label>
            <input
              className="input w-full"
              placeholder={t("license_plate_placeholder")}
              value={plate}
              onChange={(e) => setPlate(e.target.value.toUpperCase())}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              {t("saved_vehicles_label")}
            </label>
            <select
              className="input w-full"
              value={plate}
              onChange={(e) => setPlate(e.target.value)}
            >
              <option value="">{t("saved_vehicles_default")}</option>
              {savedPlates.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>

          <div className="flex gap-2">
            <button className="button" onClick={fetchData}>
              {loading ? t("loading") : t("fetch_vehicle_button")}
            </button>

            <button
              className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition"
              onClick={() => {
                setPlate("");
                setVehicleData(null);
                setManualData({});
              }}
            >
              {t("reset_button")}
            </button>

            <Link to="/list" className="button bg-green-600 hover:bg-green-700">
              {t("see_saved_button")}
            </Link>
          </div>

        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {vehicleData && (
            <div className="lg:col-span-2 space-y-4">
              <ManualDataForm manualData={manualData} setManualData={setManualData} />
              <VehicleInfo vehicleData={vehicleData} />

              <div className="mt-4 flex gap-2">
                <button className="button" onClick={saveEverything}>
                  {t("save_everything_button")}
                </button>

                <button
                  className="button bg-indigo-600 hover:bg-indigo-700"
                  onClick={saveEverything}
                >
                  {t("save_manual_only_button")}
                </button>
              </div>

            </div>
          )}
        </div>

      </main>
    </div>
  );
}

export default App;
