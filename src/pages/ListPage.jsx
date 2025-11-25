import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next"; // Import useTranslation
import { collection, getDocs, deleteDoc, doc } from "firebase/firestore";
import { db } from "../firebase";

export default function ListPage() {
  const { t } = useTranslation('list'); // Use the 'list' namespace
  const [plates, setPlates] = useState([]);

  const load = async () => {
    try {
      const snap = await getDocs(collection(db, "vehicle"));
      console.log(snap, 'snap');
      setPlates(snap.docs.map((d) => ({ plate: d.id, ...d.data() })));
    } catch (error) {
      console.error("Error loading vehicles:", error);
      // Optionally set an error state here and display it using t('error_loading')
    }
  };

  useEffect(() => { load(); }, []);

  const remove = async (plate) => {
    // Use the translation key for the confirmation message
    if (!window.confirm(t('delete_confirm', { plate }))) return;
    try {
      await deleteDoc(doc(db, "vehicle", plate));
      load(); // refresh list
    } catch (error) {
      console.error("Error deleting vehicle:", error);
       // Optionally set an error state here and display it using t('error_deleting')
    }
  };

  return (
    // Use t() for all static text
    <div className="max-w-5xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-4">{t('title')}</h1>
      {plates.length === 0 && <p className="text-gray-600">{t('empty_state')}</p>}
      <ul className="space-y-2">
        {plates.map((v) => (
          <li key={v.plate} className="flex items-center justify-between bg-white p-3 rounded shadow">
            <div>
              <Link to={`/plate/${v.plate}`} className="text-blue-600 hover:underline font-semibold">
                {v.plate}
              </Link>{" "}
              – {v.apiData?.tekniskKjoretoy?.merke || t('brand_unknown')}{" "}
              {v.apiData?.tekniskKjoretoy?.handelsbetegnelse}
            </div>
            <button onClick={() => remove(v.plate)} className="button bg-red-600 hover:bg-red-700 text-sm">
              {t('delete_button')}
            </button>
          </li>
        ))}
      </ul>
      <div className="mt-6">
        <Link to="/" className="button">{t('back_to_search')}</Link>
      </div>
    </div>
  );
}