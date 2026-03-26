import { useState, useEffect, useRef, useCallback, useMemo } from "react";

// ── Storage helpers ──────────────────────────────────────────────────────────
const S = {
  async get(key, shared = true) {
    try { const r = await window.storage.get(key, shared); return r ? JSON.parse(r.value) : null; }
    catch { return null; }
  },
  async set(key, val, shared = true) {
    try { await window.storage.set(key, JSON.stringify(val), shared); }
    catch {}
  }
};

// ── Claude API ───────────────────────────────────────────────────────────────
async function askClaude(messages, system = "") {
  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1000,
        system,
        messages
      })
    });
    const d = await res.json();
    return d.content?.[0]?.text || "✨ (no response)";
  } catch { return "Connection hiccup — try again! 💫"; }
}

// ── Daily Questions ──────────────────────────────────────────────────────────
const DAILY_QS = [
  "What's your favorite memory of us so far? 💭",
  "If we could teleport anywhere right now, where would you take me? 🌍",
  "What's one small thing I do that makes you smile? 😊",
  "Describe our perfect lazy Sunday together 🛋️",
  "What song makes you think of me instantly? 🎵",
  "What's something you want to teach me someday? 📚",
  "If you could send me one thing right now, what would it be? 🎁",
  "What's your dream trip we should take together? ✈️",
  "What's a silly little habit of mine you secretly love? 🥹",
  "What's the first thing you want to do when we're finally together? 🤍",
  "Describe how you feel when we talk every day 💬",
  "What movie would you pick for our next watch night? 🎬",
  "What's one thing you wish I knew about how much I mean to you? 💌",
  "If today was a color, what would it be and why? 🎨",
  "What's a goal you want us to achieve together? 🌟",
  "What's your favorite thing we've ever talked about? 💫",
  "If you could be anywhere with me right now, where would it be? 🗺️",
  "What's one small ritual you want us to start? ☕",
  "What's the weirdest thing you've missed about me? 😄",
  "What always makes you think of me when I'm not around? 🌙",
  "Describe our future together in three words 🔮",
  "What's a memory you want us to make soon? 📷",
  "What's something I said that stayed with you? 🌸",
  "If tonight was our date night, what would we do? 🕯️",
  "What do you love most about how we communicate? 💞",
  "If you could pause time with me, when would you pick? ⏸️",
  "What's your favorite thing about our relationship? 🫶",
  "What emoji describes your mood when you think of me? 💭",
  "What's one thing you want to know about my day today? 🌤️",
  "What's the sweetest thing you've ever done for someone? 🍀"
];

const getDailyQ = () => {
  const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0)) / 86400000);
  return DAILY_QS[dayOfYear % DAILY_QS.length];
};

// ── Global CSS ───────────────────────────────────────────────────────────────
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,600;0,700;1,400&family=Nunito:wght@300;400;600;700;800&display=swap');
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:'Nunito',sans-serif;color:#f0e6ff;overflow:hidden;background:#050210}
::-webkit-scrollbar{width:3px}
::-webkit-scrollbar-track{background:transparent}
::-webkit-scrollbar-thumb{background:rgba(255,110,180,0.35);border-radius:2px}

@keyframes twinkle{0%,100%{opacity:.2;transform:scale(1)}50%{opacity:1;transform:scale(1.4)}}
@keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-8px)}}
@keyframes slideUp{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)}}
@keyframes slideDown{from{opacity:0;transform:translateY(-14px)}to{opacity:1;transform:translateY(0)}}
@keyframes glow{0%,100%{box-shadow:0 0 10px rgba(255,110,180,.25)}50%{box-shadow:0 0 28px rgba(255,110,180,.5),0 0 50px rgba(177,111,247,.2)}}
@keyframes spin{to{transform:rotate(360deg)}}
@keyframes heartbeat{0%,100%{transform:scale(1)}30%{transform:scale(1.22)}60%{transform:scale(1.1)}}
@keyframes toastIn{from{opacity:0;transform:translateX(60px)}to{opacity:1;transform:translateX(0)}}
@keyframes toastOut{from{opacity:1;transform:translateX(0)}to{opacity:0;transform:translateX(60px)}}
@keyframes badgePop{0%{transform:scale(0)}70%{transform:scale(1.3)}100%{transform:scale(1)}}
@keyframes shimmer{0%{background-position:-200% center}100%{background-position:200% center}}
@keyframes missHeart{0%{transform:scale(1) rotate(0deg)}25%{transform:scale(1.3) rotate(-8deg)}50%{transform:scale(1.1) rotate(4deg)}75%{transform:scale(1.25) rotate(-4deg)}100%{transform:scale(1) rotate(0deg)}}

.glass{background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08);backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px)}
.glass-hi{background:rgba(255,255,255,.07);border:1px solid rgba(255,255,255,.13);backdrop-filter:blur(22px);-webkit-backdrop-filter:blur(22px)}

