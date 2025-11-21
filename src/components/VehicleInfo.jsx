import React from "react";

const KV = ({ label, value }) => (
  <div className="flex justify-between py-1 border-b border-gray-100 last:border-0">
    <span className="text-gray-600">{label}</span>
    <span className="font-medium">{value ?? "null"}</span>
  </div>
);

const Card = ({ title, children }) => (
  <div className="bg-white shadow rounded-lg p-4 mb-4">
    <h3 className="font-semibold text-gray-700 mb-2">{title}</h3>
    {children}
  </div>
);

export default function VehicleInfo({ vehicleData }) {
  if (!vehicleData)
    return <div className="bg-white shadow rounded-lg p-4 text-gray-500">No vehicle loaded.</div>;

  const { tekniskKjoretoy: t, registrering: r, periodiskKjoretoykontroll: p } = vehicleData;

  /* ---------------------------------------------------------- */
  /* 1.  IDENTIFIERS                                            */
  /* ---------------------------------------------------------- */
  const Identifiers = () => (
    <Card title="Identifiers">
      <KV label="License plate" value={vehicleData.kjennemerke} />
      <KV label="VIN" value={vehicleData.understellsnummer} />
      <KV label="KUID" value={vehicleData.kuid} />
      <KV label="Personal plate" value={vehicleData.personligKjennemerke} />
      <KV label="Import used" value={vehicleData.bruktimport} />
    </Card>
  );

  /* ---------------------------------------------------------- */
  /* 2.  REGISTRATION                                           */
  /* ---------------------------------------------------------- */
  const Registration = () => (
    <Card title="Registration">
      <KV label="Registration status" value={r?.registreringsstatus} />
      <KV label="Status date" value={r?.registreringsstatusDato} />
      <KV label="First registration (any country)" value={r?.forstegangsregistrering} />
      <KV label="First registration Norway" value={r?.forstegangsregistreringNorge} />
      <KV label="First owner registration" value={r?.forstegangsregistreringEier} />
      <KV label="Plate colour" value={r?.kjennemerkefarge} />
      <KV label="Dealer de-reg flag" value={r?.isAvregistrertHosBilforhandler ? "✅ Yes" : "❌ No"} />
    </Card>
  );

  /* ---------------------------------------------------------- */
  /* 3.  INSPECTION                                             */
  /* ---------------------------------------------------------- */
  const Inspection = () => (
    <Card title="Inspection">
      <KV label="Next inspection due" value={p?.nesteKontroll} />
      <KV label="Last inspection" value={p?.sistKontrollert} />
    </Card>
  );

  /* ---------------------------------------------------------- */
  /* 4.  TECHNICAL                                              */
  /* ---------------------------------------------------------- */
  const Technical = () => (
    <Card title="Technical">
      <KV label="Make" value={t?.merke} />
      <KV label="Model" value={t?.handelsbetegnelse} />
      <KV label="Type approval" value={t?.typebetegnelse} />
      <KV label="Technical category" value={t?.tekniskKode} />
      <KV label="Hybrid category" value={t?.hybridkategori} />
      <KV label="Euro class" value={t?.miljoEuroklasse} />
      <KV label="Length (mm)" value={t?.lengde} />
      <KV label="Width (mm)" value={t?.bredde} />
      <KV label="Height (mm)" value={t?.hoyde} />
      <KV label="Max speed (km/h)" value={t?.maksimumHastighet} />
      <KV label="Seats" value={t?.sitteplasser} />
      <KV label="Standing places" value={t?.staplasser} />
      <KV label="Gearbox" value={t?.girkasse} />
      <KV label="Built-up flag" value={t?.isOppbygd ? "✅ Yes" : "❌ No"} />
      <KV label="Tax class code" value={t?.kjoretoyAvgiftskode} />
    </Card>
  );

  /* ---------------------------------------------------------- */
  /* 5.  ADDITIONAL                                             */
  /* ---------------------------------------------------------- */
  const Additional = () => (
    <Card title="Additional">
      <KV label="Driving ban" value={vehicleData.tilleggsinformasjon?.harBruksforbud ? "✅ Yes" : "❌ No"} />
    </Card>
  );

  /* ---------------------------------------------------------- */
  /* 6.  COLOUR (object)                                        */
  /* ---------------------------------------------------------- */
  const Colour = () => {
    const c = t?.karosseri;
    if (!c) return null;
    return (
      <Card title="Colour">
        <KV label="Description" value={c.farge} />
        <KV label="Code" value={c.fargekode} />
      </Card>
    );
  };

  /* ---------------------------------------------------------- */
  /* 7.  WEIGHT (object)                                        */
  /* ---------------------------------------------------------- */
  const Weight = () => {
    const w = t?.lastegenskaper;
    if (!w) return null;
    return (
      <Card title="Weight data (kg)">
        <KV label="Curb weight" value={w.egenvekt} />
        <KV label="Gross weight" value={w.tillattTotalvekt} />
        <KV label="Payload" value={w.nyttelast} />
        <KV label="Roof load" value={w.tillattTaklast} />
        <KV label="Trailer w/ brakes" value={w.tillattTilhengervektMedBrems} />
        <KV label="Trailer w/o brakes" value={w.tillattTilhengervektUtenBrems} />
        <KV label="Fifth-wheel load" value={w.tillattVertikalKoplingslast} />
        <KV label="Train weight" value={w.tillattVogntogvekt} />
      </Card>
    );
  };

  /* ---------------------------------------------------------- */
  /* 8.  AXLES  (array + sub-object)                            */
  /* ---------------------------------------------------------- */
  const Axles = () => {
    const axles = t?.aksler;
    const wheels = t?.dekkOgFelger;
    if (!axles?.length) return null;
    return (
      <Card title="Axles & wheels">
        <div className="overflow-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left p-2">#</th>
                <th className="text-left p-2">Drive</th>
                <th className="text-left p-2">Max load kg</th>
                <th className="text-left p-2">Suspension</th>
                <th className="text-left p-2">Tyre</th>
                <th className="text-left p-2">Rim</th>
              </tr>
            </thead>
            <tbody>
              {axles.map((ax) => {
                const w = wheels?.find((x) => x.akselId === ax.akselId);
                return (
                  <tr key={ax.akselId} className="border-b">
                    <td className="p-2">{ax.akselId}</td>
                    <td className="p-2">{ax.isDrivaksel ? "✅" : "❌"}</td>
                    <td className="p-2">{ax.tillattLast}</td>
                    <td className="p-2">{ax.isLuftfjaering ? "Air" : "Steel"}</td>
                    <td className="p-2">{w?.dekkdimensjon}</td>
                    <td className="p-2">{w?.felgdimensjon}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    );
  };

  /* ---------------------------------------------------------- */
  /* 9.  ENGINES  (array)                                       */
  /* ---------------------------------------------------------- */
  const Engines = () => {
    const eng = t?.motorer;
    if (!eng?.length) return null;
    return (
      <Card title="Engines">
        {eng.map((e, idx) => (
          <div key={idx} className="border rounded p-3 mb-2">
            <div className="grid grid-cols-2 gap-2 text-sm">
              <KV label="Displacement cm³" value={e.slagvolum} />
              <KV label="Particle filter" value={e.isPartikkelfiltermotor ? "Yes" : "No"} />
            </div>
            {e.drivstoff?.map((f, i) => (
              <div key={i} className="mt-2 pt-2 border-t">
                <p className="font-medium text-gray-700">{f.drivstofftype}</p>
                <div className="grid grid-cols-3 gap-2 text-sm">
                  <KV label="Code" value={f.drivstoffkode} />
                  <KV label="Power kW" value={f.effekt} />
                  <KV label="kWh/h" value={f.maksEffektPerTime} />
                </div>
              </div>
            ))}
          </div>
        ))}
      </Card>
    );
  };

  /* ---------------------------------------------------------- */
  /* 10.  FUEL / CO₂  (array)                                   */
  /* ---------------------------------------------------------- */
  const Fuel = () => {
    const f = t?.forbrukOgUtslipp;
    if (!f?.length) return null;
    return (
      <Card title="Fuel consumption & emissions (WLTP)">
        {f.map((x, i) => (
          <div key={i} className="border rounded p-3 mb-2">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
              <KV label="Fuel code" value={x.drivstoffkode} />
              <KV label="CO₂ g/km" value={x.co2Utslipp} />
              <KV label="Mixed l/100km" value={x.forbrukBlandetKjoring} />
              <KV label="Range km" value={x.rekkeviddeKm} />
            </div>
            <div className="mt-2 text-sm">
              <KV label="Particle filter" value={x.partikkelfilterFabrikkmontert ? "Yes" : "No"} />
              <KV label="NOx g/km" value={x.noxUtslipp?.prKm} />
              <KV label="NOx g/kWh" value={x.noxUtslipp?.prKWh} />
            </div>
          </div>
        ))}
      </Card>
    );
  };

  /* ---------------------------------------------------------- */
  /* 11.  EXEMPTIONS  (array)                                   */
  /* ---------------------------------------------------------- */
  const Exemptions = () => {
    const ex = t?.unntak;
    if (!ex?.length) return null;
    return (
      <Card title="Exemptions">
        <ul className="list-disc pl-5 text-sm">
          {ex.map((e, i) => (
            <li key={i}>{JSON.stringify(e)}</li>
          ))}
        </ul>
      </Card>
    );
  };

  /* ---------------------------------------------------------- */
  /* 12.  HYBRID / ELECTRIC                                     */
  /* ---------------------------------------------------------- */
  const Hybrid = () => {
    const h = t?.hybridElektriskKjoretoy;
    if (!h) return null;
    return (
      <Card title="Hybrid / Electric info">
        <pre className="text-xs bg-gray-100 p-2 rounded">{JSON.stringify(h, null, 2)}</pre>
      </Card>
    );
  };

  /* ---------------------------------------------------------- */
  /* 13.  TECHNICAL SUB-CODE                                    */
  /* ---------------------------------------------------------- */
  const SubCode = () => {
    const s = vehicleData.tekniskUnderkode;
    if (!s) return null;
    return (
      <Card title="Technical sub-code">
        <KV label="Value" value={s.kodeVerdi} />
      </Card>
    );
  };

  /* ---------------------------------------------------------- */
  /* RENDER ALL BLOCKS                                           */
  /* ---------------------------------------------------------- */
  return (
    <div className="space-y-4">
      <Identifiers />
      <Registration />
      <Inspection />
      <Technical />
      <Additional />
      <Colour />
      <Weight />
      <Axles />
      <Engines />
      <Fuel />
      <Exemptions />
      <Hybrid />
      <SubCode />
    </div>
  );
}