import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { collection, getDocs, deleteDoc, doc } from "firebase/firestore";
import { db } from "../firebase";

export default function ListPage() {
  const [plates, setPlates] = useState([]);

  const load = async () => {
    const snap = await getDocs(collection(db, "vehicle"));
    setPlates(snap.docs.map((d) => ({ plate: d.id, ...d.data() })));
  };

  useEffect(() => { load(); }, []);

  const remove = async (plate) => {
    if (!window.confirm(`Delete ${plate} ?`)) return;
    await deleteDoc(doc(db, "vehicle", plate));
    load(); // refresh list
  };

  return (
    <div className="max-w-5xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-4">Saved vehicles</h1>
      {plates.length === 0 && <p className="text-gray-600">Nothing saved yet.</p>}
      <ul className="space-y-2">
        {plates.map((v) => (
          <li key={v.plate} className="flex items-center justify-between bg-white p-3 rounded shadow">
            <div>
              <Link to={`/plate/${v.plate}`} className="text-blue-600 hover:underline font-semibold">
                {v.plate}
              </Link>{" "}
              – {v.apiData?.tekniskKjoretoy?.merke || "Brand unknown"}{" "}
              {v.apiData?.tekniskKjoretoy?.handelsbetegnelse}
            </div>
            <button onClick={() => remove(v.plate)} className="button bg-red-600 hover:bg-red-700 text-sm">
              Delete
            </button>
          </li>
        ))}
      </ul>
      <div className="mt-6">
        <Link to="/" className="button">← Back to search</Link>
      </div>
    </div>
  );
}