import React, { useState, useEffect } from 'react';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, AreaChart, Area, ComposedChart, BarChart, Bar, Cell
} from 'recharts';
import { 
  Briefcase, Calendar, DollarSign, Activity, 
  Clock, Menu, X, Upload, FileText, Plus, Trash2, CheckCircle, 
  ArrowRight, LayoutDashboard, LogOut, Info, Lock, User, RefreshCw, WifiOff, AlertTriangle, Shield, Layers, PieChart, Building2, Save, Wallet
} from 'lucide-react';

// =================================================================================
// ☁️ ZONA DE CONFIGURACIÓN
// =================================================================================
const firebaseConfig = {
    apiKey: "AIzaSyDleejd5FCvIjDRM9mqF7U0mJlYXF9zRLg",
    authDomain: "dashboard-hospital-isaia-df99d.firebaseapp.com",
    projectId: "dashboard-hospital-isaia-df99d",
    storageBucket: "dashboard-hospital-isaia-df99d.firebasestorage.app",
    messagingSenderId: "687104534240",
    appId: "1:687104534240:web:376002034ee0ebadc89285",
    measurementId: "G-WBW3TS72VH"
  };
// =================================================================================

import { initializeApp } from 'firebase/app';
import { getFirestore, doc, getDoc, setDoc } from 'firebase/firestore';
import { getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged } from 'firebase/auth';

// Inicialización Segura
let db = null;
let auth = null;
let isConfigured = false;

try {
    if (firebaseConfig.apiKey !== "AIzaSyD-Ejemplo-Key-Debes-Cambiarla") {
        const app = initializeApp(firebaseConfig);
        db = getFirestore(app);
        auth = getAuth(app);
        isConfigured = true;
    }
} catch (e) {
    console.error("Error inicializando Firebase:", e);
}

// --- UTILIDADES ---
const parseCSV = (text) => {
  let delimiter = '\t'; 
  if (text.indexOf('\t') === -1) {
      if (text.indexOf(';') > -1) delimiter = ';';
      else delimiter = ',';
  }

  const lines = text.trim().split('\n');
  if (lines.length < 1) return [];

  const headers = lines[0].split(delimiter).map(h => h.trim().toLowerCase());
  const data = [];
  
  for (let i = 1; i < lines.length; i++) {
    const row = lines[i].split(delimiter);
    if (row.length < 2) continue; 
    
    const item = {};
    headers.forEach((header, index) => {
      let val = row[index];
      if (val) val = val.trim();
      
      if (header.includes('fecha') || header === 'modulo' || header === 'item' || header === 'actividad' || header === 'unidad') {
         item[header] = val; 
      } else {
        let numStr = val ? val.replace(/[Bs\s$]/g, '') : '0';
        // Lógica para detectar 1.000,00 vs 1,000.00
        if (numStr.indexOf(',') > -1 && numStr.indexOf('.') > -1) {
             if (numStr.indexOf(',') > numStr.indexOf('.')) { 
                 numStr = numStr.replace(/\./g, '').replace(',', '.');
             } else { 
                 numStr = numStr.replace(/,/g, '');
             }
        } else if (numStr.indexOf(',') > -1) {
             numStr = numStr.replace(',', '.');
        }
        const numVal = parseFloat(numStr);
        item[header] = isNaN(numVal) ? 0 : numVal;
      }
    });
    data.push(item);
  }
  return data;
};

