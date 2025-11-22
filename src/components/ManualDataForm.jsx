"use client"

import { useState, useEffect, useRef } from "react"
import { collection, getDocs } from "firebase/firestore"
import { db } from "../firebase"
import { askLongCat, uploadCloudinaryUnsigned } from "../services/aiBrowser"
import { AlertCircle, CheckCircle, Clock, Send, X, Plus, Upload, Wrench, Shield, FileText } from "lucide-react"

const DATE_FIELDS = ["start", "end", "paymentDate", "lastDate", "expiryDate"]

const BLOCKS = [
  {
    title: "Liens / Mortgages",
    key: "liens",
    fields: [
      { k: "provider", l: "Provider" },
      { k: "amount", l: "Amount" },
      { k: "status", l: "Status" },
    ],
  },
  {
    title: "Car Lease Info",
    key: "lease",
    fields: [
      { k: "start", l: "Lease start" },
      { k: "end", l: "Lease end" },
      { k: "payment", l: "Lease payment" },
      { k: "paymentDate", l: "Payment date" },
      { k: "responsible", l: "Payment responsible" },
      { k: "provider", l: "Lease provider" },
      { k: "receiver", l: "Lease receiver" },
      { k: "tender", l: "Relevant tender" },
      { k: "webLinks", l: "Other web links" },
    ],
  },
  {
    title: "Insurance",
    key: "insurance",
    fields: [
      { k: "provider", l: "Provider" },
      { k: "claimContact", l: "Claim contact" },
      { k: "claimProcedure", l: "Claim procedure URL" },
      { k: "expiryDate", l: "Insurance Expiry Date" },
    ],
  },
  {
    title: "Maintenance",
    key: "maintenance",
    fields: [
      { k: "serviceType", l: "Maintenance type" },
      { k: "lastDate", l: "Last Service Date" },
    ],
  },
]

const MAINT_TYPES = [
  "Oil change",
  "Tyre change",
  "Tyre inspection",
  "Brake check",
  "Battery check",
  "Fluid check",
  "Full service",
  "Other",
]

