"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { collection, getDocs } from "firebase/firestore" // Removed addDoc
import { db } from "../firebase"
import { askLongCat, uploadCloudinaryUnsigned } from "../services/aiBrowser"
import { askChat, analyseTyre } from "../services/api"
import {
  AlertCircle,
  CheckCircle,
  Clock,
  Send,
  X,
  Plus,
  Upload,
  Wrench,
  Shield,
  FileText,
  Loader2,
  Zap,
  Car,
  Gauge,
} from "lucide-react"
import { useTranslation } from "react-i18next"

// --- Helper Data and Functions ---

const DATE_FIELDS = ["start", "end", "paymentDate", "lastDate", "expiryDate"]



const getDateStatus = (dateStr) => {
  // const {t} = useTranslation('mdf');
  if (!dateStr) return null
  const today = new Date()
  const date = new Date(dateStr)
  const diffDays = Math.ceil((date - today) / (1000 * 60 * 60 * 24))
  if (diffDays < 0) return "Expired"
  if (diffDays <= 30) return "Expiring Soon"
  return "Valid"
}

const formatDateShort = (d) => {
  if (!d) return "-"
  try {
    return new Date(d).toLocaleDateString()
  } catch {
    return d
  }
}

// --- Helper Components for ResultsPage Integration ---

