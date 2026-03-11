import { useState, useEffect, useRef } from "react";
import {
  Activity, AlertTriangle, ArrowRight, BarChart2, Bell,
  CheckCircle, ClipboardList, Clock, Cpu, Eye, EyeOff,
  FileText, Lock, LogOut, MessageSquare, Mic,
  Phone, Plus, Radio, RefreshCw, Send, Shield,
  Layers, Stethoscope, TrendingUp, User, Users, Zap, X,
  MessageCircle, Settings, Wifi, WifiOff
} from "lucide-react";

// ─────────────────────────────────────────────────────────────────
// SMS — calls /api/send-sms (Vercel serverless route).
// That route talks to Africa's Talking server-side — no CORS issues.
// ─────────────────────────────────────────────────────────────────
async function sendSMS(to, message) {
  const num = to.startsWith("+") ? to : `+264${to.replace(/^0/, "")}`;
  try {
    const res = await fetch("/api/send-sms", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ to: num, message }),
    });
    const data = await res.json();
    console.log("[SMS]", data);
    return data;
  } catch (err) {
    console.error("[SMS error]", err);
    return { ok: false, error: err.message };
  }
}
// SMS message templates
const TEMPLATES = {
  QUEUE_ADDED: (name, ticket, triage, wait) =>
    `Hello ${name}, you have been registered at QFlowAI Hospital Queue.\nTicket: ${ticket}\nPriority: ${triage}\nEst. wait: ~${wait} min\nPlease remain nearby. We will notify you when it's your turn.`,

  CALLED_NOW: (name, ticket) =>
    `${name}, it's your turn! Ticket ${ticket} is now being called. Please proceed to the consultation room immediately. - QFlowAI`,

  QUEUE_UPDATE: (name, position, wait) =>
    `Hi ${name}, your queue update: You are now position #${position} in line. Estimated wait: ~${wait} min. Thank you for your patience. - QFlowAI`,

  CUSTOM: (name, msg) =>
    `Hi ${name}, ${msg} - QFlowAI`,
};

// ── Global CSS ───────────────────────────────────────────────────
const CSS = `
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; font-family: Arial, Helvetica, sans-serif; }

  :root {
    --bg:      #050a14;
    --surface: #0d1524;
    --sf2:     #111e33;
    --border:  rgba(99,179,255,0.1);
    --border2: rgba(99,179,255,0.2);
    --accent:  #00d4ff;
    --accent2: #0ea5e9;
    --green:   #10f59e;
    --orange:  #ff7c2a;
    --red:     #ff4560;
    --yellow:  #ffd426;
    --text:    #e8f4ff;
    --muted:   #6b8aaa;
    --muted2:  #3d5a78;
    --radius:  16px;
    --glow:    0 0 20px rgba(0,212,255,0.1);
  }

  body { background:var(--bg); color:var(--text); overflow-x:hidden; }

  ::-webkit-scrollbar{width:4px}
  ::-webkit-scrollbar-track{background:var(--bg)}
  ::-webkit-scrollbar-thumb{background:var(--muted2);border-radius:4px}

  @keyframes fadeUp   {from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}
  @keyframes fadeIn   {from{opacity:0}to{opacity:1}}
  @keyframes slideR   {from{opacity:0;transform:translateX(-18px)}to{opacity:1;transform:translateX(0)}}
  @keyframes pulse    {0%,100%{opacity:1}50%{opacity:0.3}}
  @keyframes spin     {to{transform:rotate(360deg)}}
  @keyframes scanline {0%{transform:translateY(-40px)}100%{transform:translateY(100vh)}}
  @keyframes float    {0%,100%{transform:translateY(0)}50%{transform:translateY(-7px)}}
  @keyframes toastIn  {from{opacity:0;transform:translateX(110%)}to{opacity:1;transform:translateX(0)}}
  @keyframes gridMove {from{background-position:0 0}to{background-position:60px 60px}}
  @keyframes callRing {0%,100%{box-shadow:0 0 0 0 rgba(0,212,255,0.5)}60%{box-shadow:0 0 0 16px rgba(0,212,255,0)}}
  @keyframes numUp    {from{opacity:0;transform:translateY(5px)}to{opacity:1;transform:translateY(0)}}
  @keyframes critBlink{0%,100%{border-color:rgba(255,69,96,0.25)}50%{border-color:rgba(255,69,96,0.65)}}
  @keyframes smsPing  {0%{box-shadow:0 0 0 0 rgba(16,245,158,0.6)}70%{box-shadow:0 0 0 12px rgba(16,245,158,0)}100%{box-shadow:0 0 0 0 rgba(16,245,158,0)}}

  .fu  {animation:fadeUp  0.5s cubic-bezier(0.22,1,0.36,1) both}
  .fi  {animation:fadeIn  0.35s ease both}
  .sr  {animation:slideR  0.4s cubic-bezier(0.22,1,0.36,1) both}
  .afl {animation:float   3s ease-in-out infinite}
  .mono{font-family:'Courier New',Courier,monospace!important}

  .grid-bg{
    background-image:
      linear-gradient(rgba(0,212,255,0.03) 1px,transparent 1px),
      linear-gradient(90deg,rgba(0,212,255,0.03) 1px,transparent 1px);
    background-size:60px 60px;
    animation:gridMove 8s linear infinite;
  }

  .btn-p{background:linear-gradient(135deg,#00d4ff,#0ea5e9);color:#050a14;font-weight:700;border:none;border-radius:12px;cursor:pointer;transition:all 0.18s}
  .btn-p:hover{filter:brightness(1.1);transform:translateY(-2px);box-shadow:0 8px 28px rgba(0,212,255,0.35)}
  .btn-p:active{transform:translateY(0)}
  .btn-p:disabled{opacity:0.4;cursor:not-allowed;filter:none;transform:none}

  .btn-g{background:transparent;color:var(--text);font-weight:600;border:1px solid var(--border2);border-radius:12px;cursor:pointer;transition:all 0.18s}
  .btn-g:hover{background:rgba(99,179,255,0.07);border-color:var(--accent)}

  .btn-sms{background:linear-gradient(135deg,#10f59e,#0ea5e9);color:#050a14;font-weight:700;border:none;border-radius:10px;cursor:pointer;transition:all 0.18s}
  .btn-sms:hover{filter:brightness(1.08);transform:translateY(-1px);box-shadow:0 6px 22px rgba(16,245,158,0.3)}
  .btn-sms:disabled{opacity:0.4;cursor:not-allowed;filter:none;transform:none}

  .inp{background:rgba(13,21,36,0.85);border:1.5px solid var(--border2);border-radius:12px;color:var(--text);font-size:14px;transition:all 0.18s;width:100%;padding:12px 16px}
  .inp:focus{outline:none;border-color:var(--accent);box-shadow:0 0 0 3px rgba(0,212,255,0.1)}
  .inp::placeholder{color:var(--muted)}

  .card{background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);transition:border-color 0.2s}
  .card:hover{border-color:var(--border2)}
  .cg{box-shadow:var(--glow)}

  .bc{background:rgba(255,69,96,0.15); color:#ff4560;border:1px solid rgba(255,69,96,0.3)}
  .bu{background:rgba(255,124,42,0.15);color:#ff7c2a;border:1px solid rgba(255,124,42,0.3)}
  .bm{background:rgba(255,212,38,0.12);color:#ffd426;border:1px solid rgba(255,212,38,0.25)}
  .br{background:rgba(16,245,158,0.12);color:#10f59e;border:1px solid rgba(16,245,158,0.25)}

  .nl{color:var(--muted);font-weight:500;font-size:14px;cursor:pointer;transition:color 0.2s;text-decoration:none;border:none;background:none}
  .nl:hover{color:var(--text)}

  .tab{padding:8px 14px;border-radius:8px;font-size:13px;font-weight:600;cursor:pointer;transition:all 0.18s;border:1px solid transparent;color:var(--muted);display:flex;align-items:center;gap:6px}
  .tab.on{background:rgba(0,212,255,0.1);border-color:rgba(0,212,255,0.25);color:var(--accent)}
  .tab:not(.on):hover{color:var(--text);background:rgba(255,255,255,0.03)}

  .sn{font-weight:700;letter-spacing:-1px;animation:numUp 0.4s ease}
  .pt{background:rgba(255,255,255,0.05);border-radius:4px;overflow:hidden}
  .pf{border-radius:4px;transition:width 0.6s cubic-bezier(0.22,1,0.36,1)}

  .dt{width:100%;border-collapse:collapse}
  .dt th{font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.8px;color:var(--muted);padding:10px 14px;border-bottom:1px solid var(--border);text-align:left}
  .dt td{padding:12px 14px;font-size:13px;border-bottom:1px solid rgba(255,255,255,0.03);vertical-align:middle}
  .dt tr:last-child td{border-bottom:none}
  .dt tr:hover td{background:rgba(255,255,255,0.02)}

  .fc{transition:transform 0.28s,box-shadow 0.28s}
  .fc:hover{transform:translateY(-4px);box-shadow:0 22px 56px rgba(0,0,0,0.4),0 0 28px rgba(0,212,255,0.06)}

  .cr{animation:critBlink 2s infinite}
  .cb{animation:callRing 1.4s infinite}

  .gt{background:linear-gradient(135deg,#00d4ff 0%,#38bdf8 50%,#10f59e 100%);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text}

  .orb{position:absolute;border-radius:50%;filter:blur(80px);pointer-events:none}

  /* SMS-specific */
  .sms-log-item{border-left:3px solid;padding:10px 14px;border-radius:0 10px 10px 0;margin-bottom:8px;background:rgba(255,255,255,0.02)}
  .sms-sent    {border-color:var(--green)}
  .sms-failed  {border-color:var(--red)}
  .sms-pending {border-color:var(--yellow)}

  .sms-ping{animation:smsPing 0.8s ease}

  .template-btn{background:rgba(0,212,255,0.06);border:1px solid rgba(0,212,255,0.15);border-radius:9px;padding:9px 13px;cursor:pointer;transition:all 0.18s;text-align:left;width:100%}
  .template-btn:hover{background:rgba(0,212,255,0.12);border-color:rgba(0,212,255,0.3)}

  .patient-select-row{border:1px solid var(--border);border-radius:10px;padding:10px 14px;cursor:pointer;transition:all 0.15s;display:flex;align-items:center;gap:12px}
  .patient-select-row:hover{border-color:var(--border2);background:rgba(255,255,255,0.02)}
  .patient-select-row.selected{border-color:var(--accent);background:rgba(0,212,255,0.06)}
`;

