import { useEffect } from "react";
import { knownFaults } from "../services/longcat";

export default function useAI(apiData, setManualData) {
  useEffect(() => {
    if (!apiData) return;
    const t = apiData.tekniskKjoretoy;
    const r = apiData.registrering;
    const make = t?.merke;
    const model = t?.handelsbetegnelse;
    const year = r?.forstegangsregistrering?.slice(0,4);
    if (!make || !model || !year) return;
    knownFaults({ make, model, year })
      .then(res => setManualData(m => ({...m, maintenance:{...m.maintenance, knownFaults:res.data.faults}})))
      .catch(()=>{});
  }, [apiData, setManualData]);
}