// FORMATO BOLIVIANO: 1.234.567,89
const formatCurrency = (val) => {
    return new Intl.NumberFormat('es-BO', { 
        style: 'currency', 
        currency: 'BOB', 
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(val);
};

const formatDateShort = (date) => {
    return date.toLocaleDateString('es-BO', { month: 'short', year: '2-digit' });
};

// --- COMPONENTES UI ---
const KPICard = ({ label, value, subValue, color = "blue", highlight = false }) => {
    const colors = {
        blue: "text-blue-600 bg-blue-50 border-blue-100",
        emerald: "text-emerald-600 bg-emerald-50 border-emerald-100",
        indigo: "text-indigo-600 bg-indigo-50 border-indigo-100",
        slate: "text-slate-600 bg-slate-50 border-slate-200",
        amber: "text-amber-600 bg-amber-50 border-amber-100"
    };
    return (
        <div className={`p-4 rounded-lg border ${colors[color].split(" ")[2]} ${colors[color].split(" ")[1]} flex flex-col items-center justify-center text-center shadow-sm h-full ${highlight ? 'ring-2 ring-offset-1 ring-blue-200' : ''}`}>
            <span className="text-[10px] uppercase font-bold tracking-wider opacity-70 mb-1">{label}</span>
            <span className={`text-xl font-black tracking-tight ${colors[color].split(" ")[0]}`}>{typeof value === 'number' ? (value > 1000 ? formatCurrency(value) : value.toFixed(2) + (label.includes('%') ? '%' : '')) : value}</span>
            {subValue && <span className="text-[10px] mt-1 opacity-80 font-medium">{subValue}</span>}
        </div>
    );
};

const StatCard = ({ title, value, subtext, icon: Icon, trend, footer }) => (
  <div className="bg-white rounded-lg border border-slate-200 shadow-[0_2px_8px_-2px_rgba(0,0,0,0.05)] p-5 flex flex-col justify-between h-full hover:border-blue-300 transition-colors duration-300">
    <div className="flex justify-between items-start mb-2">
        <div className="bg-slate-50 p-2 rounded-md border border-slate-100 text-slate-500">
            <Icon size={18} strokeWidth={2} />
        </div>
        {trend && (
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${trend === 'neutral' ? 'bg-slate-100 text-slate-600' : 'bg-emerald-50 text-emerald-600'}`}>
                {trend === 'neutral' ? 'Vigente' : 'Actual'}
            </span>
        )}
    </div>
    <div>
        <h3 className="text-2xl font-black text-slate-800 tracking-tight">{value}</h3>
        <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mt-1">{title}</p>
        {subtext && <p className="text-xs text-slate-400 mt-1">{subtext}</p>}
    </div>
    {footer && <div className="mt-3 pt-3 border-t border-slate-50 text-xs text-slate-400 flex items-center gap-1">{footer}</div>}
  </div>
);

// --- LOGIN ---
const LoginModal = ({ onClose, onLoginSuccess }) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleLogin = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        if (!isConfigured) {
            if (email === 'admin@obra.com' && password === '123456') {
                onLoginSuccess({ email: 'admin@local' });
                onClose();
            } else { setError("Modo Local: Usa admin@obra.com / 123456"); }
            setLoading(false);
            return;
        }
        try {
            await signInWithEmailAndPassword(auth, email, password);
            onClose(); 
        } catch (err) {
            setError("Error de acceso.");
        }
        setLoading(false);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm p-6 relative">
                <button onClick={onClose} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"><X size={20}/></button>
                <h2 className="text-lg font-bold text-slate-800 mb-4">Acceso Administrativo</h2>
                {!isConfigured && <div className="mb-4 text-xs text-amber-700 bg-amber-50 p-2 rounded">Sin Conexión: admin@obra.com / 123456</div>}
                <form onSubmit={handleLogin} className="space-y-4">
                    <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full p-3 border border-slate-300 rounded-lg text-sm" placeholder="Usuario" required/>
                    <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full p-3 border border-slate-300 rounded-lg text-sm" placeholder="Contraseña" required/>
                    {error && <p className="text-xs text-red-500 font-bold">{error}</p>}
                    <button type="submit" disabled={loading} className="w-full bg-slate-900 text-white py-3 rounded-lg font-bold hover:bg-slate-800">Entrar</button>
                </form>
            </div>
        </div>
    );
};

// --- DATA INPUT ---
const DataInputScreen = ({ onDataLoaded, onCancel }) => {
  const [inputText, setInputText] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  
  // DATOS FIJOS DEL PROYECTO
  const [baseConfig, setBaseConfig] = useState({
    contractOriginal: 54379263.62,
    daysOriginal: 1060,
    startDate: '2023-09-18',
    advancePercent: 18.30, 
    contractNumber: "CCTO-JUJ-088/2023",
    entity: "UPRE (80%) - GAMO (20%)",
    signingDate: "2023-07-04"
  });

  const [modifications, setModifications] = useState([
    { id: 1, type: 'CM', name: 'Contrato Modificatorio 1', amount: 0, days: 0 },
    { id: 2, type: 'CM', name: 'Contrato Modificatorio 2', amount: 0, days: 0 },
    { id: 3, type: 'CM', name: 'Contrato Modificatorio 3', amount: 0, days: 57 },
    { id: 4, type: 'OC', name: 'Orden de Cambio 1 (ODC-1)', amount: 0, days: 163 },
    { id: 5, type: 'OC', name: 'Orden de Cambio 2 (ODC-2)', amount: 2713525.25, days: 0 }
  ]);

  const totalAmount = baseConfig.contractOriginal + modifications.reduce((sum, m) => sum + (parseFloat(m.amount) || 0), 0);
  const totalDays = baseConfig.daysOriginal + modifications.reduce((sum, m) => sum + (parseFloat(m.days) || 0), 0);

  const handleProcessAndSave = async () => {
    if (isConfigured && !window.confirm("⚠️ ¿CONFIRMAR ACTUALIZACIÓN?\n\nEsta acción guardará los nuevos datos en la nube y actualizará el dashboard para todos los usuarios. Los datos anteriores serán reemplazados.")) {
        return;
    }
    try {
      const parsedItems = parseCSV(inputText);
      if (parsedItems.length === 0) { alert("No se detectaron datos."); return; }
      
      const projectPayload = { 
        items: parsedItems, 
        config: { ...baseConfig, modifications, totalAmount, totalDays },
        lastUpdated: new Date().toISOString()
      };

      if (isConfigured && db) {
          setIsSaving(true);
          await setDoc(doc(db, "projects", "main_project"), projectPayload);
          setIsSaving(false);
          alert("¡Datos guardados y consolidados exitosamente!");
      }
      onDataLoaded(projectPayload);
    } catch (e) { alert("Error: " + e.message); setIsSaving(false); }
  };

  return (
    <div className="max-w-5xl mx-auto p-4 md:p-8 animate-fade-in bg-slate-50 min-h-screen flex items-center justify-center">
      <div className="bg-white p-6 md:p-8 rounded-xl shadow-xl border border-slate-200 w-full">
        <div className="mb-6 flex justify-between items-center border-b pb-4">
            <div>
                <h1 className="text-xl font-bold text-slate-800">Actualizar Base de Datos</h1>
                <p className="text-xs text-slate-500">Hospital de Segundo Nivel Isaias</p>
            </div>
            <button onClick={onCancel} className="text-slate-400 hover:text-slate-600"><X/></button>
        </div>
        <div className="space-y-4">
              <div className="bg-blue-50 p-4 rounded-lg border border-blue-100 flex justify-between items-center">
                 <div>
                    <h3 className="font-bold text-blue-900 text-sm">Resumen Contractual</h3>
                    <p className="text-xs text-blue-700">Monto Vigente: {formatCurrency(totalAmount)} | Anticipo: {baseConfig.advancePercent}%</p>
                 </div>
                 <div className="text-right">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Anticipo Otorgado</span>
                    <span className="block font-bold text-slate-700">{formatCurrency(baseConfig.contractOriginal * (baseConfig.advancePercent/100))}</span>
                 </div>
              </div>

              <textarea 
                className="w-full h-64 p-3 border border-slate-300 rounded-lg font-mono text-xs focus:ring-1 focus:ring-blue-500 outline-none"
                placeholder="Pegar tabla de Excel (incluyendo encabezados)..."
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
              ></textarea>
              <div className="flex gap-4 justify-end">
                  <button onClick={handleProcessAndSave} disabled={isSaving} className="px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold text-sm hover:bg-blue-700 shadow-lg flex items-center gap-2 transition-colors">
                    {isSaving ? <RefreshCw className="animate-spin" size={18}/> : <Save size={18}/>}
                    {isSaving ? 'Consolidando...' : 'Guardar y Publicar'}
                  </button>
              </div>
          </div>
      </div>
    </div>
  );
};

// --- LOGICA DE CURVAS S ---
const calculatePlannedCurve = (items, projectStartDate, totalPeriods) => {
    const plannedData = Array(totalPeriods).fill(0).map(() => 0);
    const startObj = new Date(projectStartDate);
    items.forEach(item => {
        if (!item.fecha_inicio || !item.fecha_fin) return;
        const iStart = new Date(item.fecha_inicio);
        const iEnd = new Date(item.fecha_fin);
        const totalCost = (item.cantidad_vigente || item.cantidad_total) * item.precio_unitario;
        if (isNaN(iStart.getTime()) || isNaN(iEnd.getTime()) || totalCost <= 0) return;
        const diffTime = Math.abs(iEnd - iStart);
        const durationDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
        const costPerDay = totalCost / durationDays;
        
        // Simulación lineal simple para distribución
        for (let p = 0; p < totalPeriods; p++) {
            // ... lógica simplificada para este ejemplo ...
            // En producción usaría la lógica de fechas reales vs cortes
            plannedData[p] += (totalCost / totalPeriods); 
        }
    });
    let accum = 0;
    return plannedData.map(val => { accum += val; return accum; });
};

// --- DASHBOARD PRINCIPAL ---

export default function DashboardObra() {
  const [appState, setAppState] = useState('loading'); 
  const [projectData, setProjectData] = useState(null);
  const [config, setConfig] = useState(null);
  const [activeTab, setActiveTab] = useState('general');
  const [selectedPeriod, setSelectedPeriod] = useState(1);
  const [targetDate, setTargetDate] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [certificateView, setCertificateView] = useState(false);
  const [user, setUser] = useState(null);
  const [showLogin, setShowLogin] = useState(false);

  useEffect(() => {
      if(isConfigured && auth) {
          const unsubscribe = onAuthStateChanged(auth, (currentUser) => setUser(currentUser));
          return () => unsubscribe();
      } else { setUser(null); }
  }, []);

  useEffect(() => {
      const fetchData = async () => {
          if (!isConfigured || !db) { setAppState('empty'); return; }
          try {
              const docRef = doc(db, "projects", "main_project");
              const docSnap = await getDoc(docRef);
              if (docSnap.exists()) {
                  const data = docSnap.data();
                  processAndLoad(data.items, data.config);
              } else { setAppState('empty'); }
          } catch (e) { setAppState('empty'); }
      };
      fetchData();
  }, []);

  const processAndLoad = (items, configData) => {
      setProjectData(processDataInternal(items, configData));
      setConfig(configData);
      setAppState('dashboard');
  };

  // --- LÓGICA CENTRAL DE FECHAS Y PLANILLAS ---
  const processDataInternal = (items, config) => {
    const sampleItem = items[0];
    const periodKeys = Object.keys(sampleItem).filter(k => k.startsWith('p') && k.endsWith('_cant'));
    // Ordenar P1, P2, P10 correctamente
    periodKeys.sort((a, b) => {
        const numA = parseInt(a.match(/\d+/)[0]);
        const numB = parseInt(b.match(/\d+/)[0]);
        return numA - numB;
    });
    
    const totalPeriods = periodKeys.length;
    const advanceAmount = config.contractOriginal * (config.advancePercent / 100);
    const plannedCurveAccum = calculatePlannedCurve(items, config.startDate, totalPeriods);

    const monthlyData = [];
    let accumExecutedPhysical = 0;
    let accumFinancial = advanceAmount; 

    const modulesMap = {};

    // GENERADOR DE PERIODOS PERSONALIZADO (HOSPITAL ISAIAS)
    // P1: Sept 23, P2: Oct 23, P3: Nov 23
    // P4: Dic 23 + Ene 24 + Feb 24 + Mar 24
    // P5: Abr 24 ...
    
    const getPeriodLabel = (pIndex) => {
        const i = pIndex + 1; // 1-based
        if (i === 1) return "Sep 23";
        if (i === 2) return "Oct 23";
        if (i === 3) return "Nov 23";
        if (i === 4) return "Dic 23 - Mar 24"; // Especial
        
        // Desde P5 (Abril 2024) en adelante
        const baseDate = new Date(2024, 3, 1); // Abril 1, 2024
        baseDate.setMonth(baseDate.getMonth() + (i - 5));
        return formatDateShort(baseDate);
    };

    for (let i = 1; i <= totalPeriods; i++) {
      const periodKey = `p${i}_cant`; 
      let periodPhysicalAmount = 0;
      
      items.forEach(item => { 
          const amount = ((item[periodKey] || 0) * (item['precio_unitario'] || 0));
          periodPhysicalAmount += amount; 
          
          let modName = (item['modulo'] || 'GENERAL').toString().toUpperCase().trim();
          if (modName === '') modName = 'GENERAL';

          if (!modulesMap[modName]) {
              modulesMap[modName] = { name: modName, totalBudget: 0, executedAccum: 0 };
          }
          if (i === 1) { 
             modulesMap[modName].totalBudget += (item['cantidad_vigente'] * item['precio_unitario']);
          }
      });

      const amortization = periodPhysicalAmount * (config.advancePercent / 100);
      const liquidPayable = periodPhysicalAmount - amortization;
      accumExecutedPhysical += periodPhysicalAmount;
      accumFinancial += liquidPayable; 

      monthlyData.push({
        period: `P${i}`,
        label: getPeriodLabel(i-1),
        fullLabel: `Planilla ${i} (${getPeriodLabel(i-1)})`,
        month: i,
        physicalPartial: periodPhysicalAmount, 
        amortization, 
        liquidPartial: liquidPayable, 
        physicalAccum: accumExecutedPhysical, 
        financialAccum: accumFinancial, // Líquidos + Anticipo Original
        plannedAccum: plannedCurveAccum[i-1] || 0,
        progressPhysical: (accumExecutedPhysical / config.totalAmount) * 100,
        progressFinancial: (accumFinancial / config.totalAmount) * 100,
        spiAccum: plannedCurveAccum[i-1] > 0 ? accumExecutedPhysical / plannedCurveAccum[i-1] : 1,
      });
    }

    const processedItems = items.map(item => {
       const newItem = { ...item };
       const cantVigente = item['cantidad_vigente'] || 0;
       newItem.cantidad_vigente = cantVigente;
       newItem.historial = {};
       
       let modName = (item['modulo'] || 'GENERAL').toString().toUpperCase().trim();
       if (modName === '') modName = 'GENERAL';
       
       let itemAccumAmount = 0;
       let accumQty = 0;
       for(let i=1; i<=totalPeriods; i++) {
           const qty = item[`p${i}_cant`] || 0;
           accumQty += qty;
           const amount = qty * item['precio_unitario'];
           newItem.historial[i] = { qtyPartial: qty, qtyAccum: accumQty, amtPartial: amount, amtAccum: accumQty * item['precio_unitario'] };
           itemAccumAmount += amount;
       }
       
       if (modulesMap[modName]) {
           modulesMap[modName].executedAccum += itemAccumAmount;
       }
       return newItem;
    });

    const moduleStats = Object.values(modulesMap).map(m => ({
        ...m,
        incidence: (m.totalBudget / config.totalAmount) * 100,
        progress: m.totalBudget > 0 ? (m.executedAccum / m.totalBudget) * 100 : 0
    }));

    return { monthlyData, processedItems, totalPeriods, advanceAmount, moduleStats };
  };

  const handleLogout = async () => {
      if(isConfigured && auth) await signOut(auth);
      else setUser(null); 
  };

  if (appState === 'loading') return <div className="h-screen flex items-center justify-center bg-slate-50 text-slate-400 gap-2"><RefreshCw className="animate-spin"/> Cargando...</div>;
  if (appState === 'input') return <DataInputScreen onDataLoaded={(data) => processAndLoad(data.items, data.config)} onCancel={() => setAppState(projectData ? 'dashboard' : 'empty')} />;

  if (appState === 'empty') {
      return (
          <div className="h-screen flex flex-col items-center justify-center bg-slate-50 p-6 text-center animate-fade-in">
              <div className="bg-white p-8 rounded-xl shadow-lg border max-w-md w-full">
                  <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4 text-blue-600"><Briefcase size={32}/></div>
                  <h2 className="text-2xl font-bold text-slate-800 mb-2">Hospital Isaias - Oruro</h2>
                  <p className="text-slate-500 mb-6">Sistema de Supervisión y Control de Obra.</p>
                  
                  {user ? (
                      <button onClick={() => setAppState('input')} className="w-full bg-blue-600 text-white py-3 rounded-lg font-bold hover:bg-blue-700">Cargar Proyecto</button>
                  ) : (
                      <div className="text-center pt-4 border-t border-slate-100">
                          <button onClick={() => setShowLogin(true)} className="text-sm text-blue-600 hover:underline flex items-center justify-center gap-1 w-full"><Lock size={12}/> Acceso Supervisión</button>
                      </div>
                  )}
              </div>
              {showLogin && <LoginModal onClose={() => setShowLogin(false)} onLoginSuccess={(u) => setUser(u)} />}
          </div>
      );
  }

  const { monthlyData, processedItems, moduleStats, advanceAmount } = projectData;
  const currentPeriodData = monthlyData[selectedPeriod - 1] || {};
  
  // CALCULOS FINANCIEROS CLAVES
  const totalPagado = currentPeriodData.financialAccum; // Incluye anticipo + liquidos acumulados
  const saldoPorCancelar = config.totalAmount - totalPagado;

  return (
    <div className="flex h-screen bg-slate-100 font-sans text-slate-800 overflow-hidden flex-col">
      <div className="flex flex-1 overflow-hidden">
        {/* SIDEBAR */}
        <aside className={`fixed inset-y-0 left-0 z-30 w-64 bg-slate-900 text-slate-300 transform transition-transform duration-300 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:relative md:translate-x-0 flex flex-col shadow-2xl`}>
            <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950">
                <div className="flex items-center gap-2">
                    <div className="bg-blue-600 p-1.5 rounded-md"><Activity size={18} className="text-white"/></div>
                    <div>
                        <span className="font-bold text-white tracking-tight block text-sm">Supervisión</span>
                        <span className="text-[10px] text-blue-400 font-medium">HOSPITAL ISAIAS</span>
                    </div>
                </div>
                <button onClick={() => setSidebarOpen(false)} className="md:hidden"><X size={18}/></button>
            </div>
            <nav className="p-4 space-y-1 flex-1 overflow-y-auto">
                <p className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-2">Vistas</p>
                <button onClick={() => setActiveTab('general')} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all ${activeTab === 'general' ? 'bg-blue-600 text-white font-medium shadow-md' : 'hover:bg-slate-800 hover:text-white'}`}>
                    <LayoutDashboard size={18}/> Tablero de Control
                </button>
                <button onClick={() => setActiveTab('items')} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all ${activeTab === 'items' ? 'bg-blue-600 text-white font-medium shadow-md' : 'hover:bg-slate-800 hover:text-white'}`}>
                    <FileText size={18}/> Planillas / Módulos
                </button>
                
                <div className="mt-6">
                    <p className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-2">Resumen Módulos</p>
                    {moduleStats.slice(0, 5).map((mod, i) => (
                        <div key={i} className="px-3 py-2 text-xs flex justify-between group cursor-default">
                            <span className="text-slate-400 group-hover:text-white transition-colors truncate w-24" title={mod.name}>{mod.name}</span>
                            <span className="text-emerald-500 font-bold">{mod.progress.toFixed(1)}%</span>
                        </div>
                    ))}
                </div>

                {user && (
                <div className="mt-8 pt-4 border-t border-slate-800">
                    <p className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-2">Admin</p>
                    <button onClick={() => setAppState('input')} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm hover:bg-slate-800 text-emerald-400 transition-colors">
                        <Upload size={18}/> Actualizar Datos
                    </button>
                    <button onClick={handleLogout} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm hover:bg-red-900/30 text-red-400 transition-colors mt-2">
                        <LogOut size={18}/> Salir
                    </button>
                </div>
                )}
            </nav>
            
            <div className="p-4 bg-slate-950 border-t border-slate-800 flex justify-between items-center">
                {user ? (
                    <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                        <span className="text-xs text-white">Admin Activo</span>
                    </div>
                ) : (
                    <button onClick={() => setShowLogin(true)} className="flex items-center gap-2 text-xs text-slate-500 hover:text-white transition-colors">
                        <Lock size={12}/> Acceso Admin
                    </button>
                )}
            </div>
        </aside>

        <div className="flex-1 flex flex-col h-screen overflow-hidden">
            {/* HEADER */}
            <header className="bg-white border-b border-slate-200 h-16 flex items-center justify-between px-6 shrink-0 z-20">
                <div className="flex items-center gap-4">
                    <button onClick={() => setSidebarOpen(true)} className="md:hidden"><Menu size={20}/></button>
                    <div>
                        <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wide hidden md:block">
                            SUPERVISIÓN CONSTRUCCIÓN HOSPITAL DE SEGUNDO NIVEL ISAIAS - ORURO
                        </h2>
                        <p className="text-xs text-slate-500 hidden md:block">Tablero de Control Gerencial</p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2 bg-slate-100 px-3 py-1.5 rounded-md border border-slate-200">
                        <span className="text-xs font-bold text-slate-500 uppercase">Corte:</span>
                        <select value={selectedPeriod} onChange={(e) => setSelectedPeriod(Number(e.target.value))} className="bg-transparent border-none text-sm font-bold text-blue-700 focus:ring-0 cursor-pointer pr-4">
                            {monthlyData.map(m => <option key={m.month} value={m.month}>{m.label}</option>)}
                        </select>
                    </div>
                </div>
            </header>

            <main className="flex-1 overflow-auto p-4 md:p-6 bg-slate-50/50">
            {activeTab === 'general' ? (
                <div className="space-y-6 animate-fade-in pb-4">
                    
                    {/* TARJETAS SUPERIORES: RESUMEN EJECUTIVO AL CORTE */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                         <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
                             <div className="flex justify-between">
                                 <div>
                                     <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Anticipo Otorgado</p>
                                     <p className="text-lg font-black text-slate-800">{formatCurrency(advanceAmount)}</p>
                                     <p className="text-[10px] font-medium text-blue-600 bg-blue-50 px-1.5 rounded inline-block mt-1">{config.advancePercent}%</p>
                                 </div>
                                 <div className="bg-blue-50 p-2 rounded text-blue-600 h-fit"><Briefcase size={18}/></div>
                             </div>
                         </div>
                         <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
                             <div className="flex justify-between">
                                 <div>
                                     <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Total Cancelado</p>
                                     <p className="text-lg font-black text-emerald-600">{formatCurrency(totalPagado)}</p>
                                     <p className="text-[10px] font-medium text-slate-400 mt-1">Anticipo + Líquidos</p>
                                 </div>
                                 <div className="bg-emerald-50 p-2 rounded text-emerald-600 h-fit"><CheckCircle size={18}/></div>
                             </div>
                         </div>
                         <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
                             <div className="flex justify-between">
                                 <div>
                                     <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Saldo por Cancelar</p>
                                     <p className="text-lg font-black text-amber-600">{formatCurrency(saldoPorCancelar)}</p>
                                     <p className="text-[10px] font-medium text-slate-400 mt-1">Contrato - Pagado</p>
                                 </div>
                                 <div className="bg-amber-50 p-2 rounded text-amber-600 h-fit"><Wallet size={18}/></div>
                             </div>
                         </div>
                         <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
                             <div className="flex justify-between">
                                 <div>
                                     <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Avance Físico</p>
                                     <p className="text-lg font-black text-blue-600">{currentPeriodData.progressPhysical?.toFixed(2)}%</p>
                                     <p className="text-[10px] font-medium text-slate-400 mt-1">Acumulado a {currentPeriodData.label}</p>
                                 </div>
                                 <div className="bg-indigo-50 p-2 rounded text-indigo-600 h-fit"><Activity size={18}/></div>
                             </div>
                         </div>
                    </div>

                    {/* 2. CONTROL DE MÓDULOS */}
                    <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
                        <div className="p-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
                            <h3 className="text-sm font-bold text-slate-700 flex items-center gap-2">
                                <Layers size={16} className="text-indigo-500"/> Estructura de Costos por Módulo
                            </h3>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-xs text-left text-slate-600">
                                <thead className="bg-white text-slate-500 font-semibold border-b border-slate-100">
                                    <tr>
                                        <th className="px-4 py-3">Módulo</th>
                                        <th className="px-4 py-3 text-right">Presupuesto</th>
                                        <th className="px-4 py-3 text-right">Incidencia Total</th>
                                        <th className="px-4 py-3 text-right">Ejecutado (Acum)</th>
                                        <th className="px-4 py-3 text-center">Avance Módulo</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {moduleStats.map((mod, idx) => (
                                        <tr key={idx} className="hover:bg-indigo-50/30 transition-colors">
                                            <td className="px-4 py-3 font-medium text-slate-800">{mod.name}</td>
                                            <td className="px-4 py-3 text-right text-slate-600">{formatCurrency(mod.totalBudget)}</td>
                                            <td className="px-4 py-3 text-right">
                                                <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded text-[10px] font-bold">
                                                    {mod.incidence.toFixed(2)}%
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-right font-medium text-blue-600">{formatCurrency(mod.executedAccum)}</td>
                                            <td className="px-4 py-3">
                                                <div className="flex items-center gap-2">
                                                    <div className="flex-1 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                                                        <div className="h-full bg-emerald-500 rounded-full" style={{width: `${Math.min(mod.progress, 100)}%`}}></div>
                                                    </div>
                                                    <span className="text-[10px] font-bold w-8 text-right">{mod.progress.toFixed(1)}%</span>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* 3. GRÁFICA PRINCIPAL */}
                    <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-sm">
                        <div className="flex justify-between items-center mb-6">
                            <div>
                                <h3 className="text-base font-bold text-slate-800">Curva S de Inversión</h3>
                                <p className="text-xs text-slate-400">Evolución Acumulada</p>
                            </div>
                            <div className="flex gap-3 text-[10px] font-semibold uppercase tracking-wide">
                                <span className="flex items-center gap-1.5 text-slate-400"><div className="w-2 h-2 bg-slate-300 rounded-full"></div> Programado</span>
                                <span className="flex items-center gap-1.5 text-blue-600"><div className="w-2 h-2 bg-blue-500 rounded-full"></div> Físico</span>
                                <span className="flex items-center gap-1.5 text-emerald-600"><div className="w-2 h-2 bg-emerald-500 rounded-full"></div> Financiero</span>
                            </div>
                        </div>
                        <div className="h-64 w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <ComposedChart data={monthlyData}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9"/>
                                    <XAxis dataKey="label" tick={{fontSize: 10, fill: '#94a3b8'}} axisLine={false} tickLine={false}/>
                                    <YAxis tickFormatter={(val) => `${(val/1000000).toFixed(1)}M`} tick={{fontSize: 10, fill: '#94a3b8'}} axisLine={false} tickLine={false} />
                                    <RechartsTooltip contentStyle={{backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} formatter={(value) => formatCurrency(value)} />
                                    <Line type="monotone" dataKey="plannedAccum" stroke="#cbd5e1" strokeWidth={2} strokeDasharray="4 4" dot={false} />
                                    <Area type="monotone" dataKey="physicalAccum" fill="rgba(59, 130, 246, 0.05)" stroke="#3b82f6" strokeWidth={2} />
                                    <Line type="monotone" dataKey="financialAccum" stroke="#10b981" strokeWidth={2} dot={{r: 3, strokeWidth: 0, fill: '#10b981'}} />
                                </ComposedChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="bg-white rounded-lg border border-slate-200 shadow-sm flex flex-col h-full animate-fade-in overflow-hidden">
                    <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                        <div className="flex items-center gap-4">
                            <div>
                                <h3 className="font-bold text-slate-800 text-sm">Detalle de Planillas</h3>
                                <p className="text-xs text-slate-500 mt-0.5">Planilla {selectedPeriod} • {currentPeriodData.fullLabel}</p>
                            </div>
                            <select value={selectedPeriod} onChange={(e) => setSelectedPeriod(Number(e.target.value))} className="bg-white border border-slate-300 text-slate-700 text-xs rounded p-1 font-bold">
                                {monthlyData.map(m => <option key={m.month} value={m.month}>{m.label}</option>)}
                            </select>
                        </div>
                        <button onClick={() => setCertificateView(!certificateView)} className={`text-xs px-3 py-1.5 rounded-md border font-medium transition-colors ${certificateView ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}>
                            {certificateView ? 'Modo Edición' : 'Modo Impresión'}
                        </button>
                    </div>
                    
                    <div className="flex-1 overflow-auto">
                        <table className="w-full text-xs text-left text-slate-600">
                            <thead className="bg-slate-50 sticky top-0 z-10 text-slate-500 font-semibold uppercase tracking-wider">
                                <tr>
                                    <th className="px-4 py-3 border-b">Módulo</th>
                                    <th className="px-4 py-3 border-b">Item</th>
                                    <th className="px-4 py-3 border-b w-1/4">Descripción</th>
                                    <th className="px-4 py-3 border-b text-right">Unidad</th>
                                    {!certificateView && <th className="px-4 py-3 border-b text-right">Total</th>}
                                    <th className="px-4 py-3 border-b text-right">P.U.</th>
                                    <th className="px-4 py-3 border-b text-right bg-blue-50/50 text-blue-700">Cant.</th>
                                    <th className="px-4 py-3 border-b text-right bg-blue-50/50 text-blue-700">Parcial</th>
                                    {!certificateView && <th className="px-4 py-3 border-b text-right">%</th>}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                            {processedItems.filter(i => i.historial[selectedPeriod]?.qtyPartial > 0).map((item, idx) => {
                                const hist = item.historial[selectedPeriod];
                                const percent = (hist.qtyAccum / item.cantidad_vigente) * 100;
                                return (
                                    <tr key={idx} className="hover:bg-slate-50 transition-colors">
                                        <td className="px-4 py-2 font-medium text-[10px] text-slate-500 uppercase">{item['modulo'] || 'GENERAL'}</td>
                                        <td className="px-4 py-2 font-medium">{item['item']}</td>
                                        <td className="px-4 py-2 truncate max-w-xs" title={item['actividad']}>{item['actividad']}</td>
                                        <td className="px-4 py-2 text-right font-mono">{item['unidad']}</td>
                                        {!certificateView && <td className="px-4 py-2 text-right text-slate-400">{item.cantidad_vigente}</td>}
                                        <td className="px-4 py-2 text-right">{item['precio_unitario']}</td>
                                        <td className="px-4 py-2 text-right font-bold text-blue-700 bg-blue-50/20">{hist.qtyPartial}</td>
                                        <td className="px-4 py-2 text-right font-medium text-blue-700 bg-blue-50/20">{formatCurrency(hist.amtPartial)}</td>
                                        {!certificateView && <td className="px-4 py-2 text-right text-slate-400">{percent.toFixed(1)}%</td>}
                                    </tr>
                                );
                            })}
                            </tbody>
                        </table>
                    </div>
                    
                    <div className="p-4 border-t border-slate-200 bg-slate-50 flex justify-end gap-6 text-sm">
                        <div className="text-right">
                            <span className="block text-xs text-slate-400 uppercase font-bold">Total Bruto</span>
                            <span className="font-bold text-slate-800">{formatCurrency(currentPeriodData.physicalPartial)}</span>
                        </div>
                        <div className="text-right">
                            <span className="block text-xs text-slate-400 uppercase font-bold">Amort. ({config.advancePercent}%)</span>
                            <span className="font-bold text-red-500">-{formatCurrency(currentPeriodData.amortization)}</span>
                        </div>
                        <div className="text-right pl-6 border-l border-slate-200">
                            <span className="block text-xs text-blue-600 uppercase font-bold">Líquido Pagable</span>
                            <span className="text-xl font-black text-blue-700">{formatCurrency(currentPeriodData.liquidPartial)}</span>
                        </div>
                    </div>
                </div>
            )}
            </main>
        </div>
        
        {/* FOOTER DE CREDITOS (FIXED AT BOTTOM) */}
        <div className="bg-slate-950 text-slate-500 text-[10px] py-1 px-6 text-center shrink-0 border-t border-slate-800 w-full z-50">
            Desarrollado por <strong>Zacarias Ortega</strong> para el Proyecto Construcción Hospital de Segundo Nivel Isaias - Oruro
        </div>
        
        {showLogin && <LoginModal onClose={() => setShowLogin(false)} onLoginSuccess={(u) => setUser(u)} />}
    </div>
  );
}