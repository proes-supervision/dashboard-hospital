import React, { useState, useEffect } from 'react';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, AreaChart, Area, ComposedChart, BarChart, Bar, Cell
} from 'recharts';
import { 
  Briefcase, Calendar, DollarSign, Activity, 
  Clock, Menu, X, Upload, FileText, Plus, Trash2, CheckCircle, 
  ArrowRight, LayoutDashboard, LogOut, Info, Lock, User, RefreshCw, WifiOff, AlertTriangle, Shield, Layers, PieChart
} from 'lucide-react';

// =================================================================================
// ☁️ ZONA DE CONFIGURACIÓN (EDITAR AQUÍ EN LA NUBE)
// =================================================================================
// 1. Ve a console.firebase.google.com
// 2. Crea un proyecto, activa Firestore Database y Authentication (Email/Pass)
// 3. Copia las llaves y pégalas abajo respetando las comillas.

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
  const delimiter = text.includes('\t') ? '\t' : ',';
  const lines = text.trim().split('\n');
  const headers = lines[0].split(delimiter).map(h => h.trim().toLowerCase());
  const data = [];
  for (let i = 1; i < lines.length; i++) {
    const row = lines[i].split(delimiter);
    if (row.length < 2) continue; 
    const item = {};
    headers.forEach((header, index) => {
      let val = row[index];
      if (val) val = val.trim();
      if (header.includes('fecha')) {
         item[header] = val; 
      } else {
        const numVal = parseFloat(val?.replace(/[^0-9.-]+/g,""));
        const isNumber = !isNaN(numVal) && (
            header.includes('cant') || header.includes('total') || header.includes('precio') || 
            header.includes('monto') || header.includes('p_')
        );
        item[header] = isNumber ? numVal : val;
      }
    });
    data.push(item);
  }
  return data;
};

const formatCurrency = (val) => new Intl.NumberFormat('es-BO', { style: 'currency', currency: 'BOB', minimumFractionDigits: 2 }).format(val);

// --- COMPONENTES UI ---
const KPICard = ({ label, value, subValue, color = "blue" }) => {
    const colors = {
        blue: "text-blue-600 bg-blue-50 border-blue-100",
        emerald: "text-emerald-600 bg-emerald-50 border-emerald-100",
        indigo: "text-indigo-600 bg-indigo-50 border-indigo-100",
        slate: "text-slate-600 bg-slate-50 border-slate-200"
    };
    return (
        <div className={`p-4 rounded-lg border ${colors[color].split(" ")[2]} ${colors[color].split(" ")[1]} flex flex-col items-center justify-center text-center shadow-sm h-full`}>
            <span className="text-[10px] uppercase font-bold tracking-wider opacity-70 mb-1">{label}</span>
            <span className={`text-xl font-bold tracking-tight ${colors[color].split(" ")[0]}`}>{typeof value === 'number' ? value.toFixed(2) : value}</span>
            {subValue && <span className="text-[10px] mt-1 opacity-80">{subValue}</span>}
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
        <h3 className="text-2xl font-semibold text-slate-800 tracking-tight">{value}</h3>
        <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mt-1">{title}</p>
        {subtext && <p className="text-xs text-slate-400 mt-1">{subtext}</p>}
    </div>
    {footer && <div className="mt-3 pt-3 border-t border-slate-50 text-xs text-slate-400 flex items-center gap-1">{footer}</div>}
  </div>
);

// --- MODAL DE LOGIN ---
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
            // Backdoor local para pruebas sin Firebase
            if (email === 'admin@obra.com' && password === '123456') {
                onLoginSuccess({ email: 'admin@local' });
                onClose();
            } else {
                setError("Modo Local: Usa admin@obra.com / 123456");
            }
            setLoading(false);
            return;
        }

        try {
            await signInWithEmailAndPassword(auth, email, password);
            onClose(); 
        } catch (err) {
            console.error(err);
            setError("Error de acceso. Verifica tus credenciales.");
        }
        setLoading(false);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm p-6 relative">
                <button onClick={onClose} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"><X size={20}/></button>
                
                <div className="flex items-center gap-2 mb-4">
                    <div className="bg-slate-100 p-2 rounded-full"><Shield className="text-slate-700" size={20}/></div>
                    <h2 className="text-lg font-bold text-slate-800">Zona Administrativa</h2>
                </div>
                
                {!isConfigured && (
                    <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg flex gap-2">
                        <AlertTriangle size={16} className="text-amber-600 shrink-0 mt-0.5"/>
                        <div className="text-xs text-amber-700">
                            <strong>Sin Conexión:</strong><br/>
                            Usa: <code>admin@obra.com</code><br/>
                            Pass: <code>123456</code>
                        </div>
                    </div>
                )}

                <form onSubmit={handleLogin} className="space-y-4">
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Usuario</label>
                        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full p-3 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-slate-800 outline-none" required/>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Contraseña</label>
                        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full p-3 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-slate-800 outline-none" required/>
                    </div>
                    {error && <p className="text-xs text-red-500 font-bold bg-red-50 p-2 rounded">{error}</p>}
                    <button type="submit" disabled={loading} className="w-full bg-slate-900 text-white py-3 rounded-lg font-bold hover:bg-slate-800 transition-colors disabled:opacity-50">
                        {loading ? 'Verificando...' : 'Acceder'}
                    </button>
                </form>
            </div>
        </div>
    );
};