.btn{background:linear-gradient(135deg,#ff6eb4,#b16ff7);border:none;color:#fff;padding:10px 22px;border-radius:50px;font-family:'Nunito',sans-serif;font-weight:700;cursor:pointer;transition:all .18s;font-size:13px;letter-spacing:.02em}
.btn:hover{transform:translateY(-2px);filter:brightness(1.1)}
.btn:active{transform:translateY(0)}
.btn:disabled{opacity:.5;cursor:default;transform:none}

.btn-ghost{background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.11);color:rgba(240,230,255,.75);padding:7px 16px;border-radius:50px;font-family:'Nunito',sans-serif;font-weight:600;cursor:pointer;transition:all .18s;font-size:12px}
.btn-ghost:hover{background:rgba(255,255,255,.1);color:#f0e6ff}
.btn-ghost.active{background:linear-gradient(135deg,rgba(255,110,180,.25),rgba(177,111,247,.25));border-color:rgba(255,110,180,.4);color:#ff6eb4}

.miss-btn{background:linear-gradient(135deg,rgba(255,80,100,.18),rgba(255,110,180,.12));border:1px solid rgba(255,110,180,.3);color:#ff6eb4;padding:7px 14px;border-radius:50px;font-family:'Nunito',sans-serif;font-weight:800;cursor:pointer;transition:all .18s;font-size:12px;display:flex;align-items:center;gap:5px;letter-spacing:.01em}
.miss-btn:hover{background:linear-gradient(135deg,rgba(255,80,100,.28),rgba(255,110,180,.22));transform:scale(1.04)}
.miss-btn:active{transform:scale(.97)}
.miss-btn.sent{animation:heartbeat .5s ease}

.field{background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.12);border-radius:12px;padding:10px 14px;color:#f0e6ff;font-family:'Nunito',sans-serif;font-size:14px;outline:none;transition:border-color .2s;width:100%}
.field:focus{border-color:#ff6eb4}
.field::placeholder{color:rgba(240,230,255,.28)}

.tab{flex:1;padding:10px 2px;background:transparent;border:none;color:rgba(240,230,255,.38);cursor:pointer;font-family:'Nunito',sans-serif;font-size:10px;font-weight:700;display:flex;flex-direction:column;align-items:center;gap:3px;transition:color .2s;text-transform:uppercase;letter-spacing:.06em;position:relative}
.tab.on{color:#ff6eb4}
.tab .ico{font-size:19px}

.badge{position:absolute;top:5px;right:calc(50% - 16px);background:linear-gradient(135deg,#ff6eb4,#b16ff7);border-radius:50%;width:14px;height:14px;font-size:8px;font-weight:900;display:flex;align-items:center;justify-content:center;color:#fff;animation:badgePop .3s ease;border:1.5px solid #050210}

.msg{max-width:76%;padding:10px 14px;border-radius:16px;font-size:13.5px;line-height:1.55;animation:slideUp .22s ease}
.msg-me{background:linear-gradient(135deg,rgba(255,110,180,.22),rgba(177,111,247,.22));border:1px solid rgba(255,110,180,.28);align-self:flex-end;border-bottom-right-radius:3px}
.msg-them{background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.09);align-self:flex-start;border-bottom-left-radius:3px}
.msg-ai{background:linear-gradient(135deg,rgba(255,215,0,.1),rgba(177,111,247,.14));border:1px solid rgba(255,215,0,.22);align-self:flex-start;border-bottom-left-radius:3px}
.msg-surprise{background:linear-gradient(135deg,rgba(255,80,100,.15),rgba(255,110,180,.12));border:1px solid rgba(255,110,180,.4);align-self:flex-start;border-bottom-left-radius:3px;animation:glow 3s ease-in-out 3}

.cell{aspect-ratio:1;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.1);border-radius:12px;font-size:30px;cursor:pointer;transition:background .18s;display:flex;align-items:center;justify-content:center}
.cell:hover{background:rgba(255,110,180,.1)}

.toast-wrap{position:fixed;top:14px;right:14px;z-index:9999;display:flex;flex-direction:column;gap:8px;pointer-events:none;max-width:280px}
.toast{background:rgba(18,8,40,.92);border:1px solid rgba(255,110,180,.35);backdrop-filter:blur(18px);border-radius:14px;padding:11px 15px;display:flex;align-items:center;gap:10px;animation:toastIn .3s ease forwards;box-shadow:0 4px 24px rgba(0,0,0,.5)}
.toast.out{animation:toastOut .3s ease forwards}
.toast-emoji{font-size:22px;flex-shrink:0}
.toast-text{font-size:12.5px;font-weight:700;color:#f0e6ff;line-height:1.4}

.daily-q{background:linear-gradient(135deg,rgba(255,215,0,.07),rgba(177,111,247,.07));border:1px solid rgba(255,215,0,.2);border-radius:14px;padding:12px 14px;margin:0 14px 4px;animation:slideDown .3s ease}
.daily-q-label{font-size:10px;color:#ffd700;font-weight:800;letter-spacing:.09em;text-transform:uppercase;margin-bottom:4px}
.daily-q-text{font-size:13px;color:rgba(240,230,255,.8);line-height:1.5;font-style:italic}

.scheduler{background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.08);border-radius:14px;overflow:hidden;transition:all .25s}
.scheduler-head{padding:10px 14px;display:flex;align-items:center;justify-content:space-between;cursor:pointer}
.scheduler-body{padding:0 14px 14px;display:flex;flex-direction:column;gap:8px}

.select-field{background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.12);border-radius:10px;padding:9px 12px;color:#f0e6ff;font-family:'Nunito',sans-serif;font-size:13px;outline:none;cursor:pointer;width:100%}
.select-field option{background:#130828;color:#f0e6ff}

.starbg{position:fixed;inset:0;z-index:0;background:radial-gradient(ellipse at 20% 50%,rgba(177,111,247,.14) 0,transparent 50%),radial-gradient(ellipse at 80% 20%,rgba(255,110,180,.09) 0,transparent 42%),#050210}
.star{position:fixed;border-radius:50%;pointer-events:none;z-index:0}
`;

// ── TOAST ─────────────────────────────────────────────────────────────────────
function ToastContainer({ toasts }) {
  return (
    <div className="toast-wrap">
      {toasts.map(t => (
        <div key={t.id} className={`toast ${t.fading ? "out" : ""}`}>
          <span className="toast-emoji">{t.emoji}</span>
          <span className="toast-text">{t.text}</span>
        </div>
      ))}
    </div>
  );
}

// ── SETUP SCREEN ─────────────────────────────────────────────────────────────
function Setup({ onDone }) {
  const [name, setName] = useState("");
  const [partner, setPartner] = useState("");
  const go = () => { if (name.trim()) onDone(name.trim(), partner.trim() || "My Love"); };
  return (
    <div style={{ height:"100vh", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:28, padding:24 }}>
      <div style={{ textAlign:"center", animation:"float 3s ease-in-out infinite" }}>
        <div style={{ fontSize:56 }}>💫</div>
        <h1 style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:46, fontWeight:700,
          background:"linear-gradient(135deg,#ff6eb4,#b16ff7,#ffd700)", WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent",
          lineHeight:1.1, marginTop:8 }}>Stardust</h1>
        <p style={{ color:"rgba(240,230,255,.4)", fontSize:13.5, marginTop:5, letterSpacing:".04em" }}>your long-distance love space</p>
      </div>

      <div className="glass-hi" style={{ borderRadius:22, padding:28, width:"100%", maxWidth:360, display:"flex", flexDirection:"column", gap:16, animation:"glow 5s infinite" }}>
        {[["Your Name","e.g. Alex",name,setName],["Partner's Name","e.g. Jordan",partner,setPartner]].map(([label,ph,val,set])=>(
          <div key={label}>
            <p style={{ fontSize:11, color:"rgba(240,230,255,.4)", textTransform:"uppercase", letterSpacing:".08em", marginBottom:6 }}>{label}</p>
            <input className="field" placeholder={ph} value={val} onChange={e=>set(e.target.value)} onKeyDown={e=>e.key==="Enter"&&go()} />
          </div>
        ))}
        <button className="btn" onClick={go} style={{ marginTop:4, fontSize:14 }}>Enter Our Space 🚀</button>
      </div>

      <p style={{ fontSize:11.5, color:"rgba(240,230,255,.22)", textAlign:"center", maxWidth:280, lineHeight:1.6 }}>
        Share this page with your partner — chat, games, music & more update live in real time ✨
      </p>
    </div>
  );
}

// ── SURPRISE SCHEDULER ───────────────────────────────────────────────────────
function SurpriseScheduler({ me, partner }) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [delay, setDelay] = useState("5");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const schedule = async () => {
    if (!text.trim()) return;
    setSending(true);
    const existing = await S.get("surprise:msgs") || [];
    const msg = {
      id: Date.now(),
      by: me,
      for: partner,
      text: text.trim(),
      sendAt: Date.now() + parseInt(delay) * 60 * 1000,
      seen: false
    };
    await S.set("surprise:msgs", [...existing, msg]);
    setText(""); setSending(false); setSent(true);
    setTimeout(() => { setSent(false); setOpen(false); }, 2200);
  };

  const delayLabel = { "1":"1 minute","5":"5 minutes","15":"15 minutes","30":"30 minutes","60":"1 hour","180":"3 hours","480":"8 hours","1440":"Tomorrow" };

  return (
    <div className="scheduler" style={{ margin:"0 14px" }}>
      <div className="scheduler-head" onClick={()=>setOpen(o=>!o)}>
        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
          <span style={{ fontSize:16 }}>⏰</span>
          <span style={{ fontSize:12, fontWeight:700, color:"rgba(240,230,255,.6)" }}>Surprise Message Scheduler</span>
        </div>
        <span style={{ color:"rgba(240,230,255,.3)", fontSize:13 }}>{open?"▲":"▼"}</span>
      </div>

      {open && (
        <div className="scheduler-body">
          {sent ? (
            <div style={{ textAlign:"center", padding:"16px 0", animation:"slideUp .3s ease" }}>
              <div style={{ fontSize:32, marginBottom:6 }}>💌</div>
              <p style={{ fontSize:13, color:"#ff6eb4", fontWeight:700 }}>Scheduled! {partner} won't know 🤫</p>
            </div>
          ) : (
            <>
              <textarea className="field" placeholder={`Write something sweet for ${partner}...`}
                value={text} onChange={e=>setText(e.target.value)}
                style={{ resize:"none", height:72, fontSize:13 }} />
              <div style={{ display:"flex", gap:8, alignItems:"center" }}>
                <div style={{ flex:1 }}>
                  <p style={{ fontSize:10, color:"rgba(240,230,255,.35)", textTransform:"uppercase", letterSpacing:".07em", marginBottom:4 }}>Send in...</p>
                  <select className="select-field" value={delay} onChange={e=>setDelay(e.target.value)}>
                    {Object.entries(delayLabel).map(([v,l])=>(
                      <option key={v} value={v}>{l}</option>
                    ))}
                  </select>
                </div>
                <button className="btn" onClick={schedule} disabled={sending||!text.trim()}
                  style={{ padding:"9px 16px", marginTop:18, whiteSpace:"nowrap" }}>
                  {sending ? "..." : "Schedule 💌"}
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ── CHAT TAB ─────────────────────────────────────────────────────────────────
function Chat({ me, partner, onRead }) {
  const [msgs, setMsgs] = useState([]);
  const [inp, setInp] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [showQ, setShowQ] = useState(true);
  const bottom = useRef(null);
  const dailyQ = useMemo(() => getDailyQ(), []);

  const load = useCallback(async () => {
    const d = await S.get("chat:msgs"); if (d) setMsgs(d);
  }, []);

  useEffect(() => { load(); const t = setInterval(load, 1800); return () => clearInterval(t); }, [load]);
  useEffect(() => { bottom.current?.scrollIntoView({ behavior:"smooth" }); }, [msgs]);
  useEffect(() => { onRead?.(); }, [msgs, onRead]);

  const send = async () => {
    if (!inp.trim()) return;
    const m = { id:Date.now(), user:me, text:inp.trim(), ts:Date.now() };
    const next = [...msgs, m];
    setMsgs(next); await S.set("chat:msgs", next); setInp("");
  };

  const sendQ = async () => {
    const m = { id:Date.now(), user:me, text:`💛 Daily question: ${dailyQ}`, ts:Date.now() };
    const next = [...msgs, m];
    setMsgs(next); await S.set("chat:msgs", next); setShowQ(false);
  };

  const spark = async () => {
    setAiLoading(true);
    const ctx = msgs.slice(-6).map(m=>`${m.user}: ${m.text}`).join("\n");
    const prompt = ctx
      ? `Recent chat:\n${ctx}\n\nGive a fun conversation spark or activity idea for the couple!`
      : "Give a sweet conversation starter or virtual date idea for a long-distance couple!";
    const reply = await askClaude([{ role:"user", content:prompt }],
      "You are Stardust, a warm playful AI for a couple in long-distance. Keep replies concise (2-3 sentences). Be encouraging and fun with occasional emojis.");
    const ai = { id:Date.now(), user:"✨ Stardust AI", text:reply, ts:Date.now(), isAI:true };
    const next = [...msgs, ai];
    setMsgs(next); await S.set("chat:msgs", next); setAiLoading(false);
  };

  return (
    <div style={{ display:"flex", flexDirection:"column", height:"100%" }}>
      {/* Daily Question Banner */}
      {showQ && (
        <div className="daily-q">
          <div className="daily-q-label">✨ Today's Question</div>
          <div className="daily-q-text">{dailyQ}</div>
          <div style={{ display:"flex", gap:8, marginTop:8 }}>
            <button className="btn" onClick={sendQ} style={{ padding:"5px 13px", fontSize:11 }}>Send to Chat 💬</button>
            <button className="btn-ghost" onClick={()=>setShowQ(false)} style={{ padding:"5px 11px", fontSize:11 }}>Dismiss</button>
          </div>
        </div>
      )}

      <div style={{ flex:1, overflowY:"auto", padding:"12px 14px", display:"flex", flexDirection:"column", gap:8 }}>
        {msgs.length===0 && (
          <div style={{ margin:"auto", textAlign:"center", color:"rgba(240,230,255,.3)", padding:40 }}>
            <div style={{ fontSize:44, marginBottom:10 }}>💌</div>
            <p>Your messages appear here</p>
            <p style={{ fontSize:12, marginTop:5 }}>Both of you see everything in real time</p>
          </div>
        )}
        {msgs.map(m=>(
          <div key={m.id} className={`msg ${m.surprise ? "msg-surprise" : m.isAI ? "msg-ai" : m.user===me ? "msg-me" : "msg-them"}`}>
            <div style={{ fontSize:10, color:m.surprise?"#ff6eb4":"rgba(240,230,255,.4)", marginBottom:3, fontWeight:700, letterSpacing:".06em" }}>
              {m.surprise ? "💌 Surprise!" : m.user}
            </div>
            {m.text}
          </div>
        ))}
        <div ref={bottom} />
      </div>

      <div style={{ padding:"0 14px 8px" }}>
        <button onClick={spark} disabled={aiLoading} style={{
          width:"100%", background:"linear-gradient(135deg,rgba(255,215,0,.12),rgba(177,111,247,.12))",
          border:"1px solid rgba(255,215,0,.22)", borderRadius:11, padding:"7px 14px",
          color:"#ffd700", cursor:"pointer", fontSize:12, fontFamily:"'Nunito',sans-serif", fontWeight:700,
          opacity:aiLoading?.6:1, transition:"opacity .2s"
        }}>
          {aiLoading ? "✨ Thinking..." : "✨ AI Conversation Spark"}
        </button>
      </div>

      {/* Surprise Scheduler */}
      <SurpriseScheduler me={me} partner={partner} />

      <div style={{ padding:"8px 14px 14px", display:"flex", gap:8 }}>
        <input className="field" placeholder={`Message ${partner}... 💌`} value={inp}
          onChange={e=>setInp(e.target.value)} onKeyDown={e=>e.key==="Enter"&&send()} style={{ flex:1 }} />
        <button className="btn" onClick={send} style={{ padding:"10px 18px" }}>Send</button>
      </div>
    </div>
  );
}

// ── TIC-TAC-TOE ───────────────────────────────────────────────────────────────
function TTT({ me, partner }) {
  const E = Array(9).fill(null);
  const [board, setBoard] = useState(E);
  const [xNext, setXNext] = useState(true);
  const [scores, setScores] = useState({ X:0, O:0 });

  const load = useCallback(async () => {
    const s = await S.get("game:ttt");
    if (s) { setBoard(s.b); setXNext(s.x); setScores(s.sc||{X:0,O:0}); }
  }, []);
  useEffect(() => { load(); const t = setInterval(load, 1500); return () => clearInterval(t); }, [load]);

  const winner = (b) => {
    for (const [a,c,d] of [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]])
      if (b[a]&&b[a]===b[c]&&b[a]===b[d]) return b[a];
    return b.every(Boolean) ? "draw" : null;
  };

  const click = async (i) => {
    if (board[i]||winner(board)) return;
    const nb = [...board]; nb[i] = xNext?"X":"O";
    const w = winner(nb);
    const sc = { ...scores }; if (w&&w!=="draw") sc[w]=(sc[w]||0)+1;
    setBoard(nb); setXNext(!xNext); setScores(sc);
    await S.set("game:ttt", { b:nb, x:!xNext, sc });
  };
  const reset = async () => { const sc=scores; setBoard(E); setXNext(true); await S.set("game:ttt",{b:E,x:true,sc}); };

  const w = winner(board);
  return (
    <div style={{ padding:16, display:"flex", flexDirection:"column", alignItems:"center", gap:16 }}>
      <div style={{ display:"flex", gap:20 }}>
        {[[me,"X","#ff6eb4"],[partner,"O","#b16ff7"]].map(([n,sym,col])=>(
          <div key={n} className="glass" style={{ padding:"10px 20px", borderRadius:14, textAlign:"center" }}>
            <div style={{ fontSize:22 }}>{sym==="X"?"❌":"⭕"}</div>
            <div style={{ fontSize:11, color:"rgba(240,230,255,.5)", marginTop:2 }}>{n}</div>
            <div style={{ fontSize:26, fontWeight:800, color:col, marginTop:1 }}>{scores[sym]||0}</div>
          </div>
        ))}
      </div>
      <p style={{ fontSize:14, color:"rgba(240,230,255,.7)" }}>
        {w ? (w==="draw"?"🤝 Draw!":`🎉 ${w==="X"?me:partner} wins!`) : `${xNext?"❌":"⭕"} ${xNext?me:partner}'s turn`}
      </p>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(3,88px)", gap:8 }}>
        {board.map((c,i)=>(
          <button key={i} className="cell" onClick={()=>click(i)}
            style={{ color:c==="X"?"#ff6eb4":"#b16ff7", cursor:c||w?"default":"pointer" }}>
            {c==="X"?"❌":c==="O"?"⭕":""}
          </button>
        ))}
      </div>
      <button className="btn-ghost" onClick={reset}>New Game 🔄</button>
    </div>
  );
}

// ── CONNECT FOUR ──────────────────────────────────────────────────────────────
function C4({ me, partner }) {
  const R=6, C=7;
  const empty = () => Array(R).fill(null).map(()=>Array(C).fill(null));
  const [board, setBoard] = useState(empty());
  const [isRed, setIsRed] = useState(true);
  const [scores, setScores] = useState({ R:0, Y:0 });
  const [wc, setWc] = useState([]);

  const load = useCallback(async () => {
    const s = await S.get("game:c4");
    if (s) { setBoard(s.b); setIsRed(s.r); setScores(s.sc||{R:0,Y:0}); setWc(s.wc||[]); }
  }, []);
  useEffect(() => { load(); const t = setInterval(load, 1500); return () => clearInterval(t); }, [load]);

  const checkW = (b) => {
    for (let r=0;r<R;r++) for (let c2=0;c2<C;c2++) {
      const p=b[r][c2]; if(!p) continue;
      for (const [dr,dc] of [[0,1],[1,0],[1,1],[1,-1]]) {
        const cells=[[r,c2]];
        for (let k=1;k<4;k++) {
          const nr=r+dr*k,nc=c2+dc*k;
          if(nr<0||nr>=R||nc<0||nc>=C||b[nr][nc]!==p) break;
          cells.push([nr,nc]);
        }
        if(cells.length===4) return { p, cells };
      }
    }
    return b.every(row=>row.every(Boolean)) ? { p:"draw" } : null;
  };

  const drop = async (col) => {
    const res=checkW(board); if(res) return;
    let row=-1; for(let r=R-1;r>=0;r--) { if(!board[r][col]){row=r;break;} }
    if(row===-1) return;
    const nb=board.map(r=>[...r]); nb[row][col]=isRed?"R":"Y";
    const nr2=checkW(nb);
    const sc={...scores}; let nwc=[];
    if(nr2?.p&&nr2.p!=="draw"){ sc[nr2.p]=(sc[nr2.p]||0)+1; nwc=nr2.cells||[]; }
    setBoard(nb); setIsRed(!isRed); setScores(sc); setWc(nwc);
    await S.set("game:c4",{b:nb,r:!isRed,sc,wc:nwc});
  };
  const reset = async () => { const sc=scores; setBoard(empty()); setIsRed(true); setWc([]);
    await S.set("game:c4",{b:empty(),r:true,sc,wc:[]}); };

  const isW=(r,c2)=>wc.some(([wr,wc2])=>wr===r&&wc2===c2);
  const res=checkW(board);

  return (
    <div style={{ padding:16, display:"flex", flexDirection:"column", alignItems:"center", gap:12 }}>
      <div style={{ display:"flex", gap:18 }}>
        {[[me,"R","#ff6eb4"],[partner,"Y","#ffd700"]].map(([n,sym,col])=>(
          <div key={n} className="glass" style={{ padding:"8px 18px", borderRadius:14, textAlign:"center" }}>
            <div style={{ width:18, height:18, borderRadius:"50%", background:col, margin:"0 auto 3px", boxShadow:`0 0 8px ${col}` }} />
            <div style={{ fontSize:11, color:"rgba(240,230,255,.5)" }}>{n}</div>
            <div style={{ fontSize:22, fontWeight:800, color:col }}>{scores[sym]||0}</div>
          </div>
        ))}
      </div>
      <p style={{ fontSize:13.5, color:"rgba(240,230,255,.7)" }}>
        {res ? (res.p==="draw"?"🤝 Draw!":`🎉 ${res.p==="R"?me:partner} wins!`) : `${isRed?me:partner}'s turn`}
      </p>
      <div style={{ background:"rgba(177,111,247,.09)", borderRadius:14, padding:10, border:"1px solid rgba(177,111,247,.2)" }}>
        <div style={{ display:"grid", gridTemplateColumns:`repeat(${C},38px)`, gap:4, marginBottom:6 }}>
          {Array(C).fill(0).map((_,c2)=>(
            <button key={c2} onClick={()=>drop(c2)} style={{
              height:22, background:"transparent", border:"none", cursor:"pointer",
              color:isRed?"#ff6eb4":"#ffd700", fontSize:13
            }}>▼</button>
          ))}
        </div>
        {board.map((row,r)=>(
          <div key={r} style={{ display:"grid", gridTemplateColumns:`repeat(${C},38px)`, gap:4, marginBottom:4 }}>
            {row.map((cell,c2)=>(
              <div key={c2} style={{
                width:38, height:38, borderRadius:"50%",
                background:cell==="R"?"#ff6eb4":cell==="Y"?"#ffd700":"rgba(255,255,255,.05)",
                border:`2px solid ${cell==="R"?"rgba(255,110,180,.5)":cell==="Y"?"rgba(255,215,0,.5)":"rgba(255,255,255,.07)"}`,
                boxShadow:isW(r,c2)?`0 0 14px ${cell==="R"?"#ff6eb4":"#ffd700"},0 0 4px #fff`:"none",
                transition:"all .2s"
              }} />
            ))}
          </div>
        ))}
      </div>
      <button className="btn-ghost" onClick={reset}>New Game 🔄</button>
    </div>
  );
}

// ── GAMES ─────────────────────────────────────────────────────────────────────
function Games({ me, partner }) {
  const [g, setG] = useState("ttt");
  return (
    <div style={{ display:"flex", flexDirection:"column", height:"100%" }}>
      <div style={{ display:"flex", gap:8, padding:"12px 16px 0" }}>
        {[["ttt","Tic-Tac-Toe"],["c4","Connect Four"]].map(([id,lbl])=>(
          <button key={id} className={`btn-ghost ${g===id?"active":""}`} onClick={()=>setG(id)}>{lbl}</button>
        ))}
      </div>
      <div style={{ flex:1, overflowY:"auto" }}>
        {g==="ttt"?<TTT me={me} partner={partner}/>:<C4 me={me} partner={partner}/>}
      </div>
    </div>
  );
}

// ── WATCH TAB ─────────────────────────────────────────────────────────────────
function Watch({ me }) {
  const [url, setUrl] = useState("");
  const [inp, setInp] = useState("");

  const load = useCallback(async () => { const s=await S.get("watch:url"); if(s?.url) setUrl(s.url); }, []);
  useEffect(() => { load(); const t=setInterval(load,3000); return ()=>clearInterval(t); }, [load]);

  const ytId = (u) => u.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/)?.[1];

  const set = async () => {
    const id=ytId(inp.trim());
    if(!id){ alert("Please enter a valid YouTube URL!"); return; }
    const embed=`https://www.youtube.com/embed/${id}`;
    await S.set("watch:url",{url:embed,by:me,ts:Date.now()});
    setUrl(embed); setInp("");
  };

  return (
    <div style={{ padding:14, display:"flex", flexDirection:"column", gap:12, height:"100%" }}>
      <div style={{ display:"flex", gap:8 }}>
        <input className="field" placeholder="Paste a YouTube URL..." value={inp}
          onChange={e=>setInp(e.target.value)} onKeyDown={e=>e.key==="Enter"&&set()} style={{ flex:1 }} />
        <button className="btn" onClick={set} style={{ whiteSpace:"nowrap" }}>Watch Together 🎬</button>
      </div>
      {url ? (
        <div style={{ flex:1, borderRadius:16, overflow:"hidden", border:"1px solid rgba(255,255,255,.1)", minHeight:260 }}>
          <iframe src={url} style={{ width:"100%", height:"100%", minHeight:260, border:"none" }}
            allowFullScreen allow="accelerometer;autoplay;clipboard-write;encrypted-media;gyroscope;picture-in-picture" />
        </div>
      ) : (
        <div style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:12, color:"rgba(240,230,255,.3)" }}>
          <div style={{ fontSize:52 }}>🍿</div>
          <p style={{ fontSize:14 }}>Share a YouTube link to watch together!</p>
          <p style={{ fontSize:12 }}>Your partner will see the same video live</p>
        </div>
      )}
    </div>
  );
}

// ── MUSIC TAB ─────────────────────────────────────────────────────────────────
function Music({ me }) {
  const [playlist, setPl] = useState([]);
  const [cur, setCur] = useState(null);
  const [urlInp, setUrlInp] = useState("");
  const [titleInp, setTitleInp] = useState("");

  const load = useCallback(async () => {
    const pl=await S.get("music:pl"); if(pl) setPl(pl);
    const c=await S.get("music:cur"); if(c!==null) setCur(c);
  }, []);
  useEffect(() => { load(); const t=setInterval(load,2500); return ()=>clearInterval(t); }, [load]);

  const ytId = (u) => u.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/)?.[1];

  const add = async () => {
    const id=ytId(urlInp.trim()); if(!id){ alert("Enter a valid YouTube URL!"); return; }
    const track={ id:Date.now(), title:titleInp.trim()||"♫ Track", ytId:id, by:me };
    const next=[...playlist,track]; setPl(next); await S.set("music:pl",next);
    if(cur===null){ setCur(0); await S.set("music:cur",0); }
    setUrlInp(""); setTitleInp("");
  };
  const play = async (i) => { setCur(i); await S.set("music:cur",i); };
  const remove = async (id) => {
    const next=playlist.filter(t=>t.id!==id); setPl(next); await S.set("music:pl",next);
  };

  const now=cur!==null?playlist[cur]:null;
  return (
    <div style={{ padding:14, display:"flex", flexDirection:"column", gap:12, height:"100%", overflowY:"auto" }}>
      {now && (
        <div className="glass" style={{ borderRadius:16, overflow:"hidden", border:"1px solid rgba(255,110,180,.22)", animation:"glow 4s infinite" }}>
          <div style={{ padding:"10px 14px", display:"flex", alignItems:"center", gap:8 }}>
            <span style={{ fontSize:16, animation:"float 2s ease-in-out infinite" }}>🎵</span>
            <span style={{ fontSize:13, fontWeight:700, flex:1, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", color:"#ff6eb4" }}>{now.title}</span>
          </div>
          <iframe src={`https://www.youtube.com/embed/${now.ytId}?autoplay=1`}
            style={{ width:"100%", height:200, border:"none" }}
            allowFullScreen allow="autoplay;accelerometer;clipboard-write;encrypted-media;gyroscope;picture-in-picture" />
        </div>
      )}

      <div className="glass" style={{ borderRadius:16, padding:14, display:"flex", flexDirection:"column", gap:8 }}>
        <p style={{ fontSize:11, color:"rgba(240,230,255,.4)", textTransform:"uppercase", letterSpacing:".07em", fontWeight:700 }}>Add to Playlist</p>
        <input className="field" placeholder="Song / video title..." value={titleInp} onChange={e=>setTitleInp(e.target.value)} />
        <div style={{ display:"flex", gap:8 }}>
          <input className="field" placeholder="YouTube URL..." value={urlInp} onChange={e=>setUrlInp(e.target.value)}
            onKeyDown={e=>e.key==="Enter"&&add()} style={{ flex:1 }} />
          <button className="btn" onClick={add} style={{ whiteSpace:"nowrap" }}>+ Add</button>
        </div>
      </div>

      {playlist.length>0 && (
        <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
          <p style={{ fontSize:11, color:"rgba(240,230,255,.4)", textTransform:"uppercase", letterSpacing:".07em", fontWeight:700 }}>
            Playlist · {playlist.length} {playlist.length===1?"track":"tracks"}
          </p>
          {playlist.map((t,i)=>(
            <div key={t.id} onClick={()=>play(i)} style={{
              borderRadius:12, padding:"10px 14px", display:"flex", gap:10, alignItems:"center",
              background:cur===i?"rgba(255,110,180,.08)":"rgba(255,255,255,.03)",
              border:`1px solid ${cur===i?"rgba(255,110,180,.35)":"rgba(255,255,255,.07)"}`,
              cursor:"pointer", transition:"all .18s"
            }}>
              <span style={{ fontSize:18 }}>{cur===i?"🎵":"▶"}</span>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontSize:13, fontWeight:700, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", color:cur===i?"#ff6eb4":undefined }}>{t.title}</div>
                <div style={{ fontSize:11, color:"rgba(240,230,255,.35)", marginTop:1 }}>Added by {t.by}</div>
              </div>
              <button onClick={e=>{ e.stopPropagation(); remove(t.id); }} style={{ background:"none", border:"none", color:"rgba(240,230,255,.25)", cursor:"pointer", fontSize:18, lineHeight:1 }}>×</button>
            </div>
          ))}
        </div>
      )}

      {playlist.length===0 && !now && (
        <div style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:12, color:"rgba(240,230,255,.28)", padding:32 }}>
          <div style={{ fontSize:52 }}>🎶</div>
          <p style={{ fontSize:14 }}>Build your shared playlist!</p>
          <p style={{ fontSize:12 }}>Add YouTube songs — your partner sees them too</p>
        </div>
      )}
    </div>
  );
}

// ── AI COMPANION TAB ──────────────────────────────────────────────────────────
function AI({ me, partner }) {
  const [msgs, setMsgs] = useState([{
    role:"assistant",
    text:`Hey ${me}! 💫 I'm Stardust, your AI companion. Ask me for date ideas, surprise plans, conversation starters, or just have a chat!`
  }]);
  const [inp, setInp] = useState("");
  const [loading, setLoading] = useState(false);
  const bottom = useRef(null);

  useEffect(() => { bottom.current?.scrollIntoView({ behavior:"smooth" }); }, [msgs]);

  const send = async () => {
    if (!inp.trim()||loading) return;
    const text=inp.trim(); setInp("");
    const next=[...msgs,{role:"user",text}]; setMsgs(next); setLoading(true);
    const history=next.map(m=>({ role:m.role==="assistant"?"assistant":"user", content:m.text }));
    const sys=`You are Stardust, a warm and playful AI companion for ${me} and ${partner}, a couple in long-distance. Be encouraging, creative, concise (2-4 sentences). Suggest date ideas, games, conversation starters, surprise ideas, or just chat. Use occasional emojis naturally.`;
    const reply=await askClaude(history,sys);
    setMsgs(p=>[...p,{role:"assistant",text:reply}]); setLoading(false);
  };

  const quick=["💡 Virtual date ideas","🎁 Surprise my partner","💬 Conversation starters","💕 Love language tips","🎮 Game suggestions","🌙 Goodnight message"];

  return (
    <div style={{ display:"flex", flexDirection:"column", height:"100%" }}>
      <div style={{ flex:1, overflowY:"auto", padding:"12px 14px", display:"flex", flexDirection:"column", gap:10 }}>
        {msgs.map((m,i)=>(
          <div key={i} className={`msg ${m.role==="user"?"msg-me":"msg-ai"}`}>
            {m.role==="assistant"&&<div style={{ fontSize:10, color:"#ffd700", fontWeight:800, marginBottom:3, letterSpacing:".06em" }}>✨ STARDUST AI</div>}
            {m.text}
          </div>
        ))}
        {loading&&<div className="msg msg-ai" style={{ opacity:.6 }}>✨ thinking...</div>}
        <div ref={bottom} />
      </div>

      <div style={{ padding:"0 14px 8px", display:"flex", gap:6, flexWrap:"wrap" }}>
        {quick.map(q=>(
          <button key={q} className="btn-ghost" onClick={()=>setInp(q.split(" ").slice(1).join(" "))}
            style={{ fontSize:11, padding:"5px 11px" }}>{q}</button>
        ))}
      </div>

      <div style={{ padding:"0 14px 14px", display:"flex", gap:8 }}>
        <input className="field" placeholder="Ask Stardust anything..." value={inp}
          onChange={e=>setInp(e.target.value)} onKeyDown={e=>e.key==="Enter"&&send()} style={{ flex:1 }} />
        <button className="btn" onClick={send} disabled={loading} style={{ padding:"10px 16px" }}>
          {loading?"...":"✨"}
        </button>
      </div>
    </div>
  );
}

// ── STARS ─────────────────────────────────────────────────────────────────────
function Stars() {
  const stars = useMemo(()=>Array.from({length:35},(_,i)=>({
    id:i,
    left:`${(i*37.3+11)%100}%`,
    top:`${(i*53.7+7)%100}%`,
    size:`${(i%3)+1.2}px`,
    color:["#ff6eb4","#b16ff7","#ffd700","#fff","#fff","#fff"][i%6],
    opacity:((i%5)+1)*.12+.08,
    dur:`${((i%4)+2.5).toFixed(1)}s`,
    delay:`${((i%5)*.8).toFixed(1)}s`
  })),[]);
  return (
    <>
      <div className="starbg" />
      {stars.map(s=>(
        <div key={s.id} className="star" style={{
          left:s.left, top:s.top, width:s.size, height:s.size,
          background:s.color, opacity:s.opacity,
          animation:`twinkle ${s.dur} ease-in-out infinite`,
          animationDelay:s.delay
        }} />
      ))}
    </>
  );
}

// ── ROOT APP ──────────────────────────────────────────────────────────────────
export default function App() {
  const [screen, setScreen] = useState("boot");
  const [me, setMe] = useState("");
  const [partner, setPartner] = useState("My Love");
  const [tab, setTab] = useState("chat");
  const [toasts, setToasts] = useState([]);
  const [missSent, setMissSent] = useState(false);
  const [badges, setBadges] = useState({ chat:0, miss:0 });
  const lastMissTs = useRef(0);
  const lastChatTs = useRef(0);

  const addToast = useCallback((text, emoji="💔") => {
    const id = Date.now() + Math.random();
    setToasts(p => [...p, { id, text, emoji }]);
    setTimeout(() => setToasts(p => p.filter(t => t.id !== id)), 4500);
  }, []);

  useEffect(() => {
    const st = document.createElement("style"); st.textContent=CSS; document.head.appendChild(st);
    S.get("identity",false).then(d=>{
      if(d?.me){ setMe(d.me); setPartner(d.partner||"My Love"); setScreen("main"); }
      else setScreen("setup");
    });
    return ()=>document.head.removeChild(st);
  }, []);

  // Global polling: miss pings + surprise deliveries
  useEffect(() => {
    if (!me) return;

    const poll = async () => {
      // Miss you ping
      const ping = await S.get("miss:ping");
      if (ping && ping.by !== me && ping.ts > lastMissTs.current) {
        lastMissTs.current = ping.ts;
        addToast(`${ping.by} misses you 💔`, "💔");
        if (tab !== "chat") setBadges(b => ({ ...b, miss: b.miss + 1 }));
      }

      // Surprise messages
      const surprises = await S.get("surprise:msgs") || [];
      const now = Date.now();
      const pending = surprises.filter(s => s.for === me && s.sendAt <= now && !s.seen);
      if (pending.length > 0) {
        // Deliver surprises into chat
        const chat = await S.get("chat:msgs") || [];
        const newMsgs = pending.map(s => ({
          id: s.id + 1,
          user: s.by,
          text: s.text,
          ts: now,
          surprise: true
        }));
        await S.set("chat:msgs", [...chat, ...newMsgs]);

        for (const s of pending) {
          addToast(`💌 Surprise from ${s.by}!`, "💌");
        }

        // Mark seen
        const updated = surprises.map(s =>
          s.for === me && s.sendAt <= now ? { ...s, seen: true } : s
        );
        await S.set("surprise:msgs", updated);

        if (tab !== "chat") setBadges(b => ({ ...b, chat: b.chat + pending.length }));
      }

      // Chat unread badge
      if (tab !== "chat") {
        const chatMsgs = await S.get("chat:msgs") || [];
        const unread = chatMsgs.filter(m => m.user !== me && m.ts > lastChatTs.current).length;
        if (unread > 0) setBadges(b => ({ ...b, chat: Math.max(b.chat, unread) }));
      }
    };

    const t = setInterval(poll, 2200);
    return () => clearInterval(t);
  }, [me, partner, tab, addToast]);

  const sendMiss = async () => {
    await S.set("miss:ping", { by: me, ts: Date.now() });
    setMissSent(true);
    setTimeout(() => setMissSent(false), 2000);
  };

  const onSetup = async (n, p) => {
    setMe(n); setPartner(p); setScreen("main");
    await S.set("identity",{me:n,partner:p},false);
  };

  const switchTab = (id) => {
    setTab(id);
    if (id === "chat") {
      setBadges(b => ({ ...b, chat: 0, miss: 0 }));
      lastChatTs.current = Date.now();
    }
  };

  const TABS=[["chat","💬","Chat"],["games","🎮","Games"],["watch","🎬","Watch"],["music","🎵","Music"],["ai","✨","AI"]];
  const totalBadge = badges.chat + badges.miss;

  if (screen==="boot") return (
    <>
      <Stars />
      <div style={{ height:"100vh", display:"flex", alignItems:"center", justifyContent:"center", position:"relative", zIndex:1 }}>
        <div style={{ fontSize:52, animation:"float 2s ease-in-out infinite" }}>💫</div>
      </div>
    </>
  );

  return (
    <>
      <Stars />
      <ToastContainer toasts={toasts} />
      {screen==="setup" ? <Setup onDone={onSetup} /> : (
        <div style={{ position:"relative", zIndex:1, height:"100vh", display:"flex", flexDirection:"column", maxWidth:860, margin:"0 auto" }}>
          {/* Header */}
          <div className="glass" style={{
            margin:"10px 12px 0", borderRadius:18, padding:"11px 18px",
            display:"flex", alignItems:"center", justifyContent:"space-between",
            animation:"glow 5s ease-in-out infinite"
          }}>
            <div>
              <h1 style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:22, fontWeight:700,
                background:"linear-gradient(135deg,#ff6eb4,#b16ff7,#ffd700)",
                WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent" }}>
                Stardust ✨
              </h1>
              <p style={{ fontSize:11, color:"rgba(240,230,255,.38)", marginTop:1, letterSpacing:".03em" }}>
                {me} <span style={{ color:"rgba(255,110,180,.55)" }}>♥</span> {partner}
              </p>
            </div>
            <div style={{ display:"flex", alignItems:"center", gap:8 }}>
              {/* Miss You Button */}
              <button className={`miss-btn ${missSent?"sent":""}`} onClick={sendMiss}>
                <span style={{ fontSize:15, display:"inline-block", animation:missSent?"missHeart .5s ease":"none" }}>💔</span>
                <span>{missSent ? "Sent!" : `Miss ${partner}`}</span>
              </button>

              <div style={{ display:"flex", alignItems:"center", gap:5 }}>
                <div style={{ width:7, height:7, borderRadius:"50%", background:"#4ade80", boxShadow:"0 0 6px #4ade80" }} />
                <span style={{ fontSize:11, color:"rgba(240,230,255,.35)" }}>Live</span>
              </div>
              <button onClick={()=>setScreen("setup")} style={{ background:"none", border:"1px solid rgba(255,255,255,.1)", borderRadius:8, color:"rgba(240,230,255,.4)", cursor:"pointer", fontSize:11, padding:"4px 9px", fontFamily:"'Nunito',sans-serif" }}>
                ✎ Edit
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="glass" style={{ flex:1, margin:"8px 12px 0", borderRadius:18, overflow:"hidden", display:"flex", flexDirection:"column" }}>
            <div style={{ flex:1, overflow:"hidden", display:"flex", flexDirection:"column" }}>
              {tab==="chat"  && <Chat  me={me} partner={partner} onRead={()=>{ setBadges(b=>({...b,chat:0,miss:0})); lastChatTs.current=Date.now(); }} />}
              {tab==="games" && <Games me={me} partner={partner} />}
              {tab==="watch" && <Watch me={me} />}
              {tab==="music" && <Music me={me} />}
              {tab==="ai"    && <AI    me={me} partner={partner} />}
            </div>
          </div>

          {/* Tab bar */}
          <div className="glass" style={{ margin:"8px 12px 10px", borderRadius:18, display:"flex", padding:"2px 0" }}>
            {TABS.map(([id,ico,lbl])=>(
              <button key={id} className={`tab ${tab===id?"on":""}`} onClick={()=>switchTab(id)}>
                {id==="chat" && totalBadge > 0 && tab !== "chat" && (
                  <span className="badge">{totalBadge > 9 ? "9+" : totalBadge}</span>
                )}
                <span className="ico">{ico}</span>{lbl}
              </button>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