const getDateStatus = (dateStr) => {
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

const StatusBadge = ({ status }) => {
  if (!status || status === "Valid") {
    return (
      <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
        <CheckCircle size={14} /> Valid
      </span>
    )
  }
  if (status === "Expired") {
    return (
      <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-rose-50 text-rose-700 border border-rose-200">
        <AlertCircle size={14} /> Expired
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200">
      <Clock size={14} /> Expiring Soon
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

export default function ManualDataForm({ manualData = {}, setManualData, plate = "", readOnly = false }) {
  const [workshops, setWorkshops] = useState([])
  const [leaseFile, setLeaseFile] = useState(null)
  const [leaseSummary, setLeaseSummary] = useState(manualData.lease?.docSummary || "")
  const [aiSummary, setAiSummary] = useState("")
  const [loadingAi, setLoadingAi] = useState(false)

  const [chatOpen, setChatOpen] = useState(false)
  const [chatInput, setChatInput] = useState("")
  const [messages, setMessages] = useState([])
  const messagesEndRef = useRef(null)

  const QUICK_QUESTIONS = [
    { id: 1, text: "When will the insurance expire?", icon: "🛡️" },
    { id: 2, text: "When will the lease expire?", icon: "📄" },
    { id: 3, text: "When is the next maintenance due?", icon: "🔧" },
    { id: 4, text: "What are the main alerts for this vehicle?", icon: "⚠️" },
  ]

  const handleQuickQuestion = async (question) => {
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
      const prompt = `
Du er en bilassistent. Bruk denne JSON-dataen og svar spørsmålet klart på norsk. 
DATA: ${JSON.stringify(context, null, 2)}
BRUKERS SPØRSMÅL: ${question}
Svar 2-4 setninger, inkluder relevante fakta fra dataen når mulig og en kort AI-anbefaling.
      `
      const answer = await askLongCat(prompt)
      const aiMsg = { from: "ai", text: answer, ts: Date.now() }
      setMessages((prev) => [...prev, aiMsg])
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), 200)
    } catch (e) {
      const errMsg = { from: "ai", text: "Beklager, noe gikk galt med AI-forespørselen." }
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
      const summary = await askLongCat(`Oppsummer følgende leiekontrakt på norsk i 5 setninger:\n${txt}`)
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
      const s = getDateStatus(m.lastDate)
      if (s === "Expired") alerts.push({ text: `Maintenance "${m.serviceType}" is overdue`, risk: 9 })
      else if (s === "Expiring Soon") alerts.push({ text: `Maintenance "${m.serviceType}" expiring soon`, risk: 6 })
    })
    const insStatus = getDateStatus(manualData.insurance?.expiryDate)
    if (insStatus === "Expired") alerts.push({ text: "Insurance expired", risk: 10 })
    else if (insStatus === "Expiring Soon") alerts.push({ text: "Insurance expiring soon", risk: 7 })
    const leaseStatus = getDateStatus(manualData.lease?.end)
    if (leaseStatus === "Expired") alerts.push({ text: "Lease expired", risk: 8 })
    else if (leaseStatus === "Expiring Soon") alerts.push({ text: "Lease expiring soon", risk: 5 })
    return alerts
  }

  const alerts = computeAlerts()

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

      const prompt = `
Du er en ekspert på biladministrasjon. Du får dataen som JSON og skal returnere:
1) Kort norsk oversikt (2-3 setninger).
2) Tre konkrete anbefalinger (kritisk først).
3) For hver kategori (lease, insurance, maintenance) gi risikoscore 1-10 og én linje forklaring.
DATA:
${JSON.stringify(ctx, null, 2)}
Svar kort og strukturert, i norsk.
      `

      const reply = await askLongCat(prompt)
      setAiSummary(reply)
    } catch (e) {
      console.error(e)
      setAiSummary("AI summary: feilet å generere innsikt.")
    } finally {
      setLoadingAi(false)
    }
  }

  useEffect(() => {
    const t = setTimeout(() => generateAiSummary(), 450)
    return () => clearTimeout(t)
  }, [plate, JSON.stringify(manualData)])

  const askAIChat = async () => {
    if (!chatInput.trim()) return
    const userMsg = { from: "user", text: chatInput, ts: Date.now() }
    setMessages((prev) => [...prev, userMsg])
    setChatInput("")
    try {
      const context = {
        plate,
        lease: manualData.lease || {},
        insurance: manualData.insurance || {},
        maintenance: manualData.maintenance || [],
        liens: manualData.liens || {},
      }
      const prompt = `
Du er en bilassistent. Bruk denne JSON-dataen og svar spørsmålet klart på norsk. 
DATA: ${JSON.stringify(context, null, 2)}
BRUKERS SPØRSMÅL: ${userMsg.text}
Svar 2-4 setninger, inkluder relevante fakta fra dataen når mulig og en kort AI-anbefaling.
      `
      const answer = await askLongCat(prompt)
      const aiMsg = { from: "ai", text: answer, ts: Date.now() }
      setMessages((prev) => [...prev, aiMsg])
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), 200)
    } catch (e) {
      const errMsg = { from: "ai", text: "Beklager, noe gikk galt med AI-forespørselen." }
      setMessages((prev) => [...prev, errMsg])
    }
  }

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])


  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 ">
      <div className="max-w-6xl mx-auto space-y-8">
        <div className="space-y-2">
          {plate && (
            <p className="text-slate-600">
              License Plate: <span className="font-semibold text-blue-600">{plate}</span>
            </p>
          )}
        </div>

        {(alerts.length > 0 || aiSummary) && (
          <div className="bg-white rounded-xl shadow-md border border-slate-200 p-6 space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">Insights & Recommendations</h2>
                <p className="text-sm text-slate-500 mt-1">
                  {loadingAi ? "Generating AI insights…" : "AI insights ready"}
                </p>
              </div>
            </div>

            {alerts.length > 0 && (
              <div className="space-y-2 border-t border-slate-200 pt-4">
                {alerts.map((a, i) => (
                  <div
                    key={i}
                    className={`flex items-start gap-3 p-3 rounded-lg ${
                      a.risk >= 8
                        ? "bg-rose-50 border border-rose-200"
                        : a.risk >= 6
                          ? "bg-amber-50 border border-amber-200"
                          : "bg-blue-50 border border-blue-200"
                    }`}
                  >
                    {a.risk >= 8 ? (
                      <AlertCircle size={18} className="text-rose-600 flex-shrink-0 mt-0.5" />
                    ) : a.risk >= 6 ? (
                      <Clock size={18} className="text-amber-600 flex-shrink-0 mt-0.5" />
                    ) : (
                      <CheckCircle size={18} className="text-blue-600 flex-shrink-0 mt-0.5" />
                    )}
                    <span
                      className={`text-sm font-medium ${
                        a.risk >= 8 ? "text-rose-700" : a.risk >= 6 ? "text-amber-700" : "text-blue-700"
                      }`}
                    >
                      {a.text}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {aiSummary && (
              <div className="border-t border-slate-200 pt-4">
                <p className="text-sm text-slate-700 whitespace-pre-line leading-relaxed">{aiSummary}</p>
              </div>
            )}
          </div>
        )}

        <div className="space-y-6">

          {/* Detailed Records Section */}
          <div className="space-y-6">
            <div>
              <h3 className="text-2xl font-bold text-slate-900 mb-4">Detailed Records</h3>
              <p className="text-slate-600">Browse complete information for each category</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Maintenance Detailed Records */}
              <div className="rounded-2xl bg-white border border-slate-200 overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                <div className="bg-gradient-to-r from-emerald-50 to-emerald-100 border-b border-emerald-200 px-6 py-5 flex items-center gap-4">
                  <div className="p-3 rounded-lg bg-emerald-200">
                    <Wrench size={22} className="text-emerald-700" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 text-lg">Maintenance</h3>
                    <p className="text-xs text-slate-600 mt-0.5">
                      {(manualData.maintenance || []).length} service records
                    </p>
                  </div>
                </div>
                <div className="p-6">
                  {(manualData.maintenance || []).length === 0 ? (
                    <div className="text-center py-8">
                      <Wrench size={32} className="text-slate-300 mx-auto mb-3" />
                      <p className="text-sm text-slate-500 font-medium">No maintenance records yet</p>
                      <p className="text-xs text-slate-400 mt-1">
                        Add services to track your vehicle's maintenance history
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3 max-h-80 overflow-y-auto pr-2">
                      {(manualData.maintenance || []).map((m, idx) => (
                        <div
                          key={idx}
                          className="p-4 rounded-lg border border-emerald-100 bg-emerald-50 hover:bg-emerald-100 transition-colors group cursor-pointer"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1">
                              <p className="font-semibold text-slate-900 text-sm">{m.serviceType}</p>
                              <p className="text-xs text-slate-500 mt-2">
                                {m.lastDate
                                  ? new Date(m.lastDate).toLocaleDateString("en-US", {
                                      year: "numeric",
                                      month: "short",
                                      day: "numeric",
                                    })
                                  : "No date recorded"}
                              </p>
                            </div>
                            <div className="flex-shrink-0">
                              <StatusBadge status={getDateStatus(m.lastDate)} />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Insurance Detailed Records */}
              <div className="rounded-2xl bg-white border border-slate-200 overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                <div className="bg-gradient-to-r from-rose-50 to-rose-100 border-b border-rose-200 px-6 py-5 flex items-center gap-4">
                  <div className="p-3 rounded-lg bg-rose-200">
                    <Shield size={22} className="text-rose-700" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 text-lg">Insurance</h3>
                    <p className="text-xs text-slate-600 mt-0.5">Coverage information</p>
                  </div>
                </div>
                <div className="p-6">
                  {manualData.insurance ? (
                    <div className="space-y-4">
                      <div className="p-4 rounded-lg bg-rose-50 border border-rose-100">
                        <p className="text-xs text-slate-600 uppercase font-bold tracking-wide mb-1">Provider</p>
                        <p className="text-lg font-bold text-slate-900">{manualData.insurance.provider}</p>
                      </div>
                      {manualData.insurance.claimContact && (
                        <div className="p-4 rounded-lg bg-rose-50 border border-rose-100">
                          <p className="text-xs text-slate-600 uppercase font-bold tracking-wide mb-1">Claim Contact</p>
                          <p className="text-sm text-slate-700 font-medium">{manualData.insurance.claimContact}</p>
                        </div>
                      )}
                      {manualData.insurance.expiryDate && (
                        <div className="p-4 rounded-lg bg-rose-50 border border-rose-100">
                          <p className="text-xs text-slate-600 uppercase font-bold tracking-wide mb-1">Expiry Date</p>
                          <p className="text-sm text-slate-700 font-medium">
                            {formatDateShort(manualData.insurance.expiryDate)}
                          </p>
                        </div>
                      )}
                      <div className="pt-2">
                        <StatusBadge status={getDateStatus(manualData.insurance.expiryDate)} />
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <Shield size={32} className="text-slate-300 mx-auto mb-3" />
                      <p className="text-sm text-slate-500 font-medium">No insurance data</p>
                      <p className="text-xs text-slate-400 mt-1">Add insurance information to track your coverage</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Lease Detailed Records */}
              <div className="rounded-2xl bg-white border border-slate-200 overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                <div className="bg-gradient-to-r from-blue-50 to-blue-100 border-b border-blue-200 px-6 py-5 flex items-center gap-4">
                  <div className="p-3 rounded-lg bg-blue-200">
                    <FileText size={22} className="text-blue-700" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 text-lg">Lease</h3>
                    <p className="text-xs text-slate-600 mt-0.5">Lease agreement details</p>
                  </div>
                </div>
                <div className="p-6">
                  {manualData.lease ? (
                    <div className="space-y-4">
                      <div className="p-4 rounded-lg bg-blue-50 border border-blue-100">
                        <p className="text-xs text-slate-600 uppercase font-bold tracking-wide mb-1">Provider</p>
                        <p className="text-lg font-bold text-slate-900">
                          {manualData.lease.provider || "Not specified"}
                        </p>
                      </div>
                      {manualData.lease.start && (
                        <div className="p-4 rounded-lg bg-blue-50 border border-blue-100">
                          <p className="text-xs text-slate-600 uppercase font-bold tracking-wide mb-1">Start Date</p>
                          <p className="text-sm text-slate-700 font-medium">
                            {formatDateShort(manualData.lease.start)}
                          </p>
                        </div>
                      )}
                      {manualData.lease.end && (
                        <div className="p-4 rounded-lg bg-blue-50 border border-blue-100">
                          <p className="text-xs text-slate-600 uppercase font-bold tracking-wide mb-1">End Date</p>
                          <p className="text-sm text-slate-700 font-medium">{formatDateShort(manualData.lease.end)}</p>
                        </div>
                      )}
                      <div className="pt-2">
                        <StatusBadge status={getDateStatus(manualData.lease.end)} />
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <FileText size={32} className="text-slate-300 mx-auto mb-3" />
                      <p className="text-sm text-slate-500 font-medium">No lease information</p>
                      <p className="text-xs text-slate-400 mt-1">Add lease details to manage your agreement</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

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
                            <label className="block text-sm font-medium text-slate-700 mb-2">Maintenance Type</label>
                            <select
                              className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                              value={item.serviceType || ""}
                              onChange={(e) => handleChange("maintenance", "serviceType", e.target.value, i)}
                              disabled={readOnly}
                            >
                              <option value="">Select maintenance type</option>
                              {MAINT_TYPES.map((t, j) => (
                                <option key={j} value={t}>
                                  {t}
                                </option>
                              ))}
                            </select>
                          </div>
                          <LabeledInput
                            label="Last Service Date"
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
                        <Plus size={18} /> Add Maintenance
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
                      <Upload size={16} /> Upload
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

      <div className="fixed bottom-8 right-8 z-50">
        {!chatOpen && (
          <button
            onClick={() => setChatOpen(true)}
            className="flex items-center gap-2 px-5 py-3 rounded-full bg-gradient-to-r from-blue-600 to-blue-700 text-white font-medium shadow-lg hover:shadow-xl hover:from-blue-700 hover:to-blue-800 transition-all"
          >
            💬 Ask AI
          </button>
        )}
        {chatOpen && (
          <div className="w-80 h-[500px] bg-white rounded-xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden">
            <div className="px-5 py-4 bg-gradient-to-r from-blue-600 to-blue-700 text-white flex justify-between items-center">
              <span className="font-semibold">Vehicle Assistant</span>
              <button onClick={() => setChatOpen(false)} className="hover:bg-blue-600 p-1 rounded transition-colors">
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {messages.length === 0 && (
                <div className="text-sm text-slate-500 text-center py-8">
                  <p className="font-semibold mb-4">Ask about your vehicle</p>
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

            <div className="p-4 border-t border-slate-200 flex gap-2">
              <input
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="Type your question…"
                className="flex-1 px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                onKeyDown={(e) => {
                  if (e.key === "Enter") askAIChat()
                }}
              />
              <button
                onClick={askAIChat}
                className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Send size={16} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