// --- PANTALLA DE CARGA ---
const DataInputScreen = ({ onDataLoaded, onCancel }) => {
  const [step, setStep] = useState(1);
  const [inputText, setInputText] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  
  const [baseConfig, setBaseConfig] = useState({
    contractOriginal: 0,
    daysOriginal: 0,
    startDate: '',
    advancePercent: 18.30
  });

  const [modifications, setModifications] = useState([]);

  const addModification = () => setModifications([...modifications, { id: Date.now(), name: '', amount: 0, days: 0, type: 'CM' }]);
  const removeModification = (id) => setModifications(modifications.filter(m => m.id !== id));
  const updateModification = (id, field, value) => setModifications(modifications.map(m => m.id === id ? { ...m, [field]: value } : m));

  const totalAmount = baseConfig.contractOriginal + modifications.reduce((sum, m) => sum + (parseFloat(m.amount) || 0), 0);
  const totalDays = baseConfig.daysOriginal + modifications.reduce((sum, m) => sum + (parseFloat(m.days) || 0), 0);

  const handleProcessAndSave = async () => {
    try {
      const parsedItems = parseCSV(inputText);
      if (parsedItems.length === 0) { alert("No se detectaron datos válidos. Verifica los encabezados."); return; }
      
      const projectPayload = { 
        items: parsedItems, 
        config: { ...baseConfig, modifications, totalAmount, totalDays },
        lastUpdated: new Date().toISOString()
      };

      if (isConfigured && db) {
          setIsSaving(true);
          try {
            await setDoc(doc(db, "projects", "main_project"), projectPayload);
            alert("¡Proyecto actualizado exitosamente!");
          } catch (err) {
            console.error(err);
            alert("Error al guardar: " + err.message);
            setIsSaving(false);
            return;
          }
          setIsSaving(false);
      }
      onDataLoaded(projectPayload);
    } catch (e) { 
        alert("Error crítico: " + e.message); 
        setIsSaving(false);
    }
  };

  const loadExample = () => {
    let header = "Modulo\tItem\tActividad\tUnidad\tFecha_Inicio\tFecha_Fin\tCantidad_Original\tCantidad_Vigente\tPrecio_Unitario";
    for(let i=1; i<=25; i++) header += `\tP${i}_Cant`;
    let rows = "";
    const startDate = new Date(baseConfig.startDate || '2023-01-01');
    const modules = ["Arquitectura", "Estructuras", "Inst. Eléctricas", "Inst. Sanitarias", "Gases Medicinales"];
    
    for(let i=1; i<=20; i++) {
        const mod = modules[i % modules.length];
        const precio = Math.floor(Math.random()*500)+50;
        const cantVigente = 1000;
        const itemStart = new Date(startDate);
        itemStart.setDate(startDate.getDate() + (i * 15));
        const itemEnd = new Date(itemStart);
        itemEnd.setDate(itemStart.getDate() + 60);
        const fInicio = itemStart.toISOString().split('T')[0];
        const fFin = itemEnd.toISOString().split('T')[0];
        let row = `${mod}\t${i}\tActividad Ejemplo ${i}\tm3\t${fInicio}\t${fFin}\t${cantVigente}\t${cantVigente}\t${precio}`;
        for(let p=1; p<=25; p++) {
             const pDate = new Date(startDate);
             pDate.setMonth(pDate.getMonth() + p - 1);
             let qty = 0;
             if (pDate >= itemStart && pDate <= itemEnd) qty = Math.floor(Math.random() * (cantVigente/3)); 
             row += `\t${qty}`; 
        }
        rows += `\n${row}`;
    }
    setInputText(header + rows);
    setModifications([{ id: 1, name: 'CM 1: Ajuste', amount: 50000, days: 0, type: 'CM' }]);
    setBaseConfig({...baseConfig, contractOriginal: 15000000, daysOriginal: 700, startDate: '2023-01-01'});
  };

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-8 animate-fade-in bg-slate-50 min-h-screen flex items-center justify-center">
      <div className="bg-white p-6 md:p-8 rounded-xl shadow-xl border border-slate-200 w-full">
        <div className="mb-6 flex justify-between items-center border-b pb-4">
            <div>
                <h1 className="text-xl font-bold text-slate-800">Cargar Proyecto</h1>
                <div className="flex items-center gap-2">
                    <p className="text-sm text-slate-500">Editor de Datos</p>
                    {!isConfigured && <span className="text-[10px] bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-bold">Modo Local</span>}
                </div>
            </div>
            <button onClick={onCancel} className="text-slate-400 hover:text-slate-600"><X/></button>
        </div>

        {step === 1 ? (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
               <div>
                  <label className="text-xs font-semibold text-slate-600 uppercase">Monto Original</label>
                  <input type="number" value={baseConfig.contractOriginal} onChange={(e) => setBaseConfig({...baseConfig, contractOriginal: parseFloat(e.target.value)})} className="w-full mt-1 p-2 border rounded text-sm" />
               </div>
               <div>
                  <label className="text-xs font-semibold text-slate-600 uppercase">Anticipo (%)</label>
                  <input type="number" value={baseConfig.advancePercent} onChange={(e) => setBaseConfig({...baseConfig, advancePercent: parseFloat(e.target.value)})} className="w-full mt-1 p-2 border rounded text-sm" />
               </div>
               <div>
                  <label className="text-xs font-semibold text-slate-600 uppercase">Plazo (Días)</label>
                  <input type="number" value={baseConfig.daysOriginal} onChange={(e) => setBaseConfig({...baseConfig, daysOriginal: parseFloat(e.target.value)})} className="w-full mt-1 p-2 border rounded text-sm" />
               </div>
               <div>
                  <label className="text-xs font-semibold text-slate-600 uppercase">Inicio</label>
                  <input type="date" value={baseConfig.startDate} onChange={(e) => setBaseConfig({...baseConfig, startDate: e.target.value})} className="w-full mt-1 p-2 border rounded text-sm" />
               </div>
            </div>

            <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
               <div className="flex justify-between items-center mb-3">
                 <h3 className="text-sm font-bold text-slate-700">Modificaciones</h3>
                 <button onClick={addModification} className="text-xs bg-slate-200 hover:bg-slate-300 px-2 py-1 rounded flex items-center gap-1"><Plus size={12}/> Agregar</button>
               </div>
               {modifications.map((mod) => (
                  <div key={mod.id} className="flex gap-2 mb-2 items-center flex-wrap md:flex-nowrap">
                    <select value={mod.type} onChange={(e) => updateModification(mod.id, 'type', e.target.value)} className="p-1.5 border rounded text-xs font-bold w-16"><option value="CM">CM</option><option value="OC">OC</option></select>
                    <input value={mod.name} onChange={(e) => updateModification(mod.id, 'name', e.target.value)} className="p-1.5 border rounded text-xs flex-1 min-w-[150px]" placeholder="Descripción"/>
                    <div className="flex items-center gap-1">
                        <input type="number" value={mod.amount} onChange={(e) => updateModification(mod.id, 'amount', e.target.value)} className="p-1.5 border rounded text-xs w-20" placeholder="Monto"/>
                    </div>
                    <div className="flex items-center gap-1">
                        <input type="number" value={mod.days} onChange={(e) => updateModification(mod.id, 'days', e.target.value)} className="p-1.5 border rounded text-xs w-16" placeholder="Plazo"/>
                    </div>
                    <button onClick={() => removeModification(mod.id)} className="text-slate-400 hover:text-red-500"><Trash2 size={14}/></button>
                  </div>
               ))}
            </div>

            <button onClick={() => setStep(2)} className="w-full py-3 bg-slate-900 text-white rounded-lg font-semibold text-sm hover:bg-slate-800 flex justify-center items-center gap-2">
              Siguiente <ArrowRight size={16}/>
            </button>
          </div>
        ) : (
          <div className="space-y-4">
              <div className="flex justify-end gap-3 mb-2">
                   <button onClick={loadExample} className="text-xs text-blue-600 font-medium hover:underline">Usar Ejemplo</button>
                   <button onClick={() => setStep(1)} className="text-xs text-slate-500 hover:underline">Volver</button>
              </div>
              <div className="bg-blue-50 p-3 rounded-lg border border-blue-100 text-xs text-blue-800 mb-2">
                  <p className="font-bold mb-1">Columnas requeridas (Orden sugerido):</p>
                  <code className="font-mono text-[10px] break-all">
                      Modulo, Item, Actividad, Unidad, Fecha_Inicio, Fecha_Fin, Cantidad_Original, Cantidad_Vigente, Precio_Unitario, P1_Cant...
                  </code>
              </div>
              <textarea 
                className="w-full h-48 p-3 border border-slate-300 rounded-lg font-mono text-xs focus:ring-1 focus:ring-blue-500 outline-none"
                placeholder="Pegar datos de Excel..."
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
              ></textarea>
              <div className="flex gap-4">
                  <button onClick={() => setStep(1)} className="px-4 py-3 text-slate-500 text-sm hover:underline">Atrás</button>
                  <button onClick={handleProcessAndSave} disabled={isSaving} className="flex-1 py-3 bg-blue-600 text-white rounded-lg font-semibold text-sm hover:bg-blue-700 shadow-lg flex justify-center items-center gap-2 transition-colors">
                    {isSaving ? <RefreshCw className="animate-spin" size={18}/> : <Upload size={18}/>}
                    {isSaving ? 'Guardando...' : (isConfigured ? 'Guardar y Publicar' : 'Visualizar (Local)')}
                  </button>
              </div>
          </div>
        )}
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
        for (let p = 0; p < totalPeriods; p++) {
            const pStart = new Date(startObj);
            pStart.setMonth(startObj.getMonth() + p);
            const pEnd = new Date(pStart);
            pEnd.setMonth(pStart.getMonth() + 1);
            pEnd.setDate(pEnd.getDate() - 1); 
            const overlapStart = new Date(Math.max(iStart, pStart));
            const overlapEnd = new Date(Math.min(iEnd, pEnd));
            if (overlapStart <= overlapEnd) {
                const overlapDays = Math.ceil((overlapEnd - overlapStart) / (1000 * 60 * 60 * 24)) + 1;
                plannedData[p] += (overlapDays * costPerDay);
            }
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
      setTargetDate(new Date().toISOString().split('T')[0]);
      setAppState('dashboard');
  };

  const processDataInternal = (items, config) => {
    const sampleItem = items[0];
    const periodKeys = Object.keys(sampleItem).filter(k => k.startsWith('p') && k.endsWith('_cant'));
    const totalPeriods = periodKeys.length;
    const advanceAmount = config.contractOriginal * (config.advancePercent / 100);
    const plannedCurveAccum = calculatePlannedCurve(items, config.startDate, totalPeriods);

    const monthlyData = [];
    let accumExecutedPhysical = 0;
    let accumFinancial = advanceAmount; 

    // --- PROCESAMIENTO DE MÓDULOS (NUEVO) ---
    const modulesMap = {};

    for (let i = 1; i <= totalPeriods; i++) {
      const periodKey = `p${i}_cant`; 
      let periodPhysicalAmount = 0;
      
      items.forEach(item => { 
          const amount = ((item[periodKey] || 0) * (item['precio_unitario'] || 0));
          periodPhysicalAmount += amount; 
          
          // Agrupar por modulo para estadísticas globales
          const modName = item['modulo'] || 'GENERAL';
          if (!modulesMap[modName]) {
              modulesMap[modName] = { 
                  name: modName, 
                  totalBudget: 0, 
                  executedAccum: 0 
              };
          }
          if (i === 1) { // Sumar presupuesto solo una vez
             modulesMap[modName].totalBudget += (item['cantidad_vigente'] * item['precio_unitario']);
          }
          // Sumar lo ejecutado hasta este periodo en el acumulado global
          // (Se recalcula al final, aquí solo para el loop si fuera necesario, pero mejor hacerlo fuera)
      });

      const amortization = periodPhysicalAmount * (config.advancePercent / 100);
      const liquidPayable = periodPhysicalAmount - amortization;
      accumExecutedPhysical += periodPhysicalAmount;
      accumFinancial += liquidPayable; 

      const plannedAccumPrev = i === 1 ? 0 : plannedCurveAccum[i-2];
      const plannedPartial = plannedCurveAccum[i-1] - plannedAccumPrev;

      const pStartDate = new Date(config.startDate);
      pStartDate.setMonth(pStartDate.getMonth() + i - 1);
      const pEndDate = new Date(pStartDate);
      pEndDate.setMonth(pStartDate.getMonth() + 1);
      pEndDate.setDate(0); 

      monthlyData.push({
        period: `P${i}`,
        label: pStartDate.toLocaleDateString('es-BO', { month: 'short', year: '2-digit' }),
        fullLabel: pStartDate.toLocaleDateString('es-BO', { month: 'long', year: 'numeric' }),
        month: i,
        startDate: pStartDate,
        endDate: pEndDate,
        physicalPartial: periodPhysicalAmount, 
        amortization, liquidPartial: liquidPayable, plannedPartial,
        physicalAccum: accumExecutedPhysical, financialAccum: accumFinancial, plannedAccum: plannedCurveAccum[i-1] || 0,
        progressPhysical: (accumExecutedPhysical / config.totalAmount) * 100,
        progressFinancial: (accumFinancial / config.totalAmount) * 100,
        spiAccum: plannedCurveAccum[i-1] > 0 ? accumExecutedPhysical / plannedCurveAccum[i-1] : 1,
        spiMonth: plannedPartial > 0 ? periodPhysicalAmount / plannedPartial : 1,
      });
    }

    const processedItems = items.map(item => {
       const newItem = { ...item };
       const cantVigente = item['cantidad_vigente'] || item['cantidad_total'] || 0;
       newItem.cantidad_vigente = cantVigente;
       newItem.historial = {};
       
       // Acumular ejecutado por módulo
       const modName = item['modulo'] || 'GENERAL';
       let itemAccumAmount = 0;

       let accumQty = 0;
       for(let i=1; i<=totalPeriods; i++) {
           const qty = item[`p${i}_cant`] || 0;
           accumQty += qty;
           const amount = qty * item['precio_unitario'];
           newItem.historial[i] = { qtyPartial: qty, qtyAccum: accumQty, amtPartial: amount, amtAccum: accumQty * item['precio_unitario'] };
           itemAccumAmount += amount;
       }
       
       // Actualizar acumulado del módulo
       if (modulesMap[modName]) {
           modulesMap[modName].executedAccum += itemAccumAmount;
       }
       
       return newItem;
    });

    // Calcular estadísticas finales de módulos
    const moduleStats = Object.values(modulesMap).map(m => ({
        ...m,
        incidence: (m.totalBudget / config.totalAmount) * 100,
        progress: (m.executedAccum / m.totalBudget) * 100
    }));

    return { monthlyData, processedItems, totalPeriods, advanceAmount, moduleStats };
  };

  const handleDateChange = (newDate) => {
      setTargetDate(newDate);
      if (!projectData) return;
      const target = new Date(newDate);
      const found = projectData.monthlyData.find(m => target >= m.startDate && target <= m.endDate);
      if (found) setSelectedPeriod(found.month);
  };

  const handlePeriodChange = (newPeriod) => {
      setSelectedPeriod(newPeriod);
      if(!projectData) return;
      const period = projectData.monthlyData.find(m => m.month === newPeriod);
      if(period) setTargetDate(period.endDate.toISOString().split('T')[0]);
  };

  const handleLogout = async () => {
      if(isConfigured && auth) await signOut(auth);
      else setUser(null); 
  };

  if (appState === 'loading') {
      return <div className="h-screen flex items-center justify-center bg-slate-50 text-slate-400 gap-2"><RefreshCw className="animate-spin"/> Cargando Sistema...</div>;
  }

  if (appState === 'input') {
      return <DataInputScreen onDataLoaded={(data) => processAndLoad(data.items, data.config)} onCancel={() => setAppState(projectData ? 'dashboard' : 'empty')} />;
  }

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

  const { monthlyData, processedItems, moduleStats } = projectData;
  const currentPeriodData = monthlyData[selectedPeriod - 1] || {};
  const totalModAmount = config.modifications.reduce((sum, m) => sum + parseFloat(m.amount || 0), 0);
  const elapsedDays = Math.floor((new Date(targetDate) - new Date(config.startDate)) / (1000 * 60 * 60 * 24));
  const remainingDays = config.totalDays - elapsedDays;
  const progressTime = Math.min(100, Math.max(0, (elapsedDays / config.totalDays) * 100));

  return (
    <div className="flex h-screen bg-slate-100 font-sans text-slate-800 overflow-hidden">
      {/* SIDEBAR */}
      <aside className={`fixed inset-y-0 left-0 z-30 w-64 bg-slate-900 text-slate-300 transform transition-transform duration-300 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:relative md:translate-x-0 flex flex-col`}>
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
            
            {/* Lista rápida de módulos */}
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
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider hidden sm:block">Fecha de Corte:</span>
                <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-md border border-slate-200">
                    <Calendar size={14} className="text-slate-400"/>
                    <input type="date" value={targetDate} onChange={(e) => handleDateChange(e.target.value)} className="bg-transparent border-none p-0 text-sm font-medium text-slate-700 focus:ring-0 cursor-pointer w-28"/>
                </div>
            </div>
        </header>

        <main className="flex-1 overflow-auto p-4 md:p-6 bg-slate-50/50 pb-16">
           {activeTab === 'general' ? (
             <div className="space-y-6 animate-fade-in pb-12">
                {/* 1. SECCIÓN DE ESTADO CONTRACTUAL */}
                <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-5">
                    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start mb-6">
                        <div className="lg:col-span-1 border-r border-slate-100 pr-4">
                            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2 mb-3">
                                <Briefcase size={16} className="text-blue-500"/> Contrato
                            </h3>
                            <div className="space-y-2">
                                <div className="flex justify-between text-xs">
                                    <span className="text-slate-500">Original</span>
                                    <span className="font-medium text-slate-700">{formatCurrency(config.contractOriginal)}</span>
                                </div>
                                <div className="pt-2 border-t border-slate-100 flex justify-between text-sm font-bold">
                                    <span className="text-slate-800">Vigente</span>
                                    <span className="text-blue-700">{formatCurrency(config.totalAmount)}</span>
                                </div>
                            </div>
                        </div>

                        <div className="lg:col-span-1 border-r border-slate-100 pr-4">
                             <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2 mb-3">
                                <Clock size={16} className="text-amber-500"/> Plazo
                            </h3>
                            <div className="space-y-2">
                                <div className="flex justify-between text-xs mb-1">
                                    <span className="text-slate-500">{elapsedDays} días ejecutados</span>
                                    <span className="font-medium text-slate-700">{remainingDays} restantes</span>
                                </div>
                                <div className="w-full bg-slate-100 rounded-full h-1.5 mb-2 overflow-hidden">
                                    <div className={`h-1.5 rounded-full ${progressTime > 90 ? 'bg-red-500' : 'bg-blue-500'}`} style={{width: `${progressTime}%`}}></div>
                                </div>
                            </div>
                        </div>

                        <div className="lg:col-span-2">
                            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2 mb-3">
                                <Activity size={16} className="text-purple-500"/> Rendimiento (EVM)
                            </h3>
                            <div className="grid grid-cols-4 gap-3">
                                <KPICard label="SPI Acum" value={currentPeriodData.spiAccum} color={currentPeriodData.spiAccum >= 0.95 ? "emerald" : "indigo"} />
                                <KPICard label="% Físico" value={currentPeriodData.progressPhysical} subValue="Real" color="blue" />
                                <KPICard label="% Financ." value={currentPeriodData.progressFinancial} subValue="Pagado" color="emerald" />
                            </div>
                        </div>
                    </div>
                </div>

                {/* 2. NUEVA SECCIÓN: CONTROL DE MÓDULOS */}
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
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2 bg-white p-5 rounded-lg border border-slate-200 shadow-sm">
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

                    <div className="space-y-4">
                         <StatCard title="Total Planillado (Mes)" value={formatCurrency(currentPeriodData.physicalPartial)} icon={FileText} trend="neutral" footer={`Corresponde a ${currentPeriodData.fullLabel}`}/>
                         <StatCard title="Líquido Pagable" value={formatCurrency(currentPeriodData.liquidPartial)} icon={DollarSign} trend="positive" footer={`Tras desc. ${config.advancePercent}% anticipo`}/>
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
                        <select value={selectedPeriod} onChange={(e) => handlePeriodChange(Number(e.target.value))} className="bg-white border border-slate-300 text-slate-700 text-xs rounded p-1 font-bold">
                            {monthlyData.map(m => <option key={m.month} value={m.month}>{m.label} (P{m.month})</option>)}
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
        
        {/* FOOTER DE CREDITOS (STICKY) */}
        <div className="bg-slate-900 text-slate-500 text-[10px] py-1 px-6 text-center shrink-0 border-t border-slate-800">
            Desarrollado por <strong>Zacarias Ortega</strong> para el Proyecto Construcción Hospital de Segundo Nivel Isaias - Oruro
        </div>
        
        {showLogin && <LoginModal onClose={() => setShowLogin(false)} onLoginSuccess={(u) => setUser(u)} />}
      </div>
    </div>
  );
}