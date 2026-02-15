import React, { useState, useEffect, useRef } from 'react';
import { 
  Send, User, Bot, RefreshCw, Settings, MessageSquare, BookOpen,
  ChevronRight, Search, CheckCircle, HelpCircle, ShieldCheck,
  LogIn, LogOut, Zap, Star, Clock, Cpu, Globe, ArrowRight,
  LayoutDashboard, CreditCard, Lock, X, Mail, Key, UserPlus, MapPin,
  Phone, ShieldCheck as Shield, ArrowLeft, Camera, Edit3, Save, Image as ImageIcon,
  Bell, Globe2, Languages, Trash2, CreditCard as CardIcon, Sparkles, Receipt,
  Infinity, Target, Rocket, Smartphone, ShieldAlert, Wand2, Lightbulb,
  Volume2, BellRing, EyeOff, SmartphoneNfc, AppWindow, Calendar, Hash,
  AlertCircle, Info, Check
} from 'lucide-react';
import { initializeApp } from 'firebase/app';
import { 
  getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged, signOut, 
  updateProfile, createUserWithEmailAndPassword, signInWithEmailAndPassword
} from 'firebase/auth';
import { 
  getFirestore, doc, setDoc, getDoc, onSnapshot, collection, addDoc, serverTimestamp, query, orderBy, updateDoc, deleteDoc
} from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyAby3rLUCl_UO3Gga_PEPacRJBjiBGtFiQ",
  authDomain: "support-pro-4ab2d.firebaseapp.com",
  projectId: "support-pro-4ab2d",
  storageBucket: "support-pro-4ab2d.firebasestorage.app",
  messagingSenderId: "272552424117",
  appId: "1:272552424117:web:0b2ead9502ef39cf8e04fc",
  measurementId: "G-JM9GLW7GMX"
}

const GEMINI_API_KEY = ""; 
const MODEL_NAME = "gemini-2.5-flash-preview-09-2025";

// Initialize Services safely
const isConfigValid = firebaseConfig.apiKey !== "AIzaSyAby3rLUCl_UO3Gga_PEPacRJBjiBGtFiQ";
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = '1:272552424117:web:0b2ead9502ef39cf8e04fc'; 