// ── Triage ───────────────────────────────────────────────────────
const T = {
  CRITICAL:{ label:"Critical", color:"#ff4560", cls:"bc" },
  URGENT:  { label:"Urgent",   color:"#ff7c2a", cls:"bu" },
  MODERATE:{ label:"Moderate", color:"#ffd426", cls:"bm" },
  ROUTINE: { label:"Routine",  color:"#10f59e", cls:"br" },
};

const DEMO = [
  {id:"P-0991",name:"Sarah Mutombo",  phone:"+264811234567",age:67,symptoms:"Chest pain radiating to left arm, diaphoresis, onset 20 min ago",triage_level:"CRITICAL",priority_score:96,reasoning:"Possible STEMI — immediate cardiac intervention required.",recommended_action:"Cardiac Room 1 — STAT",estimated_wait_minutes:0, arrivalTime:Date.now()-180000,ticket:"#001"},
  {id:"P-0992",name:"James Nambinga", phone:"+264812345678",age:34,symptoms:"Fever 39.8°C, severe headache, neck stiffness, photophobia",    triage_level:"URGENT",  priority_score:79,reasoning:"Possible bacterial meningitis — urgent isolation needed.",  recommended_action:"Isolate and assess now",  estimated_wait_minutes:10,arrivalTime:Date.now()-300000,ticket:"#002"},
  {id:"P-0993",name:"Grace Hamunyela",phone:"+264813456789",age:8, symptoms:"Fractured right arm after fall, in pain but hemodynamically stable",triage_level:"MODERATE",priority_score:44,reasoning:"Pediatric fracture — painful but not life-threatening.",  recommended_action:"X-ray and splinting",     estimated_wait_minutes:28,arrivalTime:Date.now()-600000,ticket:"#003"},
  {id:"P-0994",name:"David Shilongo", phone:"+264814567890",age:45,symptoms:"Mild sore throat, runny nose, low-grade fever for 2 days",        triage_level:"ROUTINE",  priority_score:11,reasoning:"Likely viral upper respiratory infection.",              recommended_action:"Outpatient consultation", estimated_wait_minutes:65,arrivalTime:Date.now()-900000,ticket:"#004"},
];

let ctr = 1000;
const genId   = () => `P-${++ctr}`;
const nowTime = () => new Date().toLocaleTimeString("en-US",{hour:"2-digit",minute:"2-digit"});
const ago     = ts => { const d=Math.floor((Date.now()-ts)/60000); return d===0?"just now":d===1?"1 min ago":`${d} min ago`; };

async function aiTriage(symptoms, age, vitals) {
  const r = await fetch("https://api.anthropic.com/v1/messages",{
    method:"POST",headers:{"Content-Type":"application/json"},
    body:JSON.stringify({model:"claude-sonnet-4-20250514",max_tokens:800,
      messages:[{role:"user",content:`Hospital triage AI. Return ONLY JSON, no markdown.
Patient: Age ${age}, Symptoms: ${symptoms}, Vitals: ${vitals||"not provided"}
{"triage_level":"CRITICAL"|"URGENT"|"MODERATE"|"ROUTINE","priority_score":<1-100>,"reasoning":"<1-2 sentences>","recommended_action":"<brief>","estimated_wait_minutes":<number>}`}]
    })
  });
  const d = await r.json();
  try{return JSON.parse((d.content?.[0]?.text||"{}").replace(/```json|```/g,"").trim());}
  catch{return{triage_level:"ROUTINE",priority_score:10,reasoning:"Manual assessment needed.",recommended_action:"Standard consultation",estimated_wait_minutes:45};}
}

