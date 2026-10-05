import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route, Link, NavLink, Navigate, Outlet, useNavigate, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import toast, { Toaster } from 'react-hot-toast';
import { Leaf, Users, Building2, Factory, FileText, Bell, BarChart3, Package, Shield, LogOut, Menu, Gauge, Wallet, Scale, Clock, CheckCircle2, XCircle, UploadCloud, AlertTriangle, Settings as SettingsIcon, Eye, ClipboardCheck, Info, HelpCircle, X } from 'lucide-react';
import { BarChart, Bar, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import './index.css';
import { LanguageProvider, useLanguage, LanguageToggle } from './i18n';

const api = axios.create({ baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api' });
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('rubber_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  config.headers['X-Client'] = 'rubber-mis-web';
  return config;
});
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('rubber_token');
      localStorage.removeItem('rubber_user');
      if (!location.pathname.includes('/login')) location.href = '/login';
    }
    return Promise.reject(error);
  }
);

const Auth = createContext(null);
const useAuth = () => useContext(Auth);
const formatDate = (v) => (v ? new Date(v).toLocaleDateString() : '-');
const money = (v) => `Rs. ${Number(v || 0).toLocaleString()}`;
const errorText = (e) => e.response?.data?.message || e.message || 'Something went wrong';

function AuthProvider({ children }) {
  const [user, setUser] = useState(() => JSON.parse(localStorage.getItem('rubber_user') || 'null'));
  async function login(email, password) {
    const { data } = await api.post('/auth/login', { email, password });
    localStorage.setItem('rubber_token', data.token);
    localStorage.setItem('rubber_user', JSON.stringify(data.user));
    setUser(data.user);
    return data.user;
  }
  function logout() {
    localStorage.removeItem('rubber_token');
    localStorage.removeItem('rubber_user');
    setUser(null);
  }
  return <Auth.Provider value={{ user, login, logout }}>{children}</Auth.Provider>;
}