const App = () => {
  // Core State
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState({ 
    tier: 'free', 
    notifications: true, 
    emailNotifications: true,
    pushNotifications: true,
    marketingNotifications: false,
    language: 'English', 
    region: 'United States',
    phone: '',
    displayName: '',
    bio: '',
    location: '',
    photoURL: '',
    bannerURL: '',
    email: '',
    isPhoneVerified: false
  });
  
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [activeTab, setActiveTab] = useState("dashboard");
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState('login'); 
  const [authStep, setAuthStep] = useState(1); 
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isGeneratingProfile, setIsGeneratingProfile] = useState(false);
  
  // Billing States
  const [showCheckout, setShowCheckout] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [paymentForm, setPaymentForm] = useState({
    cardNumber: '',
    expiry: '',
    cvv: ''
  });

  // Notification States
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const notificationRef = useRef(null);

  // Refs for Image Upload
  const messagesEndRef = useRef(null);
  const profileInputRef = useRef(null);
  const bannerInputRef = useRef(null);

  // Auth Form State
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Settings Sub-tabs
  const [settingsTab, setSettingsTab] = useState('profile');

  // Initialize Auth
  useEffect(() => {
    const initAuth = async () => {
      if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
        await signInWithCustomToken(auth, __initial_auth_token);
      } else {
        await signInAnonymously(auth);
      }
    };
    initAuth();
    const unsubscribe = onAuthStateChanged(auth, setUser);
    return () => unsubscribe();
  }, []);

  // Fetch Profile, Messages, and Notifications
  useEffect(() => {
    if (!user) return;
    
    const profileRef = doc(db, 'artifacts', appId, 'users', user.uid, 'profile', 'settings');
    const unsubProfile = onSnapshot(profileRef, (snap) => {
      if (snap.exists()) {
        setUserProfile(prev => ({ ...prev, ...snap.data(), email: user.email }));
      } else {
        const initialData = { 
          tier: 'free', 
          notifications: true, 
          emailNotifications: true,
          pushNotifications: true,
          marketingNotifications: false,
          language: 'English', 
          region: 'United States',
          phone: user.phoneNumber || '',
          displayName: user.displayName || 'Guest User',
          photoURL: user.photoURL || '',
          bannerURL: '',
          bio: 'Welcome to my workspace.',
          location: 'Global',
          isPhoneVerified: false
        };
        setDoc(profileRef, initialData);
      }
    }, (err) => console.error("Profile Error:", err));

    const msgCol = collection(db, 'artifacts', appId, 'users', user.uid, 'messages');
    const unsubMsgs = onSnapshot(msgCol, (snapshot) => {
      const loadedMsgs = snapshot.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .sort((a, b) => (a.createdAt?.seconds || 0) - (b.createdAt?.seconds || 0));
      setMessages(loadedMsgs);
    }, (err) => console.error("Chat Error:", err));

    const notifyCol = collection(db, 'artifacts', appId, 'users', user.uid, 'notifications');
    const unsubNotify = onSnapshot(notifyCol, (snapshot) => {
      const loadedNotify = snapshot.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
      setNotifications(loadedNotify);
      
      // If we have 0 notifications, seed some mock data for demo
      if (snapshot.empty) {
        addDoc(notifyCol, {
          title: "Welcome to Pro Studio",
          message: "Explore your new AI workspace and customize your profile.",
          type: "info",
          read: false,
          createdAt: serverTimestamp()
        });
      }
    }, (err) => console.error("Notification Error:", err));

    return () => {
      unsubProfile();
      unsubMsgs();
      unsubNotify();
    };
  }, [user]);

  // Close notifications on click outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (notificationRef.current && !notificationRef.current.contains(event.target)) {
        setShowNotifications(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  // Image Upload Logic
  const handleImageUpload = (e, type) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64String = reader.result;
      try {
        const profileRef = doc(db, 'artifacts', appId, 'users', user.uid, 'profile', 'settings');
        const updateKey = type === 'profile' ? 'photoURL' : 'bannerURL';
        await updateDoc(profileRef, { [updateKey]: base64String });
      } catch (err) {
        console.error("Image upload failed", err);
      }
    };
    reader.readAsDataURL(file);
  };

  // Generic Update for Settings
  const updateSystemPreference = async (key, value) => {
    if (!user) return;
    try {
      const profileRef = doc(db, 'artifacts', appId, 'users', user.uid, 'profile', 'settings');
      await updateDoc(profileRef, { [key]: value });
    } catch (err) {
      console.error("Update preference failed", err);
    }
  };

  // Notification actions
  const markNotificationRead = async (id) => {
    if (!user) return;
    const ref = doc(db, 'artifacts', appId, 'users', user.uid, 'notifications', id);
    await updateDoc(ref, { read: true });
  };

  const clearAllNotifications = async () => {
    if (!user) return;
    notifications.forEach(async (n) => {
      const ref = doc(db, 'artifacts', appId, 'users', user.uid, 'notifications', n.id);
      await deleteDoc(ref);
    });
  };

  // ✨ Gemini Feature: AI Profile Generator
  const generateAIProfile = async () => {
    setIsGeneratingProfile(true);
    try {
      const prompt = `Based on a user located in ${userProfile.location || 'somewhere in the world'} with a current bio of "${userProfile.bio}", generate a professional name and a creative 2-sentence bio that reflects a ${userProfile.tier} member of a Customer Support Pro platform. Return in JSON: { "displayName": "string", "bio": "string" }`;
      
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL_NAME}:generateContent?key=${API_KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { responseMimeType: "application/json" }
        })
      });
      
      const data = await response.json();
      const result = JSON.parse(data.candidates[0].content.parts[0].text);
      setUserProfile(prev => ({ ...prev, ...result }));
    } catch (err) {
      console.error("AI Generation failed", err);
    } finally {
      setIsGeneratingProfile(false);
    }
  };

  // ✨ Gemini Feature: Smart Reply Suggestion
  const generateReplySuggestion = async () => {
    if (messages.length === 0) return;
    const lastMsg = messages[messages.length - 1];
    if (lastMsg.role === 'user') return;

    setInput("✨ Analyzing context...");
    try {
      const prompt = `The AI assistant just said: "${lastMsg.content}". What would be a helpful follow-up question or response from the user? Provide only the text for the reply.`;
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL_NAME}:generateContent?key=${API_KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }]
        })
      });
      const data = await response.json();
      const suggestion = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
      setInput(suggestion.trim().replace(/^"|"$/g, ''));
    } catch (e) {
      setInput("");
    }
  };

  // Auth Handlers
  const handleAuth = async (e) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);
    try {
      if (authMode === 'register' && authStep === 1) {
        const cred = await createUserWithEmailAndPassword(auth, email, password);
        await updateProfile(cred.user, { displayName: email.split('@')[0] });
        setAuthStep(2); 
      } else if (authMode === 'register' && authStep === 2) {
        if (verificationCode === "123456") {
          const profileRef = doc(db, 'artifacts', appId, 'users', user.uid, 'profile', 'settings');
          await updateDoc(profileRef, { 
            phone: phone,
            isPhoneVerified: true 
          });
          setShowAuthModal(false);
          setAuthStep(1);
        } else {
          setError("Invalid verification code. Use 123456 for demo.");
        }
      } else {
        await signInWithEmailAndPassword(auth, email, password);
        setShowAuthModal(false);
      }
    } catch (err) {
      setError(err.message.replace("Firebase: ", ""));
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
    window.location.reload();
  };

  // Billing Handlers
  const handleStartCheckout = (plan) => {
    setSelectedPlan(plan);
    setShowCheckout(true);
  };

  const handlePaymentInput = (field, val) => {
    let formatted = val;
    if (field === 'cardNumber') {
      formatted = val.replace(/\s?/g, '').replace(/(\d{4})/g, '$1 ').trim().slice(0, 19);
    } else if (field === 'expiry') {
      formatted = val.replace(/\//g, '').replace(/(\d{2})/g, '$1/').trim().slice(0, 5);
      if (formatted.endsWith('/')) formatted = formatted.slice(0, -1);
    } else if (field === 'cvv') {
      formatted = val.replace(/\D/g, '').slice(0, 3);
    }
    setPaymentForm(prev => ({ ...prev, [field]: formatted }));
  };

  const processPayment = async (e) => {
    e.preventDefault();
    if (!paymentForm.cardNumber || !paymentForm.expiry || !paymentForm.cvv) return;
    
    setIsProcessingPayment(true);
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    if (user) {
      const profileRef = doc(db, 'artifacts', appId, 'users', user.uid, 'profile', 'settings');
      await updateDoc(profileRef, { tier: selectedPlan.id });
      
      const notifyCol = collection(db, 'artifacts', appId, 'users', user.uid, 'notifications');
      await addDoc(notifyCol, {
        title: "Account Upgraded",
        message: `You are now a ${selectedPlan.name}. Full access enabled.`,
        type: "success",
        read: false,
        createdAt: serverTimestamp()
      });

      const msgCol = collection(db, 'artifacts', appId, 'users', user.uid, 'messages');
      await addDoc(msgCol, {
        role: 'assistant',
        content: `Congratulations! Your workspace has been upgraded to the ${selectedPlan.name} plan. You now have full access to all premium features.`,
        createdAt: serverTimestamp(),
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      });
    }
    
    setIsProcessingPayment(false);
    setShowCheckout(false);
    setActiveTab('dashboard');
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    if (!user) return;
    setIsSavingProfile(true);
    try {
      const profileRef = doc(db, 'artifacts', appId, 'users', user.uid, 'profile', 'settings');
      await updateDoc(profileRef, {
        displayName: userProfile.displayName,
        bio: userProfile.bio,
        location: userProfile.location,
        phone: userProfile.phone
      });
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!input.trim() || isTyping || !user) return;
    const userText = input;
    setInput("");
    setIsTyping(true);
    const msgCol = collection(db, 'artifacts', appId, 'users', user.uid, 'messages');
    try {
      await addDoc(msgCol, {
        role: 'user',
        content: userText,
        createdAt: serverTimestamp(),
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      });

      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL_NAME}:generateContent?key=${API_KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: userText }] }],
          systemInstruction: { parts: [{ text: `You are Customer Support Pro. User Tier: ${userProfile.tier}. Verification Status: ${userProfile.isPhoneVerified ? 'Verified' : 'Unverified'}. Provide highly technical and helpful advice.` }] }
        })
      });
      const data = await response.json();
      const aiText = data.candidates?.[0]?.content?.parts?.[0]?.text || "I'm having trouble connecting to my brain. Please try again.";
      
      await addDoc(msgCol, {
        role: 'assistant',
        content: aiText,
        createdAt: serverTimestamp(),
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      });
    } finally {
      setIsTyping(false);
    }
  };

  const Toggle = ({ active, onToggle, label, description, icon: Icon }) => (
    <div className="flex items-center justify-between p-6 bg-slate-50 dark:bg-slate-800/50 rounded-[24px] border border-slate-100 dark:border-slate-800 transition-all hover:bg-slate-100 dark:hover:bg-slate-800">
      <div className="flex items-center gap-4">
        {Icon && <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${active ? 'bg-indigo-600 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-500'}`}><Icon size={20}/></div>}
        <div>
          <p className="font-black text-sm">{label}</p>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{description}</p>
        </div>
      </div>
      <button 
        onClick={onToggle}
        className={`w-12 h-6 rounded-full relative transition-all duration-300 ${active ? 'bg-indigo-600 shadow-lg shadow-indigo-200 dark:shadow-none' : 'bg-slate-300 dark:bg-slate-700'}`}
      >
        <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all duration-300 ${active ? 'left-7' : 'left-1'}`}></div>
      </button>
    </div>
  );

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <div className="flex h-screen bg-[#f8fafc] dark:bg-slate-950 text-slate-900 dark:text-white overflow-hidden font-sans">
      {/* Hidden File Inputs */}
      <input type="file" ref={profileInputRef} onChange={(e) => handleImageUpload(e, 'profile')} accept="image/*" className="hidden" />
      <input type="file" ref={bannerInputRef} onChange={(e) => handleImageUpload(e, 'banner')} accept="image/*" className="hidden" />

      {/* Sidebar Navigation */}
      <aside className="w-72 border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col shrink-0">
        <div className="p-8 flex items-center gap-4">
          <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg">
            <Bot size={24} />
          </div>
          <div>
            <h1 className="font-black text-lg tracking-tight">Pro Studio</h1>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Enterprise v2.6</p>
          </div>
        </div>
        
        <nav className="flex-1 px-4 space-y-1">
          {[
            { id: 'dashboard', icon: LayoutDashboard, label: 'Workspace' },
            { id: 'chat', icon: MessageSquare, label: 'AI Intelligence' },
            { id: 'billing', icon: CreditCard, label: 'Billing & Plans' },
            { id: 'settings', icon: Settings, label: 'System Settings' }
          ].map(item => (
            <button 
              key={item.id}
              onClick={() => setActiveTab(item.id)} 
              className={`w-full flex items-center gap-4 p-4 rounded-2xl transition-all ${activeTab === item.id ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 font-bold' : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
            >
              <item.icon size={20} />
              <span className="text-sm">{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="p-6 mt-auto border-t border-slate-100 dark:border-slate-800">
          <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden shrink-0">
              {userProfile.photoURL ? <img src={userProfile.photoURL} className="w-full h-full object-cover" /> : <User size={20} className="m-2.5 text-slate-400" />}
            </div>
            <div className="overflow-hidden">
              <p className="text-xs font-black truncate">{userProfile.displayName || 'Guest User'}</p>
              <div className="flex items-center gap-1">
                {userProfile.tier !== 'free' && <Zap size={8} className="fill-indigo-500 text-indigo-500"/>}
                <span className="text-[9px] font-black text-indigo-500 uppercase">{userProfile.tier} access</span>
              </div>
            </div>
          </div>
          {user?.isAnonymous ? (
            <button onClick={() => { setAuthMode('login'); setAuthStep(1); setShowAuthModal(true); }} className="w-full py-3 text-xs font-black bg-slate-900 dark:bg-white text-white dark:text-black rounded-xl hover:opacity-90 transition-all flex items-center justify-center gap-2">
              <LogIn size={14}/> Sign In / Register
            </button>
          ) : (
            <button onClick={handleLogout} className="w-full py-3 text-xs font-black text-red-500 bg-red-50 dark:bg-red-900/10 rounded-xl hover:bg-red-100 transition-all flex items-center justify-center gap-2">
              <LogOut size={14}/> Terminate Session
            </button>
          )}
        </div>
      </aside>

      {/* Main Panel */}
      <main className="flex-1 flex flex-col overflow-hidden relative">
        <header className="h-20 border-b border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 backdrop-blur-md px-10 flex items-center justify-between z-10">
          <div className="flex items-center gap-4">
            <h2 className="text-xl font-black tracking-tight capitalize">{activeTab.replace('-', ' ')}</h2>
            {!userProfile.isPhoneVerified && !user?.isAnonymous && (
              <span className="flex items-center gap-1.5 px-3 py-1 bg-amber-50 dark:bg-amber-900/20 text-amber-600 text-[10px] font-black rounded-full uppercase tracking-tighter border border-amber-100 dark:border-amber-800">
                <ShieldAlert size={12}/> Unverified Phone
              </span>
            )}
          </div>
          <div className="flex gap-3 relative">
             {userProfile.tier === 'free' && (
               <button onClick={() => setActiveTab('billing')} className="px-4 py-2 bg-indigo-50 text-indigo-600 dark:bg-indigo-900/20 dark:text-indigo-400 text-[10px] font-black uppercase tracking-widest rounded-lg flex items-center gap-2 hover:bg-indigo-100 transition-all">
                 <Sparkles size={14}/> Upgrade Now
               </button>
             )}
             
             {/* Notification Trigger */}
             <button 
              onClick={() => setShowNotifications(!showNotifications)}
              className={`w-10 h-10 rounded-full flex items-center justify-center transition-all relative ${showNotifications ? 'bg-indigo-600 text-white shadow-lg' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-slate-200'}`}
             >
               <Bell size={18}/>
               {unreadCount > 0 && (
                 <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 bg-red-500 text-white text-[9px] font-black rounded-full border-2 border-white dark:border-slate-900 flex items-center justify-center animate-bounce">
                    {unreadCount}
                 </span>
               )}
             </button>

             {/* Notifications Flyout */}
             {showNotifications && (
               <div ref={notificationRef} className="absolute top-14 right-0 w-80 max-h-[480px] bg-white dark:bg-slate-900 rounded-[32px] shadow-2xl border border-slate-100 dark:border-slate-800 flex flex-col overflow-hidden animate-in fade-in slide-in-from-top-2 z-50">
                  <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/50">
                    <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-500">Notifications</h4>
                    {notifications.length > 0 && (
                      <button onClick={clearAllNotifications} className="text-[9px] font-black text-indigo-600 dark:text-indigo-400 hover:underline uppercase tracking-tighter">Clear All</button>
                    )}
                  </div>
                  <div className="flex-1 overflow-y-auto">
                    {notifications.length === 0 ? (
                      <div className="p-10 text-center space-y-3 opacity-30">
                        <BellRing size={32} className="mx-auto" />
                        <p className="text-[10px] font-black uppercase tracking-widest">No new alerts</p>
                      </div>
                    ) : (
                      <div className="divide-y divide-slate-50 dark:divide-slate-800/50">
                        {notifications.map(n => (
                          <div 
                            key={n.id} 
                            onClick={() => markNotificationRead(n.id)}
                            className={`p-5 flex gap-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer relative group ${!n.read ? 'bg-indigo-50/30 dark:bg-indigo-900/10' : ''}`}
                          >
                            <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                              n.type === 'success' ? 'bg-emerald-100 text-emerald-600' : 
                              n.type === 'error' ? 'bg-red-100 text-red-600' : 
                              'bg-indigo-100 text-indigo-600'
                            }`}>
                              {n.type === 'success' ? <Check size={16}/> : n.type === 'error' ? <AlertCircle size={16}/> : <Info size={16}/>}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-black tracking-tight leading-none mb-1">{n.title}</p>
                              <p className="text-[10px] text-slate-500 font-medium line-clamp-2 leading-normal">{n.message}</p>
                              <p className="text-[8px] font-bold text-slate-400 mt-2 uppercase tracking-tighter">
                                {n.createdAt?.seconds ? new Date(n.createdAt.seconds * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Just now'}
                              </p>
                            </div>
                            {!n.read && <div className="w-2 h-2 bg-indigo-600 rounded-full mt-1.5 shrink-0"></div>}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-800 text-center">
                    <button onClick={() => setShowNotifications(false)} className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 hover:text-indigo-600 transition-colors">Dismiss Center</button>
                  </div>
               </div>
             )}
          </div>
        </header>

        <div className="flex-1 overflow-y-auto">
          {activeTab === 'dashboard' ? (
            <div className="p-10 max-w-6xl mx-auto space-y-10 animate-in fade-in slide-in-from-bottom-4">
              <div className="bg-white dark:bg-slate-900 rounded-[32px] overflow-hidden border border-slate-200 dark:border-slate-800 shadow-sm">
                <div 
                  className="h-56 bg-slate-200 dark:bg-slate-800 relative group cursor-pointer"
                  onClick={() => bannerInputRef.current?.click()}
                >
                  {userProfile.bannerURL ? (
                    <img src={userProfile.bannerURL} className="w-full h-full object-cover transition-opacity group-hover:opacity-80" />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-indigo-500 to-purple-600 opacity-80"></div>
                  )}
                  <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <div className="bg-white/20 backdrop-blur-md p-3 rounded-full text-white"><Camera size={20}/></div>
                  </div>
                </div>
                <div className="px-10 pb-10">
                  <div className="flex flex-col md:flex-row items-end gap-6 -mt-14 relative z-20">
                    <div 
                      className="w-32 h-32 rounded-[40px] bg-white dark:bg-slate-900 p-1.5 shadow-2xl overflow-hidden cursor-pointer relative group"
                      onClick={() => profileInputRef.current?.click()}
                    >
                       <div className="w-full h-full rounded-[34px] bg-slate-100 dark:bg-slate-800 flex items-center justify-center overflow-hidden">
                          {userProfile.photoURL ? <img src={userProfile.photoURL} className="w-full h-full object-cover" /> : <User size={48} className="text-slate-300" />}
                       </div>
                       <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <Camera size={24} className="text-white"/>
                       </div>
                    </div>
                    <div className="flex-1 pb-2">
                      <h3 className="text-3xl font-black tracking-tighter">{userProfile.displayName || 'Anonymous User'}</h3>
                      <div className="flex items-center gap-4 mt-1">
                        <span className="text-sm font-bold text-slate-400 flex items-center gap-1"><MapPin size={14}/> {userProfile.location || 'Global'}</span>
                        <span className="text-sm font-bold text-indigo-500 flex items-center gap-1"><Shield size={14}/> {userProfile.tier.toUpperCase()} MEMBER</span>
                      </div>
                    </div>
                    <button onClick={() => setActiveTab('settings')} className="bg-slate-100 dark:bg-slate-800 px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center gap-2 hover:bg-slate-200 transition-all mb-2">
                       <Edit3 size={16}/> Edit Profile
                    </button>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                 {[
                   { label: 'AI Sessions', value: '24', icon: MessageSquare, color: 'text-indigo-500' },
                   { label: 'Cloud Data', value: '1.2GB', icon: Cpu, color: 'text-purple-500' },
                   { label: 'Active Projects', value: '8', icon: Rocket, color: 'text-emerald-500' }
                 ].map(stat => (
                   <div key={stat.label} className="bg-white dark:bg-slate-900 p-8 rounded-[32px] border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
                      <div>
                        <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">{stat.label}</p>
                        <p className="text-3xl font-black tracking-tighter">{stat.value}</p>
                      </div>
                      <stat.icon className={stat.color} size={32}/>
                   </div>
                 ))}
              </div>
            </div>
          ) : activeTab === 'billing' ? (
            <div className="p-10 max-w-6xl mx-auto animate-in fade-in duration-500">
               <div className="text-center mb-12">
                  <h3 className="text-4xl font-black tracking-tighter mb-4">Select Subscription Plan</h3>
                  <p className="text-slate-500 font-bold uppercase text-[10px] tracking-[0.2em]">Scale your productivity with enterprise AI</p>
               </div>

               <div className="grid md:grid-cols-3 gap-8">
                  <div className={`p-8 rounded-[40px] border-2 bg-white dark:bg-slate-900 transition-all ${userProfile.tier === 'free' ? 'border-indigo-500 shadow-xl' : 'border-slate-100 dark:border-slate-800'}`}>
                     <div className="w-12 h-12 bg-slate-100 dark:bg-slate-800 rounded-2xl flex items-center justify-center text-slate-500 mb-6"><Target size={24}/></div>
                     <h4 className="text-xl font-black mb-2">Basic Tier</h4>
                     <p className="text-slate-400 text-xs font-bold uppercase mb-6">Standard Access</p>
                     <div className="text-4xl font-black tracking-tighter mb-8">$0<span className="text-sm text-slate-400 font-bold ml-1">/mo</span></div>
                     <ul className="space-y-4 mb-10">
                        {['100 AI Messages/mo', 'Single Workspace', 'Community Support', 'Basic Profile Customization'].map(f => (
                          <li key={f} className="flex items-center gap-3 text-sm font-bold text-slate-600 dark:text-slate-400"><CheckCircle size={16} className="text-slate-300"/> {f}</li>
                        ))}
                     </ul>
                     <button disabled className="w-full py-4 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 font-black text-xs uppercase tracking-widest cursor-not-allowed">
                        {userProfile.tier === 'free' ? 'Current Plan' : 'Standard Tier'}
                     </button>
                  </div>

                  <div className={`p-8 rounded-[40px] border-2 relative bg-white dark:bg-slate-900 transition-all scale-105 ${userProfile.tier === 'pro' ? 'border-indigo-500 shadow-xl' : 'border-indigo-500 shadow-2xl shadow-indigo-100 dark:shadow-none'}`}>
                     <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-indigo-600 text-white px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest">Recommended</div>
                     <div className="w-12 h-12 bg-indigo-100 dark:bg-indigo-900/40 rounded-2xl flex items-center justify-center text-indigo-600 mb-6"><Rocket size={24}/></div>
                     <h4 className="text-xl font-black mb-2">Pro Member</h4>
                     <p className="text-indigo-500 text-xs font-bold uppercase mb-6">Power User</p>
                     <div className="text-4xl font-black tracking-tighter mb-8">$19<span className="text-sm text-slate-400 font-bold ml-1">/mo</span></div>
                     <ul className="space-y-4 mb-10">
                        {['Unlimited AI Intelligence', 'Custom AI Personas', 'Priority Data Fetching', 'Custom Headers & Banners'].map(f => (
                          <li key={f} className="flex items-center gap-3 text-sm font-bold"><CheckCircle size={16} className="text-indigo-500"/> {f}</li>
                        ))}
                     </ul>
                     <button 
                        onClick={() => handleStartCheckout({ id: 'pro', name: 'Pro Member', price: '$19' })}
                        className={`w-full py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all ${userProfile.tier === 'pro' ? 'bg-indigo-100 text-indigo-600 cursor-default shadow-none' : 'bg-indigo-600 text-white hover:bg-indigo-700 active:scale-95 shadow-lg shadow-indigo-200'}`}
                      >
                        {userProfile.tier === 'pro' ? 'Active Subscription' : 'Upgrade to Pro'}
                     </button>
                  </div>

                  <div className={`p-8 rounded-[40px] border-2 bg-white dark:bg-slate-900 transition-all ${userProfile.tier === 'ultimate' ? 'border-purple-500 shadow-xl' : 'border-slate-100 dark:border-slate-800'}`}>
                     <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/40 rounded-2xl flex items-center justify-center text-purple-600 mb-6"><Infinity size={24}/></div>
                     <h4 className="text-xl font-black mb-2">Ultimate AI</h4>
                     <p className="text-purple-500 text-xs font-bold uppercase mb-6">Enterprise Scaling</p>
                     <div className="text-4xl font-black tracking-tighter mb-8">$49<span className="text-sm text-slate-400 font-bold ml-1">/mo</span></div>
                     <ul className="space-y-4 mb-10">
                        {['Private AI Models', 'Advanced Analytics', '24/7 Support', 'Full API Access'].map(f => (
                          <li key={f} className="flex items-center gap-3 text-sm font-bold"><CheckCircle size={16} className="text-purple-500"/> {f}</li>
                        ))}
                     </ul>
                     <button 
                        onClick={() => handleStartCheckout({ id: 'ultimate', name: 'Ultimate AI', price: '$49' })}
                        className={`w-full py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all ${userProfile.tier === 'ultimate' ? 'bg-purple-100 text-purple-600 cursor-default' : 'bg-slate-900 dark:bg-white text-white dark:text-black hover:opacity-90 active:scale-95'}`}
                      >
                        {userProfile.tier === 'ultimate' ? 'Active Plan' : 'Go Ultimate'}
                     </button>
                  </div>
               </div>
            </div>
          ) : activeTab === 'chat' ? (
            <div className="flex-1 flex flex-col bg-white dark:bg-slate-900 m-8 rounded-[40px] overflow-hidden shadow-xl border border-slate-200 dark:border-slate-800 h-[calc(100vh-140px)]">
              <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/50">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-2xl bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center text-indigo-600"><Bot size={22} /></div>
                  <div>
                    <span className="font-black text-sm block tracking-tight">AI Intelligence Engine</span>
                    <span className="text-[10px] font-bold text-indigo-500 uppercase tracking-widest">Tier: {userProfile.tier} logic active</span>
                  </div>
                </div>
                <button 
                  onClick={generateReplySuggestion}
                  className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-50 transition-all active:scale-95"
                >
                  <Lightbulb size={14} className="text-amber-500"/> ✨ AI Suggestion
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-8 space-y-6">
                {messages.length === 0 && (
                   <div className="h-full flex flex-col items-center justify-center opacity-20 text-center space-y-4">
                      <Bot size={64}/>
                      <p className="font-black uppercase tracking-[0.2em] text-xs">Start a conversation with your AI workspace</p>
                   </div>
                )}
                {messages.map(m => (
                  <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[75%] p-6 rounded-[32px] ${m.role === 'user' ? 'bg-indigo-600 text-white rounded-tr-none shadow-lg' : 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-100 rounded-tl-none'}`}>
                      <p className="text-sm font-medium leading-relaxed">{m.content}</p>
                      <span className="text-[9px] opacity-40 block mt-3 font-black uppercase tracking-widest">{m.timestamp}</span>
                    </div>
                  </div>
                ))}
                {isTyping && <div className="bg-slate-100 dark:bg-slate-800 px-6 py-3 rounded-full animate-pulse text-[10px] font-black opacity-50 uppercase tracking-widest w-fit">AI is generating logic...</div>}
                <div ref={messagesEndRef} />
              </div>
              <form onSubmit={handleSendMessage} className="p-6 bg-slate-50/50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-800 flex gap-4">
                <input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Type your query..." className="flex-1 p-4 bg-white dark:bg-slate-900 border-none rounded-2xl shadow-sm focus:ring-2 focus:ring-indigo-500 font-bold text-sm" />
                <button disabled={!input.trim()} className="w-14 h-14 bg-indigo-600 text-white rounded-2xl flex items-center justify-center hover:bg-indigo-700 disabled:opacity-50 transition-all active:scale-95"><Send size={22} /></button>
              </form>
            </div>
          ) : activeTab === 'settings' ? (
            <div className="p-10 max-w-5xl mx-auto animate-in fade-in slide-in-from-bottom-4">
               <div className="bg-white dark:bg-slate-900 rounded-[40px] border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row overflow-hidden min-h-[600px]">
                  {/* Settings Sidebar */}
                  <div className="w-full md:w-64 border-r border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 p-6 space-y-2">
                     <h4 className="px-4 text-[10px] font-black uppercase tracking-widest text-slate-400 mb-6">System Config</h4>
                     {[
                       { id: 'profile', label: 'User Profile', icon: User },
                       { id: 'security', label: 'Security', icon: Lock },
                       { id: 'notifications', label: 'Alert Center', icon: Bell },
                       { id: 'language', label: 'Localization', icon: Globe2 }
                     ].map(item => (
                       <button 
                         key={item.id} 
                         onClick={() => setSettingsTab(item.id)}
                         className={`w-full flex items-center gap-3 p-4 rounded-2xl text-xs font-black uppercase tracking-widest transition-all ${settingsTab === item.id ? 'bg-white dark:bg-slate-800 text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                       >
                         <item.icon size={16}/>
                         {item.label}
                       </button>
                     ))}
                  </div>

                  {/* Settings Content */}
                  <div className="flex-1 p-10">
                     {settingsTab === 'profile' ? (
                        <div className="animate-in fade-in duration-300">
                           <div className="flex items-center justify-between mb-8">
                             <h3 className="text-2xl font-black tracking-tighter">Identity & Profile</h3>
                             <button 
                               onClick={generateAIProfile}
                               disabled={isGeneratingProfile}
                               className="flex items-center gap-2 px-4 py-2 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-100 transition-all disabled:opacity-50"
                             >
                               {isGeneratingProfile ? <RefreshCw className="animate-spin" size={14}/> : <Wand2 size={14}/>} 
                               ✨ AI Sync Identity
                             </button>
                           </div>
                           <form onSubmit={handleUpdateProfile} className="space-y-6">
                              <div className="grid grid-cols-2 gap-6">
                                 <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Full Name</label>
                                    <input type="text" value={userProfile.displayName} onChange={(e) => setUserProfile({...userProfile, displayName: e.target.value})} className="w-full p-4 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl font-black focus:ring-2 focus:ring-indigo-500" />
                                 </div>
                                 <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Location</label>
                                    <input type="text" value={userProfile.location} onChange={(e) => setUserProfile({...userProfile, location: e.target.value})} className="w-full p-4 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl font-black focus:ring-2 focus:ring-indigo-500" />
                                 </div>
                              </div>
                              <div className="space-y-2">
                                 <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Bio / Status</label>
                                 <textarea value={userProfile.bio} onChange={(e) => setUserProfile({...userProfile, bio: e.target.value})} className="w-full p-4 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl font-black h-24 focus:ring-2 focus:ring-indigo-500 resize-none" />
                              </div>
                              <button type="submit" disabled={isSavingProfile} className="px-8 py-4 bg-indigo-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-indigo-700 transition-all flex items-center gap-2">
                                 {isSavingProfile ? <RefreshCw className="animate-spin" size={16}/> : <Save size={16}/>}
                                 Synchronize Profile
                              </button>
                           </form>
                        </div>
                     ) : settingsTab === 'security' ? (
                        <div className="animate-in fade-in duration-300 space-y-8">
                           <h3 className="text-2xl font-black tracking-tighter">Security Protocol</h3>
                           <div className="bg-slate-50 dark:bg-slate-800/50 p-6 rounded-3xl border border-slate-100 dark:border-slate-800 flex items-center justify-between">
                              <div className="flex items-center gap-4">
                                 <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 rounded-2xl flex items-center justify-center"><Phone size={24}/></div>
                                 <div>
                                    <p className="font-black text-sm">Phone Verification</p>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{userProfile.isPhoneVerified ? 'Status: Authenticated' : 'Status: Action Required'}</p>
                                 </div>
                              </div>
                              {!userProfile.isPhoneVerified && (
                                <button onClick={() => { setAuthMode('register'); setAuthStep(2); setShowAuthModal(true); }} className="px-6 py-2 bg-indigo-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest">Verify Now</button>
                              )}
                           </div>
                           <div className="bg-slate-50 dark:bg-slate-800/50 p-6 rounded-3xl border border-slate-100 dark:border-slate-800 flex items-center justify-between">
                              <div className="flex items-center gap-4">
                                 <div className="w-12 h-12 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 rounded-2xl flex items-center justify-center"><ShieldCheck size={24}/></div>
                                 <div>
                                    <p className="font-black text-sm">Two-Factor Auth</p>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Enhanced account protection</p>
                                 </div>
                              </div>
                              <div className="w-12 h-6 bg-slate-200 dark:bg-slate-700 rounded-full relative cursor-pointer opacity-50"><div className="absolute left-1 top-1 w-4 h-4 bg-white rounded-full"></div></div>
                           </div>
                        </div>
                     ) : settingsTab === 'notifications' ? (
                        <div className="animate-in fade-in duration-300 space-y-8">
                           <div>
                             <h3 className="text-2xl font-black tracking-tighter mb-2">Alert Center</h3>
                             <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Configure how you receive intelligence updates</p>
                           </div>

                           <div className="space-y-4">
                             <Toggle 
                               label="System Alerts" 
                               description="Critical infrastructure updates" 
                               active={userProfile.notifications} 
                               icon={BellRing}
                               onToggle={() => updateSystemPreference('notifications', !userProfile.notifications)}
                             />
                             <Toggle 
                               label="Email Intelligence" 
                               description="Daily workspace summaries" 
                               active={userProfile.emailNotifications} 
                               icon={Mail}
                               onToggle={() => updateSystemPreference('emailNotifications', !userProfile.emailNotifications)}
                             />
                             <Toggle 
                               label="Push Transmissions" 
                               description="Real-time browser notifications" 
                               active={userProfile.pushNotifications} 
                               icon={AppWindow}
                               onToggle={() => updateSystemPreference('pushNotifications', !userProfile.pushNotifications)}
                             />
                             <Toggle 
                               label="Marketing Intel" 
                               description="New feature announcements" 
                               active={userProfile.marketingNotifications} 
                               icon={Zap}
                               onToggle={() => updateSystemPreference('marketingNotifications', !userProfile.marketingNotifications)}
                             />
                           </div>
                        </div>
                     ) : settingsTab === 'language' ? (
                        <div className="animate-in fade-in duration-300 space-y-8">
                           <div>
                             <h3 className="text-2xl font-black tracking-tighter mb-2">Localization</h3>
                             <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">System-wide language and regional settings</p>
                           </div>

                           <div className="grid grid-cols-2 gap-4">
                              {[
                                { id: 'English', label: 'English', sub: 'United States' },
                                { id: 'Spanish', label: 'Español', sub: 'España' },
                                { id: 'French', label: 'Français', sub: 'France' },
                                { id: 'German', label: 'Deutsch', sub: 'Deutschland' },
                                { id: 'Japanese', label: '日本語', sub: '日本' },
                                { id: 'Chinese', label: '中文', sub: '中国' }
                              ].map(lang => (
                                <button 
                                  key={lang.id}
                                  onClick={() => updateSystemPreference('language', lang.id)}
                                  className={`p-6 rounded-[32px] border text-left transition-all flex items-center justify-between group ${userProfile.language === lang.id ? 'bg-indigo-600 border-indigo-600 text-white shadow-xl shadow-indigo-100 dark:shadow-none' : 'bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-800 hover:border-indigo-300'}`}
                                >
                                  <div>
                                    <p className="font-black text-lg tracking-tight">{lang.label}</p>
                                    <p className={`text-[10px] font-bold uppercase tracking-widest ${userProfile.language === lang.id ? 'text-indigo-200' : 'text-slate-400'}`}>{lang.sub}</p>
                                  </div>
                                  {userProfile.language === lang.id && <CheckCircle size={20} className="text-white"/>}
                                </button>
                              ))}
                           </div>

                           <div className="bg-indigo-50 dark:bg-indigo-900/20 p-8 rounded-[40px] border border-indigo-100 dark:border-indigo-800 flex items-center gap-6">
                             <div className="w-14 h-14 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shrink-0"><Globe size={28}/></div>
                             <div>
                               <p className="font-black text-sm">Smart Translation Logic</p>
                               <p className="text-[10px] font-bold text-indigo-600/60 dark:text-indigo-400/60 uppercase tracking-widest leading-relaxed">System is currently translating UI components to {userProfile.language} based on your selection.</p>
                             </div>
                           </div>
                        </div>
                     ) : (
                        <div className="h-full flex flex-col items-center justify-center text-center space-y-4 opacity-30">
                           <Globe2 size={48}/>
                           <p className="font-black text-xs uppercase tracking-widest">Modules coming soon in v2.7</p>
                        </div>
                     )}
                  </div>
               </div>
            </div>
          ) : null}
        </div>
      </main>

      {/* Modern Checkout UI with CC Form */}
      {showCheckout && (
        <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-xl z-[100] flex items-center justify-center p-6 animate-in fade-in duration-300">
           <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-[48px] p-10 shadow-2xl relative border border-white/10 overflow-hidden">
              <button onClick={() => setShowCheckout(false)} className="absolute top-8 right-8 p-3 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-all z-10"><X size={20}/></button>
              
              <div className="mb-8 text-center">
                 <div className="w-16 h-16 bg-indigo-600 rounded-[28px] flex items-center justify-center text-white mx-auto mb-4 shadow-xl"><CardIcon size={32}/></div>
                 <h2 className="text-3xl font-black tracking-tighter mb-1">Authorization</h2>
                 <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Confirming {selectedPlan?.name}</p>
              </div>

              <form onSubmit={processPayment} className="space-y-5">
                 <div className="bg-slate-50 dark:bg-slate-800/50 p-5 rounded-3xl border border-slate-100 dark:border-slate-800 flex justify-between items-center mb-2">
                    <p className="font-black text-sm tracking-tight">Monthly Subscription</p>
                    <p className="text-xl font-black text-indigo-600">{selectedPlan?.price}<span className="text-xs opacity-40">.00</span></p>
                 </div>

                 {/* Card Number */}
                 <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Secure Card Number</label>
                    <div className="relative">
                       <input 
                          type="text" 
                          placeholder="0000 0000 0000 0000"
                          value={paymentForm.cardNumber}
                          onChange={(e) => handlePaymentInput('cardNumber', e.target.value)}
                          className="w-full p-5 bg-slate-50 dark:bg-slate-800 border-none rounded-[24px] font-black text-sm focus:ring-2 focus:ring-indigo-500 placeholder:opacity-30" 
                          required
                       />
                       <CreditCard className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-300" size={18}/>
                    </div>
                 </div>

                 <div className="grid grid-cols-2 gap-4">
                    {/* Expiry */}
                    <div className="space-y-2">
                       <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Expiration</label>
                       <div className="relative">
                          <input 
                             type="text" 
                             placeholder="MM/YY"
                             value={paymentForm.expiry}
                             onChange={(e) => handlePaymentInput('expiry', e.target.value)}
                             className="w-full p-5 bg-slate-50 dark:bg-slate-800 border-none rounded-[24px] font-black text-sm focus:ring-2 focus:ring-indigo-500 placeholder:opacity-30" 
                             required
                          />
                          <Calendar className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-300" size={18}/>
                       </div>
                    </div>
                    {/* CVV */}
                    <div className="space-y-2">
                       <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">CVV Security</label>
                       <div className="relative">
                          <input 
                             type="password" 
                             placeholder="000"
                             value={paymentForm.cvv}
                             onChange={(e) => handlePaymentInput('cvv', e.target.value)}
                             className="w-full p-5 bg-slate-50 dark:bg-slate-800 border-none rounded-[24px] font-black text-sm focus:ring-2 focus:ring-indigo-500 placeholder:opacity-30" 
                             required
                          />
                          <Hash className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-300" size={18}/>
                       </div>
                    </div>
                 </div>

                 <div className="flex items-center gap-3 px-4 py-2 opacity-50">
                    <ShieldCheck size={14} className="text-indigo-500"/>
                    <p className="text-[9px] font-bold uppercase tracking-widest">AES-256 Encrypted Transmission Layer</p>
                 </div>

                 <button type="submit" disabled={isProcessingPayment} className="w-full py-5 bg-indigo-600 text-white rounded-[24px] font-black text-sm tracking-widest uppercase shadow-xl hover:bg-indigo-700 active:scale-95 transition-all mt-2 overflow-hidden relative">
                   {isProcessingPayment ? (
                     <div className="flex items-center justify-center gap-2">
                       <RefreshCw className="animate-spin" size={20}/>
                       <span>Authenticating...</span>
                     </div>
                   ) : (
                     <div className="flex items-center justify-center gap-2">
                       <Lock size={16}/>
                       <span>Authorize {selectedPlan?.price}</span>
                     </div>
                   )}
                 </button>
              </form>
           </div>
        </div>
      )}

      {/* Advanced Auth Modal */}
      {showAuthModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xl z-50 flex items-center justify-center p-6 animate-in fade-in duration-300">
          <div className="bg-white dark:bg-slate-900 w-full max-md rounded-[48px] p-10 shadow-2xl relative border border-white/10 animate-in zoom-in-95 duration-300">
            <button onClick={() => { setShowAuthModal(false); setAuthStep(1); }} className="absolute top-8 right-8 p-3 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-all"><X size={20}/></button>
            
            <div className="text-center mb-8">
               <div className="w-16 h-16 bg-indigo-600 rounded-3xl flex items-center justify-center text-white mx-auto mb-6">
                  {authStep === 1 ? (authMode === 'login' ? <LogIn size={32}/> : <UserPlus size={32}/>) : <Smartphone size={32}/>}
               </div>
               <h2 className="text-3xl font-black tracking-tighter mb-2">
                 {authStep === 1 ? (authMode === 'login' ? 'System Access' : 'Create Identity') : 'Verify Device'}
               </h2>
               <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                 {authStep === 1 ? 'Enter your credentials' : 'Enter the 6-digit code sent to your phone'}
               </p>
            </div>

            <form onSubmit={handleAuth} className="space-y-4">
              {authStep === 1 ? (
                <>
                  <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Workspace Email" className="w-full p-5 bg-slate-50 dark:bg-slate-800 border-none rounded-[24px] font-black text-sm focus:ring-2 focus:ring-indigo-500" required />
                  <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Security Key" className="w-full p-5 bg-slate-50 dark:bg-slate-800 border-none rounded-[24px] font-black text-sm focus:ring-2 focus:ring-indigo-500" required />
                  {authMode === 'register' && (
                     <input type="text" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Phone: +1 (555) 000-0000" className="w-full p-5 bg-slate-50 dark:bg-slate-800 border-none rounded-[24px] font-black text-sm focus:ring-2 focus:ring-indigo-500" required />
                  )}
                </>
              ) : (
                <>
                  <input type="text" value={verificationCode} onChange={(e) => setVerificationCode(e.target.value)} placeholder="Verification Code" className="w-full p-6 bg-slate-50 dark:bg-slate-800 border-none rounded-[24px] font-black text-2xl text-center tracking-[0.5em] focus:ring-2 focus:ring-indigo-500" maxLength={6} required />
                  <p className="text-[9px] text-center font-bold text-slate-400 uppercase">Demo code is: 123456</p>
                </>
              )}

              {error && <div className="p-4 bg-red-50 dark:bg-red-900/10 text-red-600 text-xs font-bold rounded-2xl border border-red-100 dark:border-red-900/20">{error}</div>}
              
              <button disabled={isLoading} className="w-full py-5 bg-indigo-600 text-white rounded-[24px] font-black text-sm uppercase tracking-widest shadow-xl hover:bg-indigo-700 active:scale-95 transition-all mt-4">
                {isLoading ? 'Processing...' : (authStep === 1 ? (authMode === 'login' ? 'Authenticate' : 'Begin Setup') : 'Verify Identity')}
              </button>
            </form>

            <div className="mt-8 text-center flex flex-col gap-3">
               <button onClick={() => { setAuthMode(authMode === 'login' ? 'register' : 'login'); setAuthStep(1); }} className="text-xs font-black text-indigo-500 uppercase tracking-widest hover:underline">
                 {authMode === 'login' ? "New here? Initialize Account" : "Registered? Access Portal"}
               </button>
               {authStep === 2 && (
                 <button onClick={() => setAuthStep(1)} className="text-[10px] font-bold text-slate-400 hover:text-slate-600 flex items-center justify-center gap-1">
                   <ArrowLeft size={12}/> Back to credentials
                 </button>
               )}
            </div>
          </div>
        </div>
      )}

      {/* Global Transitions & Animations */}
      <style>{`
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-thumb { background: rgba(99, 102, 241, 0.2); border-radius: 10px; }
        .animate-in { animation: slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1); }
        @keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  );
};

export default App;