const StatusBadge = ({ status }) => {

  const {t} = useTranslation('mdf');
  if (!status || status === "Valid") {
    return (
      <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
        <CheckCircle size={14} /> {t('status_valid')}
      </span>
    )
  }
  if (status === "Expired") {
    return (
      <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-rose-50 text-rose-700 border border-rose-200">
        <AlertCircle size={14} /> {t('status_expired')}
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200">
      <Clock size={14} /> {t('status_expiring_soon')}
    </span>
  )
}

const ProgressBar = ({ label, dateMs, maxSpanMs, colorClass }) => {
  const now = Date.now()
  const distance = dateMs ? Math.max(0, dateMs - now) : maxSpanMs
  const score = Math.max(0, maxSpanMs - distance)
  const pct = Math.round((score / (maxSpanMs || 1)) * 100)
  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center">
        <span className="text-sm font-medium text-slate-700">{label}</span>
        <span className="text-xs text-slate-500">{dateMs ? formatDateShort(dateMs) : "-"}</span>
      </div>
      <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all ${colorClass}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

const LabeledInput = ({ label, type = "text", value, onChange, readOnly = false, status = null }) => (
  <div className="space-y-2">
    <label className="block text-sm font-medium text-slate-700">{label}</label>
    <input
      type={type}
      className={`w-full px-3 py-2 rounded-lg border transition-colors ${
        readOnly
          ? "bg-slate-50 text-slate-500 cursor-not-allowed border-slate-200"
          : status === "Expired"
            ? "border-rose-300 bg-rose-50 focus:ring-rose-500"
            : status === "Expiring Soon"
              ? "border-amber-300 bg-amber-50 focus:ring-amber-500"
              : "border-slate-200 bg-white focus:ring-blue-500"
      } focus:outline-none focus:ring-2 focus:border-transparent`}
      value={value || ""}
      onChange={(e) => onChange(e.target.value)}
      disabled={readOnly}
    />
  </div>
)

const getPriorityColor = (priority) => {
  switch (priority?.toLowerCase()) {
    case "high":
      return { bg: "bg-red-100", text: "text-red-800", border: "border-red-400" };
    case "medium":
      return { bg: "bg-amber-100", text: "text-amber-800", border: "border-amber-400" };
    case "low":
      return { bg: "bg-green-100", text: "text-green-800", border: "border-green-400" };
    default:
      return { bg: "bg-slate-100", text: "text-slate-700", border: "border-slate-300" };
  }
};

const getRiskLevelColor = (riskLevel) => {
  switch (riskLevel?.toLowerCase()) {
    case "high":
      return { bg: "bg-red-100", text: "text-red-800", border: "border-red-400", icon: "🔴" };
    case "medium":
      return { bg: "bg-amber-100", text: "text-amber-800", border: "border-amber-400", icon: "🟡" };
    case "low":
      return { bg: "bg-green-100", text: "text-green-800", border: "border-green-400", icon: "🟢" };
    default:
      return { bg: "bg-slate-100", text: "text-slate-700", border: "border-slate-300", icon: "⚪" };
  }
};

const TireAnalysisResults = ({ analysis, onAnalyzeAgain }) => {
  const {t} = useTranslation('mdf');
  if (!analysis) return null;

  const riskColor = getRiskLevelColor(analysis.riskLevel);

  return (
    <div className="space-y-8 p-6 bg-white rounded-xl shadow-lg border border-slate-200">
      <h2 className="text-2xl font-bold text-slate-900 border-b pb-4 mb-4 flex items-center gap-2">
        <Zap size={24} className="text-blue-600" /> {t('tire_analysis_results_title')}
      </h2>

      {/* Condition Summary Card */}
      {analysis.condition && (
        <div className="bg-white rounded-xl shadow-sm p-6 border-l-4 border-blue-500">
          <h3 className="text-xl font-bold text-slate-900 mb-3">{t('condition_summary_title')}</h3>
          <p className="text-base text-slate-700 leading-relaxed">{analysis.condition}</p>
        </div>
      )}

      {/* Risk Level Card */}
      {analysis.riskLevel && (
        <div className={`rounded-xl p-6 flex items-center gap-4 ${riskColor.bg} border ${riskColor.border}`}>
          <div className="text-4xl">{riskColor.icon}</div>
          <div>
            <h3 className={`text-lg font-bold ${riskColor.text}`}>
              {t('risk_level_title')}: {analysis.riskLevel.charAt(0).toUpperCase() + analysis.riskLevel.slice(1)}
            </h3>
            <p className={`text-sm ${riskColor.text} opacity-80 mt-1`}>
              {analysis.riskLevel.toLowerCase() === "low" && t("risk_level_low_tip")}
              {analysis.riskLevel.toLowerCase() === "medium" && t("risk_level_medium_tip")}
              {analysis.riskLevel.toLowerCase() === "high" && t("risk_level_high_tip")}
            </p>
          </div>
        </div>
      )}

      {/* Estimated Life Card */}
      {analysis.estimatedLifeKm && (
        <div className="bg-white rounded-xl shadow-sm p-6 border-t-4 border-purple-500">
          <div className="flex items-center gap-4">
            <div className="text-5xl font-bold text-purple-600 min-w-[100px]">
              {analysis.estimatedLifeKm.toLocaleString()}
            </div>
            <div>
              <h3 className="text-base font-semibold text-slate-900">{t("estimated_remaining_life_title")}</h3>
              <p className="text-sm text-slate-600 mt-1">{t("kilometers_until_replacement")}</p>
            </div>
          </div>
        </div>
      )}

      {/* Maintenance Tasks */}
      {analysis.maintenance && analysis.maintenance.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-xl font-bold text-slate-900">{t("maintenance_tasks_title")}</h3>
          <div className="grid gap-4">
            {analysis.maintenance.map((task, idx) => {
              const priorityColor = getPriorityColor(task.priority);
              return (
                <div
                  key={idx}
                  className={`p-4 rounded-lg ${priorityColor.bg} border ${priorityColor.border} transition-shadow hover:shadow-md`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`px-3 py-1 rounded-full text-xs font-semibold ${priorityColor.text} ${priorityColor.bg.replace('100', '200')}`}>
                      {task.priority?.toUpperCase() || "MEDIUM"}
                    </div>
                    <div className="flex-1">
                      <h4 className="text-base font-semibold text-slate-900 mb-1">{task.task}</h4>
                      <p className="text-sm text-slate-700 leading-relaxed">{task.reason}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Driver Tips */}
      {analysis.driverTips && analysis.driverTips.length > 0 && (
        <div className="p-6 rounded-xl text-white bg-gradient-to-br from-indigo-500 to-purple-600 shadow-lg">
          <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
            <span className="text-2xl">💡</span> {t("driver_tips_title")}
          </h3>
          <ul className="space-y-3 list-none p-0">
            {analysis.driverTips.map((tip, idx) => (
              <li key={idx} className="flex items-start gap-2 text-sm">
                <span className="mt-0.5 text-lg">✓</span>
                <p className="m-0">{tip}</p>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Analyze Again Button */}
      <div className="pt-4 border-t border-slate-200">
        <button
          onClick={onAnalyzeAgain}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-slate-100 text-slate-700 font-medium hover:bg-slate-200 transition-colors"
        >
          <Zap size={18} /> {t("analyze_again_button")}
        </button>
      </div>
    </div>
  );
};

// --- Main Component ---

export default function ManualDataForm({ manualData = {}, setManualData, plate = "", readOnly = false, onAnalysisComplete }) { // Added onAnalysisComplete prop
  const {t} = useTranslation('mdf');
  const [workshops, setWorkshops] = useState([])
  const [leaseFile, setLeaseFile] = useState(null)
  const [leaseSummary, setLeaseSummary] = useState(manualData.lease?.docSummary || "")
  const [aiSummary, setAiSummary] = useState("")
  const [loadingAi, setLoadingAi] = useState(false)

  const [chatOpen, setChatOpen] = useState(false)
  const [chatInput, setChatInput] = useState("")
  const [messages, setMessages] = useState([])
  const messagesEndRef = useRef(null)

  const BLOCKS = [
  {
    title: t("liens_mortgages_title"),
    key: "liens",
    fields: [
      { k: "provider", l: t("provider_label") },
      { k: "amount", l: t("amount_label") },
      { k: "status", l: t("status_label") },
    ],
  },
  {
    title: t("car_lease_info_title"),
    key: "lease",
    fields: [
      { k: "start", l: t("lease_start_label") },
      { k: "end", l: t("lease_end_label") },
      { k: "payment", l: t("lease_payment_label") },
      { k: "paymentDate", l: t("payment_date_label") },
      { k: "responsible", l: t("payment_responsible_label") },
      { k: "provider", l: t("lease_provider_label")},
      { k: "receiver", l: t("lease_receiver_label")},
      { k: "tender", l: t("relevant_tender_label") },
      { k: "webLinks", l: t("other_web_links_label") },
    ],
  },
  {
    title: t("insurance_quick_view_title"),
    key: "insurance",
    fields: [
      { k: "provider", l: t("lease_provider_label_short") },
      { k: "claimContact", l: t("claim_contact_label") },
      { k: "claimProcedure", l: t("claim_procedure_url_label") },
      { k: "expiryDate", l: t("insurance_expiry_date_label") },
    ],
  },
  {
    title: t("maintenance_title"),
    key: "maintenance",
    fields: [
      { k: "serviceType", l: t("maintenance_type_label") },
      { k: "lastDate", l: t("last_service_date_label")},
    ],
  },
]

const MAINT_TYPES = [
  t("maint_type_oil_change"),
 t("maint_type_tyre_change"),
  t("maint_type_tyre_inspection"),
  t("maint_type_brake_check"),
  t("maint_type_battery_check"),
  t("maint_type_fluid_check"),
  t("maint_type_full_service"),
  t("maint_type_other"),
]

  // New state for tire analysis, initialized from manualData for persistence
  const [tireAnalysis, setTireAnalysis] = useState(manualData.tireAnalysis?.analysis || null);
  const [tireImages, setTireImages] = useState([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  // New state for analysis input fields, initialized from manualData for persistence
  const [vehicleType, setVehicleType] = useState(manualData.tireAnalysis?.vehicleType || '');
  const [mileage, setMileage] = useState(manualData.tireAnalysis?.mileage || '');

  // Sync state from parent's manualData.tireAnalysis on initial load/update
  useEffect(() => {
    if (manualData.tireAnalysis) {
      setTireAnalysis(manualData.tireAnalysis.analysis || null);
      setVehicleType(manualData.tireAnalysis.vehicleType || '');
      setMileage(manualData.tireAnalysis.mileage || '');
    } else {
      // If parent clears the analysis, clear local state too
      setTireAnalysis(null);
    }
  }, [manualData.tireAnalysis]);


  const QUICK_QUESTIONS = [
    { id: 1, text: t("whenInsuranceExpire"), icon: "🛡️" },
    { id: 2, text: t("whenLeaseExpire"), icon: "📄" },
    { id: 3, text:t("nextMaintenanceDue"), icon: "🔧" },
    { id: 4, text: t("mainAlertsForVehicle"), icon: "⚠️" },
  ]

  const handleQuickQuestion = async (question) => {
    // ... (Original handleQuickQuestion logic)
    setChatInput(question)
    // Trigger AI response with the question
    const userMsg = { from: "user", text: question, ts: Date.now() }
    setMessages((prev) => [...prev, userMsg])
    try {
      const context = {
        plate,
        lease: manualData.lease || {},
        insurance: manualData.insurance || {},
        maintenance: manualData.maintenance || [],
        liens: manualData.liens || {},
      }
      // build localized instruction + the user's specific question
      const userPrompt = `${t("prompt")}\n\nQuestion: ${question}`
      const answer = await askLongCat(userPrompt, context)
      const aiMsg = { from: "ai", text: answer, ts: Date.now() }
      setMessages((prev) => [...prev, aiMsg])
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), 200)
    } catch (e) {
      const errMsg = { from: "ai", text: t("aiError") }
      setMessages((prev) => [...prev, errMsg])
    }
    setChatInput("")
  }

  useEffect(() => {
    ;(async () => {
      try {
        const snap = await getDocs(collection(db, "workshops"))
        setWorkshops(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
      } catch (e) {
        // ignore silently
      }
    })()
  }, [])

  useEffect(() => {
    if (!Array.isArray(manualData.maintenance)) {
      setManualData((prev) => ({ ...prev, maintenance: prev.maintenance || [] }))
    }
  }, [])

  const handleChange = (section, field, value, index = null) => {
    if (index !== null) {
      const arr = Array.isArray(manualData[section]) ? [...manualData[section]] : []
      arr[index] = { ...arr[index], [field]: value }
      setManualData({ ...manualData, [section]: arr })
    } else {
      setManualData({ ...manualData, [section]: { ...(manualData[section] || {}), [field]: value } })
    }
  }

  const addMaintenance = () => {
    const arr = Array.isArray(manualData.maintenance) ? [...manualData.maintenance] : []
    arr.push({ serviceType: "", lastDate: "" })
    setManualData({ ...manualData, maintenance: arr })
  }

  const uploadLease = async () => {
    if (!leaseFile) return
    try {
      const url = await uploadCloudinaryUnsigned(leaseFile, `lease/${plate}`)
      const txt = await fetch(url).then((r) => r.text())
      // include the loaded text as context — pass both the instruction and doc for better results
      const prompt = t("longCat")
      const summary = await askLongCat(prompt, { plate, lease: { ...manualData.lease, rawText: txt } })
      setLeaseSummary(summary)
      handleChange("lease", "docUrl", url)
      handleChange("lease", "docSummary", summary)
      setLeaseFile(null)
    } catch (e) {
      console.error(e)
      alert("Lease upload failed")
    }
  }

  const computeAlerts = () => {
    const alerts = []
    ;(manualData.maintenance || []).forEach((m) => {
      if (!m) return
      console.log(m)
      const s = getDateStatus(m.lastDate)
      console.log(s)
      if (s === "Expired") alerts.push({ text: `${m.serviceType} ${t("overdue")}`, risk: 9 })
      else if (s === "Expiring Soon") alerts.push({ text: `${m.serviceType} ${t("expiringSoon")}`, risk: 6 })
    })
    const insStatus = getDateStatus(manualData.insurance?.expiryDate)
    if (insStatus === "Expired") alerts.push({ text: t("expired"), risk: 10 })
    else if (insStatus === "Expiring Soon") alerts.push({ text: t("expiringSoonTwo"), risk: 7 })
    const leaseStatus = getDateStatus(manualData.lease?.end)
    if (leaseStatus === "Expired") alerts.push({ text: t("Lexpired"), risk: 8 })
    else if (leaseStatus === "Expiring Soon") alerts.push({ text: t("LexpiringSoon"), risk: 5 })
    return alerts
  }

  const alerts = computeAlerts()
  console.log(alerts,'alerst')

  const nowMs = Date.now()
  const dateMsList = [
    ...(manualData.maintenance || []).map((m) => (m.lastDate ? new Date(m.lastDate).getTime() : null)),
    manualData.insurance?.expiryDate ? new Date(manualData.insurance.expiryDate).getTime() : null,
    manualData.lease?.end ? new Date(manualData.lease.end).getTime() : null,
  ].filter(Boolean)
  const maxSpanMs = dateMsList.length
    ? Math.max(...dateMsList.map((d) => Math.abs(d - nowMs)))
    : 1000 * 60 * 60 * 24 * 365

  const generateAiSummary = async () => {
    if (!plate) {
      setAiSummary("")
      return
    }
    setLoadingAi(true)
    try {
      const ctx = {
        plate,
        lease: manualData.lease || {},
        insurance: manualData.insurance || {},
        maintenance: manualData.maintenance || [],
        liens: manualData.liens || {},
      }

      const prompt = t("promptTwo")
      const summary = await askLongCat(prompt, ctx)
      setAiSummary(summary)
    } catch (e) {
      console.error(e)
      setAiSummary("Kunne ikke generere AI-oppsummering.")
    } finally {
      setLoadingAi(false)
    }
  }

  // --- New Tire Analysis Logic ---

  const handleImageUpload = (e) => {
    setTireImages(Array.from(e.target.files));
    setTireAnalysis(null); // Clear previous analysis
    onAnalysisComplete(null); // Notify parent to clear saved analysis
  };

  const runTireAnalysis = async () => {
    if (tireImages.length === 0) {
      alert("Please upload tire pictures first.");
      return;
    }
    if (!vehicleType || !mileage) {
        alert("Please enter Vehicle Type and Mileage.");
        return;
    }

    setIsAnalyzing(true);
    setTireAnalysis(null);

    try {
      const formData = new FormData();
      tireImages.forEach((img) => formData.append('images', img));
      formData.append('vehicleType', vehicleType);
      formData.append('mileage', mileage);

      const res = await analyseTyre(formData);
      
      const analysisResult = res.data.data;
      setTireAnalysis(analysisResult); 
      
      // Pass the analysis result up to the parent component for saving
      onAnalysisComplete({
        vehicleType,
        mileage,
        timestamp: new Date().toISOString(),
        analysis: analysisResult,
      });

    } catch (e) {
      console.error("Tire Analysis Error:", e);
      alert("Tire analysis failed. Please check the backend service.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleAnalyzeAgain = () => {
    setTireAnalysis(null);
    setTireImages([]);
    onAnalysisComplete(null); // Notify parent to clear saved analysis
    // Keep vehicleType and mileage for convenience
  };

  // --- Render Logic ---

  return (
    <div className="p-6 space-y-8">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Alerts and Summaries */}
        <div className="lg:col-span-1 space-y-8">
          {/* AI Summary Card */}
          <div className="bg-white rounded-xl shadow-md border border-slate-200 p-6 space-y-4">
            <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
              <Zap size={20} className="text-blue-600" /> {t("ai_vehicle_summary_title")}
            </h2>
            {loadingAi ? (
              <div className="flex justify-center items-center h-20">
                <Loader2 className="animate-spin text-blue-500" size={24} />
              </div>
            ) : aiSummary ? (
              <p className="text-sm text-slate-700">{aiSummary}</p>
            ) : (
              <button
                onClick={generateAiSummary}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-blue-500 text-white font-medium hover:bg-blue-600 transition-colors"
              >
                {t("generate_summary_button")}
              </button>
            )}
          </div>

          {/* Alerts Card */}
          <div className="bg-white rounded-xl shadow-md border border-slate-200 p-6 space-y-4">
            <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
              <AlertCircle size={20} className="text-rose-500" /> {t("vehicle_alerts_title")}
            </h2>
            {alerts.length > 0 ? (
              <div className="space-y-3">
                {alerts.sort((a, b) => b.risk - a.risk).map((alert, i) => (
                  <div key={i} className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-sm text-rose-800">
                    {alert.text}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-500">{t("no_critical_alerts")}</p>
            )}
          </div>

          {/* Date Progress Bars */}
          <div className="bg-white rounded-xl shadow-md border border-slate-200 p-6 space-y-6">
            <h2 className="text-lg font-semibold text-slate-900">{t("key_date_tracking_title")}</h2>
            {manualData.insurance?.expiryDate && (
              <ProgressBar
                label={t("insurance_expiry_label")}
                dateMs={new Date(manualData.insurance.expiryDate).getTime()}
                maxSpanMs={maxSpanMs}
                colorClass="bg-green-500"
              />
            )}
            {manualData.lease?.end && (
              <ProgressBar
                label={t('lease_end_label')}
                dateMs={new Date(manualData.lease.end).getTime()}
                maxSpanMs={maxSpanMs}
                colorClass="bg-blue-500"
              />
            )}
            {(manualData.maintenance || []).map((m, i) => m.lastDate && (
              <ProgressBar
                key={i}
                label={`Maintenance: ${m.serviceType}`}
                dateMs={new Date(m.lastDate).getTime()}
                maxSpanMs={maxSpanMs}
                colorClass="bg-amber-500"
              />
            ))}
          </div>

          {/* Insurance and Lease Quick View */}
          <div className="grid grid-cols-1 gap-4">
            {/* Insurance Quick View */}
            <div className="rounded-2xl bg-white border border-slate-200 overflow-hidden shadow-sm">
              <div className="bg-gradient-to-r from-green-50 to-green-100 border-b border-green-200 px-6 py-5 flex items-center gap-4">
                <div className="p-3 rounded-lg bg-green-200">
                  <Shield size={22} className="text-green-700" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-lg">{t('insurance_title')}</h3>
                  <p className="text-xs text-slate-600 mt-0.5">{t('insurance_coverage_status')}</p>
                </div>
              </div>
              <div className="p-6">
                {manualData.insurance ? (
                  <div className="space-y-4">
                    {manualData.insurance.expiryDate && (
                      <div className="p-4 rounded-lg bg-green-50 border border-green-100">
                        <p className="text-xs text-slate-600 uppercase font-bold tracking-wide mb-1">{t('insurance_expiry_date_label_short')}</p>
                        <p className="text-sm text-slate-700 font-medium">
                          {formatDateShort(manualData.insurance.expiryDate)}
                        </p>
                      </div>
                    )}
                    <div className="pt-2">
                      <StatusBadge status={getDateStatus(manualData.insurance?.expiryDate)} />
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Shield size={32} className="text-slate-300 mx-auto mb-3" />
                    <p className="text-sm text-slate-500 font-medium">{t('no_insurance_data')}</p>
                    <p className="text-xs text-slate-400 mt-1">{t('add_insurance_info')}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Lease Quick View */}
            <div className="rounded-2xl bg-white border border-slate-200 overflow-hidden shadow-sm">
              <div className="bg-gradient-to-r from-blue-50 to-blue-100 border-b border-blue-200 px-6 py-5 flex items-center gap-4">
                <div className="p-3 rounded-lg bg-blue-200">
                  <FileText size={22} className="text-blue-700" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-lg">{t("lease_quick_view_title")}</h3>
                  <p className="text-xs text-slate-600 mt-0.5">{t("lease_agreement_details")}</p>
                </div>
              </div>
              <div className="p-6">
                {manualData.lease ? (
                  <div className="space-y-4">
                    {manualData.lease.provider && (
                      <div className="p-4 rounded-lg bg-blue-50 border border-blue-100">
                        <p className="text-xs text-slate-600 uppercase font-bold tracking-wide mb-1">{t('lease_provider_label_short')}</p>
                        <p className="text-lg font-bold text-slate-900">
                          {manualData.lease.provider || t('not_specified')}
                        </p>
                      </div>
                    )}
                    {manualData.lease.end && (
                      <div className="p-4 rounded-lg bg-blue-50 border border-blue-100">
                        <p className="text-xs text-slate-600 uppercase font-bold tracking-wide mb-1">{t('lease_end_date_label_short')}</p>
                        <p className="text-sm text-slate-700 font-medium">{formatDateShort(manualData.lease.end)}</p>
                      </div>
                    )}
                    <div className="pt-2">
                      <StatusBadge status={getDateStatus(manualData.lease?.end)} />
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <FileText size={32} className="text-slate-300 mx-auto mb-3" />
                    <p className="text-sm text-slate-500 font-medium">{t('no_lease_information')}</p>
                    <p className="text-xs text-slate-400 mt-1">{t("add_lease_details")}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Data Blocks and Tire Analysis */}
        <div className="lg:col-span-2 space-y-8">
          {/* Tire Analysis Section */}
          <div className="bg-white rounded-xl shadow-md border border-slate-200 p-6 space-y-4">
            <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
              <Wrench size={20} className="text-slate-600" /> {t('tire_maintenance_analysis_title')}
            </h2>
            
            {/* Analysis Input Form (Hidden when results are present) */}
            {!tireAnalysis && (
              <>
                {/* Analysis Input Fields */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <label className="flex items-center text-sm font-semibold text-slate-700 mb-2">
                            <Car className="w-4 h-4 mr-2 text-blue-600" />
                            {t('vehicle_type_label')}
                        </label>
                        <input
                            type="text"
                            value={vehicleType}
                            onChange={(e) => setVehicleType(e.target.value)}
                            placeholder={t('vehicle_type_placeholder')}
                            required
                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all duration-200 placeholder:text-slate-400"
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="flex items-center text-sm font-semibold text-slate-700 mb-2">
                            <Gauge className="w-4 h-4 mr-2 text-blue-600" />
                            {t('mileage_label')}
                        </label>
                        <input
                            type="number"
                            value={mileage}
                            onChange={(e) => setMileage(e.target.value)}
                            placeholder={t('mileage_placeholder')}
                            required
                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all duration-200 placeholder:text-slate-400"
                        />
                    </div>
                </div>

                {/* Image Upload and Analyze Button */}
                <div className="border-y border-slate-200 py-4 space-y-4">
                  <label className="block text-sm font-medium text-slate-700">{t('upload_tire_images_label')}</label>
                  <input
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm bg-white"
                  />
                  {tireImages.length > 0 && (
                    <p className="text-xs text-slate-500">{tireImages.length} {t('upload_tire_images_description')}</p>
                  )}
                  <button
                    onClick={runTireAnalysis}
                    disabled={tireImages.length === 0 || isAnalyzing || !vehicleType || !mileage}
                    className={`w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg text-white font-medium transition-colors ${
                      tireImages.length === 0 || isAnalyzing || !vehicleType || !mileage
                        ? "bg-gray-400 cursor-not-allowed"
                        : "bg-blue-600 hover:bg-blue-700"
                    }`}
                  >
                    {isAnalyzing ? (
                      <>
                        <Loader2 className="animate-spin" size={18} /> {t('analyzing_button')}
                      </>
                    ) : (
                      <>
                        <Zap size={18} /> {t("upload_button")}
                      </>
                    )}
                  </button>
                </div>
              </>
            )}

            {/* Analysis Results Display */}
            {tireAnalysis && <TireAnalysisResults analysis={tireAnalysis} onAnalyzeAgain={handleAnalyzeAgain} />}
            
            {!tireAnalysis && !isAnalyzing && tireImages.length === 0 && (
                <div className="text-center py-8 text-slate-500">
                    <p>{t('analyze_button')}</p>
                </div>
            )}
          </div>

          {/* Manual Data Blocks */}
          {BLOCKS.map((block) => (
            <div key={block.key} className="bg-white rounded-xl shadow-md border border-slate-200 p-6 space-y-4">
              <h2 className="text-lg font-semibold text-slate-900">{block.title}</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {block.key === "maintenance" ? (
                  <>
                    {(manualData.maintenance || []).map((item, i) => (
                      <div key={i} className="flex gap-3 p-4 rounded-lg bg-slate-50 border border-slate-200">
                        <div className="flex-1 space-y-3">
                          <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">{t('maintenance_type_label')}</label>
                            <select
                              className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                              value={item.serviceType || ""}
                              onChange={(e) => handleChange("maintenance", "serviceType", e.target.value, i)}
                              disabled={readOnly}
                            >
                              <option value="">{t('select_maintenance_type')}</option>
                              {MAINT_TYPES.map((t, j) => (
                                <option key={j} value={t}>
                                  {t}
                                </option>
                              ))}
                            </select>
                          </div>
                          <LabeledInput
                            label={t('last_service_date_label')}
                            type="date"
                            value={item.lastDate}
                            status={getDateStatus(item.lastDate)}
                            onChange={(val) => handleChange("maintenance", "lastDate", val, i)}
                            readOnly={readOnly}
                          />
                        </div>
                      </div>
                    ))}
                    {!readOnly && (
                      <button
                        onClick={addMaintenance}
                        className="flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700 transition-colors col-span-1 md:col-span-2"
                      >
                        <Plus size={18} /> {t('addMaintainance')}
                      </button>
                    )}
                  </>
                ) : (
                  block.fields.map((f) => {
                    const isDate = DATE_FIELDS.includes(f.k)
                    const value = manualData[block.key]?.[f.k] || ""
                    const status = isDate ? getDateStatus(value) : null
                    return (
                      <LabeledInput
                        key={f.k}
                        label={f.l}
                        type={isDate ? "date" : "text"}
                        value={value}
                        status={status}
                        onChange={(val) => handleChange(block.key, f.k, val)}
                        readOnly={readOnly}
                      />
                    )
                  })
                )}
              </div>

              {block.key === "lease" && (
                <div className="border-t border-slate-200 pt-4 space-y-4">
                  <div className="flex gap-3">
                    <input
                      type="file"
                      onChange={(e) => setLeaseFile(e.target.files[0])}
                      className="px-3 py-2 rounded-lg border border-slate-200 text-sm flex-1"
                    />
                    <button
                      onClick={uploadLease}
                      className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700 transition-colors whitespace-nowrap"
                    >
                      <Upload size={16} /> {t('uploadLease')}
                    </button>
                  </div>
                  {leaseSummary && (
                    <div className="p-4 rounded-lg bg-slate-50 border border-slate-200">
                      <p className="text-sm text-slate-700">{leaseSummary}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* AI Chat Widget (Original Logic) */}
      <div className="fixed bottom-8 right-8 z-50">
        {!chatOpen && (
          <button
            onClick={() => setChatOpen(true)}
            className="flex items-center gap-2 px-5 py-3 rounded-full bg-gradient-to-r from-blue-600 to-blue-700 text-white font-medium shadow-lg hover:shadow-xl hover:from-blue-700 hover:to-blue-800 transition-all"
          >
            💬 {t('askAi')}
          </button>
        )}
        {chatOpen && (
          <div className="w-80 h-[500px] bg-white rounded-xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden">
            <div className="px-5 py-4 bg-gradient-to-r from-blue-600 to-blue-700 text-white flex justify-between items-center">
              <span className="font-semibold">{t('vehicleAssistant')}</span>
              <button onClick={() => setChatOpen(false)} className="hover:bg-blue-600 p-1 rounded transition-colors">
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {messages.length === 0 && (
                <div className="text-sm text-slate-500 text-center py-8">
                  <p className="font-semibold mb-4">{t('askAboutYourVeh')}</p>
                  <div className="space-y-2">
                    {QUICK_QUESTIONS.map((q) => (
                      <button
                        key={q.id}
                        onClick={() => handleQuickQuestion(q.text)}
                        className="w-full text-left px-3 py-2 text-xs bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg border border-blue-200 transition-colors font-medium"
                      >
                        <span className="mr-2">{q.icon}</span>
                        {q.text}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {messages.map((m, i) => (
                <div key={i} className={`flex ${m.from === "user" ? "justify-end" : "justify-start"}`}>
                  <div
                    className={`max-w-xs px-4 py-2 rounded-lg text-sm ${
                      m.from === "user"
                        ? "bg-blue-600 text-white rounded-br-none"
                        : "bg-slate-100 text-slate-900 rounded-bl-none"
                    }`}
                  >
                    {m.text}
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            <div className="p-4 border-t border-slate-200 flex items-center">
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && handleQuickQuestion(chatInput)}
                placeholder={t('typeAMessage')}
                className="flex-1 px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              />
              <button
                onClick={() => handleQuickQuestion(chatInput)}
                disabled={!chatInput.trim()}
                className={`ml-2 p-2 rounded-full text-white transition-colors ${
                  !chatInput.trim() ? "bg-blue-300 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-700"
                }`}
              >
                <Send size={18} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