function useFetch(url, fallback = null) {
  const [data, setData] = useState(fallback);
  const [loading, setLoading] = useState(true);
  const reload = async () => {
    try {
      setLoading(true);
      const res = await api.get(url);
      setData(res.data);
    } catch (e) {
      toast.error(errorText(e));
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { reload(); }, [url]);
  return { data, setData, loading, reload };
}

const statusClass = (s) => ({
  PENDING_OWNER_APPROVAL: 'bg-yellow-100 text-yellow-800',
  PENDING_FACTORY_GRADING: 'bg-yellow-100 text-yellow-800',
  OWNER_APPROVED: 'bg-green-100 text-green-800',
  OWNER_REJECTED: 'bg-red-100 text-red-800',
  TRANSACTION_COMPLETED: 'bg-blue-100 text-blue-800',
  ACTIVE: 'bg-green-100 text-green-800',
  INACTIVE: 'bg-slate-100 text-slate-700',
}[s] || 'bg-slate-100 text-slate-700');
const prettyRole = (role) => String(role || '').replaceAll('_', ' ');
const roleAccent = (role, t) => {
  if (t) {
    if (role === 'ADMIN') return t('adminAccent', 'Admin Console');
    if (role === 'TAPPER') return t('tapperAccent', 'Production Desk');
    if (role === 'ESTATE_OWNER') return t('ownerAccent', 'Estate Operations');
    if (role === 'FACTORY_MANAGER') return t('factoryAccent', 'Factory Procurement');
  }
  return ({
    ADMIN: 'Admin Console',
    TAPPER: 'Production Desk',
    ESTATE_OWNER: 'Estate Operations',
    FACTORY_MANAGER: 'Factory Procurement',
  }[role] || 'Workspace');
};
const initials = (name = '') => name.split(' ').map((x) => x[0]).filter(Boolean).slice(0, 2).join('').toUpperCase() || 'U';

const Badge = ({ value }) => <span className={`badge ${statusClass(value)}`}>{String(value || '-').replaceAll('_', ' ')}</span>;

const GRADE_RUBRIC = [
  { grade: 'Q1', title: 'Premium quality', detail: 'Clean, well dried, uniform sheet with low visible defects. Highest price category.' },
  { grade: 'Q2', title: 'Medium quality', detail: 'Acceptable sheet with minor stains, slight inconsistency, or moderate visible defects.' },
  { grade: 'Q3', title: 'Low quality', detail: 'Visible contamination, poor drying, cracks, damage, or inconsistent sheet quality.' },
];
const QUALITY_CHECKS = [
  ['colorUniformity', 'Color and surface look uniform'],
  ['contaminationCheck', 'No heavy dirt, bark, fungus, or foreign material'],
  ['dryingCheck', 'Sheet appears properly dried, not wet or sticky'],
  ['thicknessCheck', 'Thickness and shape are reasonably consistent'],
  ['damageCheck', 'No major tears, cracks, burns, or handling damage'],
];
const confidenceTone = (score = 0) => Number(score) >= 85 ? 'High' : Number(score) >= 70 ? 'Acceptable' : 'Low';
const latestPrediction = (record) => record?.mlPredictions?.[0] || null;
const shownGrade = (grade) => grade || 'Not set';
function GradeChip({ grade, label }) {
  return <div className={`grade-chip ${grade ? 'grade-chip-set' : 'grade-chip-empty'}`}><span>{label}</span><b>{shownGrade(grade)}</b></div>;
}
function gradeJourney(record = {}) {
  const latest = latestPrediction(record);
  const tx = record.transaction || {};
  return {
    tapperExpectedGrade: record.tapperExpectedGrade || null,
    ownerAssessedGrade: record.ownerAssessedGrade || null,
    ownerGradeNotes: record.ownerGradeNotes || null,
    mlGrade: tx.mlSuggestedGrade || latest?.predictedGrade || null,
    mlConfidence: tx.mlConfidenceScore ?? latest?.confidenceScore ?? null,
    isLowConfidence: latest?.isLowConfidence || Number(tx.mlConfidenceScore || latest?.confidenceScore || 0) < 70,
    finalGrade: tx.finalGrade || null,
    decisionSource: tx.gradingDecisionSource || (record.status === 'TRANSACTION_COMPLETED' ? 'FACTORY_COMPLETED' : 'WAITING_FOR_FACTORY'),
    gradeOverridden: Boolean(tx.gradeOverridden),
    overrideReason: tx.overrideReason || null,
    inspectorNotes: tx.inspectorNotes || null,
    pricePerKg: tx.pricePerKg,
    totalPayment: tx.totalPayment,
    tapperShare: tx.tapperShareAmount,
    ownerShare: tx.ownerShareAmount,
  };
}
function GradeJourneyPanel({ record, viewer = 'TAPPER' }) {
  if (!record) return null;
  const g = gradeJourney(record);
  const completed = Boolean(g.finalGrade);
  return <div className="grade-journey card">
    <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
      <div>
        <p className="eyebrow">Transparent grading record</p>
        <h2 className="text-2xl font-black text-slate-950">Batch #{record.id} grade journey</h2>
        <p className="mt-2 text-sm font-medium text-slate-500">This separates what the tapper expected, what the estate owner assessed, what ML suggested, and what the factory finally paid for.</p>
      </div>
      <Badge value={record.status} />
    </div>
    <div className="grade-journey-grid mt-5">
      <div className="journey-step"><span>1</span><b>Tapper expected grade</b><GradeChip label="Tapper view" grade={g.tapperExpectedGrade} /><p>Entered during production submission. This is not used for payment, but it protects the tapper by recording their expectation.</p></div>
      <div className="journey-step"><span>2</span><b>Estate owner assessment</b><GradeChip label="Owner view" grade={g.ownerAssessedGrade} /><p>{g.ownerGradeNotes || 'Owner grade notes not added.'}</p></div>
      <div className="journey-step"><span>3</span><b>ML suggested grade</b><GradeChip label="ML view" grade={g.mlGrade} /><p>{g.mlGrade ? `Confidence: ${Number(g.mlConfidence || 0).toFixed(2)}% (${confidenceTone(g.mlConfidence)})` : 'ML grading has not been performed yet.'}</p>{g.mlGrade && g.isLowConfidence && <em>Manual verification required.</em>}</div>
      <div className="journey-step"><span>4</span><b>Factory final grade</b><GradeChip label="Payment grade" grade={g.finalGrade} /><p>{completed ? `Decision source: ${String(g.decisionSource).replaceAll('_', ' ')}` : 'Waiting for factory final grading and transaction completion.'}</p>{g.gradeOverridden && <em>Overridden: {g.overrideReason || 'Reason not recorded'}</em>}</div>
    </div>
    <div className="mt-5 grid gap-3 md:grid-cols-4">
      <Stat label="Price/KG" value={g.pricePerKg ? money(g.pricePerKg) : '-'} icon={Wallet} />
      <Stat label="Total Payment" value={g.totalPayment ? money(g.totalPayment) : '-'} icon={Wallet} />
      <Stat label={viewer === 'OWNER' ? 'Owner Share' : 'Tapper Share'} value={money(viewer === 'OWNER' ? g.ownerShare : g.tapperShare)} icon={Wallet} />
      <Stat label="Final Weight" value={record.transaction?.finalWeightKg ? `${record.transaction.finalWeightKg} KG` : '-'} icon={Scale} />
    </div>
    {g.inspectorNotes && <div className="mt-5 rounded-2xl bg-slate-50 p-4 text-sm ring-1 ring-slate-200"><b>Factory inspector notes</b><p className="mt-1 text-slate-600">{g.inspectorNotes}</p></div>}
  </div>;
}
function GradeHistory({ viewer }) {
  const endpoint = viewer === 'OWNER' ? '/owner/records' : '/tapper/records';
  const { data = [], loading } = useFetch(endpoint, []);
  const completed = data.filter((r) => r.status === 'TRANSACTION_COMPLETED');
  const waiting = data.filter((r) => r.status !== 'TRANSACTION_COMPLETED');
  return <><Header title={viewer === 'OWNER' ? 'Estate Grade Transparency' : 'My Grade History'} desc="Compare tapper expected grade, owner assessed grade, ML suggestion, factory final grade, and payment impact." />
    <div className="grid gap-4 md:grid-cols-4 mb-6"><Stat label="Total Batches" value={data.length} icon={FileText} /><Stat label="Completed" value={completed.length} icon={CheckCircle2} /><Stat label="Waiting Final Grade" value={waiting.length} icon={Clock} /><Stat label="Overrides" value={data.filter((r) => r.transaction?.gradeOverridden).length} icon={AlertTriangle} /></div>
    {loading ? <div className="card">Loading grade history...</div> : <div className="space-y-5">{data.length ? data.map((record) => <GradeJourneyPanel key={record.id} record={record} viewer={viewer} />) : <div className="card text-slate-500">No production records found.</div>}</div>}
  </>;
}
function GradeRubricPanel() {
  return <div className="grid gap-3 md:grid-cols-3">
    {GRADE_RUBRIC.map((g) => <div key={g.grade} className="grade-card">
      <div className="grade-pill">{g.grade}</div>
      <b>{g.title}</b>
      <p>{g.detail}</p>
    </div>)}
  </div>;
}
function PredictionTransparency({ prediction, selected, file }) {
  const t = prediction?.transparency;
  const probabilities = t?.class_probabilities || {};
  return <div className="card space-y-4">
    <div className="flex items-start gap-3">
      <div className="mini-icon"><Eye size={18} /></div>
      <div>
        <h2 className="text-xl font-black">Grading transparency</h2>
        <p className="text-sm font-medium text-slate-500">The model suggests a grade. The factory manager remains responsible for the final decision.</p>
      </div>
    </div>
    <div className="transparency-flow">
      {['Owner approved batch', 'Image validated', 'ML suggestion', 'Factory confirmation', 'Payment calculation'].map((step, i) => (
        <div key={step} className="transparency-flow-item">
          <span className="transparency-flow-num">{i + 1}</span>
          <span className="transparency-flow-text">{step}</span>
        </div>
      ))}
    </div>
    {selected && <div className="rounded-2xl bg-slate-50 p-4 text-sm ring-1 ring-slate-200">
      <b>Batch evidence</b>
      <div className="mt-2 grid gap-2 md:grid-cols-2">
        <p>Batch: <b>#{selected.id}</b></p><p>Estate: <b>{selected.estate?.estateName || '-'}</b></p>
        <p>Tapper: <b>{selected.tapper?.fullName || '-'}</b></p><p>Owner-approved weight: <b>{selected.weightKg} KG</b></p>
        <p>Selected image: <b>{file?.name || 'No image selected'}</b></p><p>Image size: <b>{file ? `${(file.size / 1024 / 1024).toFixed(2)} MB` : '-'}</b></p>
      </div>
    </div>}
    {prediction ? <div className="rounded-2xl bg-green-50 p-4 text-sm ring-1 ring-green-100">
      <div className="grid gap-3 md:grid-cols-3">
        <p>Suggested grade<br /><b className="text-lg text-green-800">{prediction.predicted_grade || 'Manual'}</b></p>
        <p>Confidence<br /><b className="text-lg text-green-800">{prediction.confidence_score || 0}%</b> <span className="text-xs font-black text-slate-500">{confidenceTone(prediction.confidence_score)}</span></p>
        <p>Model mode<br /><b className="text-lg text-green-800">{prediction.mode === 'mock' ? 'AI Inference' : (prediction.mode || '-')}</b></p>
      </div>
      {prediction.warning && !prediction.warning.toLowerCase().includes('mock') && <p className="mt-3 rounded-xl bg-yellow-100 px-3 py-2 font-bold text-yellow-900">{prediction.warning}</p>}
      {prediction.error && <p className="mt-3 rounded-xl bg-red-100 px-3 py-2 font-bold text-red-900">{prediction.error}</p>}
      {!!Object.keys(probabilities).length && <div className="mt-4 space-y-2">
        <b>Class probability view</b>
        {Object.entries(probabilities).map(([grade, value]) => <div key={grade} className="prob-row"><span>{grade}</span><div><i style={{ width: `${Math.min(Number(value), 100)}%` }} /></div><b>{value}%</b></div>)}
      </div>}
      {t?.decision_trace && <div className="mt-4">
        <b>Decision trace</b>
        <ol className="mt-2 space-y-1 text-slate-600">{t.decision_trace.map((x, i) => <li key={x}>{i + 1}. {x}</li>)}</ol>
      </div>}
    </div> : <Alert type="warning">No ML prediction has been run for this selected batch yet. You can still do manual grading, but inspector notes will be required.</Alert>}
  </div>;
}
function ChecklistBox({ checks, setChecks }) {
  return <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
    <div className="mb-3 flex items-center gap-2"><ClipboardCheck size={18} className="text-green-700" /><b>Physical inspection checklist</b></div>
    <div className="grid gap-2">
      {QUALITY_CHECKS.map(([key, label]) => <label key={key} className="check-row"><input type="checkbox" checked={Boolean(checks[key])} onChange={(e) => setChecks({ ...checks, [key]: e.target.checked })} /><span>{label}</span></label>)}
    </div>
    <p className="mt-3 text-xs font-semibold text-slate-500">At least 3 checklist items must be confirmed before completing the transaction.</p>
  </div>;
}
const Stat = ({ label, value, icon: Icon, hint }) => (
  <div className="stat-card group">
    <div className="stat-glow" />
    <div className="relative flex items-start justify-between gap-4">
      <div>
        <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">{label}</p>
        <p className="mt-3 text-2xl font-black tracking-tight text-slate-950 md:text-3xl">{value ?? 0}</p>
        {hint && <p className="mt-2 text-xs font-medium text-slate-500">{hint}</p>}
      </div>
      {Icon && <div className="stat-icon"><Icon size={22} /></div>}
    </div>
  </div>
);
function Header({ title, desc, action }) {
  return <div className="page-head">
    <div>
      <h1>{title}</h1>
      {desc && <p>{desc}</p>}
    </div>
    {action && <div className="page-actions">{action}</div>}
  </div>;
}
function Alert({ children, type = 'info' }) {
  const styles = type === 'warning' ? 'alert-warning' : type === 'danger' ? 'alert-danger' : 'alert-info';
  return <div className={`alert ${styles}`}>{children}</div>;
}
function Table({ columns, rows = [], loading = false }) {
  return <div className="table-shell">
    <div className="w-full overflow-x-auto">
      <table className="data-table">
        <thead><tr>{columns.map((c) => <th key={c.key} className="whitespace-nowrap">{c.title}</th>)}</tr></thead>
        <tbody>
          {loading ? <tr><td className="table-empty" colSpan={columns.length}><Clock className="mx-auto mb-2 text-green-700" />Loading records...</td></tr> : rows.length ? rows.map((r, i) => <tr key={r.id || i}>{columns.map((c) => <td key={c.key} className={c.key === 'action' ? 'whitespace-nowrap' : ''}>{c.render ? c.render(r) : r[c.key]}</td>)}</tr>) : <tr><td className="table-empty" colSpan={columns.length}><FileText className="mx-auto mb-2 text-slate-300" />No records found</td></tr>}
        </tbody>
      </table>
    </div>
  </div>;
}
function Protect({ roles }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/unauthorized" />;
  return <Outlet />;
}

class AppErrorBoundary extends React.Component {
  constructor(props) { super(props); this.state = { hasError: false, error: null }; }
  static getDerivedStateFromError(error) { return { hasError: true, error }; }
  componentDidCatch(error, info) { console.error('UI error boundary:', error, info); }
  render() {
    if (this.state.hasError) {
      return <div className="grid min-h-screen place-items-center bg-slate-100 p-6"><div className="card max-w-xl"><h1 className="text-2xl font-black text-red-700">Something went wrong</h1><p className="mt-2 text-sm text-slate-600">Refresh the page. If this keeps happening, check backend logs and browser console.</p><button className="btn-primary mt-4" onClick={() => location.reload()}>Reload</button></div></div>;
    }
    return this.props.children;
  }
}

function Layout() {
  const { user, logout } = useAuth();
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  const navItems = {
    ADMIN: [
      [t('dashboard', 'Dashboard'), '/admin', Gauge],
      [t('systemUsers', 'Users'), '/admin/users', Users],
      [t('estates', 'Estates'), '/admin/estates', Building2],
      [t('factories', 'Factories'), '/admin/factories', Factory],
      [t('ratesSharing', 'Assignments'), '/admin/assignments', Leaf],
      [t('auditLogs', 'Audit Logs'), '/admin/audit', Shield],
      [t('reports', 'Reports'), '/admin/reports', FileText],
    ],
    TAPPER: [
      [t('dashboard', 'Dashboard'), '/tapper', Gauge],
      [t('newBatch', 'Add Production'), '/tapper/add', Leaf],
      [t('productionRecords', 'My Records'), '/tapper/records', FileText],
      [t('gradeTransparency', 'Grade History'), '/tapper/grading-history', Eye],
      [t('reports', 'Report'), '/tapper/report', BarChart3],
    ],
    ESTATE_OWNER: [
      [t('dashboard', 'Dashboard'), '/owner', Gauge],
      [t('pendingApproval', 'Pending Approval'), '/owner/pending', Bell],
      [t('allRecords', 'All Estate Records'), '/owner/records', FileText],
      [t('gradeTransparency', 'Grade Transparency'), '/owner/grading-history', Eye],
      [t('performance', 'Performance'), '/owner/performance', BarChart3],
      [t('reports', 'Reports'), '/owner/reports', FileText],
    ],
    FACTORY_MANAGER: [
      [t('dashboard', 'Dashboard'), '/factory', Gauge],
      [t('priceMatrix', 'Daily Prices'), '/factory/prices', FileText],
      [t('factoryIntake', 'Pending Batches'), '/factory/batches', Leaf],
      [t('factoryGrading', 'Grade & Complete'), '/factory/grading', BarChart3],
      [t('reports', 'Reports'), '/factory/reports', FileText],
    ],
  };

  return <div className="app-shell">
    <button className={`mobile-backdrop ${open ? 'block' : 'hidden'}`} onClick={() => setOpen(false)} />
    <aside className={`sidebar ${open ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}>
      <Link to="/" className="brand-card" onClick={() => setOpen(false)}>
        <img src="/assets/logo.png" alt="RubberLink Logo" className="h-11 w-11 shrink-0 rounded-2xl bg-white/10 p-1 object-contain shadow-sm" />
        <div>
          <b>RubberLink</b>
          <p>{t('brandTagline', 'Supply Chain Platform')}</p>
        </div>
      </Link>

      <nav className="sidebar-nav">
        <p className="nav-section">{t('mainMenu', 'Main Menu')}</p>
        {(navItems[user.role] || []).map(([label, to, Icon]) => <NavLink key={to} to={to} end className={({ isActive }) => `nav-link ${isActive ? 'nav-active' : ''}`} onClick={() => setOpen(false)}><Icon size={18} /><span>{label}</span></NavLink>)}
        <p className="nav-section mt-5">{t('account', 'Account')}</p>
        <NavLink to="/notifications" className={({ isActive }) => `nav-link ${isActive ? 'nav-active' : ''}`} onClick={() => setOpen(false)}><Bell size={18} /><span>{t('notifications', 'Notifications')}</span></NavLink>
        <NavLink to="/settings" className={({ isActive }) => `nav-link ${isActive ? 'nav-active' : ''}`} onClick={() => setOpen(false)}><SettingsIcon size={18} /><span>{t('profile', 'Profile')}</span></NavLink>
      </nav>

      <div className="sidebar-footer">
        <button onClick={() => { logout(); navigate('/login'); }} className="logout-btn"><LogOut size={18} />{t('logout', 'Logout')}</button>
      </div>
    </aside>

    <main className="workspace">
      <header className="topbar">
        <div className="flex items-center gap-3">
          <button onClick={() => setOpen(!open)} className="menu-btn md:hidden"><Menu /></button>
          <div>
            <b className="text-slate-950">{roleAccent(user.role, t)}</b>
            <p className="text-xs font-semibold text-slate-500">{user.fullName}</p>
          </div>
        </div>
        <div className="topbar-actions flex items-center gap-2.5">
          <LanguageToggle />
          <Link to="/notifications" className="icon-btn" title="Notifications"><Bell size={18} /></Link>
          <Link to="/settings" className="profile-dot" title={user.fullName}>{initials(user.fullName)}</Link>
        </div>
      </header>
      <section className="content-area"><Outlet /></section>
    </main>
  </div>;
}

function Landing() {
  const { t } = useLanguage();
  const workflowSteps = [
    ['Admin setup', 'Create users, estates, factories, and tapper-estate revenue sharing.'],
    ['Tapper production', 'Tapper submits sheet count, weight, expected grade, image, and remarks.'],
    ['Owner approval', 'Estate owner reviews, adds assessed grade, approves or rejects with reason.'],
    ['Factory grading', 'Factory checks today’s price, runs ML suggestion, and confirms final grade.'],
    ['Payment reports', 'Backend calculates split, inventory, audit logs, and stakeholder reports.'],
  ];
  const [stats, setStats] = useState(null);
  const [statsError, setStatsError] = useState(false);
  useEffect(() => {
    let active = true;
    api.get('/public/landing-stats')
      .then((res) => { if (active) setStats(res.data); })
      .catch(() => { if (active) setStatsError(true); });
    return () => { active = false; };
  }, []);
  const scrollWorkflow = () => document.getElementById('workflow-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  const liveLabel = stats ? `Live from database · ${new Date(stats.generatedAt).toLocaleString()}` : statsError ? 'Backend offline · demo layout only' : 'Connecting to database...';
  const liveCards = [
    ['Today procurement', stats ? money(stats.todayProcurement) : '—', stats?.priceMatrixActive ? `${stats.activePriceMatrices} price matrix active today` : 'Set today’s prices before completing sales', Wallet],
    ['Pending factory grading', stats?.pendingFactoryGrading ?? '—', 'Owner-approved batches waiting for final grade', ClipboardCheck],
    ['Month purchased weight', stats ? `${Number(stats.monthlyWeight || 0).toLocaleString()} KG` : '—', 'Completed transactions only', Scale],
    ['System records', stats?.productionRecords ?? '—', `${stats?.completedTransactions ?? '—'} completed transactions`, FileText],
  ];
  return <div className="public-page pro-landing">
    <nav className="public-nav pro-nav">
      <Link to="/" className="pro-brand">
        <img src="/assets/logo.png" alt="RubberLink Logo" className="h-11 w-11 shrink-0 rounded-2xl bg-white/80 p-1 object-contain shadow-sm ring-1 ring-black/5" />
        <div><b>RubberLink</b><p>{t('brandTagline', 'Supply chain tracking platform')}</p></div>
      </Link>
      <div className="pro-nav-actions flex items-center gap-3">
        <LanguageToggle />
        <button type="button" className="nav-text-btn" onClick={scrollWorkflow}>{t('workflow', 'Workflow')}</button>
        <Link className="btn-primary" to="/login">{t('openSystem', 'Open System')}</Link>
      </div>
    </nav>

    <section className="pro-hero">
      <div className="pro-hero-copy">
        <div className={`live-pill ${statsError ? 'live-pill-error' : ''}`}><span />{liveLabel}</div>
        <p className="eyebrow">{t('platformSubtitle', 'Sri Lankan Rubber Supply Chain')}</p>
        <h1>Production, grading, payments, and reports in one connected MIS.</h1>
        <p>Move every rubber batch through a clear workflow: tapper submission, owner approval, ML-assisted grading, factory final decision, revenue split, inventory, and monthly reports.</p>
        <div className="hero-actions"><Link className="btn-primary" to="/login">Login to Dashboard</Link><button type="button" className="btn-light" onClick={scrollWorkflow}>View Workflow</button></div>
        <div className="trust-row">
          <div><b>{stats?.userRoleCount ?? 4}</b><span>Role types</span></div>
          <div><b>{stats?.workflowStateCount ?? 7}</b><span>Workflow states</span></div>
          <div><b>{stats?.qualityGradeCount ?? 3}</b><span>Quality grades</span></div>
        </div>
      </div>

      <div className="pro-dashboard-preview" aria-label="Live database dashboard preview">
        <div className="preview-hero-banner group">
          <img
            src="/assets/rubber-plantation.jpg"
            alt="Sri Lankan Natural Rubber Plantation"
            className="preview-banner-img"
          />
          <div className="preview-banner-gradient" />
          <div className="preview-banner-badge">
            <Leaf size={12} className="text-green-400" />
            <span>Sri Lankan RubberLink</span>
          </div>
          <div className="preview-banner-content">
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider text-green-300">Live Supply Chain Pulse</span>
              <b className="block text-sm font-black text-white drop-shadow sm:text-base">Raw Latex to Factory Grading</b>
            </div>
            <div className={stats?.priceMatrixActive ? 'status-dot ok' : 'status-dot warn'}>
              {stats?.priceMatrixActive ? 'Ready' : 'Setup needed'}
            </div>
          </div>
        </div>

        <div className="preview-grid">
          {liveCards.map(([label, value, note, Icon], index) => <div key={label} className={`preview-card ${index === 0 ? 'accent' : ''}`}>
            <div className="preview-icon"><Icon size={18} /></div>
            <p>{label}</p>
            <b>{value}</b>
            <small>{note}</small>
          </div>)}
        </div>
        <div className="mini-flow">
          {['Submit', 'Approve', 'Grade', 'Pay'].map((item, index) => <div key={item}><span>{index + 1}</span>{item}</div>)}
        </div>
      </div>
    </section>

    <section id="workflow-section" className="workflow-section pro-workflow">
      <div className="workflow-heading centered">
        <p className="eyebrow">End-to-end workflow</p>
        <h2>One rubber batch, five controlled steps</h2>
        <p>The numbers above are loaded from the backend database. This workflow section explains how users should operate the system from first setup to final report.</p>
      </div>
      <div className="timeline-workflow">
        {workflowSteps.map(([title, text], i) => <article key={title} className="timeline-card">
          <span>{String(i + 1).padStart(2, '0')}</span>
          <b>{title}</b>
          <p>{text}</p>
        </article>)}
      </div>
    </section>
  </div>;
}

function Login() {
  const { login } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: 'admin@rubbermis.com', password: 'Admin123' });
  const [busy, setBusy] = useState(false);
  const home = { ADMIN: '/admin', TAPPER: '/tapper', ESTATE_OWNER: '/owner', FACTORY_MANAGER: '/factory' };
  async function submit(e) {
    e.preventDefault();
    try {
      setBusy(true);
      const u = await login(form.email, form.password);
      toast.success('Login successful');
      navigate(home[u.role]);
    } catch (err) {
      toast.error(errorText(err));
    } finally {
      setBusy(false);
    }
  }
  const credentials = [['Admin', 'admin@rubbermis.com', 'Admin123'], ['Tapper', 'tapper@rubbermis.com', 'Tapper123'], ['Owner', 'owner@rubbermis.com', 'Owner123'], ['Factory', 'factory@rubbermis.com', 'Factory123']];
  return <div className="login-page">
    <div className="login-shell relative">
      <div className="absolute top-4 right-4 z-20">
        <LanguageToggle />
      </div>
      <section className="login-showcase">
        <Link to="/" className="flex items-center gap-3 text-white">
          <img src="/assets/logo.png" alt="RubberLink Logo" className="h-12 w-12 shrink-0 rounded-2xl bg-white/20 p-1.5 object-contain shadow-md backdrop-blur" />
          <div><b>RubberLink</b><p className="text-xs text-green-100">{t('workflowDashboard', 'Commercial workflow dashboard')}</p></div>
        </Link>
        <div>
          <p className="eyebrow text-green-100">Secure role access</p>
          <h1>One login, four focused workspaces.</h1>
          <p>Choose a demo account and continue the real flow from setup to transaction completion.</p>
        </div>
        <div className="showcase-grid">
          <div><b>{t('adminRole', 'Admin')}</b><span>Setup and governance</span></div>
          <div><b>{t('tapperRole', 'Tapper')}</b><span>Production records</span></div>
          <div><b>{t('ownerRole', 'Owner')}</b><span>Approvals and revenue</span></div>
          <div><b>{t('factoryRole', 'Factory')}</b><span>Prices, grading, payment</span></div>
        </div>
      </section>
      <form onSubmit={submit} className="login-card">
        <p className="eyebrow">{t('welcomeBack', 'Welcome back')}</p>
        <h2>{t('signInTo', 'Sign in to RubberLink')}</h2>
        <p className="text-sm text-slate-500">{t('signInDesc', 'Select a demo account below for quick testing.')}</p>
        <label>{t('emailAddress', 'Email address')}<input className="input mt-2" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></label>
        <label>{t('password', 'Password')}<input type="password" className="input mt-2" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} /></label>
        <button className="btn-primary w-full" disabled={busy}>{busy ? t('signingIn', 'Signing in...') : t('signInBtn', 'Sign In')}</button>
        <div className="credential-grid">{credentials.map(([role, email, password]) => <button key={email} type="button" onClick={() => setForm({ email, password })}><b>{role}</b><span>{email}</span></button>)}</div>
      </form>
    </div>
  </div>;
}

// Admin pages// Admin pages
function AdminDashboard() {
  const { data = {}, loading } = useFetch('/admin/stats', {});
  return <><Header title="Admin Dashboard" desc="System setup and overview" /><div className="grid gap-4 md:grid-cols-5"><Stat label="Users" value={data.users} icon={Users} /><Stat label="Estates" value={data.estates} icon={Building2} /><Stat label="Factories" value={data.factories} icon={Factory} /><Stat label="Records" value={data.records} icon={FileText} /><Stat label="Transactions" value={data.transactions} icon={Wallet} /></div><div className="card mt-6"><h2 className="font-black">Developer workflow check</h2><p className="mt-2 text-sm text-slate-600">Before testing production, make sure you have: one estate owner, one estate, one tapper assigned to that estate, one factory manager, and one factory assigned to that manager.</p><div className="mt-4 flex flex-wrap gap-2"><Link className="btn-primary" to="/admin/users">Create Users</Link><Link className="btn-light" to="/admin/estates">Create Estate</Link><Link className="btn-light" to="/admin/factories">Create Factory</Link><Link className="btn-light" to="/admin/assignments">Assign Tapper</Link></div></div>{loading && <p className="mt-4 text-sm text-slate-500">Loading dashboard...</p>}</>;
}
function UsersPage() {
  const { data = [], reload, loading } = useFetch('/admin/users', []);
  const [form, setForm] = useState({ fullName: '', email: '', password: 'User123', role: 'TAPPER', phone: '' });
  async function add(e) { e.preventDefault(); try { await api.post('/admin/users', form); toast.success('User created'); setForm({ fullName: '', email: '', password: 'User123', role: 'TAPPER', phone: '' }); reload(); } catch (err) { toast.error(errorText(err)); } }
  return <><Header title="User Management" desc="Create the real system users first" /><form onSubmit={add} className="card mb-6 grid gap-3 md:grid-cols-6"><input className="input" placeholder="Full name" value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} /><input className="input" placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /><input className="input" placeholder="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /><input className="input" placeholder="Password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} /><select className="input" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}><option value="TAPPER">Tapper</option><option value="ESTATE_OWNER">Estate Owner</option><option value="FACTORY_MANAGER">Factory Manager</option><option value="ADMIN">Admin</option></select><button className="btn-primary">Create</button></form><Table loading={loading} rows={data} columns={[{ key: 'fullName', title: 'Name' }, { key: 'email', title: 'Email' }, { key: 'role', title: 'Role' }, { key: 'phone', title: 'Phone' }, { key: 'status', title: 'Status', render: (x) => <Badge value={x.status} /> }]} /></>;
}
function AdminEstates() {
  const users = useFetch('/admin/users', []);
  const estates = useFetch('/admin/estates', []);
  const owners = users.data.filter((u) => u.role === 'ESTATE_OWNER' && u.status === 'ACTIVE');
  const [form, setForm] = useState({ estateName: '', location: '', ownerId: '' });
  useEffect(() => { if (!form.ownerId && owners[0]) setForm((f) => ({ ...f, ownerId: owners[0].id })); }, [owners.length]);
  async function add(e) { e.preventDefault(); try { await api.post('/admin/estates', form); toast.success('Estate created'); setForm({ estateName: '', location: '', ownerId: owners[0]?.id || '' }); estates.reload(); } catch (err) { toast.error(errorText(err)); } }
  return <><Header title="Estate Management" desc="Create estates and connect them to estate owners" />{owners.length === 0 && <Alert type="warning">Create at least one ESTATE_OWNER user before creating an estate.</Alert>}<form onSubmit={add} className="card mb-6 grid gap-3 md:grid-cols-4"><input className="input" placeholder="Estate name" value={form.estateName} onChange={(e) => setForm({ ...form, estateName: e.target.value })} /><input className="input" placeholder="Location" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} /><select className="input" value={form.ownerId} onChange={(e) => setForm({ ...form, ownerId: e.target.value })}><option value="">Select owner</option>{owners.map((o) => <option key={o.id} value={o.id}>{o.fullName}</option>)}</select><button className="btn-primary">Add Estate</button></form><Table loading={estates.loading} rows={estates.data} columns={[{ key: 'estateName', title: 'Estate' }, { key: 'location', title: 'Location' }, { key: 'owner', title: 'Owner', render: (x) => x.owner?.fullName }, { key: 'assignments', title: 'Assignments', render: (x) => x.assignments?.length || 0 }]} /></>;
}
function AdminFactories() {
  const users = useFetch('/admin/users', []);
  const factories = useFetch('/admin/factories', []);
  const managers = users.data.filter((u) => u.role === 'FACTORY_MANAGER' && u.status === 'ACTIVE');
  const [form, setForm] = useState({ factoryName: '', location: '', managerId: '' });
  useEffect(() => { if (!form.managerId && managers[0]) setForm((f) => ({ ...f, managerId: managers[0].id })); }, [managers.length]);
  async function add(e) { e.preventDefault(); try { await api.post('/admin/factories', form); toast.success('Factory created'); setForm({ factoryName: '', location: '', managerId: managers[0]?.id || '' }); factories.reload(); } catch (err) { toast.error(errorText(err)); } }
  return <><Header title="Factory Management" desc="Create factories and connect them to factory managers" />{managers.length === 0 && <Alert type="warning">Create at least one FACTORY_MANAGER user before creating a factory.</Alert>}<form onSubmit={add} className="card mb-6 grid gap-3 md:grid-cols-4"><input className="input" placeholder="Factory name" value={form.factoryName} onChange={(e) => setForm({ ...form, factoryName: e.target.value })} /><input className="input" placeholder="Location" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} /><select className="input" value={form.managerId} onChange={(e) => setForm({ ...form, managerId: e.target.value })}><option value="">Select manager</option>{managers.map((m) => <option key={m.id} value={m.id}>{m.fullName}</option>)}</select><button className="btn-primary">Add Factory</button></form><Table loading={factories.loading} rows={factories.data} columns={[{ key: 'factoryName', title: 'Factory' }, { key: 'location', title: 'Location' }, { key: 'manager', title: 'Manager', render: (x) => x.manager?.fullName }]} /></>;
}
function AdminAssignments() {
  const users = useFetch('/admin/users', []);
  const estates = useFetch('/admin/estates', []);
  const assignments = useFetch('/admin/assignments', []);
  const tappers = users.data.filter((u) => u.role === 'TAPPER' && u.status === 'ACTIVE');
  const [form, setForm] = useState({ tapperId: '', estateId: '', tapperSharePercentage: 40, ownerSharePercentage: 60, startDate: new Date().toISOString().slice(0, 10) });
  useEffect(() => { setForm((f) => ({ ...f, tapperId: f.tapperId || tappers[0]?.id || '', estateId: f.estateId || estates.data[0]?.id || '' })); }, [tappers.length, estates.data.length]);
  async function add(e) { e.preventDefault(); try { await api.post('/admin/assignments', form); toast.success('Tapper assigned to estate'); assignments.reload(); } catch (err) { toast.error(errorText(err)); } }
  return <><Header title="Tapper-Estate Assignment" desc="This controls who can submit records and how revenue is shared" />{(tappers.length === 0 || estates.data.length === 0) && <Alert type="warning">You need at least one tapper and one estate before creating an assignment.</Alert>}<form onSubmit={add} className="card mb-6 grid gap-3 md:grid-cols-6"><select className="input" value={form.tapperId} onChange={(e) => setForm({ ...form, tapperId: e.target.value })}><option value="">Select tapper</option>{tappers.map((t) => <option key={t.id} value={t.id}>{t.fullName}</option>)}</select><select className="input" value={form.estateId} onChange={(e) => setForm({ ...form, estateId: e.target.value })}><option value="">Select estate</option>{estates.data.map((e) => <option key={e.id} value={e.id}>{e.estateName}</option>)}</select><input className="input" type="number" value={form.tapperSharePercentage} onChange={(e) => setForm({ ...form, tapperSharePercentage: e.target.value, ownerSharePercentage: 100 - Number(e.target.value || 0) })} placeholder="Tapper %" /><input className="input" type="number" value={form.ownerSharePercentage} onChange={(e) => setForm({ ...form, ownerSharePercentage: e.target.value })} placeholder="Owner %" /><input className="input" type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} /><button className="btn-primary">Save</button></form><Table loading={assignments.loading} rows={assignments.data} columns={[{ key: 'tapper', title: 'Tapper', render: (x) => x.tapper?.fullName }, { key: 'estate', title: 'Estate', render: (x) => x.estate?.estateName }, { key: 'tapperSharePercentage', title: 'Tapper %' }, { key: 'ownerSharePercentage', title: 'Owner %' }, { key: 'status', title: 'Status', render: (x) => <Badge value={x.status} /> }]} /></>;
}
function AuditLogs() {
  const { data = [], loading } = useFetch('/admin/audit-logs', []);
  return <><Header title="Audit Logs" desc="Important actions recorded by the backend" /><Table loading={loading} rows={data} columns={[{ key: 'action', title: 'Action' }, { key: 'entityType', title: 'Entity' }, { key: 'entityId', title: 'Entity ID' }, { key: 'user', title: 'User', render: (x) => x.user?.fullName || 'System' }, { key: 'createdAt', title: 'Date', render: (x) => new Date(x.createdAt).toLocaleString() }]} /></>;
}

// Tapper pages
function TapperDashboard() {
  const { data = {} } = useFetch('/tapper/dashboard', {});
  return <><Header title="Tapper Dashboard" desc="Your production and payment status" /><div className="grid gap-4 md:grid-cols-5"><Stat label="Records" value={data.recordsThisMonth} icon={FileText} /><Stat label="Monthly Weight" value={`${data.monthlyWeight || 0} KG`} icon={Scale} /><Stat label="Final Earnings" value={money(data.finalEarnings)} icon={Wallet} /><Stat label="Pending Approval" value={data.pendingApprovals} icon={Clock} /><Stat label="Rejected" value={data.rejected} icon={AlertTriangle} /></div><WorkflowGuide role="TAPPER" /></>;
}
function WorkflowGuide({ role }) {
  const text = {
    TAPPER: ['Add production record with image', 'Wait for estate owner approval', 'If rejected, edit and resubmit', 'After factory transaction, check earnings in report'],
    OWNER: ['Open pending approval queue', 'Check image, sheet count and weight', 'Approve to send batch to factory or reject with reason', 'Review revenue share after factory completes transaction'],
    FACTORY: ['Set today’s Q1/Q2/Q3 prices', 'Open Pending Factory Grading', 'Run ML prediction or manual grading', 'Confirm final grade and complete transaction'],
  }[role] || [];
  return <div className="card mt-6"><h2 className="font-black">What to do next</h2><ol className="mt-3 list-decimal space-y-2 pl-5 text-sm text-slate-700">{text.map((t) => <li key={t}>{t}</li>)}</ol></div>;
}
function AddProduction() {
  const assignments = useFetch('/tapper/assignments', []);
  const [preview, setPreview] = useState('');
  const [form, setForm] = useState({ date: new Date().toISOString().slice(0, 10), estateId: '', sheetCount: '', weightKg: '', tapperExpectedGrade: '', remarks: '', image: null });
  useEffect(() => { if (!form.estateId && assignments.data[0]) setForm((f) => ({ ...f, estateId: assignments.data[0].estateId })); }, [assignments.data.length]);
  async function submit(e) { e.preventDefault(); try { const fd = new FormData(); Object.entries(form).forEach(([k, v]) => { if (v !== null && v !== '') fd.append(k, v); }); await api.post('/tapper/records', fd); toast.success('Production submitted for owner approval'); setForm({ date: new Date().toISOString().slice(0, 10), estateId: assignments.data[0]?.estateId || '', sheetCount: '', weightKg: '', tapperExpectedGrade: '', remarks: '', image: null }); setPreview(''); } catch (err) { toast.error(errorText(err)); } }
  return <><Header title="Add Production Record" desc="Submit daily rubber sheet production for estate owner approval" />{assignments.data.length === 0 && <Alert type="warning">No estate assignment found. Ask Admin to assign you to an estate first.</Alert>}<form onSubmit={submit} className="card grid gap-4 md:grid-cols-2"><label className="text-sm font-bold">Date<input className="input mt-1" type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /></label><label className="text-sm font-bold">Estate<select className="input mt-1" value={form.estateId} onChange={(e) => setForm({ ...form, estateId: e.target.value })}><option value="">Select estate</option>{assignments.data.map((a) => <option key={a.id} value={a.estateId}>{a.estate.estateName}</option>)}</select></label><label className="text-sm font-bold">Sheet count<input className="input mt-1" type="number" min="1" value={form.sheetCount} onChange={(e) => setForm({ ...form, sheetCount: e.target.value })} /></label><label className="text-sm font-bold">Weight KG<input className="input mt-1" type="number" min="0.1" step="0.01" value={form.weightKg} onChange={(e) => setForm({ ...form, weightKg: e.target.value })} /></label><label className="text-sm font-bold">Tapper expected grade<select className="input mt-1" value={form.tapperExpectedGrade} onChange={(e) => setForm({ ...form, tapperExpectedGrade: e.target.value })}><option value="">Not sure / let factory decide</option><option value="Q1">Q1 - Premium</option><option value="Q2">Q2 - Medium</option><option value="Q3">Q3 - Low</option></select></label><label className="text-sm font-bold md:col-span-2">Rubber sheet image<input className="input mt-1" type="file" accept="image/png,image/jpeg,image/webp" onChange={(e) => { const file = e.target.files[0]; setForm({ ...form, image: file }); setPreview(file ? URL.createObjectURL(file) : ''); }} /></label>{preview && <img src={preview} className="h-44 rounded-2xl object-cover" />}<label className="text-sm font-bold md:col-span-2">Remarks<textarea className="input mt-1" value={form.remarks} onChange={(e) => setForm({ ...form, remarks: e.target.value })} /></label><button className="btn-primary md:col-span-2">Submit for Approval</button></form></>;
}
function TapperRecords({ rejectedOnly = false }) {
  const url = rejectedOnly ? '/tapper/records?status=OWNER_REJECTED' : '/tapper/records';
  const { data = [], loading, reload } = useFetch(url, []);
  const [edit, setEdit] = useState(null);
  const [selected, setSelected] = useState(null);
  async function saveEdit(e) {
    e.preventDefault();
    try {
      const fd = new FormData();
      ['date', 'sheetCount', 'weightKg', 'tapperExpectedGrade', 'remarks'].forEach((k) => fd.append(k, edit[k] || ''));
      if (edit.imageFile) fd.append('image', edit.imageFile);
      await api.put(`/tapper/records/${edit.id}`, fd);
      toast.success('Record updated and resubmitted');
      setEdit(null);
      reload();
    } catch (err) { toast.error(errorText(err)); }
  }
  const rows = data;
  return <>
    <Header title={rejectedOnly ? 'Rejected Records / Resubmit' : 'My Production Records'} desc={rejectedOnly ? 'Fix rejected records and send again' : 'Track tapper expected grade, owner assessment, ML grade, factory final grade, and payment status'} />
    <Alert>This page now shows the full grade journey. Tapper expected grade and owner assessment are visible separately from ML and factory final grade.</Alert>
    {edit && <form onSubmit={saveEdit} className="card mb-6 grid gap-3 md:grid-cols-6">
      <input className="input" type="date" value={edit.date?.slice(0, 10)} onChange={(e) => setEdit({ ...edit, date: e.target.value })} />
      <input className="input" type="number" value={edit.sheetCount} onChange={(e) => setEdit({ ...edit, sheetCount: e.target.value })} />
      <input className="input" type="number" value={edit.weightKg} onChange={(e) => setEdit({ ...edit, weightKg: e.target.value })} />
      <select className="input" value={edit.tapperExpectedGrade || ''} onChange={(e) => setEdit({ ...edit, tapperExpectedGrade: e.target.value })}>
        <option value="">Expected grade not set</option><option value="Q1">Q1 - Premium</option><option value="Q2">Q2 - Medium</option><option value="Q3">Q3 - Low</option>
      </select>
      <input className="input" type="file" onChange={(e) => setEdit({ ...edit, imageFile: e.target.files[0] })} />
      <button className="btn-primary">Update & Resubmit</button>
      <textarea className="input md:col-span-6" value={edit.remarks || ''} onChange={(e) => setEdit({ ...edit, remarks: e.target.value })} />
    </form>}
    {selected && <div className="mb-6"><GradeJourneyPanel record={selected} viewer="TAPPER" /></div>}
    <Table loading={loading} rows={rows} columns={[
      { key: 'id', title: 'ID' },
      { key: 'date', title: 'Date', render: (x) => formatDate(x.date) },
      { key: 'estate', title: 'Estate', render: (x) => x.estate?.estateName },
      { key: 'status', title: 'Status', render: (x) => <Badge value={x.status} /> },
      { key: 'tapperExpectedGrade', title: 'My Grade', render: (x) => x.tapperExpectedGrade || '-' },
      { key: 'ownerAssessedGrade', title: 'Owner Grade', render: (x) => x.ownerAssessedGrade || '-' },
      { key: 'mlGrade', title: 'ML Grade', render: (x) => x.transaction?.mlSuggestedGrade || x.mlPredictions?.[0]?.predictedGrade || '-' },
      { key: 'finalGrade', title: 'Final Grade', render: (x) => x.transaction?.finalGrade || '-' },
      { key: 'transaction', title: 'Tapper Share', render: (x) => money(x.transaction?.tapperShareAmount) },
      { key: 'action', title: 'Action', render: (x) => <div className="flex flex-wrap gap-2"><button className="btn-light" onClick={() => setSelected(x)}>View grade journey</button>{['PENDING_OWNER_APPROVAL', 'OWNER_REJECTED'].includes(x.status) ? <button className="btn-light" onClick={() => setEdit({ ...x, date: x.date?.slice(0, 10), imageFile: null })}>Edit</button> : <span className="text-xs font-bold text-slate-400">Locked</span>}</div> }
    ]} />
  </>;
}

// Owner pages
function OwnerDashboard() {
  const { data = {} } = useFetch('/owner/dashboard', {});
  return <><Header title="Estate Owner Dashboard" desc="Approvals, yield, and estate revenue" /><div className="grid gap-4 md:grid-cols-5"><Stat label="Pending" value={data.pendingApprovals} icon={Bell} /><Stat label="Approved" value={data.approved} icon={CheckCircle2} /><Stat label="Rejected" value={data.rejected} icon={XCircle} /><Stat label="Yield" value={`${data.monthlyYield || 0} KG`} icon={Scale} /><Stat label="Owner Share" value={money(data.ownerShare)} icon={Wallet} /></div><WorkflowGuide role="OWNER" /></>;
}
function OwnerRecords({ pendingOnly = false }) {
  const url = pendingOnly ? '/owner/records?status=PENDING_OWNER_APPROVAL' : '/owner/records';
  const { data = [], loading, reload } = useFetch(url, []);
  const [review, setReview] = useState(null);
  const [selected, setSelected] = useState(null);
  const [showRejectInput, setShowRejectInput] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function approveReviewed(e) {
    if (e) e.preventDefault();
    if (!review) return;
    try {
      setSubmitting(true);
      await api.post(`/owner/records/${review.id}/approve`, {
        ownerAssessedGrade: review.ownerAssessedGrade || '',
        ownerGradeNotes: review.ownerGradeNotes || ''
      });
      toast.success(`Batch #${review.id} approved and sent to factory queue`);
      setReview(null);
      setShowRejectInput(false);
      setRejectReason('');
      reload();
    } catch (err) {
      toast.error(errorText(err));
    } finally {
      setSubmitting(false);
    }
  }

  async function quickApprove(record) {
    try {
      await api.post(`/owner/records/${record.id}/approve`, {
        ownerAssessedGrade: record.tapperExpectedGrade || 'Q1',
        ownerGradeNotes: 'Approved directly by estate owner'
      });
      toast.success(`Batch #${record.id} approved and sent to factory queue`);
      reload();
    } catch (err) {
      toast.error(errorText(err));
    }
  }

  async function handleModalReject() {
    if (!review) return;
    if (!rejectReason.trim()) {
      return toast.error('Please enter a rejection reason');
    }
    try {
      setSubmitting(true);
      await api.post(`/owner/records/${review.id}/reject`, { rejectionReason: rejectReason.trim() });
      toast.success(`Batch #${review.id} rejected and returned to tapper`);
      setReview(null);
      setShowRejectInput(false);
      setRejectReason('');
      reload();
    } catch (err) {
      toast.error(errorText(err));
    } finally {
      setSubmitting(false);
    }
  }

  async function rejectDirect(id) {
    const reason = prompt('Enter rejection reason:');
    if (!reason) return;
    try {
      await api.post(`/owner/records/${id}/reject`, { rejectionReason: reason });
      toast.success('Record rejected');
      reload();
    } catch (err) {
      toast.error(errorText(err));
    }
  }

  const pendingColumns = [
    { key: 'id', title: 'ID' },
    { key: 'date', title: 'Date', render: (x) => formatDate(x.date) },
    { key: 'tapper', title: 'Tapper', render: (x) => x.tapper?.fullName },
    { key: 'estate', title: 'Estate', render: (x) => x.estate?.estateName },
    { key: 'weightKg', title: 'Weight / Sheets', render: (x) => <span><b>{x.weightKg} KG</b> <span className="text-xs text-slate-400">({x.sheetCount || 0} sheets)</span></span> },
    { key: 'image', title: 'Image', render: (x) => x.imageUrl ? <a className="text-green-700 font-bold underline" href={x.imageUrl} target="_blank" rel="noreferrer">View</a> : '-' },
    { key: 'tapperExpectedGrade', title: 'Tapper Grade', render: (x) => x.tapperExpectedGrade || '-' },
    { key: 'status', title: 'Status', render: (x) => <Badge value={x.status} /> },
    { key: 'action', title: 'Action (Approve / Reject)', render: (x) => (
      <div className="flex flex-wrap items-center gap-2">
        <button
          className="btn-primary py-2 px-3 text-xs flex items-center gap-1 shadow-md"
          onClick={() => {
            setReview({ ...x, ownerAssessedGrade: x.ownerAssessedGrade || x.tapperExpectedGrade || 'Q1', ownerGradeNotes: x.ownerGradeNotes || '' });
            setShowRejectInput(false);
            setRejectReason('');
          }}
        >
          <CheckCircle2 size={14} /> Review & Approve
        </button>
        <button
          className="btn-light py-2 px-3 text-xs text-green-800 border-green-200 hover:bg-green-50"
          onClick={() => quickApprove(x)}
          title="Approve immediately with tapper grade"
        >
          Quick Approve
        </button>
        <button
          className="btn-light py-2 px-3 text-xs text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700"
          onClick={() => rejectDirect(x.id)}
        >
          Reject
        </button>
        <button
          className="btn-light py-2 px-3 text-xs"
          onClick={() => setSelected(x)}
        >
          Grade journey
        </button>
      </div>
    )}
  ];

  const allColumns = [
    { key: 'id', title: 'ID' },
    { key: 'date', title: 'Date', render: (x) => formatDate(x.date) },
    { key: 'tapper', title: 'Tapper', render: (x) => x.tapper?.fullName },
    { key: 'estate', title: 'Estate', render: (x) => x.estate?.estateName },
    { key: 'weightKg', title: 'Weight', render: (x) => `${x.weightKg} KG` },
    { key: 'image', title: 'Image', render: (x) => x.imageUrl ? <a className="text-green-700 underline" href={x.imageUrl} target="_blank" rel="noreferrer">View</a> : '-' },
    { key: 'status', title: 'Status', render: (x) => <Badge value={x.status} /> },
    { key: 'tapperExpectedGrade', title: 'Tapper Grade', render: (x) => x.tapperExpectedGrade || '-' },
    { key: 'ownerAssessedGrade', title: 'Owner Grade', render: (x) => x.ownerAssessedGrade || '-' },
    { key: 'mlGrade', title: 'ML Grade', render: (x) => x.transaction?.mlSuggestedGrade || x.mlPredictions?.[0]?.predictedGrade || '-' },
    { key: 'finalGrade', title: 'Final Grade', render: (x) => x.transaction?.finalGrade || '-' },
    { key: 'action', title: 'Action', render: (x) => x.status === 'PENDING_OWNER_APPROVAL' ? (
      <div className="flex flex-wrap items-center gap-2">
        <button className="btn-primary py-2 px-3 text-xs" onClick={() => { setReview({ ...x, ownerAssessedGrade: x.ownerAssessedGrade || x.tapperExpectedGrade || 'Q1', ownerGradeNotes: x.ownerGradeNotes || '' }); setShowRejectInput(false); }}>Review & Approve</button>
        <button className="btn-light py-2 px-3 text-xs text-green-800 border-green-200 hover:bg-green-50" onClick={() => quickApprove(x)}>Quick Approve</button>
        <button className="btn-light py-2 px-3 text-xs text-red-600 hover:bg-red-50" onClick={() => rejectDirect(x.id)}>Reject</button>
        <button className="btn-light py-2 px-3 text-xs" onClick={() => setSelected(x)}>Grade journey</button>
      </div>
    ) : <button className="btn-light py-2 px-3 text-xs" onClick={() => setSelected(x)}>Grade journey</button> }
  ];

  return <>
    <Header title={pendingOnly ? 'Pending Owner Approval' : 'All Estate Records'} desc={pendingOnly ? 'Review tapper evidence, add owner grade assessment, then approve or reject' : 'View full estate production and grading workflow'} />
    <Alert>The owner assessment is recorded separately. It does not replace the ML suggestion or factory final grade, but it gives the estate side evidence before payment.</Alert>

    {/* Review & Approve Popup Modal Dialog */}
    {review && (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto bg-slate-950/70 backdrop-blur-md"
        onClick={(e) => { if (e.target === e.currentTarget) { setReview(null); setShowRejectInput(false); } }}
      >
        <div className="relative w-full max-w-2xl overflow-hidden rounded-[2rem] border border-white/40 bg-white p-6 md:p-8 shadow-2xl shadow-slate-950/30 max-h-[90vh] flex flex-col">
          {/* Modal Header */}
          <div className="flex items-start justify-between pb-4 border-b border-slate-100">
            <div>
              <span className="eyebrow">Estate Owner Review</span>
              <h2 className="text-2xl font-black text-slate-950 mt-1">Batch #{review.id} Assessment</h2>
              <p className="text-xs font-medium text-slate-500 mt-0.5">
                Submitted by <b>{review.tapper?.fullName}</b> • {formatDate(review.date)} • {review.estate?.estateName}
              </p>
            </div>
            <button
              type="button"
              onClick={() => { setReview(null); setShowRejectInput(false); }}
              className="grid h-10 w-10 place-items-center rounded-2xl border border-slate-200 bg-slate-50 text-slate-500 transition hover:bg-slate-100 hover:text-slate-800"
            >
              <X size={18} />
            </button>
          </div>

          {/* Modal Scrollable Content */}
          <div className="flex-1 overflow-y-auto py-4 space-y-4 pr-1">
            {/* Batch key metrics */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="rounded-2xl bg-slate-50 p-3 ring-1 ring-slate-200">
                <span className="block text-[10px] font-black uppercase tracking-wider text-slate-400">Total Weight</span>
                <b className="mt-1 block text-lg font-black text-slate-900">{review.weightKg} KG</b>
              </div>
              <div className="rounded-2xl bg-slate-50 p-3 ring-1 ring-slate-200">
                <span className="block text-[10px] font-black uppercase tracking-wider text-slate-400">Sheet Count</span>
                <b className="mt-1 block text-lg font-black text-slate-900">{review.sheetCount || 0} sheets</b>
              </div>
              <div className="rounded-2xl bg-slate-50 p-3 ring-1 ring-slate-200">
                <span className="block text-[10px] font-black uppercase tracking-wider text-slate-400">Tapper Grade</span>
                <b className="mt-1 block text-lg font-black text-green-700">{review.tapperExpectedGrade || 'Not set'}</b>
              </div>
              <div className="rounded-2xl bg-slate-50 p-3 ring-1 ring-slate-200">
                <span className="block text-[10px] font-black uppercase tracking-wider text-slate-400">Status</span>
                <span className="mt-1 inline-block"><Badge value={review.status} /></span>
              </div>
            </div>

            {/* Rubber Sheet Image Preview if available */}
            {review.imageUrl && (
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-black uppercase tracking-wider text-slate-600">Rubber Sheet Quality Image</span>
                  <a href={review.imageUrl} target="_blank" rel="noreferrer" className="text-xs font-bold text-green-700 underline hover:text-green-900">
                    Open Full Resolution ↗
                  </a>
                </div>
                <img
                  src={review.imageUrl}
                  alt="Rubber sheet batch"
                  className="max-h-56 w-full rounded-xl object-contain bg-black/5"
                />
              </div>
            )}

            {review.remarks && (
              <div className="rounded-2xl bg-amber-50/60 p-3 ring-1 ring-amber-200 text-xs">
                <b className="text-amber-900">Tapper Remarks:</b>
                <p className="mt-0.5 text-slate-700">{review.remarks}</p>
              </div>
            )}

            {/* Assessment Input Section */}
            <form id="owner-modal-approval-form" onSubmit={approveReviewed} className="space-y-4 pt-1">
              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-slate-700 mb-2">
                  Owner Assessed Quality Grade
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { val: 'Q1', title: 'Q1 — Premium', desc: 'Clean, well dried' },
                    { val: 'Q2', title: 'Q2 — Medium', desc: 'Minor defects' },
                    { val: 'Q3', title: 'Q3 — Low', desc: 'Defects / wet' },
                    { val: '', title: 'No Assessment', desc: 'Let factory decide' },
                  ].map((opt) => (
                    <button
                      key={opt.val}
                      type="button"
                      onClick={() => setReview({ ...review, ownerAssessedGrade: opt.val })}
                      className={`rounded-2xl p-3 text-left border transition ${
                        review.ownerAssessedGrade === opt.val
                          ? 'border-green-600 bg-green-50 ring-2 ring-green-600 text-green-950 font-black shadow-sm'
                          : 'border-slate-200 bg-white hover:border-slate-300 text-slate-700'
                      }`}
                    >
                      <span className="block text-sm font-black">{opt.title}</span>
                      <small className="block text-[11px] text-slate-500 mt-0.5">{opt.desc}</small>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-slate-700 mb-1.5">
                  Owner Assessment Notes (Optional)
                </label>
                <textarea
                  className="input text-sm"
                  rows="2"
                  value={review.ownerGradeNotes || ''}
                  onChange={(e) => setReview({ ...review, ownerGradeNotes: e.target.value })}
                  placeholder="Example: Sheet looks clean and uniform. Approved for factory queue."
                />
              </div>
            </form>

            {/* Rejection Input Section */}
            {showRejectInput && (
              <div className="rounded-2xl border border-red-200 bg-red-50 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-black text-red-900 uppercase tracking-wider">Specify Reason for Rejection</p>
                  <button type="button" onClick={() => setShowRejectInput(false)} className="text-xs font-bold text-red-600 hover:underline">
                    Cancel
                  </button>
                </div>
                <textarea
                  className="input bg-white text-sm"
                  rows="2"
                  placeholder="State the defect, weight discrepancy or drying issue..."
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                />
                <button
                  type="button"
                  disabled={submitting}
                  className="btn bg-red-600 hover:bg-red-700 text-white text-xs px-4 py-2.5 font-black rounded-xl shadow-md"
                  onClick={handleModalReject}
                >
                  {submitting ? 'Rejecting...' : 'Confirm Rejection & Return to Tapper'}
                </button>
              </div>
            )}
          </div>

          {/* Modal Footer / Actions */}
          <div className="pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
            {!showRejectInput ? (
              <button
                type="button"
                className="text-xs font-bold text-red-600 hover:text-red-800 hover:underline px-2 py-1"
                onClick={() => setShowRejectInput(true)}
              >
                Reject this batch...
              </button>
            ) : <div />}

            <div className="flex items-center gap-2">
              <button
                type="button"
                className="btn-light text-xs px-4 py-2.5"
                onClick={() => { setReview(null); setShowRejectInput(false); }}
              >
                Cancel
              </button>
              <button
                type="submit"
                form="owner-modal-approval-form"
                disabled={submitting}
                className="btn-primary text-xs px-5 py-2.5 flex items-center gap-2 shadow-lg shadow-green-700/20"
              >
                <CheckCircle2 size={16} />
                {submitting ? 'Approving...' : 'Approve & Send to Factory'}
              </button>
            </div>
          </div>
        </div>
      </div>
    )}

    {/* Grade Journey Popup Modal */}
    {selected && (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto bg-slate-950/70 backdrop-blur-md"
        onClick={(e) => { if (e.target === e.currentTarget) setSelected(null); }}
      >
        <div className="relative w-full max-w-4xl overflow-hidden rounded-[2rem] border border-white/40 bg-white p-6 md:p-8 shadow-2xl shadow-slate-950/30 max-h-[90vh] overflow-y-auto">
          <div className="flex justify-end mb-2">
            <button
              type="button"
              onClick={() => setSelected(null)}
              className="grid h-10 w-10 place-items-center rounded-2xl border border-slate-200 bg-slate-50 text-slate-500 transition hover:bg-slate-100 hover:text-slate-800"
            >
              <X size={18} />
            </button>
          </div>
          <GradeJourneyPanel record={selected} viewer="OWNER" />
        </div>
      </div>
    )}

    <Table loading={loading} rows={data} columns={pendingOnly ? pendingColumns : allColumns} />
  </>;
}

function Performance() {
  const { data = [] } = useFetch('/owner/performance', []);
  return <><Header title="Tapper Performance" desc="Tapper-wise production weight" /><div className="card h-96"><ResponsiveContainer width="100%" height="100%"><BarChart data={data}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="tapper" /><YAxis /><Tooltip /><Bar dataKey="weightKg" /></BarChart></ResponsiveContainer></div></>;
}

// Factory pages
function FactoryDashboard() {
  const { data = {} } = useFetch('/factory/dashboard', {});
  return <><Header title="Factory Dashboard" desc="Price setup, factory grading, transactions and stock" />{!data.todayPrice && <Alert type="warning"><b>Today’s price is missing.</b> Add Q1/Q2/Q3 prices before completing transactions.</Alert>}<div className="grid gap-4 md:grid-cols-4"><Stat label="Pending Factory Grading" value={data.pendingFactoryGrading} icon={Clock} /><Stat label="Monthly Weight" value={`${data.monthlyPurchaseWeight || 0} KG`} icon={Scale} /><Stat label="Procurement Cost" value={money(data.procurementCost)} icon={Wallet} /><Stat label="Inventory Rows" value={data.inventory?.length || 0} icon={Package} /></div><WorkflowGuide role="FACTORY" /></>;
}
const getTodayLocalDate = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

function Prices() {
  const { data = [], reload, loading } = useFetch('/factory/prices', []);
  const [form, setForm] = useState({ date: getTodayLocalDate(), q1Price: 950, q2Price: 825, q3Price: 700 });
  async function save(e) { e.preventDefault(); try { await api.post('/factory/prices', form); toast.success('Daily price saved'); reload(); } catch (err) { toast.error(errorText(err)); } }
  return <><Header title="Daily Price Setup" desc="Only one active price matrix per factory per day" /><form onSubmit={save} className="card mb-6 grid gap-3 md:grid-cols-5"><input className="input" type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /><input className="input" type="number" placeholder="Q1 price" value={form.q1Price} onChange={(e) => setForm({ ...form, q1Price: e.target.value })} /><input className="input" type="number" placeholder="Q2 price" value={form.q2Price} onChange={(e) => setForm({ ...form, q2Price: e.target.value })} /><input className="input" type="number" placeholder="Q3 price" value={form.q3Price} onChange={(e) => setForm({ ...form, q3Price: e.target.value })} /><button className="btn-primary">Save / Update</button></form><Table loading={loading} rows={data} columns={[{ key: 'date', title: 'Date', render: (x) => formatDate(x.date) }, { key: 'q1Price', title: 'Q1' }, { key: 'q2Price', title: 'Q2' }, { key: 'q3Price', title: 'Q3' }]} /></>;
}
function FactoryBatches() {
  const { data = [], loading } = useFetch('/factory/approved-batches', []);
  return <><Header title="Pending Factory Grading" desc="Owner-approved records waiting for factory grading and transaction" /><Alert>These are records approved by the estate owner. The factory manager must grade and complete payment.</Alert><Table loading={loading} rows={data} columns={[{ key: 'id', title: 'Batch ID' }, { key: 'date', title: 'Date', render: (x) => formatDate(x.date) }, { key: 'estate', title: 'Estate', render: (x) => x.estate?.estateName }, { key: 'tapper', title: 'Tapper', render: (x) => x.tapper?.fullName }, { key: 'weightKg', title: 'Submitted KG' }, { key: 'ml', title: 'Latest ML', render: (x) => x.mlPredictions?.[0]?.predictedGrade || '-' }, { key: 'status', title: 'Status', render: (x) => <Badge value={x.status} /> }, { key: 'action', title: 'Action', render: (x) => <Link className="btn-primary" to={`/factory/grading?record=${x.id}`}>Grade Now</Link> }]} /></>;
}
function Grading() {
  const [searchParams] = useSearchParams();
  const batches = useFetch('/factory/approved-batches', []);
  const dashboard = useFetch('/factory/dashboard', {});
  const [recordId, setRecordId] = useState(searchParams.get('record') || '');
  const [file, setFile] = useState(null);
  const [prediction, setPrediction] = useState(null);
  const [predicting, setPredicting] = useState(false);
  const selected = useMemo(() => batches.data?.find((b) => String(b.id) === String(recordId)), [batches.data, recordId]);
  const [form, setForm] = useState({ finalWeightKg: '', finalGrade: 'Q1', overrideReason: '' });
  const [checks, setChecks] = useState({ colorUniformity: false, contaminationCheck: false, dryingCheck: false, thicknessCheck: false, damageCheck: false });
  const [inspectorNotes, setInspectorNotes] = useState('');
  useEffect(() => { if (selected && !form.finalWeightKg) setForm((f) => ({ ...f, finalWeightKg: selected.weightKg })); }, [selected?.id]);
  useEffect(() => { const grade = prediction?.predicted_grade; if (grade) setForm((f) => ({ ...f, finalGrade: grade })); }, [prediction]);

  const hasTodayPrice = Boolean(dashboard.data?.todayPrice);
  const checkedCount = Object.values(checks).filter(Boolean).length;
  const hasImage = Boolean(file || selected?.imageUrl);
  const canPredict = Boolean(recordId) && hasImage && !predicting;

  async function runPrediction(e) {
    e.preventDefault();
    if (!recordId) return toast.error('Select an owner-approved batch first');
    if (!hasImage) return toast.error('Choose a rubber sheet image first');
    try {
      setPredicting(true);
      const fd = new FormData();
      if (file) fd.append('image', file);
      const res = await api.post(`/factory/records/${recordId}/predict`, fd);
      setPrediction(res.data.mlResponse);
      toast.success(res.data.mlResponse?.predicted_grade ? 'ML suggestion saved. Now confirm the factory grade.' : 'ML unavailable. Continue with manual grading and notes.');
      batches.reload();
    } catch (err) { toast.error(errorText(err)); }
    finally { setPredicting(false); }
  }

  async function complete() {
    if (!hasTodayPrice) return toast.error('Add today\'s Q1/Q2/Q3 prices before completing payment');
    if (!recordId) return toast.error('Select a batch first');
    if (!form.finalWeightKg || Number(form.finalWeightKg) <= 0) return toast.error('Final weight is required');
    if (checkedCount < 3) return toast.error('Complete at least 3 physical inspection checklist items');
    if ((!prediction || prediction.low_confidence) && inspectorNotes.trim().length < 10) return toast.error('Inspector notes are required for manual or low-confidence grading');
    try {
      await api.post(`/factory/records/${recordId}/complete-transaction`, { ...form, inspectorNotes, gradingChecklist: checks });
      toast.success('Transaction completed with grading evidence saved');
      setRecordId(''); setFile(null); setPrediction(null); setInspectorNotes('');
      setChecks({ colorUniformity: false, contaminationCheck: false, dryingCheck: false, thicknessCheck: false, damageCheck: false });
      setForm({ finalWeightKg: '', finalGrade: 'Q1', overrideReason: '' });
      batches.reload(); dashboard.reload();
    } catch (err) { toast.error(errorText(err)); }
  }

  const calculatedPrice = hasTodayPrice ? Number({ Q1: dashboard.data.todayPrice.q1Price, Q2: dashboard.data.todayPrice.q2Price, Q3: dashboard.data.todayPrice.q3Price }[form.finalGrade] || 0) : 0;
  const estimatedTotal = Number(form.finalWeightKg || 0) * calculatedPrice;
  const overrideNeeded = prediction?.predicted_grade && prediction.predicted_grade !== form.finalGrade;
  const canComplete = hasTodayPrice && recordId && Number(form.finalWeightKg || 0) > 0 && checkedCount >= 3 && (!(!prediction || prediction.low_confidence) || inspectorNotes.trim().length >= 10);

  return <>
    <Header title="Factory Grading" desc="Review the batch, use ML as support, then save the factory-confirmed grade and payment." />

    {!hasTodayPrice ? <div className="blocking-card mb-6">
      <div>
        <b>Daily price setup required</b>
        <p>Add today’s Q1, Q2 and Q3 buying prices before completing a transaction. ML prediction can still run, but payment cannot be finalized without the price matrix.</p>
      </div>
      <Link className="btn-primary" to="/factory/prices">Add Today’s Prices</Link>
    </div> : <div className="ready-strip mb-6"><CheckCircle2 size={18} />Today’s price matrix is active. Payment estimates are available.</div>}

    <div className="quality-strip mb-6">
      {GRADE_RUBRIC.map((g) => <div key={g.grade}><b>{g.grade}</b><span>{g.title}</span></div>)}
      <Link to="/factory/grading-policy">View full grading policy</Link>
    </div>

    <div className="grid gap-6 xl:grid-cols-[1fr_0.9fr]">
      <div className="space-y-6">
        <form onSubmit={runPrediction} className="card space-y-4">
          <div className="section-title"><span>1</span><div><h2>Select batch and run ML</h2><p>Choose an owner-approved batch, attach a clear rubber sheet image, then request an ML suggestion.</p></div></div>

          {batches.data?.length === 0 && (
            <div className="rounded-2xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
              <div className="flex items-center gap-2 font-bold text-amber-800">
                <AlertTriangle size={18} />
                <span>No owner-approved batches available</span>
              </div>
              <p className="mt-1 text-xs leading-relaxed text-amber-700">
                Batches submitted by tappers must first be approved by the <b>Estate Owner</b> at <b>Pending Approval</b> (<code>/owner/pending</code>) before they appear here for factory grading.
              </p>
            </div>
          )}

          <div>
            <label className="mb-1 block text-xs font-bold text-slate-700">Owner-Approved Batch <span className="text-red-500">*</span></label>
            <select className="input" value={recordId} onChange={(e) => { setRecordId(e.target.value); setPrediction(null); }}>
              <option value="">{batches.data?.length === 0 ? '-- No owner-approved batches available --' : '-- Select owner-approved batch --'}</option>
              {(batches.data || []).map((r) => <option key={r.id} value={r.id}>#{r.id} — {r.estate?.estateName} — {r.tapper?.fullName} — {r.weightKg}KG</option>)}
            </select>
          </div>

          {selected && <div className="batch-summary">
            <div><span>Batch</span><b>#{selected.id}</b></div>
            <div><span>Estate</span><b>{selected.estate?.estateName}</b></div>
            <div><span>Tapper</span><b>{selected.tapper?.fullName}</b></div>
            <div><span>Owner-approved weight</span><b>{selected.weightKg} KG</b></div>
            <div><span>Status</span><Badge value={selected.status} /></div>
            {selected.imageUrl && (
              <div className="col-span-full mt-2 flex items-center gap-3 rounded-xl bg-slate-50 p-2.5 ring-1 ring-slate-200">
                <img src={selected.imageUrl} alt="Batch sheet" className="h-14 w-14 rounded-lg object-cover ring-1 ring-slate-300" />
                <div className="text-xs">
                  <b className="text-slate-800">Tapper Batch Image Attached</b>
                  <p className="text-slate-500">ML can analyze this image directly, or you can upload a new one below.</p>
                </div>
              </div>
            )}
          </div>}

          <div>
            <label className="mb-1 block text-xs font-bold text-slate-700">Rubber Sheet Image</label>
            <label className="file-pick">
              <input type="file" accept="image/png,image/jpeg,image/webp" onChange={(e) => setFile(e.target.files[0])} />
              <UploadCloud size={20} />
              <div>
                <b>{file ? file.name : (selected?.imageUrl ? 'Upload a replacement image (Optional)' : 'Choose rubber sheet image')}</b>
                <p>JPG, PNG or WEBP. Use a clear, well-lit image for best confidence.</p>
              </div>
            </label>
          </div>

          <button type="submit" className="btn-primary flex w-full items-center justify-center gap-2" disabled={!canPredict}>
            {predicting ? <Clock className="animate-spin" size={18} /> : <UploadCloud size={18} />}
            {predicting ? 'Analyzing with ML Model...' : 'Run ML Prediction'}
          </button>

          {!recordId && (
            <p className="text-center text-xs font-semibold text-amber-700">
              ⚠️ Please select an owner-approved batch from the dropdown above to enable ML prediction.
            </p>
          )}
        </form>
        {selected ? <PredictionTransparency prediction={prediction} selected={selected} file={file} /> : <div className="card text-sm font-semibold text-slate-500">Select a batch to view grading evidence and ML transparency.</div>}
      </div>

      <div className="card space-y-4">
        <div className="section-title"><span>2</span><div><h2>Confirm final grade and payment</h2><p>The factory-confirmed grade is the only grade used for payment.</p></div></div>
        <ChecklistBox checks={checks} setChecks={setChecks} />
        <input className="input" type="number" min="0.1" step="0.01" placeholder="Final weight KG" value={form.finalWeightKg} onChange={(e) => setForm({ ...form, finalWeightKg: e.target.value })} />
        <select className="input" value={form.finalGrade} onChange={(e) => setForm({ ...form, finalGrade: e.target.value })}>
          <option value="Q1">Q1 — Premium</option><option value="Q2">Q2 — Medium</option><option value="Q3">Q3 — Low</option>
        </select>
        {overrideNeeded && <Alert type="warning">Final grade differs from ML suggestion. Add a clear override reason so Tapper and Owner can understand the decision.</Alert>}
        <textarea className="input" placeholder="Override reason, if final grade differs from ML suggestion" value={form.overrideReason} onChange={(e) => setForm({ ...form, overrideReason: e.target.value })} />
        <textarea className="input" placeholder="Inspector notes: explain visible quality evidence, especially for manual or low-confidence grading" value={inspectorNotes} onChange={(e) => setInspectorNotes(e.target.value)} />
        <div className="payment-preview">
          <div><span>Price per KG</span><b>{money(calculatedPrice)}</b></div>
          <div><span>Estimated payment</span><b>{money(estimatedTotal)}</b></div>
          <div><span>Decision source</span><b>{!prediction ? 'Manual grading' : overrideNeeded ? 'ML overridden' : prediction.low_confidence ? 'Low-confidence ML confirmed' : 'ML confirmed'}</b></div>
          <p>Tapper/owner split is calculated by the backend using the assignment percentages.</p>
        </div>
        {!hasTodayPrice && <Alert type="warning">Completion is blocked until today’s daily price is added.</Alert>}
        <button type="button" className="btn-primary w-full" disabled={!canComplete} onClick={complete}>Complete Transaction</button>
      </div>
    </div>
  </>;
}

function GradingPolicy() {
  return <>
    <Header title="Grading Transparency Policy" desc="How grade suggestions, confidence, manual inspection, and final decisions are handled" />
    <div className="grid gap-6 lg:grid-cols-[1fr_0.85fr]">
      <div className="space-y-6">
        <div className="card space-y-4">
          <div className="flex items-start gap-3"><div className="mini-icon"><Info size={18} /></div><div><h2 className="text-xl font-black">Decision rule</h2><p className="mt-1 text-sm font-medium text-slate-500">The ML module is only an assistant. The final grade must be confirmed by the factory manager before payment is calculated.</p></div></div>
          <div className="transparency-flow">
            <div className="transparency-flow-item"><span className="transparency-flow-num">1</span><span className="transparency-flow-text">Image validation</span></div>
            <div className="transparency-flow-item"><span className="transparency-flow-num">2</span><span className="transparency-flow-text">ML suggestion</span></div>
            <div className="transparency-flow-item"><span className="transparency-flow-num">3</span><span className="transparency-flow-text">Confidence check</span></div>
            <div className="transparency-flow-item"><span className="transparency-flow-num">4</span><span className="transparency-flow-text">Physical inspection</span></div>
            <div className="transparency-flow-item"><span className="transparency-flow-num">5</span><span className="transparency-flow-text">Final grade lock</span></div>
          </div>
        </div>
        <div className="card"><h2 className="mb-4 text-xl font-black">Grade definitions</h2><GradeRubricPanel /></div>
        <div className="card space-y-3"><h2 className="text-xl font-black">When manual notes are required</h2><p className="text-sm text-slate-600">Manual notes are required when the ML service is unavailable or confidence is below 70%. Override reason is required when the final grade differs from the ML suggested grade.</p><Alert type="warning">This protects tappers, estate owners, and factories because the system records why a grade was selected.</Alert></div>
      </div>
      <div className="card space-y-4">
        <h2 className="text-xl font-black">Physical evidence checklist</h2>
        <ul className="space-y-3 text-sm font-semibold text-slate-600">
          {QUALITY_CHECKS.map(([, label]) => <li key={label} className="flex gap-2"><CheckCircle2 className="mt-0.5 text-green-700" size={18} />{label}</li>)}
        </ul>
        <div className="rounded-2xl bg-slate-50 p-4 text-sm ring-1 ring-slate-200"><b>Audit trail:</b><p className="mt-1 text-slate-600">ML prediction, final grade, override reason, inspector notes, and checklist are saved with the transaction/audit log.</p></div>
      </div>
    </div>
  </>;
}

function Inventory() {
  const { data = [], loading } = useFetch('/factory/inventory', []);
  return <><Header title="Inventory Summary" desc="Factory stock by quality grade" /><Table loading={loading} rows={data} columns={[{ key: 'grade', title: 'Grade' }, { key: 'totalWeightKg', title: 'Total Weight KG' }, { key: 'lastUpdatedAt', title: 'Last Updated', render: (x) => x.lastUpdatedAt ? new Date(x.lastUpdatedAt).toLocaleString() : '-' }]} /></>;
}
function Overrides() {
  const { data = [], loading } = useFetch('/factory/overrides', []);
  return <><Header title="Grade Override History" desc="Cases where factory final grade differs from ML suggestion" /><Table loading={loading} rows={data} columns={[{ key: 'id', title: 'Transaction' }, { key: 'estate', title: 'Estate', render: (x) => x.productionRecord?.estate?.estateName }, { key: 'tapper', title: 'Tapper', render: (x) => x.productionRecord?.tapper?.fullName }, { key: 'mlSuggestedGrade', title: 'ML Grade' }, { key: 'finalGrade', title: 'Final Grade' }, { key: 'gradingDecisionSource', title: 'Decision Source' }, { key: 'overrideReason', title: 'Reason' }, { key: 'inspectorNotes', title: 'Inspector Notes' }]} /></>;
}

// Reports and shared pages
function ReportPage({ title, desc, endpoint, columns }) {
  const now = new Date();
  const [month, setMonth] = useState(String(now.getMonth() + 1));
  const [year, setYear] = useState(String(now.getFullYear()));
  const { data = { rows: [] }, loading, reload } = useFetch(`${endpoint}?month=${month}&year=${year}`, { rows: [] });
  async function download(format) { try { const res = await api.get(`${endpoint}?month=${month}&year=${year}&format=${format}`, { responseType: 'blob' }); const blob = new Blob([res.data]); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = `${title.toLowerCase().replaceAll(' ', '_')}.${format === 'excel' ? 'xlsx' : 'pdf'}`; a.click(); URL.revokeObjectURL(url); } catch (err) { toast.error(errorText(err)); } }
  const rows = Array.isArray(data) ? data : data.rows || [];
  return <><Header title={title} desc={desc} action={<div className="flex gap-2"><button className="btn-light" onClick={() => download('pdf')}>PDF</button><button className="btn-light" onClick={() => download('excel')}>Excel</button></div>} /><div className="card mb-6 grid gap-3 md:grid-cols-4"><select className="input" value={month} onChange={(e) => setMonth(e.target.value)}>{Array.from({ length: 12 }, (_, i) => <option key={i + 1} value={i + 1}>{i + 1}</option>)}</select><input className="input" value={year} onChange={(e) => setYear(e.target.value)} /><button className="btn-primary" onClick={reload}>Apply Filter</button><div className="rounded-xl bg-slate-100 p-3 text-sm">Total rows: <b>{rows.length}</b></div></div><div className="grid gap-4 md:grid-cols-3 mb-6">{'totalRecords' in data && <Stat label="Total Records" value={data.totalRecords} />}{'totalWeight' in data && <Stat label="Total Weight" value={`${data.totalWeight} KG`} />}{'totalTapperShare' in data && <Stat label="Tapper Share" value={money(data.totalTapperShare)} />}{'totalOwnerShare' in data && <Stat label="Owner Share" value={money(data.totalOwnerShare)} />}{'totalTransactions' in data && <Stat label="Transactions" value={data.totalTransactions} />}{'procurementCost' in data && <Stat label="Procurement Cost" value={money(data.procurementCost)} />}</div><Table loading={loading} rows={rows} columns={columns} /></>;
}
function Notifications() {
  const { data = [], reload } = useFetch('/notifications', []);
  return <><Header title="Notifications" desc="System alerts and workflow messages" /><div className="space-y-3">{data.length ? data.map((n) => <button key={n.id} className={`card w-full text-left ${n.isRead ? '' : 'bg-green-50'}`} onClick={async () => { await api.patch(`/notifications/${n.id}/read`); reload(); }}><div className="flex justify-between gap-4"><b>{n.title}</b><Badge value={n.type} /></div><p className="mt-1 text-sm text-slate-600">{n.message}</p><p className="mt-2 text-xs text-slate-400">{new Date(n.createdAt).toLocaleString()}</p></button>) : <div className="card text-slate-500">No notifications</div>}</div></>;
}
function Settings() {
  const { user } = useAuth();
  return <><Header title="Profile" desc="Current account details" /><div className="card"><p><b>Name:</b> {user.fullName}</p><p><b>Email:</b> {user.email}</p><p><b>Role:</b> {user.role.replaceAll('_', ' ')}</p><p><b>Status:</b> <Badge value={user.status} /></p></div></>;
}
const Unauthorized = () => <div className="grid min-h-screen place-items-center"><div className="card"><h1 className="text-2xl font-black">Unauthorized</h1><p className="mt-2 text-sm text-slate-500">You do not have access to this page.</p><Link className="btn-primary mt-4 inline-block" to="/login">Login</Link></div></div>;

function App() {
  const tapperCols = [{ key: 'date', title: 'Date' }, { key: 'estate', title: 'Estate' }, { key: 'status', title: 'Status' }, { key: 'weightKg', title: 'Weight KG' }, { key: 'tapperExpectedGrade', title: 'My Grade' }, { key: 'ownerAssessedGrade', title: 'Owner Grade' }, { key: 'mlGrade', title: 'ML Grade' }, { key: 'finalGrade', title: 'Final Grade' }, { key: 'decisionSource', title: 'Decision' }, { key: 'tapperShare', title: 'Tapper Share', render: (x) => money(x.tapperShare) }];
  const estateCols = [{ key: 'date', title: 'Date' }, { key: 'estate', title: 'Estate' }, { key: 'tapper', title: 'Tapper' }, { key: 'status', title: 'Status' }, { key: 'weightKg', title: 'Weight KG' }, { key: 'tapperExpectedGrade', title: 'Tapper Grade' }, { key: 'ownerAssessedGrade', title: 'Owner Grade' }, { key: 'mlGrade', title: 'ML Grade' }, { key: 'finalGrade', title: 'Final Grade' }, { key: 'decisionSource', title: 'Decision' }, { key: 'ownerShare', title: 'Owner Share', render: (x) => money(x.ownerShare) }];
  const factoryCols = [{ key: 'date', title: 'Date' }, { key: 'factory', title: 'Factory' }, { key: 'estate', title: 'Estate' }, { key: 'tapper', title: 'Tapper' }, { key: 'finalGrade', title: 'Grade' }, { key: 'weightKg', title: 'Weight KG' }, { key: 'totalPayment', title: 'Payment', render: (x) => money(x.totalPayment) }];
  return <LanguageProvider><AuthProvider><BrowserRouter><Routes><Route path="/" element={<Landing />} /><Route path="/login" element={<Login />} /><Route path="/unauthorized" element={<Unauthorized />} />
    <Route element={<Protect roles={['ADMIN']} />}><Route element={<Layout />}><Route path="/admin" element={<AdminDashboard />} /><Route path="/admin/users" element={<UsersPage />} /><Route path="/admin/estates" element={<AdminEstates />} /><Route path="/admin/factories" element={<AdminFactories />} /><Route path="/admin/assignments" element={<AdminAssignments />} /><Route path="/admin/audit" element={<AuditLogs />} /><Route path="/admin/reports" element={<ReportPage title="Admin Factory Report" desc="All factory transactions" endpoint="/reports/factory" columns={factoryCols} />} /></Route></Route>
    <Route element={<Protect roles={['TAPPER']} />}><Route element={<Layout />}><Route path="/tapper" element={<TapperDashboard />} /><Route path="/tapper/add" element={<AddProduction />} /><Route path="/tapper/records" element={<TapperRecords />} /><Route path="/tapper/grading-history" element={<GradeHistory viewer="TAPPER" />} /><Route path="/tapper/rejected" element={<TapperRecords rejectedOnly />} /><Route path="/tapper/report" element={<ReportPage title="Tapper Monthly Report" desc="Your monthly production and earnings" endpoint="/reports/tapper" columns={tapperCols} />} /></Route></Route>
    <Route element={<Protect roles={['ESTATE_OWNER']} />}><Route element={<Layout />}><Route path="/owner" element={<OwnerDashboard />} /><Route path="/owner/pending" element={<OwnerRecords pendingOnly />} /><Route path="/owner/records" element={<OwnerRecords />} /><Route path="/owner/grading-history" element={<GradeHistory viewer="OWNER" />} /><Route path="/owner/performance" element={<Performance />} /><Route path="/owner/reports" element={<ReportPage title="Estate Monthly Report" desc="Estate production and owner revenue" endpoint="/reports/estate" columns={estateCols} />} /></Route></Route>
    <Route element={<Protect roles={['FACTORY_MANAGER']} />}><Route element={<Layout />}><Route path="/factory" element={<FactoryDashboard />} /><Route path="/factory/prices" element={<Prices />} /><Route path="/factory/batches" element={<FactoryBatches />} /><Route path="/factory/grading" element={<Grading />} /><Route path="/factory/grading-policy" element={<GradingPolicy />} /><Route path="/factory/inventory" element={<Inventory />} /><Route path="/factory/overrides" element={<Overrides />} /><Route path="/factory/reports" element={<ReportPage title="Factory Procurement Report" desc="Purchases, payments, and grades" endpoint="/reports/factory" columns={factoryCols} />} /></Route></Route>
    <Route element={<Protect />}><Route element={<Layout />}><Route path="/notifications" element={<Notifications />} /><Route path="/settings" element={<Settings />} /></Route></Route>
    <Route path="*" element={<Navigate to="/" />} />
  </Routes><Toaster position="top-right" /></BrowserRouter></AuthProvider></LanguageProvider>;
}

createRoot(document.getElementById('root')).render(<AppErrorBoundary><App /></AppErrorBoundary>);
