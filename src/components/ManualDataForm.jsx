// import uploadFile from "../utils/uploadFile";
// import { summariseLeaseDoc, tyreAdvice, nextServiceHint } from "../services/longcat";
// import { collection, addDoc, serverTimestamp } from "firebase/firestore";
// import { db } from "../firebase";
import React, { useState } from "react";
import { collection, addDoc, serverTimestamp, getDocs } from "firebase/firestore";
import { db } from "../firebase";
import { askLongCat, uploadCloudinaryUnsigned } from "../services/aiBrowser";

const BLOCKS = [
  /* --- existing liens, lease, insurance --- */
  { title: "Liens / Mortgages", key: "liens", fields: [
      {k:"provider",l:"Provider"},{k:"amount",l:"Amount"},{k:"status",l:"Status"}]},

  { title: "Car Lease Info", key: "lease", fields: [
      {k:"start",l:"Lease start"},{k:"end",l:"Lease end"},{k:"payment",l:"Lease payment"},
      {k:"paymentDate",l:"Payment date"},{k:"responsible",l:"Payment responsible"},
      {k:"provider",l:"Lease provider"},{k:"receiver",l:"Lease receiver"},
      {k:"tender",l:"Relevant tender"},{k:"webLinks",l:"Other web links"}]},

  { title: "Insurance", key: "insurance", fields: [
      {k:"provider",l:"Provider"},{k:"claimContact",l:"Claim contact"},
      {k:"claimProcedure",l:"Claim procedure URL"},{k:"apiKey",l:"API key (encrypted)"}]},

  { title: "Maintenance", key: "maintenance", fields: [
      {k:"mechanicId",l:"Mechanic (workshop)"},{k:"lastVisit",l:"Last visit"},
      {k:"lastService",l:"Last service"},{k:"nextServiceDate",l:"Next service date (AI)"},
      {k:"nextServiceMileage",l:"Next service km (AI)"},{k:"knownFaults",l:"Known faults (AI)"}]},

  { title: "Tyre Info", key: "tyre", fields: [
      {k:"storageAddress",l:"Storage address"},{k:"winterChange",l:"Winter change date"},
      {k:"summerChange",l:"Summer change date"},{k:"mileage",l:"Current tyre mileage"},
      {k:"aiRecommendation",l:"AI recommendation"}]}
];

export default function ManualDataForm({ manualData, setManualData, plate, readOnly=false }) {
  const [mechanics, setMechanics] = useState([]);
  const [leaseFile, setLeaseFile] = useState(null);
  const [tyreFile, setTyreFile] = useState(null);
  const [leaseSummary, setLeaseSummary] = useState(manualData.lease?.docSummary || "");
  const [tyreRec, setTyreRec]       = useState(manualData.tyre?.aiRecommendation || "");

  /* load workshop users once */
  React.useEffect(() => {
    (async () => {
      const snap = await getDocs(collection(db, "workshops"));
      setMechanics(snap.docs.map(d => ({id:d.id, ...d.data()})));
    })();
  }, []);

  const handleChange = (section, field, value) =>
    setManualData({...manualData, [section]: {...manualData[section], [field]: value}});

 const uploadLease = async () => {
  if (!leaseFile) return;
  const url  = await uploadCloudinaryUnsigned(leaseFile, `lease/${plate}`);
  const txt  = await fetch(url).then(r => r.text());
  const summary = await askLongCat(`Oppsummer følgende leiekontrakt på norsk i 5 setninger:\n${txt}`);
  setLeaseSummary(summary);
  handleChange("lease", "docUrl", url);
  handleChange("lease", "docSummary", summary);
  setLeaseFile(null);
};

/* ---------- 2.  tyre photo + AI advice ---------- */
const uploadTyre = async () => {
  if (!tyreFile) return;
  const url  = await uploadCloudinaryUnsigned(tyreFile, `tyre/${plate}`);
  const rec  = await askLongCat(`Se på bildet: ${url} – vurder dekkmønster-dybde og anbefal om dekk bør skiftes (norsk, kort).`);
  setTyreRec(rec);
  handleChange("tyre", "photoUrl", url);
  handleChange("tyre", "aiRecommendation", rec);
  setTyreFile(null);
};

/* ---------- 3.  AI service hint ---------- */
const hintService = async () => {
  const hint = await askLongCat(
    `Bilen er en ${manualData.make || ""} (${manualData.year || ""}), siste service ved ${
      manualData.maintenance?.lastServiceMileage || 0
    } km ${
      manualData.maintenance?.lastService || ""
    }, nåværende km ${
      manualData.maintenance?.currentKm || 0
    }. Anbefal neste service-dato og kilometer-stand (norsk, kort).`
  );
  handleChange("maintenance", "nextServiceHint", hint);
};

  return (
    <div className="bg-white shadow rounded-lg p-4 space-y-6">
      {BLOCKS.map((block) => (
        <div key={block.key}>
          <h4 className="font-medium text-gray-700 mb-2">{block.title}</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {block.fields.map((f) =>
              f.k === "mechanicId" ? (
                /* mechanic dropdown */
                <select
                  key={f.k}
                  className="input"
                  value={manualData[block.key]?.[f.k] || ""}
                  onChange={(e) => handleChange(block.key, f.k, e.target.value)}
                  disabled={readOnly}
                >
                  <option value="">Choose workshop</option>
                  {mechanics.map((m) => (
                    <option key={m.id} value={m.id}>{m.name}</option>
                  ))}
                </select>
              ) : (
                <input
                  key={f.k}
                  placeholder={f.l}
                  className="input"
                  value={manualData[block.key]?.[f.k] || ""}
                  onChange={(e) => handleChange(block.key, f.k, e.target.value)}
                  disabled={readOnly}
                />
              )
            )}
          </div>

          {/* special rows for file + AI */}
          {block.key === "lease" && (
            <>
              <div className="mt-3 flex gap-2">
                <input type="file" onChange={(e) => setLeaseFile(e.target.files[0])} />
                <button onClick={uploadLease} className="button bg-indigo-600">Upload & summarise</button>
              </div>
              {leaseSummary && <div className="mt-2 text-sm bg-gray-100 p-2 rounded">{leaseSummary}</div>}
            </>
          )}

          {block.key === "tyre" && (
            <>
              <div className="mt-3 flex gap-2">
                <input type="file" accept="image/*" onChange={(e) => setTyreFile(e.target.files[0])} />
                <button onClick={uploadTyre} className="button bg-purple-600">Upload & AI check</button>
              </div>
              {tyreRec && <div className="mt-2 text-sm bg-gray-100 p-2 rounded">{tyreRec}</div>}
            </>
          )}

          {block.key === "maintenance" && (
            <div className="mt-3">
              <button onClick={hintService} className="button bg-teal-600">AI service hint</button>
              {manualData.maintenance?.nextServiceHint && (
                <div className="mt-2 text-sm bg-gray-100 p-2 rounded">{manualData.maintenance.nextServiceHint}</div>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}