// ══════════════════════════════════════════════════════════════════
export default function App() {
  const [page,setPage]   = useState("landing");
  const [auth,setAuth]   = useState("login");
  const [user,setUser]   = useState(null);
  const [toast,setToast] = useState(null);

  const showToast=(msg,type="success")=>{setToast({msg,type});setTimeout(()=>setToast(null),4000);};
  const login=u=>{setUser(u);setPage("dashboard");showToast(`Welcome back, ${u.name}!`);};
  const logout=()=>{setUser(null);setPage("landing");};

  return(
    <div style={{minHeight:"100vh",background:"var(--bg)",color:"var(--text)"}}>
      <style>{CSS}</style>
      {page==="landing"  &&<Landing   onLogin={()=>{setAuth("login");setPage("auth");}} onSignup={()=>{setAuth("signup");setPage("auth");}}/>}
      {page==="auth"     &&<Auth      mode={auth} setMode={setAuth} onAuth={login} onBack={()=>setPage("landing")} showToast={showToast}/>}
      {page==="dashboard"&&<Dash      user={user} onLogout={logout} showToast={showToast}/>}
      {toast&&(
        <div style={{position:"fixed",bottom:28,right:28,zIndex:9999,animation:"toastIn 0.35s ease",
          background:toast.type==="error"?"rgba(255,69,96,0.12)":"rgba(16,245,158,0.1)",
          border:`1px solid ${toast.type==="error"?"rgba(255,69,96,0.4)":"rgba(16,245,158,0.3)"}`,
          borderRadius:14,padding:"14px 20px",maxWidth:400,backdropFilter:"blur(20px)",
          boxShadow:"0 16px 40px rgba(0,0,0,0.4)",display:"flex",alignItems:"center",gap:12}}>
          {toast.type==="error"?<AlertTriangle size={17} color="#ff4560"/>:<CheckCircle size={17} color="#10f59e"/>}
          <span style={{fontSize:13,fontWeight:600,color:toast.type==="error"?"#ff4560":"#10f59e"}}>{toast.msg}</span>
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
// LANDING (condensed — same as before)
// ══════════════════════════════════════════════════════════════════
function Landing({onLogin,onSignup}){
  const [scrolled,setScrolled]=useState(false);
  useEffect(()=>{const h=()=>setScrolled(window.scrollY>60);window.addEventListener("scroll",h);return()=>window.removeEventListener("scroll",h);},[]);
  const features=[
    {Icon:Cpu,         title:"AI Triage Engine",        desc:"Claude-powered symptom analysis assigns priority scores in seconds. Life-threatening cases are never missed."},
    {Icon:MessageCircle,title:"Automatic SMS Alerts",   desc:"Patients receive instant Africa's Talking SMS when registered, called, or when their queue position updates."},
    {Icon:BarChart2,   title:"Real-time Analytics",     desc:"Live dashboards track wait times, throughput, and triage distribution across all departments."},
    {Icon:Zap,         title:"Preemptive Queue",         desc:"Critical patients auto-jump the queue. Smart algorithms ensure the sickest are always seen first."},
    {Icon:Layers,      title:"Multi-department Routing", desc:"Automatically route patients to Emergency, Pediatrics, Cardiology, and more."},
    {Icon:Shield,      title:"HIPAA-Ready Security",    desc:"End-to-end encryption, role-based access, and full audit logs built in from day one."},
  ];
  return(
    <div style={{background:"var(--bg)",minHeight:"100vh",position:"relative",overflow:"hidden"}}>
      <nav style={{position:"fixed",top:0,left:0,right:0,zIndex:100,padding:"0 48px",height:66,display:"flex",alignItems:"center",justifyContent:"space-between",background:scrolled?"rgba(5,10,20,0.9)":"transparent",backdropFilter:scrolled?"blur(20px)":"none",borderBottom:scrolled?"1px solid var(--border)":"none",transition:"all 0.3s"}}>
        <Logo/>
        <div style={{display:"flex",gap:36}}>{["Features","How it Works","Pricing"].map(l=><button key={l} className="nl">{l}</button>)}</div>
        <div style={{display:"flex",gap:10}}>
          <button onClick={onLogin}  className="btn-g" style={{padding:"9px 20px",fontSize:13}}>Sign in</button>
          <button onClick={onSignup} className="btn-p" style={{padding:"9px 22px",fontSize:13,display:"flex",alignItems:"center",gap:6}}>Get Started<ArrowRight size={14}/></button>
        </div>
      </nav>

      <section style={{position:"relative",minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",textAlign:"center",paddingTop:80,overflow:"hidden"}}>
        <div className="grid-bg" style={{position:"absolute",inset:0,opacity:0.7}}/>
        <div className="orb" style={{width:600,height:600,background:"rgba(0,212,255,0.06)",top:"10%",left:"50%",transform:"translateX(-50%)"}}/>
        <div className="orb" style={{width:320,height:320,background:"rgba(16,245,158,0.05)",bottom:"12%",right:"8%"}}/>
        <div style={{position:"absolute",top:0,left:0,right:0,height:2,background:"linear-gradient(90deg,transparent,rgba(0,212,255,0.5),transparent)",animation:"scanline 5s linear infinite",pointerEvents:"none"}}/>
        <div style={{position:"relative",maxWidth:860,padding:"0 24px"}}>
          <div className="fu" style={{display:"inline-flex",alignItems:"center",gap:8,background:"rgba(0,212,255,0.08)",border:"1px solid rgba(0,212,255,0.25)",borderRadius:20,padding:"6px 16px",marginBottom:28,fontSize:11,fontWeight:700,color:"var(--accent)",letterSpacing:"1px",textTransform:"uppercase"}}>
            <span style={{width:6,height:6,borderRadius:"50%",background:"var(--green)",display:"inline-block",animation:"pulse 1.5s infinite"}}/>AI-Powered Hospital Queue Intelligence
          </div>
          <h1 className="fu" style={{animationDelay:"80ms",fontSize:"clamp(38px,6vw,74px)",fontWeight:800,lineHeight:1.05,letterSpacing:"-2.5px",marginBottom:24}}>
            The Queue That<br/><span className="gt">Thinks for Itself</span>
          </h1>
          <p className="fu" style={{animationDelay:"160ms",fontSize:"clamp(14px,1.7vw,18px)",color:"var(--muted)",maxWidth:580,margin:"0 auto 40px",lineHeight:1.8}}>
            QFlowAI uses real-time AI to triage patients, send automatic SMS notifications, and reduce critical wait times — transforming how public hospitals manage patient flow.
          </p>
          <div className="fu" style={{animationDelay:"240ms",display:"flex",gap:12,justifyContent:"center",flexWrap:"wrap"}}>
            <button onClick={onSignup} className="btn-p" style={{padding:"15px 36px",fontSize:15,borderRadius:14,display:"flex",alignItems:"center",gap:8}}>Start Free Trial<ArrowRight size={16}/></button>
            <button onClick={onLogin}  className="btn-g" style={{padding:"15px 28px",fontSize:15,borderRadius:14}}>View Live Demo</button>
          </div>
          <div className="fu" style={{animationDelay:"320ms",display:"flex",gap:10,justifyContent:"center",marginTop:44,flexWrap:"wrap"}}>
            {["40+ Hospitals","98.7% AI Accuracy","SMS Alerts","HIPAA Ready"].map(s=>(
              <div key={s} style={{background:"rgba(255,255,255,0.04)",border:"1px solid var(--border)",borderRadius:20,padding:"5px 14px",fontSize:12,color:"var(--muted)",fontWeight:600}}>{s}</div>
            ))}
          </div>
        </div>
      </section>

      <section style={{padding:"56px 48px",borderTop:"1px solid var(--border)",borderBottom:"1px solid var(--border)",background:"rgba(13,21,36,0.6)"}}>
        <div style={{maxWidth:1100,margin:"0 auto",display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:32,textAlign:"center"}}>
          {[{v:"73%",l:"Reduction in critical wait time"},{v:"3.2×",l:"Faster triage processing"},{v:"98.7%",l:"AI triage accuracy rate"},{v:"40+",l:"Hospitals deployed"}].map((s,i)=>(
            <div key={i}><div className="gt" style={{fontSize:44,fontWeight:800,letterSpacing:"-2px",lineHeight:1}}>{s.v}</div><div style={{fontSize:13,color:"var(--muted)",marginTop:8}}>{s.l}</div></div>
          ))}
        </div>
      </section>

      <section style={{padding:"96px 48px"}}>
        <div style={{maxWidth:1100,margin:"0 auto"}}>
          <div style={{textAlign:"center",marginBottom:60}}>
            <div style={{fontSize:11,fontWeight:700,textTransform:"uppercase",letterSpacing:"1.5px",color:"var(--accent)",marginBottom:14}}>Platform Features</div>
            <h2 style={{fontSize:38,fontWeight:800,letterSpacing:"-1.5px",marginBottom:14}}>Built for the frontlines<br/>of emergency care</h2>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:18}}>
            {features.map(({Icon,title,desc},i)=>(
              <div key={i} className="card fc" style={{padding:"26px 24px"}}>
                <div style={{width:42,height:42,borderRadius:11,background:"rgba(0,212,255,0.08)",border:"1px solid rgba(0,212,255,0.14)",display:"flex",alignItems:"center",justifyContent:"center",marginBottom:16}}>
                  <Icon size={19} color="var(--accent)" strokeWidth={1.8}/>
                </div>
                <div style={{fontSize:15,fontWeight:700,marginBottom:9}}>{title}</div>
                <div style={{fontSize:13,color:"var(--muted)",lineHeight:1.75}}>{desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section style={{padding:"80px 48px",textAlign:"center",position:"relative",overflow:"hidden"}}>
        <div className="orb" style={{width:500,height:500,background:"rgba(0,212,255,0.05)",top:"50%",left:"50%",transform:"translate(-50%,-50%)"}}/>
        <div style={{position:"relative"}}>
          <h2 style={{fontSize:"clamp(28px,4.5vw,50px)",fontWeight:800,letterSpacing:"-2px",marginBottom:18}}>Ready to transform<br/><span className="gt">your hospital's flow?</span></h2>
          <p style={{fontSize:16,color:"var(--muted)",margin:"0 auto 40px",maxWidth:440,lineHeight:1.75}}>Join 40+ hospitals using QFlowAI to save lives through smarter queue management and automated patient communication.</p>
          <button onClick={onSignup} className="btn-p" style={{padding:"16px 44px",fontSize:15,borderRadius:14,display:"inline-flex",alignItems:"center",gap:8}}>Start Your Free Trial<ArrowRight size={16}/></button>
        </div>
      </section>

      <footer style={{borderTop:"1px solid var(--border)",padding:"26px 48px",display:"flex",alignItems:"center",justifyContent:"space-between",background:"rgba(5,10,20,0.85)"}}>
        <Logo small/><div style={{fontSize:12,color:"var(--muted)"}}>© 2025 QFlowAI. All rights reserved.</div>
        <div style={{display:"flex",gap:20}}>{["Privacy","Terms","Contact"].map(l=><button key={l} className="nl" style={{fontSize:12}}>{l}</button>)}</div>
      </footer>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
// AUTH
// ══════════════════════════════════════════════════════════════════
function Auth({mode,setMode,onAuth,onBack,showToast}){
  const [form,setForm]=useState({name:"",email:"",password:"",hospital:"",role:"nurse"});
  const [busy,setBusy]=useState(false);
  const [showPw,setShowPw]=useState(false);
  const submit=async()=>{
    if(!form.email||!form.password){showToast("Please fill in all required fields.","error");return;}
    if(mode==="signup"&&!form.name){showToast("Please enter your full name.","error");return;}
    setBusy(true);await new Promise(r=>setTimeout(r,1400));setBusy(false);
    onAuth({name:form.name||"Dr. Admin",email:form.email,hospital:form.hospital||"Katutura State Hospital",role:form.role});
  };
  const lbl={display:"block",fontSize:11,fontWeight:700,color:"var(--muted)",marginBottom:7,textTransform:"uppercase",letterSpacing:"0.5px"};
  return(
    <div style={{minHeight:"100vh",display:"grid",gridTemplateColumns:"1fr 1fr",background:"var(--bg)"}}>
      <div style={{position:"relative",overflow:"hidden",background:"var(--surface)",borderRight:"1px solid var(--border)",display:"flex",flexDirection:"column",padding:"48px",justifyContent:"space-between"}}>
        <div className="grid-bg" style={{position:"absolute",inset:0,opacity:0.4}}/>
        <div className="orb" style={{width:440,height:440,background:"rgba(0,212,255,0.07)",top:"15%",left:"20%"}}/>
        <div style={{position:"relative"}}>
          <button onClick={onBack} className="nl" style={{display:"flex",alignItems:"center",gap:6,marginBottom:48,padding:0,border:"none",background:"none",cursor:"pointer"}}>
            <ArrowRight size={14} style={{transform:"rotate(180deg)"}}/> Back to home
          </button>
          <Logo/>
        </div>
        <div style={{position:"relative"}}>
          <div style={{fontSize:11,fontWeight:700,textTransform:"uppercase",letterSpacing:"1.5px",color:"var(--accent)",marginBottom:16}}>Trusted by hospitals</div>
          <h2 style={{fontSize:30,fontWeight:800,letterSpacing:"-1.5px",lineHeight:1.12,marginBottom:24}}>Smarter triage.<br/>Faster care.<br/><span className="gt">Better outcomes.</span></h2>
          <div style={{display:"flex",flexDirection:"column",gap:14}}>
            {[{Icon:Activity,t:"Critical patients identified in under 10 seconds"},{Icon:MessageCircle,t:"Automatic SMS notifications via Africa's Talking"},{Icon:Lock,t:"Encrypted, audit-logged, and HIPAA-ready"}].map(({Icon,t},i)=>(
              <div key={i} style={{display:"flex",alignItems:"center",gap:12}}>
                <div style={{width:34,height:34,borderRadius:9,background:"rgba(0,212,255,0.08)",border:"1px solid var(--border)",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                  <Icon size={15} color="var(--accent)" strokeWidth={1.8}/>
                </div>
                <span style={{fontSize:13,color:"var(--muted)",fontWeight:500}}>{t}</span>
              </div>
            ))}
          </div>
        </div>
        <div style={{position:"relative",display:"flex",gap:6}}>
          {[...Array(4)].map((_,i)=><div key={i} style={{flex:1,height:3,borderRadius:2,background:i===0?"var(--accent)":"var(--muted2)"}}/>)}
        </div>
      </div>
      <div style={{display:"flex",alignItems:"center",justifyContent:"center",padding:"48px"}}>
        <div style={{width:"100%",maxWidth:420}} className="sr">
          <div style={{display:"flex",background:"var(--surface)",borderRadius:12,padding:4,border:"1px solid var(--border)",marginBottom:34}}>
            {["login","signup"].map(m=>(
              <button key={m} onClick={()=>setMode(m)} style={{flex:1,padding:"9px",borderRadius:9,fontWeight:600,fontSize:13,cursor:"pointer",border:"none",transition:"all 0.18s",background:mode===m?"var(--sf2)":"transparent",color:mode===m?"var(--text)":"var(--muted)",boxShadow:mode===m?"0 2px 8px rgba(0,0,0,0.3)":"none"}}>
                {m==="login"?"Sign In":"Create Account"}
              </button>
            ))}
          </div>
          <h2 style={{fontSize:23,fontWeight:800,letterSpacing:"-0.6px",marginBottom:6}}>{mode==="login"?"Welcome back":"Create your account"}</h2>
          <p style={{fontSize:13,color:"var(--muted)",marginBottom:30,lineHeight:1.6}}>{mode==="login"?"Sign in to access your hospital dashboard.":"Set up QFlowAI for your hospital in minutes."}</p>
          <div style={{display:"flex",flexDirection:"column",gap:15}}>
            {mode==="signup"&&<>
              <FI label="Full Name" Icon={User}><input className="inp" value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))} placeholder="Dr. Anna Nghifindaka" style={{paddingLeft:40}}/></FI>
              <FI label="Hospital Name" Icon={Stethoscope}><input className="inp" value={form.hospital} onChange={e=>setForm(f=>({...f,hospital:e.target.value}))} placeholder="Katutura State Hospital" style={{paddingLeft:40}}/></FI>
              <div>
                <label style={lbl}>Your Role</label>
                <select className="inp" value={form.role} onChange={e=>setForm(f=>({...f,role:e.target.value}))} style={{appearance:"none",cursor:"pointer"}}>
                  <option value="nurse">Triage Nurse</option><option value="doctor">Doctor</option>
                  <option value="admin">Hospital Administrator</option><option value="receptionist">Receptionist</option>
                </select>
              </div>
            </>}
            <FI label="Email Address" Icon={FileText}><input className="inp" type="email" value={form.email} onChange={e=>setForm(f=>({...f,email:e.target.value}))} placeholder="you@hospital.org" style={{paddingLeft:40}}/></FI>
            <div>
              <label style={lbl}>Password</label>
              <div style={{position:"relative"}}>
                <Lock size={14} color="var(--muted)" style={{position:"absolute",left:13,top:"50%",transform:"translateY(-50%)"}}/>
                <input className="inp" type={showPw?"text":"password"} value={form.password} onChange={e=>setForm(f=>({...f,password:e.target.value}))} placeholder="••••••••" style={{paddingLeft:40,paddingRight:44}} onKeyDown={e=>e.key==="Enter"&&submit()}/>
                <button onClick={()=>setShowPw(v=>!v)} style={{position:"absolute",right:13,top:"50%",transform:"translateY(-50%)",background:"none",border:"none",cursor:"pointer",color:"var(--muted)",display:"flex"}}>
                  {showPw?<EyeOff size={14}/>:<Eye size={14}/>}
                </button>
              </div>
            </div>
            <button onClick={submit} disabled={busy} className="btn-p" style={{padding:"13px",fontSize:14,display:"flex",alignItems:"center",justifyContent:"center",gap:8,marginTop:4}}>
              {busy?<><Spin/>Authenticating...</>:<>{mode==="login"?"Sign In":"Create Account"}<ArrowRight size={14}/></>}
            </button>
          </div>
          <div style={{textAlign:"center",marginTop:22,fontSize:12,color:"var(--muted)"}}>
            {mode==="login"?"Don't have an account? ":"Already have an account? "}
            <button onClick={()=>setMode(mode==="login"?"signup":"login")} style={{background:"none",border:"none",cursor:"pointer",color:"var(--accent)",fontWeight:700,fontSize:12}}>{mode==="login"?"Create one":"Sign in"}</button>
          </div>
          <div style={{marginTop:26,padding:"12px 16px",background:"rgba(0,212,255,0.04)",border:"1px solid var(--border)",borderRadius:12,fontSize:11,color:"var(--muted)",textAlign:"center",lineHeight:1.6,display:"flex",alignItems:"center",justifyContent:"center",gap:8}}>
            <Lock size={11} color="var(--muted)"/> Demo: any email and password grants access
          </div>
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
// DASHBOARD
// ══════════════════════════════════════════════════════════════════
function Dash({user,onLogout,showToast}){
  const [tab,setTab]         = useState("queue");
  const [queue,setQueue]     = useState(DEMO);
  const [served,setServed]   = useState([]);
  const [smsLog,setSmsLog]   = useState([]);    // {id,to,name,message,status,time,simulated}
  const [form,setForm]       = useState({name:"",age:"",phone:"",symptoms:"",vitals:""});
  const [busy,setBusy]       = useState(false);
  const [calling,setCalling] = useState(null);
  const [time,setTime]       = useState(nowTime());
  const [smsBusy,setSmsBusy] = useState({});    // patientId → bool
  const tkRef = useRef(5);

  useEffect(()=>{const i=setInterval(()=>setTime(nowTime()),30000);return()=>clearInterval(i);},[]);

  const sorted=[...queue].sort((a,b)=>b.priority_score-a.priority_score);
  const stats={waiting:queue.length,critical:queue.filter(p=>p.triage_level==="CRITICAL").length,served:served.length,smsCount:smsLog.length,avgWait:queue.length?Math.round(queue.reduce((s,p)=>s+p.estimated_wait_minutes,0)/queue.length):0};

  // ── Send SMS helper (logs result)
  const dispatchSMS=async(patient,message,type="manual")=>{
    if(!patient.phone){showToast(`No phone number for ${patient.name}`,"error");return false;}
    const logId=Date.now()+Math.random();
    setSmsLog(l=>[{id:logId,to:patient.phone,name:patient.name,patientId:patient.id,message,type,status:"sending",time:Date.now()},...l]);
    const res=await sendSMS(patient.phone,message);
    setSmsLog(l=>l.map(x=>x.id===logId?{...x,status:res.ok?"sent":"failed",simulated:!!res.simulated,messageId:res.messageId||null,errorMsg:res.error||null}:x));
    return res.ok;
  };

  // ── Register patient + auto-SMS
  const register=async()=>{
    if(!form.name.trim()||!form.age||!form.symptoms.trim()){showToast("Name, age, and symptoms are required.","error");return;}
    setBusy(true);
    try{
      const ai=await aiTriage(form.symptoms,form.age,form.vitals);
      const tn=String(tkRef.current++).padStart(3,"0");
      const p={id:genId(),name:form.name.trim(),age:parseInt(form.age),phone:form.phone.trim(),symptoms:form.symptoms.trim(),vitals:form.vitals.trim(),triage_level:ai.triage_level||"ROUTINE",priority_score:ai.priority_score||10,reasoning:ai.reasoning||"",recommended_action:ai.recommended_action||"",estimated_wait_minutes:ai.estimated_wait_minutes||45,arrivalTime:Date.now(),ticket:`#${tn}`};
      setQueue(prev=>[...prev,p]);
      setForm({name:"",age:"",phone:"",symptoms:"",vitals:""});
      setTab("queue");
      showToast(`${p.name} registered as ${T[p.triage_level]?.label}. Ticket ${p.ticket}`);
      // Auto-SMS if phone provided
      if(p.phone){
        await dispatchSMS(p,TEMPLATES.QUEUE_ADDED(p.name,p.ticket,T[p.triage_level].label,p.estimated_wait_minutes),"auto-register");
        showToast(`SMS sent to ${p.phone}`);
      }
    }catch(e){showToast("Error during registration.","error");}
    setBusy(false);
  };

  // ── Call next patient + auto-SMS
  const callNext=()=>{
    const s=[...queue].sort((a,b)=>b.priority_score-a.priority_score);
    if(!s.length){showToast("Queue is empty.","error");return;}
    const next=s[0];setCalling(next);
    setTimeout(async()=>{
      setQueue(p=>p.filter(x=>x.id!==next.id));
      setServed(p=>[{...next,servedAt:Date.now()},...p]);
      setCalling(null);
      showToast(`${next.name} (${next.ticket}) is now being seen.`);
      if(next.phone) await dispatchSMS(next,TEMPLATES.CALLED_NOW(next.name,next.ticket),"auto-call");
    },2400);
  };

  const TABS=[
    {id:"queue",    label:"Live Queue",  Icon:Radio},
    {id:"register", label:"Register",   Icon:Plus},
    {id:"sms",      label:"SMS Centre", Icon:MessageCircle},
    {id:"analytics",label:"Analytics",  Icon:BarChart2},
    {id:"log",      label:"Service Log",Icon:FileText},
  ];

  return(
    <div style={{minHeight:"100vh",display:"flex",flexDirection:"column",background:"var(--bg)"}}>
      {/* Header */}
      <header style={{height:62,borderBottom:"1px solid var(--border)",display:"flex",alignItems:"center",justifyContent:"space-between",padding:"0 28px",background:"rgba(5,10,20,0.95)",backdropFilter:"blur(20px)",position:"sticky",top:0,zIndex:100}}>
        <div style={{display:"flex",alignItems:"center",gap:18}}>
          <Logo small/><div style={{width:1,height:24,background:"var(--border)"}}/>
          <div style={{fontSize:12,color:"var(--muted)",fontWeight:500}}>{user?.hospital}</div>
        </div>
        <nav style={{display:"flex",gap:2}}>
          {TABS.map(({id,label,Icon:I})=>(
            <button key={id} onClick={()=>setTab(id)} className={`tab${tab===id?" on":""}`}>
              <I size={13} strokeWidth={2}/>{label}
              {id==="sms"&&smsLog.length>0&&<span style={{background:"var(--green)",color:"var(--bg)",borderRadius:"50%",width:16,height:16,display:"flex",alignItems:"center",justifyContent:"center",fontSize:9,fontWeight:800,marginLeft:2}}>{smsLog.filter(s=>s.status==="sent").length}</span>}
            </button>
          ))}
        </nav>
        <div style={{display:"flex",alignItems:"center",gap:14}}>
          {stats.critical>0&&<div style={{background:"rgba(255,69,96,0.1)",border:"1px solid rgba(255,69,96,0.35)",borderRadius:20,padding:"4px 12px",fontSize:11,fontWeight:700,color:"#ff4560",display:"flex",alignItems:"center",gap:6}}><span style={{width:6,height:6,borderRadius:"50%",background:"#ff4560",animation:"pulse 0.9s infinite"}}/>{stats.critical} CRITICAL</div>}
          <div className="mono" style={{fontSize:12,color:"var(--muted)"}}>{time}</div>
          <div style={{width:1,height:22,background:"var(--border)"}}/>
          <div style={{display:"flex",alignItems:"center",gap:8}}>
            <div style={{width:30,height:30,borderRadius:8,background:"linear-gradient(135deg,var(--accent),var(--green))",display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,fontWeight:800,color:"var(--bg)"}}>{user?.name?.[0]||"A"}</div>
            <div><div style={{fontSize:12,fontWeight:700}}>{user?.name}</div><div style={{color:"var(--muted)",fontSize:10,textTransform:"capitalize"}}>{user?.role}</div></div>
          </div>
          <button onClick={onLogout} className="btn-g" style={{padding:"6px 12px",fontSize:12,display:"flex",alignItems:"center",gap:6}}><LogOut size={13}/>Sign out</button>
        </div>
      </header>

      {/* Stat bar */}
      <div style={{borderBottom:"1px solid var(--border)",padding:"14px 28px",display:"flex",gap:30,background:"rgba(13,21,36,0.6)"}}>
        {[
          {l:"In Queue",    v:stats.waiting,   c:"var(--accent)", Icon:Users},
          {l:"Critical",    v:stats.critical,  c:"var(--red)",    Icon:AlertTriangle},
          {l:"Served Today",v:stats.served,    c:"var(--green)",  Icon:CheckCircle},
          {l:"SMS Sent",    v:stats.smsCount,  c:"#10f59e",       Icon:MessageCircle},
          {l:"Avg Wait",    v:`${stats.avgWait}m`,c:"var(--yellow)",Icon:Clock},
        ].map(({l,v,c,Icon:I})=>(
          <div key={l} style={{display:"flex",alignItems:"center",gap:10}}>
            <div style={{width:34,height:34,borderRadius:9,background:"rgba(255,255,255,0.04)",border:"1px solid var(--border)",display:"flex",alignItems:"center",justifyContent:"center"}}>
              <I size={15} color={c} strokeWidth={2}/>
            </div>
            <div><div className="sn" style={{fontSize:20,color:c,lineHeight:1}}>{v}</div><div style={{fontSize:10,color:"var(--muted)",fontWeight:700,textTransform:"uppercase",letterSpacing:"0.5px",marginTop:2}}>{l}</div></div>
          </div>
        ))}
      </div>

      <main style={{flex:1,padding:"28px",maxWidth:1200,width:"100%",margin:"0 auto",boxSizing:"border-box"}}>

        {/* ── QUEUE ── */}
        {tab==="queue"&&(
          <div className="fi">
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:20}}>
              <div><h2 style={{fontSize:20,fontWeight:800,letterSpacing:"-0.5px"}}>Live Queue</h2><p style={{fontSize:12,color:"var(--muted)",marginTop:3}}>Sorted by AI priority score — highest urgency first</p></div>
              <button onClick={callNext} className="btn-p cb" style={{padding:"11px 22px",fontSize:13,display:"flex",alignItems:"center",gap:8}}><Bell size={15}/>Call Next Patient</button>
            </div>
            {calling&&(
              <div className="fu card cg" style={{padding:"17px 22px",marginBottom:18,borderColor:"rgba(0,212,255,0.4)",background:"rgba(0,212,255,0.05)",display:"flex",alignItems:"center",gap:16}}>
                <div style={{width:38,height:38,borderRadius:10,background:"rgba(0,212,255,0.14)",border:"1px solid rgba(0,212,255,0.4)",display:"flex",alignItems:"center",justifyContent:"center",animation:"pulse 0.7s infinite"}}><Mic size={17} color="var(--accent)"/></div>
                <div>
                  <div style={{fontWeight:800,fontSize:17,color:"var(--accent)"}}>Now Calling: {calling.name}</div>
                  <div style={{fontSize:13,color:"var(--muted)",marginTop:3}}>Ticket {calling.ticket} — Proceeding to consultation room{calling.phone&&" · SMS sent"}</div>
                </div>
              </div>
            )}
            {sorted.length===0?(
              <div style={{textAlign:"center",padding:"80px 0",color:"var(--muted)"}}>
                <div style={{display:"flex",justifyContent:"center",marginBottom:14}} className="afl"><CheckCircle size={50} color="var(--green)" strokeWidth={1.4}/></div>
                <div style={{fontSize:18,fontWeight:700,color:"var(--text)"}}>Queue is empty</div>
                <div style={{fontSize:13,marginTop:5}}>All patients have been seen</div>
              </div>
            ):(
              <div style={{display:"flex",flexDirection:"column",gap:8}}>
                {sorted.map((p,i)=>{
                  const t=T[p.triage_level]||T.ROUTINE;
                  const isCrit=p.triage_level==="CRITICAL";
                  return(
                    <div key={p.id} className={`card fu${isCrit?" cr":""}`} style={{animationDelay:`${i*35}ms`,padding:"15px 20px",display:"flex",alignItems:"center",gap:15,borderColor:isCrit?"rgba(255,69,96,0.3)":"var(--border)",background:isCrit?"rgba(255,69,96,0.025)":"var(--surface)"}}>
                      <div style={{width:36,height:36,borderRadius:9,background:i===0?"linear-gradient(135deg,var(--accent),var(--accent2))":"rgba(255,255,255,0.04)",color:i===0?"var(--bg)":"var(--muted2)",display:"flex",alignItems:"center",justifyContent:"center",fontWeight:800,fontSize:13,flexShrink:0}}>{i+1}</div>
                      <div style={{flexShrink:0,width:94}}>
                        <div className={t.cls} style={{borderRadius:8,padding:"4px 9px",fontSize:11,fontWeight:700,textAlign:"center",display:"flex",alignItems:"center",justifyContent:"center",gap:5}}>
                          <span style={{width:6,height:6,borderRadius:"50%",background:t.color,display:"inline-block",flexShrink:0,animation:isCrit?"pulse 0.9s infinite":"none"}}/>{t.label}
                        </div>
                        <div className="mono" style={{fontSize:10,color:"var(--muted)",textAlign:"center",marginTop:4}}>Score {p.priority_score}</div>
                      </div>
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:3,flexWrap:"wrap"}}>
                          <span style={{fontWeight:700,fontSize:14}}>{p.name}</span>
                          <span style={{fontSize:11,color:"var(--muted)"}}>Age {p.age}</span>
                          <span className="mono" style={{fontSize:11,color:"var(--muted2)",background:"rgba(255,255,255,0.04)",padding:"1px 6px",borderRadius:5}}>{p.ticket}</span>
                          {p.phone&&<span style={{fontSize:10,color:"var(--green)",display:"flex",alignItems:"center",gap:3}}><Phone size={9}/>{p.phone}</span>}
                        </div>
                        <div style={{fontSize:12,color:"var(--muted)",marginBottom:3,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{p.symptoms}</div>
                        {p.reasoning&&<div style={{fontSize:11,color:"var(--muted2)",fontStyle:"italic"}}>AI: {p.reasoning}</div>}
                      </div>
                      <div style={{textAlign:"right",flexShrink:0,minWidth:170}}>
                        <div style={{fontSize:12,fontWeight:600,color:t.color,marginBottom:4}}>{p.recommended_action}</div>
                        <div className="mono" style={{fontSize:10,color:"var(--muted)"}}>~{p.estimated_wait_minutes}min · {ago(p.arrivalTime)}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            {served.length>0&&(
              <div style={{marginTop:30}}>
                <div style={{fontSize:11,fontWeight:700,color:"var(--muted)",textTransform:"uppercase",letterSpacing:"0.8px",marginBottom:12}}>Recently Served</div>
                <div style={{display:"flex",flexDirection:"column",gap:6}}>
                  {served.slice(0,4).map((p,i)=>{const t=T[p.triage_level]||T.ROUTINE;return(
                    <div key={p.id+i} style={{background:"rgba(255,255,255,0.02)",border:"1px solid var(--border)",borderRadius:10,padding:"11px 16px",display:"flex",alignItems:"center",gap:12,opacity:0.65}}>
                      <CheckCircle size={13} color="var(--green)"/>
                      <span style={{fontWeight:600,fontSize:13}}>{p.name}</span>
                      <span className="mono" style={{fontSize:11,color:"var(--muted)"}}>{p.ticket}</span>
                      <span className={t.cls} style={{borderRadius:6,padding:"2px 8px",fontSize:11,fontWeight:700,marginLeft:"auto"}}>{t.label}</span>
                      <span style={{fontSize:11,color:"var(--muted)"}}>{ago(p.servedAt)}</span>
                    </div>
                  );})}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── REGISTER ── */}
        {tab==="register"&&(
          <div className="fi" style={{maxWidth:620,margin:"0 auto"}}>
            <div style={{marginBottom:22}}>
              <h2 style={{fontSize:20,fontWeight:800,letterSpacing:"-0.5px"}}>Register New Patient</h2>
              <p style={{fontSize:12,color:"var(--muted)",marginTop:4}}>AI assigns triage. An SMS confirmation is sent automatically if a phone number is provided.</p>
            </div>
            <div className="card cg" style={{padding:26}}>
              <div style={{display:"flex",flexDirection:"column",gap:16}}>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
                  <FI label="Full Name *" Icon={User}><input className="inp" value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))} placeholder="Maria Shikongo" style={{paddingLeft:40}}/></FI>
                  <div>
                    <label style={LBL}>Age *</label>
                    <input className="inp" type="number" value={form.age} onChange={e=>setForm(f=>({...f,age:e.target.value}))} placeholder="e.g. 45" min="0" max="120"/>
                  </div>
                </div>
                <FI label="Phone Number (for SMS)" Icon={Phone}>
                  <input className="inp" value={form.phone} onChange={e=>setForm(f=>({...f,phone:e.target.value}))} placeholder="+264 81 234 5678" style={{paddingLeft:40}}/>
                </FI>
                <div>
                  <label style={LBL}>Presenting Symptoms *</label>
                  <textarea className="inp" value={form.symptoms} onChange={e=>setForm(f=>({...f,symptoms:e.target.value}))} placeholder="Describe in detail — e.g. severe chest pain radiating to left arm, onset 20 minutes ago, diaphoresis..." rows={4} style={{resize:"vertical"}}/>
                  <div style={{fontSize:11,color:"var(--muted2)",marginTop:5}}>More detail yields better AI triage accuracy</div>
                </div>
                <FI label="Vitals — optional" Icon={Activity}>
                  <input className="inp" value={form.vitals} onChange={e=>setForm(f=>({...f,vitals:e.target.value}))} placeholder="BP: 160/100, Temp: 38.5°C, SpO2: 94%, HR: 110" style={{paddingLeft:40}}/>
                </FI>
                <div style={{background:"rgba(16,245,158,0.05)",border:"1px solid rgba(16,245,158,0.2)",borderRadius:10,padding:"11px 14px",fontSize:12,color:"var(--muted)",display:"flex",alignItems:"center",gap:10}}>
                  <MessageCircle size={14} color="var(--green)"/>
                  An automatic SMS will be sent to the patient's phone upon registration and again when they are called.
                </div>
                <button onClick={register} disabled={busy} className="btn-p" style={{padding:"13px",fontSize:14,display:"flex",alignItems:"center",justifyContent:"center",gap:9,marginTop:4}}>
                  {busy?<><Spin/>Analyzing and registering...</>:<><Cpu size={15}/>Analyze, Register and Notify</>}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── SMS CENTRE ── */}
        {tab==="sms"&&(
          <SMSCentre queue={queue} served={served} smsLog={smsLog} dispatchSMS={dispatchSMS} smsBusy={smsBusy} setSmsBusy={setSmsBusy} showToast={showToast}/>
        )}

        {/* ── ANALYTICS ── */}
        {tab==="analytics"&&(
          <div className="fi">
            <div style={{marginBottom:22}}><h2 style={{fontSize:20,fontWeight:800,letterSpacing:"-0.5px"}}>Queue Analytics</h2><p style={{fontSize:12,color:"var(--muted)",marginTop:3}}>Real-time statistics for today's session</p></div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:18}}>
              <div className="card" style={{padding:"22px"}}>
                <div style={{fontSize:14,fontWeight:700,marginBottom:18,display:"flex",alignItems:"center",gap:8}}><BarChart2 size={14} color="var(--accent)"/>Queue by Triage Level</div>
                {Object.entries(T).map(([k,t])=>{const c=queue.filter(p=>p.triage_level===k).length;const pct=queue.length?Math.round((c/queue.length)*100):0;return(
                  <div key={k} style={{marginBottom:16}}>
                    <div style={{display:"flex",justifyContent:"space-between",marginBottom:5}}><span className={t.cls} style={{borderRadius:6,padding:"2px 8px",fontSize:11,fontWeight:700}}>{t.label}</span><span className="mono" style={{fontSize:12,color:"var(--muted)"}}>{c} · {pct}%</span></div>
                    <div className="pt" style={{height:6}}><div className="pf" style={{width:`${pct}%`,height:"100%",background:t.color}}/></div>
                  </div>
                );})}
              </div>
              <div className="card" style={{padding:"22px"}}>
                <div style={{fontSize:14,fontWeight:700,marginBottom:18,display:"flex",alignItems:"center",gap:8}}><TrendingUp size={14} color="var(--accent)"/>Priority Score Ranking</div>
                {sorted.map((p,i)=>{const t=T[p.triage_level]||T.ROUTINE;return(
                  <div key={p.id} style={{marginBottom:13}}>
                    <div style={{display:"flex",justifyContent:"space-between",marginBottom:5}}><span style={{fontSize:12,fontWeight:600}}>{p.name.split(" ")[0]} <span style={{color:"var(--muted)",fontSize:11}}>#{i+1}</span></span><span className="mono" style={{fontSize:12,fontWeight:700,color:t.color}}>{p.priority_score}</span></div>
                    <div className="pt" style={{height:5}}><div className="pf" style={{width:`${p.priority_score}%`,height:"100%",background:`linear-gradient(90deg,${t.color},${t.color}44)`}}/></div>
                  </div>
                );})}
                {sorted.length===0&&<div style={{color:"var(--muted)",fontSize:13,textAlign:"center",paddingTop:20}}>No patients in queue</div>}
              </div>
              <div className="card" style={{padding:"22px",gridColumn:"1/-1"}}>
                <div style={{fontSize:14,fontWeight:700,marginBottom:18,display:"flex",alignItems:"center",gap:8}}><Activity size={14} color="var(--accent)"/>Session Overview</div>
                <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:16}}>
                  {[
                    {l:"Total Registered", v:queue.length+served.length,c:"var(--accent)"},
                    {l:"Currently Waiting",v:queue.length,              c:"var(--orange)"},
                    {l:"Served Today",     v:served.length,             c:"var(--green)"},
                    {l:"SMS Dispatched",   v:smsLog.length,             c:"#10f59e"},
                    {l:"Avg Wait",         v:`${stats.avgWait}m`,       c:"var(--yellow)"},
                  ].map(s=>(
                    <div key={s.l} style={{textAlign:"center",padding:"16px",background:"rgba(255,255,255,0.02)",borderRadius:12,border:"1px solid var(--border)"}}>
                      <div className="sn" style={{fontSize:28,color:s.c,marginBottom:5}}>{s.v}</div>
                      <div style={{fontSize:10,color:"var(--muted)",fontWeight:700,textTransform:"uppercase",letterSpacing:"0.5px"}}>{s.l}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── SERVICE LOG ── */}
        {tab==="log"&&(
          <div className="fi">
            <div style={{marginBottom:22}}><h2 style={{fontSize:20,fontWeight:800,letterSpacing:"-0.5px"}}>Service Log</h2><p style={{fontSize:12,color:"var(--muted)",marginTop:3}}>{served.length} patient{served.length!==1?"s":""} seen today</p></div>
            <div className="card" style={{overflow:"hidden"}}>
              {served.length===0?(
                <div style={{textAlign:"center",padding:"64px",color:"var(--muted)"}}>
                  <div style={{display:"flex",justifyContent:"center",marginBottom:14}}><ClipboardList size={44} color="var(--muted2)" strokeWidth={1.4}/></div>
                  <div style={{fontWeight:600,fontSize:15}}>No patients served yet</div>
                </div>
              ):(
                <table className="dt">
                  <thead><tr>{["Ticket","Patient","Phone","Triage","Score","Action","Served"].map(h=><th key={h}>{h}</th>)}</tr></thead>
                  <tbody>
                    {served.map((p,i)=>{const t=T[p.triage_level]||T.ROUTINE;return(
                      <tr key={p.id+i}>
                        <td><span className="mono" style={{fontSize:12,color:"var(--muted)"}}>{p.ticket}</span></td>
                        <td><span style={{fontWeight:700,fontSize:13}}>{p.name}</span></td>
                        <td><span style={{fontSize:12,color:"var(--muted)"}}>{p.phone||"—"}</span></td>
                        <td><span className={t.cls} style={{borderRadius:7,padding:"3px 9px",fontSize:11,fontWeight:700}}>{t.label}</span></td>
                        <td><span className="mono" style={{fontWeight:700,color:t.color}}>{p.priority_score}</span></td>
                        <td style={{color:"var(--muted)",fontSize:12}}>{p.recommended_action}</td>
                        <td className="mono" style={{fontSize:11,color:"var(--muted2)"}}>{ago(p.servedAt)}</td>
                      </tr>
                    );})}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
// SMS CENTRE
// ══════════════════════════════════════════════════════════════════
function SMSCentre({queue,served,smsLog,dispatchSMS,smsBusy,setSmsBusy,showToast}){
  const allPatients=[...queue,...served];
  const withPhone=allPatients.filter(p=>p.phone);
  const [selected,setSelected]=useState([]);
  const [customMsg,setCustomMsg]=useState("");
  const [sending,setSending]=useState(false);
  const [activePanel,setActivePanel]=useState("compose"); // compose | log

  const toggleSelect=id=>setSelected(s=>s.includes(id)?s.filter(x=>x!==id):[...s,id]);
  const selectAll=()=>setSelected(withPhone.map(p=>p.id));
  const clearAll=()=>setSelected([]);

  const applyTemplate=(fn,...args)=>{
    if(selected.length===0){showToast("Select at least one patient first.","error");return;}
    const p=allPatients.find(x=>x.id===selected[0]);
    if(p) setCustomMsg(fn(p.name,...args));
  };

  const sendToSelected=async()=>{
    if(selected.length===0){showToast("Select at least one patient.","error");return;}
    if(!customMsg.trim()){showToast("Message cannot be empty.","error");return;}
    setSending(true);
    let ok=0;
    for(const id of selected){
      const p=allPatients.find(x=>x.id===id);
      if(p&&p.phone){
        const msg=customMsg.replace("{name}",p.name).replace("{ticket}",p.ticket);
        const res=await dispatchSMS(p,msg,"manual");
        if(res) ok++;
      }
    }
    showToast(`${ok} SMS message${ok!==1?"s":""} dispatched.`);
    setSending(false);
    setCustomMsg("");
    setSelected([]);
    setActivePanel("log");
  };

  const sendPositionUpdates=async()=>{
    const sorted=[...queue].sort((a,b)=>b.priority_score-a.priority_score);
    const pts=sorted.filter(p=>p.phone);
    if(pts.length===0){showToast("No patients in queue with phone numbers.","error");return;}
    setSending(true);
    for(let i=0;i<pts.length;i++){
      const p=pts[i];
      await dispatchSMS(p,TEMPLATES.QUEUE_UPDATE(p.name,i+1,p.estimated_wait_minutes),"auto-update");
    }
    showToast(`Position updates sent to ${pts.length} patient${pts.length!==1?"s":""}.`);
    setSending(false);
  };

  const QUICK=[
    {label:"Queue confirmation",fn:()=>applyTemplate((n)=>`Hi ${n}, you have been added to our queue. Please remain nearby — we will SMS you when it is your turn. - QFlowAI`)},
    {label:"Expected wait update",fn:()=>applyTemplate((n)=>`Hi ${n}, your estimated wait time has been updated. Please check in with reception if you have any concerns. - QFlowAI`)},
    {label:"Proceed to room",fn:()=>applyTemplate((n)=>`${n}, it is your turn. Please proceed to the consultation room now. Thank you for your patience. - QFlowAI`)},
    {label:"Bring ID documents",fn:()=>applyTemplate((n)=>`Hi ${n}, please ensure you have your ID document and medical aid card ready when called. - QFlowAI`)},
  ];

  return(
    <div className="fi">
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:22}}>
        <div>
          <h2 style={{fontSize:20,fontWeight:800,letterSpacing:"-0.5px"}}>SMS Centre</h2>
          <p style={{fontSize:12,color:"var(--muted)",marginTop:3}}>Send personalised messages to patients via Africa's Talking</p>
        </div>
        <div style={{display:"flex",gap:8}}>
          <button onClick={sendPositionUpdates} disabled={sending} className="btn-g" style={{padding:"9px 16px",fontSize:13,display:"flex",alignItems:"center",gap:7}}>
            <RefreshCw size={13}/> Send Position Updates
          </button>
          <div style={{display:"flex",background:"var(--surface)",borderRadius:10,padding:3,border:"1px solid var(--border)"}}>
            {[{id:"compose",label:"Compose",Icon:Send},{id:"log",label:"SMS Log",Icon:ClipboardList}].map(({id,label,Icon:I})=>(
              <button key={id} onClick={()=>setActivePanel(id)} style={{padding:"7px 14px",borderRadius:8,fontWeight:600,fontSize:12,cursor:"pointer",border:"none",transition:"all 0.18s",background:activePanel===id?"var(--sf2)":"transparent",color:activePanel===id?"var(--text)":"var(--muted)",display:"flex",alignItems:"center",gap:6}}>
                <I size={12}/>{label}
                {id==="log"&&smsLog.length>0&&<span style={{background:"var(--accent)",color:"var(--bg)",borderRadius:20,padding:"1px 6px",fontSize:9,fontWeight:800}}>{smsLog.length}</span>}
              </button>
            ))}
          </div>
        </div>
      </div>

      {activePanel==="compose"&&(
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:18}}>
          {/* Patient selector */}
          <div className="card" style={{padding:"20px"}}>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:14}}>
              <div style={{fontSize:14,fontWeight:700,display:"flex",alignItems:"center",gap:8}}><Users size={14} color="var(--accent)"/>Select Recipients</div>
              <div style={{display:"flex",gap:8}}>
                <button onClick={selectAll} style={{background:"none",border:"none",cursor:"pointer",fontSize:11,color:"var(--accent)",fontWeight:600}}>All</button>
                <span style={{color:"var(--muted2)"}}>·</span>
                <button onClick={clearAll} style={{background:"none",border:"none",cursor:"pointer",fontSize:11,color:"var(--muted)",fontWeight:600}}>None</button>
              </div>
            </div>
            {withPhone.length===0?(
              <div style={{textAlign:"center",padding:"30px 0",color:"var(--muted)"}}>
                <Phone size={32} color="var(--muted2)" strokeWidth={1.4} style={{margin:"0 auto 10px",display:"block"}}/>
                <div style={{fontSize:13}}>No patients with phone numbers</div>
                <div style={{fontSize:11,marginTop:4}}>Add phone numbers when registering patients</div>
              </div>
            ):(
              <div style={{display:"flex",flexDirection:"column",gap:6,maxHeight:380,overflowY:"auto"}}>
                {withPhone.map(p=>{
                  const t=T[p.triage_level]||T.ROUTINE;
                  const isSel=selected.includes(p.id);
                  const inQueue=queue.some(x=>x.id===p.id);
                  return(
                    <div key={p.id} className="patient-select-row" onClick={()=>toggleSelect(p.id)} style={{borderColor:isSel?"var(--accent)":"var(--border)",background:isSel?"rgba(0,212,255,0.06)":"transparent"}}>
                      <div style={{width:18,height:18,borderRadius:5,border:`2px solid ${isSel?"var(--accent)":"var(--muted2)"}`,background:isSel?"var(--accent)":"transparent",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,transition:"all 0.15s"}}>
                        {isSel&&<CheckCircle size={10} color="var(--bg)" strokeWidth={3}/>}
                      </div>
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{display:"flex",alignItems:"center",gap:7}}>
                          <span style={{fontWeight:600,fontSize:13}}>{p.name}</span>
                          <span className={t.cls} style={{borderRadius:5,padding:"1px 7px",fontSize:10,fontWeight:700}}>{t.label}</span>
                          {inQueue&&<span style={{fontSize:10,color:"var(--accent)",fontWeight:600}}>In Queue</span>}
                        </div>
                        <div style={{fontSize:11,color:"var(--muted)",marginTop:2,display:"flex",alignItems:"center",gap:4}}>
                          <Phone size={9}/>{p.phone} · Ticket {p.ticket}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            {selected.length>0&&<div style={{marginTop:12,padding:"8px 12px",background:"rgba(0,212,255,0.06)",border:"1px solid rgba(0,212,255,0.2)",borderRadius:8,fontSize:12,color:"var(--accent)",fontWeight:600,textAlign:"center"}}>{selected.length} patient{selected.length!==1?"s":""} selected</div>}
          </div>

          {/* Compose panel */}
          <div style={{display:"flex",flexDirection:"column",gap:14}}>
            {/* Quick templates */}
            <div className="card" style={{padding:"18px 20px"}}>
              <div style={{fontSize:14,fontWeight:700,marginBottom:12,display:"flex",alignItems:"center",gap:8}}><Zap size={14} color="var(--accent)"/>Quick Templates</div>
              <div style={{display:"flex",flexDirection:"column",gap:7}}>
                {QUICK.map(({label,fn},i)=>(
                  <button key={i} className="template-btn" onClick={fn}>
                    <div style={{fontSize:12,fontWeight:600,color:"var(--text)"}}>{label}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Message composer */}
            <div className="card" style={{padding:"18px 20px",flex:1}}>
              <div style={{fontSize:14,fontWeight:700,marginBottom:12,display:"flex",alignItems:"center",gap:8,justifyContent:"space-between"}}>
                <span style={{display:"flex",alignItems:"center",gap:8}}><MessageSquare size={14} color="var(--accent)"/>Message</span>
                <span style={{fontSize:11,color:"var(--muted)",fontWeight:400}}>{customMsg.length}/160 chars</span>
              </div>
              <textarea className="inp" value={customMsg} onChange={e=>setCustomMsg(e.target.value)} placeholder="Type your message here. Use {name} for patient name and {ticket} for ticket number. These will be personalised for each recipient..." rows={6} style={{resize:"vertical",marginBottom:12}}/>
              <div style={{fontSize:11,color:"var(--muted2)",marginBottom:14,lineHeight:1.6}}>
                Variables: <span style={{color:"var(--accent)",fontWeight:600}}>{"{name}"}</span> · <span style={{color:"var(--accent)",fontWeight:600}}>{"{ticket}"}</span> — replaced per patient automatically.
              </div>
              <button onClick={sendToSelected} disabled={sending||!customMsg.trim()||selected.length===0} className="btn-sms" style={{width:"100%",padding:"13px",fontSize:14,display:"flex",alignItems:"center",justifyContent:"center",gap:9}}>
                {sending?<><Spin/>Sending SMS...</>:<><Send size={15}/>Send to {selected.length||0} Patient{selected.length!==1?"s":""}</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {activePanel==="log"&&(
        <div className="card" style={{overflow:"hidden"}}>
          {smsLog.length===0?(
            <div style={{textAlign:"center",padding:"64px",color:"var(--muted)"}}>
              <div style={{display:"flex",justifyContent:"center",marginBottom:14}}><MessageCircle size={44} color="var(--muted2)" strokeWidth={1.4}/></div>
              <div style={{fontWeight:600,fontSize:15}}>No SMS messages sent yet</div>
              <div style={{fontSize:13,marginTop:4}}>Messages will appear here once dispatched</div>
            </div>
          ):(
            <div style={{padding:"8px 4px"}}>
              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"8px 16px 16px"}}>
                <div style={{fontSize:13,fontWeight:700,color:"var(--text)"}}>{smsLog.length} message{smsLog.length!==1?"s":""} total</div>
                <div style={{display:"flex",gap:14,fontSize:12}}>
                  <span style={{color:"var(--green)",fontWeight:600}}>{smsLog.filter(s=>s.status==="sent").length} sent</span>
                  <span style={{color:"var(--yellow)",fontWeight:600}}>{smsLog.filter(s=>s.status==="sending").length} pending</span>
                  <span style={{color:"var(--red)",fontWeight:600}}>{smsLog.filter(s=>s.status==="failed").length} failed</span>
                </div>
              </div>
              <div style={{maxHeight:480,overflowY:"auto",padding:"0 12px"}}>
                {smsLog.map(s=>(
                  <div key={s.id} className={`sms-log-item ${s.status==="sent"?"sms-sent":s.status==="failed"?"sms-failed":"sms-pending"}`}>
                    <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:6}}>
                      <div style={{display:"flex",alignItems:"center",gap:10}}>
                        {s.status==="sent"   &&<CheckCircle size={13} color="var(--green)"/>}
                        {s.status==="failed" &&<AlertTriangle size={13} color="var(--red)"/>}
                        {s.status==="sending"&&<Spin size={13}/>}
                        <span style={{fontWeight:700,fontSize:13}}>{s.name}</span>
                        <span style={{fontSize:11,color:"var(--muted)"}}>{s.to}</span>

                      </div>
                      <div style={{display:"flex",alignItems:"center",gap:8}}>
                        <span style={{fontSize:10,color:"var(--muted2)",fontFamily:"'Courier New',monospace"}}>{ago(s.time)}</span>
                        <span style={{fontSize:10,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.5px",color:s.status==="sent"?"var(--green)":s.status==="failed"?"var(--red)":"var(--yellow)"}}>{s.status}</span>
                      </div>
                    </div>
                    <div style={{fontSize:12,color:"var(--muted)",lineHeight:1.6,background:"rgba(0,0,0,0.2)",padding:"8px 10px",borderRadius:6}}>{s.message}</div>
                    <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginTop:5}}>
                      <div style={{fontSize:10,color:"var(--muted2)",textTransform:"uppercase",letterSpacing:"0.5px"}}>{s.type==="auto-register"?"Auto: Registration":s.type==="auto-call"?"Auto: Called to room":s.type==="auto-update"?"Auto: Position update":"Manual"}</div>
                      <div style={{display:"flex",gap:8,alignItems:"center"}}>
                        {s.messageId&&<span style={{fontSize:10,color:"var(--green)",fontFamily:"'Courier New',monospace"}}>ID: {s.messageId}</span>}
                        {s.errorMsg&&<span style={{fontSize:10,color:"var(--red)"}}>{s.errorMsg}</span>}
                        {s.simulated&&<span style={{fontSize:10,background:"rgba(255,212,38,0.1)",border:"1px solid rgba(255,212,38,0.3)",color:"var(--yellow)",padding:"1px 6px",borderRadius:4,fontWeight:600}}>CORS PROXY</span>}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Small helpers ────────────────────────────────────────────────
const LBL={display:"block",fontSize:11,fontWeight:700,color:"var(--muted)",marginBottom:7,textTransform:"uppercase",letterSpacing:"0.5px"};

function FI({label,Icon,children}){
  return(
    <div>
      <label style={LBL}>{label}</label>
      <div style={{position:"relative"}}>
        <Icon size={14} color="var(--muted)" style={{position:"absolute",left:13,top:"50%",transform:"translateY(-50%)",pointerEvents:"none"}}/>
        {children}
      </div>
    </div>
  );
}

function Spin(){return <span style={{width:15,height:15,border:"2px solid rgba(5,10,20,0.3)",borderTopColor:"var(--bg)",borderRadius:"50%",display:"inline-block",animation:"spin 0.6s linear infinite"}}/>;}

function Logo({small}){
  return(
    <div style={{display:"flex",alignItems:"center",gap:9}}>
      <div style={{width:small?30:34,height:small?30:34,borderRadius:small?8:9,background:"linear-gradient(135deg,#00d4ff,#10f59e)",display:"flex",alignItems:"center",justifyContent:"center",boxShadow:"0 0 16px rgba(0,212,255,0.28)",flexShrink:0}}>
        <Activity size={small?16:18} color="#050a14" strokeWidth={2.5}/>
      </div>
      <span style={{fontSize:small?15:17,fontWeight:800,letterSpacing:"-0.3px",background:"linear-gradient(135deg,#e8f4ff,#a8d8f0)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",backgroundClip:"text"}}>
        QFlow<span style={{background:"linear-gradient(135deg,#00d4ff,#10f59e)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",backgroundClip:"text"}}>AI</span>
      </span>
    </div>
  );
}
