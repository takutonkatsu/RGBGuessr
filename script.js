// ▼ Firebase Config
const firebaseConfig = {
  apiKey: "AIzaSyAWQexxxlNCVlG3s-OMHMzDKI-XFL2X-wE",
  authDomain: "rgb-guessr-battle.firebaseapp.com",
  databaseURL: "https://rgb-guessr-battle-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "rgb-guessr-battle",
  storageBucket: "rgb-guessr-battle.firebasestorage.app",
  messagingSenderId: "869975017002",
  appId: "1:869975017002:web:3de549898304a2c8e72553"
};
firebase.initializeApp(firebaseConfig);
const db = firebase.database();

// ▼ App Management
const app = {
    secretCount: 0,
    secretTimer: null,

    alert: function(msg, callback) {
        document.getElementById('custom-alert-text').innerText = msg;
        const modal = document.getElementById('custom-alert-modal');
        modal.classList.remove('hidden');
        document.getElementById('custom-alert-ok').onclick = () => {
            modal.classList.add('hidden');
            if(callback) callback();
        };
    },

    confirm: function(msg, callback) {
        document.getElementById('custom-confirm-text').innerText = msg;
        const modal = document.getElementById('custom-confirm-modal');
        modal.classList.remove('hidden');
        document.getElementById('custom-confirm-yes').onclick = () => {
            modal.classList.add('hidden');
            callback(true);
        };
        document.getElementById('custom-confirm-no').onclick = () => {
            modal.classList.add('hidden');
            callback(false);
        };
    },

    showScreen: function(screenId) {
        const screens = document.querySelectorAll('.screen');
        screens.forEach(el => el.classList.remove('active'));
        const target = document.getElementById('screen-' + screenId);
        if(target) target.classList.add('active');
        
        const backBtn = document.getElementById('back-btn');
        if(backBtn) {
            if(screenId === 'menu') {
                backBtn.classList.add('hidden');
                menuLogic.init(); 
            } else {
                backBtn.classList.remove('hidden');
            }
        }
        window.scrollTo(0, 0);

        // Save state for reload
        if (['origin', 'rush', 'survival', 'versus', 'daily', 'anotherworld', 'menu'].includes(screenId)) {
            localStorage.setItem('current_screen', screenId);
        }
    },

    backToMenu: function() {
        if(versusGame.roomId) {
            versusGame.confirmExit();
        } else {
            if (dailyGame.timerInterval) clearInterval(dailyGame.timerInterval);
            if (rushGame && rushGame.timerInterval) clearInterval(rushGame.timerInterval); // ★追加
            this.showScreen('menu');
        }
    },

    startGame: function(mode) {
        if(mode === 'versus') {
            this.showScreen('versus-menu');
            const savedName = localStorage.getItem("friend_name");
            if(savedName) document.getElementById('versus-name-input').value = savedName;
            return;
        }
        
        this.showScreen(mode);
        
        if(mode === 'origin') originGame.init();
        if(mode === 'survival') survivalGame.init();
        if(mode === 'rush') rushGame.init();
        if(mode === 'daily') dailyGame.init(); 
        if(mode === 'anotherworld') anotherGame.init();
    },

    triggerSecret: function() {
        this.secretCount++;
        clearTimeout(this.secretTimer);
        this.secretTimer = setTimeout(() => { this.secretCount = 0; }, 1000); 
        if(this.secretCount >= 5) { this.secretCount = 0; this.startGame('anotherworld'); }
    }
};

// ▼ Utils
const utils = {
    randColor: function() {
        const r = Math.floor(Math.random() * 256);
        const g = Math.floor(Math.random() * 256);
        const b = Math.floor(Math.random() * 256);
        return { r, g, b, hex: this.rgbToHex(r, g, b) };
    },
    rgbToHex: function(r, g, b) {
        return "#" + [r, g, b].map(x => {
            const hex = x.toString(16);
            return hex.length === 1 ? "0" + hex : hex;
        }).join("");
    },
    hexToRgbString: function(hex) {
        let c = hex.substring(1).split('');
        if(c.length== 3){
            c= [c[0], c[0], c[1], c[1], c[2], c[2]];
        }
        c= '0x'+c.join('');
        return [(c>>16)&255, (c>>8)&255, c&255].join(', ');
    },
    calcScoreValue: function(target, input) {
        const index = 2; 
        const sq = (target.r - input.r) ** index + (target.g - input.g) ** index + (target.b - input.b) ** index;
        const base = Math.max((255 - target.r) ** index, target.r ** index) + 
                     Math.max((255 - target.g) ** index, target.g ** index) + 
                     Math.max((255 - target.b) ** index, target.b ** index);
        let accuracy = 1 - (sq / base); 
        if (accuracy < 0) accuracy = 0; 
        return accuracy * 100;
    },
    calcScore: function(target, input) { 
        return this.calcScoreValue(target, input).toFixed(2); 
    },
    getTodayString: function() {
        const d = new Date();
        const year = d.getFullYear();
        const month = ('0' + (d.getMonth() + 1)).slice(-2);
        const day = ('0' + d.getDate()).slice(-2);
        return `${year}${month}${day}`;
    },
    getFormattedDate: function() {
        const d = new Date();
        return `${d.getFullYear()}.${d.getMonth() + 1}.${d.getDate()}`;
    },
    seededRandom: function(seed) {
        const x = Math.sin(seed) * 10000;
        return x - Math.floor(x);
    },
    generateDailyColor: function(dateStr) {
        let hash = 5381;
        for (let i = 0; i < dateStr.length; i++) {
            hash = ((hash << 5) + hash) + dateStr.charCodeAt(i); 
        }
        const r = Math.floor(Math.abs(this.seededRandom(hash)) * 256);
        const g = Math.floor(Math.abs(this.seededRandom(hash + 1)) * 256);
        const b = Math.floor(Math.abs(this.seededRandom(hash + 2)) * 256);
        return { r, g, b, hex: this.rgbToHex(r, g, b) };
    }
};

const menuLogic = {
    init: function() {
        const today = new Date();
        const ymd = (today.getFullYear()-2024)*400 + today.getMonth()*31 + today.getDate();
        const savedDate = localStorage.getItem("date_key");
        if(savedDate != ymd) { localStorage.setItem("date_key", ymd); }

        this.showDualRecord("my_1record", "my_ao5record", "menu-original-record");
        this.showDualRecord("rush_best", null, "menu-rush-record");
        
        const stageRec = localStorage.getItem("4stage_record");
        const stageElem = document.getElementById("menu-challenge-record");
        if(stageElem) { stageElem.innerHTML = stageRec ? `Max Stage: <span>${stageRec}</span>` : "Start: Stage 1"; }

        const ao5Rec = Number(localStorage.getItem("my_ao5record")) || 0;
        const logoEl = document.getElementById("app-logo");
        const iconHtml = `<img src="Retina_icon.png" alt="icon" class="logo-icon" id="source-logo-icon">`;
        
        if(logoEl) {
            let rankClass = ""; 
            if (ao5Rec >= 99.90) rankClass = "logo-rank-rainbow";
            else if (ao5Rec >= 99.50) rankClass = "logo-rank-gold";
            else if (ao5Rec >= 99.00) rankClass = "logo-rank-cyan";
            else if (ao5Rec >= 98.00) rankClass = "logo-rank-purple";
            else if (ao5Rec >= 95.00) rankClass = "logo-rank-red";
            else if (ao5Rec >= 90.00) rankClass = "logo-rank-blue";
            
            logoEl.innerHTML = `${iconHtml} <span class="logo-text ${rankClass}">RETINA</span>`;
        }

        const todayStr = utils.getTodayString();
        document.getElementById('menu-daily-date').innerText = utils.getFormattedDate();
        
        const dailyColor = utils.generateDailyColor(todayStr);
        const previewEl = document.getElementById('menu-daily-color-preview');
        if(previewEl) {
            previewEl.style.backgroundColor = dailyColor.hex;
        }

        const playedScore = localStorage.getItem("daily_score_" + todayStr);
        const statusEl = document.getElementById('menu-daily-status');
        if (playedScore) {
            statusEl.innerText = `SCORE: ${playedScore}%`;
            statusEl.className = "daily-status played";
        } else {
            statusEl.innerText = "PLAY NOW ►";
            statusEl.className = "daily-status";
        }
    },
    showDualRecord: function(singleKey, ao5Key, elemId) {
        const sRec = localStorage.getItem(singleKey);
        const aRec = ao5Key ? localStorage.getItem(ao5Key) : null;
        const el = document.getElementById(elemId);
        if(el) {
            if(!sRec && !aRec) { el.innerText = "NO RECORD"; } else {
                let html = "";
                if(sRec) html += `Best: <span>${sRec}${ao5Key?"%":""}</span>`;
                if(sRec && aRec) html += " / ";
                if(aRec) html += `Ao5: <span>${aRec}%</span>`;
                el.innerHTML = html;
            }
        }
    }
};

// ▼ Game Modes

// Origin Mode (Updated Share)
const originGame = {
    // ... (init, retry, nextColor, guess, showResult, updateHistory, resetData は既存のまま) ...
    // ※ 既存のメソッドはそのまま使用してください

    questionColor: {},
    init: function() {
        this.els = { R: document.getElementById('origin-R'), G: document.getElementById('origin-G'), B: document.getElementById('origin-B'), valR: document.getElementById('origin-val-R'), valG: document.getElementById('origin-val-G'), valB: document.getElementById('origin-val-B'), qColor: document.getElementById('origin-question-color') };
        const update = () => { this.els.valR.innerText = this.els.R.value; this.els.valG.innerText = this.els.G.value; this.els.valB.innerText = this.els.B.value; };
        this.els.R.oninput = update; this.els.G.oninput = update; this.els.B.oninput = update;
        document.getElementById('origin-guess-btn').onclick = () => this.guess();
        document.getElementById('origin-new-record').classList.add('hidden');
        this.retry(); this.updateHistory();
    },
    retry: function() {
        const savedHex = localStorage.getItem("RGB_Temporary_Hex");
        if(savedHex) { const r = Number(localStorage.getItem("RGB_Temporary_R")); const g = Number(localStorage.getItem("RGB_Temporary_G")); const b = Number(localStorage.getItem("RGB_Temporary_B")); this.questionColor = { r, g, b, hex: savedHex }; }
        else { this.questionColor = utils.randColor(); localStorage.setItem("RGB_Temporary_Hex", this.questionColor.hex); localStorage.setItem("RGB_Temporary_R", this.questionColor.r); localStorage.setItem("RGB_Temporary_G", this.questionColor.g); localStorage.setItem("RGB_Temporary_B", this.questionColor.b); }
        this.els.qColor.style.backgroundColor = this.questionColor.hex; this.els.R.value = 128; this.els.G.value = 128; this.els.B.value = 128; this.els.R.oninput();
        document.getElementById('origin-new-record').classList.add('hidden');
    },
    nextColor: function() { localStorage.removeItem("RGB_Temporary_Hex"); this.retry(); app.showScreen('origin'); },
    guess: function() {
        const r = parseInt(this.els.R.value); const g = parseInt(this.els.G.value); const b = parseInt(this.els.B.value); const q = this.questionColor;
        const score = utils.calcScore(q, {r, g, b});
        let val = Number(localStorage.getItem("index")) || 1;
        localStorage.setItem("score"+val, score); localStorage.setItem("answer_rgb16"+val, q.hex); localStorage.setItem("input_rgb16"+val, utils.rgbToHex(r,g,b));
        localStorage.setItem("answer_rgb"+val, `(${q.r},${q.g},${q.b})`); localStorage.setItem("input_rgb"+val, `(${r},${g},${b})`);
        
        let isNewRecord = false;
        const pb = Number(localStorage.getItem("my_1record")) || 0; 
        if(Number(score) > pb) { localStorage.setItem("my_1record", score); isNewRecord = true; } 

        if(val >= 5) {
            let scores = []; for(let i=0; i<5; i++) scores.push(Number(localStorage.getItem("score"+(val-i))));
            const max = Math.max(...scores); const min = Math.min(...scores); const sum = scores.reduce((a,b)=>a+b,0); 
            const ao5Val = (sum - max - min) / 3;
            const ao5 = ao5Val.toFixed(2);
            localStorage.setItem("Ao5"+val, ao5); 
            const ao5pb = Number(localStorage.getItem("my_ao5record")) || 0; 
            if(Number(ao5) > ao5pb) { localStorage.setItem("my_ao5record", ao5); isNewRecord = true; }
        }
        const recordEl = document.getElementById('origin-new-record');
        if(isNewRecord) recordEl.classList.remove('hidden'); else recordEl.classList.add('hidden');
        localStorage.setItem("index", val + 1); localStorage.removeItem("RGB_Temporary_Hex");
        this.showResult(score, q, {r,g,b}); this.updateHistory();
    },
    showResult: function(score, q, input) {
        app.showScreen('result-origin'); 
        document.getElementById('origin-score').innerText = score + "%";
        document.getElementById('origin-ans-color').style.backgroundColor = q.hex; document.getElementById('origin-ans-text').innerText = `${q.r},${q.g},${q.b}`;
        document.getElementById('origin-your-color').style.backgroundColor = utils.rgbToHex(input.r,input.g,input.b); document.getElementById('origin-your-text').innerText = `${input.r},${input.g},${input.b}`;
    },
    updateHistory: function() {
        const val = Number(localStorage.getItem("index")) || 1; const pb = Number(localStorage.getItem("my_1record")) || 0; const bestAo5 = Number(localStorage.getItem("my_ao5record")) || 0;
        let html = "";
        for(let i = val - 1; i > 0; i--) {
            const sc = localStorage.getItem("score"+i); const ao5 = localStorage.getItem("Ao5"+i);
            const ansHex = localStorage.getItem("answer_rgb16"+i) || '#000'; const myHex = localStorage.getItem("input_rgb16"+i) || '#000';
            const ansTxt = localStorage.getItem("answer_rgb"+i) || ''; const myTxt = localStorage.getItem("input_rgb"+i) || '';
            let ao5Html = ao5 ? `<div class="history-ao5-badge ${Number(ao5)===bestAo5&&bestAo5>0?'highlight':''}">Ao5: ${ao5}%</div>` : `<div class="history-ao5-badge placeholder">Ao5: --.--%</div>`;
            let rowClass = "history-item"; let indexHtml = `<span class="history-index">#${i}</span>`;
            if(Number(sc) === pb && pb > 0) { rowClass += " best-record"; indexHtml = `<span class="history-index">👑</span>`; }
            html += `<div class="${rowClass}">${indexHtml}<div class="history-colors"><div class="color-row"><span class="label-box" style="color:#aaa">TARGET</span><span class="chip-xs" style="background:${ansHex}"></span><span>${ansTxt}</span></div><div class="color-row"><span class="label-box" style="color:#fff">YOU</span><span class="chip-xs" style="background:${myHex}"></span><span>${myTxt}</span></div></div><div class="history-right"><div class="history-score-val">${sc}%</div>${ao5Html}</div></div>`;
        }
        document.getElementById('origin-history').innerHTML = html;
        document.getElementById('origin-pb').innerText = (pb ? pb.toFixed(2) : "--") + "%"; 
        document.getElementById('origin-ao5').innerText = (bestAo5 ? bestAo5.toFixed(2) : "--") + "%";
    },
    resetData: function() { 
        app.confirm("Originモードの記録を削除しますか？", (y)=>{ if(y){ const keys = Object.keys(localStorage); keys.forEach(k => { if (k === "index" || k.startsWith("score") || k.startsWith("answer_") || k.startsWith("input_") || k.startsWith("Ao5")) { localStorage.removeItem(k); } }); localStorage.removeItem("my_1record"); localStorage.removeItem("my_ao5record"); localStorage.removeItem("RGB_Temporary_Hex"); location.reload(); } }) 
    },

    // ★修正: Canvas描画ロジックの改善
    shareResult: function() {
        const canvas = document.getElementById('share-canvas');
        const ctx = canvas.getContext('2d');
        const score = document.getElementById('origin-score').innerText;
        const ao5 = document.getElementById('origin-ao5').innerText;
        const val = Number(localStorage.getItem("index")) || 1;
        const count = val - 1; // 直前のプレイ回数
        const targetHex = this.questionColor.hex;
        // 入力色は保存されていないため、画面から取得
        const r = document.getElementById('origin-R').value;
        const g = document.getElementById('origin-G').value;
        const b = document.getElementById('origin-B').value;
        const inputHex = utils.rgbToHex(Number(r), Number(g), Number(b));

        // Background
        const grad = ctx.createLinearGradient(0, 0, 600, 400);
        grad.addColorStop(0, '#1a1a2e'); grad.addColorStop(1, '#16213e');
        ctx.fillStyle = grad; ctx.fillRect(0, 0, 600, 400);

        // Icon
        const img = document.getElementById('source-logo-icon');
        if (img && img.complete) { ctx.drawImage(img, 25, 25, 50, 50); }
        
        // Header
        ctx.font = '900 32px "Inter", sans-serif'; ctx.fillStyle = '#ffffff'; ctx.textAlign = 'left'; ctx.fillText("RETINA", 90, 65);
        ctx.font = '700 16px "JetBrains Mono", monospace'; ctx.fillStyle = '#ff4757'; ctx.fillText("ORIGIN MODE", 450, 65);

        // Info Line
        ctx.beginPath(); ctx.moveTo(30, 90); ctx.lineTo(570, 90); ctx.strokeStyle = 'rgba(255,255,255,0.2)'; ctx.lineWidth = 1; ctx.stroke();
        ctx.font = '16px "JetBrains Mono", monospace'; ctx.fillStyle = '#aaa'; ctx.textAlign = 'left'; ctx.fillText(`Try #${count}`, 30, 120);
        ctx.textAlign = 'right'; ctx.fillText(`AO5 Best: ${ao5}`, 570, 120);

        // Score
        ctx.font = '900 90px "Inter", sans-serif'; ctx.textAlign = 'center'; ctx.fillStyle = '#ffffff'; ctx.fillText(score, 300, 220);
        
        // Colors
        const drawColor = (x, y, color, label) => {
            // Label
            ctx.font = 'bold 14px sans-serif'; ctx.fillStyle = '#8b9bb4'; ctx.textAlign = 'center'; ctx.fillText(label, x, y - 55);
            // Circle
            ctx.save();
            ctx.beginPath(); ctx.arc(x, y, 40, 0, Math.PI * 2); ctx.fillStyle = color; ctx.fill();
            ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(255,255,255,0.2)'; ctx.stroke();
            ctx.restore();
            // Hex text
            ctx.font = '14px "JetBrains Mono", monospace'; ctx.fillStyle = '#fff'; ctx.fillText(color.toUpperCase(), x, y + 60);
        };
        drawColor(200, 310, targetHex, "TARGET");
        drawColor(400, 310, inputHex, "YOU");

        // Footer
        ctx.font = '12px sans-serif'; ctx.fillStyle = 'rgba(255,255,255,0.4)'; ctx.textAlign = 'center'; ctx.fillText("rgb-guessr.web.app", 300, 385);

        canvas.toBlob(blob => {
            const file = new File([blob], "retina_origin.png", { type: "image/png" });
            if (navigator.canShare && navigator.canShare({ files: [file] })) {
                navigator.share({ files: [file], title: 'Retina Result', text: `Retina - Origin Mode #${count} | Score: ${score}` }).catch(console.error);
            } else {
                const link = document.createElement('a'); link.download = `retina_origin_${count}.png`; link.href = canvas.toDataURL(); link.click();
            }
        });
    }
};

// Rush Mode
const rushGame = {
    timerInterval: null, timeLeft: 60, score: 0, combo: 0, questionColor: {}, count: 0, isPlaying: false,
    init: function() {
        this.els = { R: document.getElementById('rush-R'), G: document.getElementById('rush-G'), B: document.getElementById('rush-B'), valR: document.getElementById('rush-val-R'), valG: document.getElementById('rush-val-G'), valB: document.getElementById('rush-val-B'), qColor: document.getElementById('rush-question-color'), myColor: document.getElementById('rush-input-color'), timer: document.getElementById('rush-timer'), combo: document.getElementById('rush-combo-display'), currentScore: document.getElementById('rush-current-score') };
        const update = () => this.updateMyColor(); 
        this.els.R.oninput = update; this.els.G.oninput = update; this.els.B.oninput = update;
        document.getElementById('rush-guess-btn').onclick = () => this.guess();
        app.showScreen('rush');
        this.resetGame();
    },
    resetGame: function() {
        this.isPlaying = true; this.timeLeft = 60; this.score = 0; this.combo = 0; this.count = 0;
        this.nextColor(); this.updateUI();
        if(this.timerInterval) clearInterval(this.timerInterval);
        this.timerInterval = setInterval(() => {
            if (!this.isPlaying) return;
            this.timeLeft -= 0.01;
            if (this.timeLeft <= 0) { this.timeLeft = 0; this.gameOver(); }
            this.updateUI();
        }, 10);
    },
    nextColor: function() {
        this.questionColor = utils.randColor(); this.els.qColor.style.backgroundColor = this.questionColor.hex;
        this.els.R.value = Math.floor(Math.random() * 256); this.els.G.value = Math.floor(Math.random() * 256); this.els.B.value = Math.floor(Math.random() * 256);
        this.updateMyColor();
    },
    updateMyColor: function() {
        const r = parseInt(this.els.R.value); const g = parseInt(this.els.G.value); const b = parseInt(this.els.B.value);
        this.els.valR.innerText = r; this.els.valG.innerText = g; this.els.valB.innerText = b;
        this.els.myColor.style.backgroundColor = utils.rgbToHex(r, g, b);
    },
    updateUI: function() {
        this.els.timer.innerText = this.timeLeft.toFixed(2); this.els.currentScore.innerText = Math.floor(this.score);
        if (this.combo > 1) { this.els.combo.classList.remove('hidden'); this.els.combo.innerText = `${this.combo} COMBO`; } else { this.els.combo.classList.add('hidden'); }
    },
    guess: function() {
        if (!this.isPlaying) return;
        const r = parseInt(this.els.R.value); const g = parseInt(this.els.G.value); const b = parseInt(this.els.B.value);
        const acc = utils.calcScoreValue(this.questionColor, {r, g, b}); 
        let timeDelta = 0; let isBad = false;
        if (acc < 90) { timeDelta = -5; this.combo = 0; isBad = true; } else {
            if (acc >= 99) timeDelta = 5; else if (acc >= 98) timeDelta = 4; else if (acc >= 95) timeDelta = 2; else timeDelta = 0; 
            this.combo++; this.score += (acc * 10) + (this.combo * 50); this.count++;
        }
        this.timeLeft += timeDelta; if (this.timeLeft < 0) this.timeLeft = 0; 
        this.showEffect(timeDelta, isBad, acc.toFixed(2)+"%");
        if (this.timeLeft > 0) { this.nextColor(); } else { this.gameOver(); }
    },
    showEffect: function(delta, isBad, accStr) {
        const container = document.getElementById('rush-effect-container');
        const el = document.createElement('div'); el.className = 'time-popup';
        let timeText = isBad ? "-5s" : (delta > 0 ? `+${delta}s` : "SAFE");
        let colorClass = isBad ? "bad" : (delta > 0 ? "good" : "safe");
        el.innerHTML = `<span class="popup-acc">${accStr}</span><br><span class="popup-time ${colorClass}">${timeText}</span>`;
        const rndX = (Math.random() - 0.5) * 60; const rndY = (Math.random() - 0.5) * 60;
        el.style.transform = `translate(${rndX}px, ${rndY}px)`;
        container.appendChild(el); setTimeout(() => el.remove(), 800);
    },
    gameOver: function() {
        this.isPlaying = false; clearInterval(this.timerInterval);
        app.showScreen('result-rush');
        const finalScore = Math.floor(this.score);
        document.getElementById('rush-final-score').innerText = finalScore;
        document.getElementById('rush-max-combo').innerText = this.combo; document.getElementById('rush-count').innerText = this.count;
        const currentBest = Number(localStorage.getItem('rush_best')) || 0;
        const newRecordEl = document.getElementById('rush-new-record');
        if (finalScore > currentBest) { localStorage.setItem('rush_best', finalScore); newRecordEl.classList.remove('hidden'); } else { newRecordEl.classList.add('hidden'); }
        document.getElementById('rush-best').innerText = localStorage.getItem('rush_best') || 0;
    },
    resetData: function() { app.confirm("Reset Rush Records?", (y) => { if(y) { localStorage.removeItem('rush_best'); location.reload(); } }); }
};

// Survival Mode (formerly Challenge)
const survivalGame = {
    aimScores: ["50.00", "60.00", "70.00", "75.00", "80.00", "85.00", "88.00", "90.00", "91.00", "92.00", "93.00", "94.00", "95.00", "95.50", "96.00", "96.50", "97.00", "97.50", "98.00", "98.50", "99.00", "99.30", "99.60", "99.90", "100.00"],
    currentStage: 1, questionColor: {},
    init: function() {
        this.els = { R: document.getElementById('survival-R'), G: document.getElementById('survival-G'), B: document.getElementById('survival-B'), valR: document.getElementById('survival-val-R'), valG: document.getElementById('survival-val-G'), valB: document.getElementById('survival-val-B'), sample: document.getElementById('survival-sample'), nextBtn: document.getElementById('survival-next-btn') };
        const update = () => { this.els.valR.innerText = this.els.R.value; this.els.valG.innerText = this.els.G.value; this.els.valB.innerText = this.els.B.value; };
        this.els.R.oninput = update; this.els.G.oninput = update; this.els.B.oninput = update;
        document.getElementById('survival-guess-btn').onclick = () => this.guess();
        const savedStage = localStorage.getItem("4stage_number"); this.currentStage = savedStage ? Number(savedStage) : 1;
        document.getElementById('survival-new-record').classList.add('hidden');
        this.setupStage(); this.updateHistory();
    },
    setupStage: function() {
        const stageStr = this.currentStage.toString().padStart(2, '0'); document.getElementById('survival-stage-num').innerText = stageStr; 
        document.getElementById('survival-aim-score').innerText = this.aimScores[this.currentStage - 1] + "%";
        const savedHex = localStorage.getItem("4RGB_Temporary_Hex");
        if(savedHex) { const r = Number(localStorage.getItem("4RGB_Temporary_R")); const g = Number(localStorage.getItem("4RGB_Temporary_G")); const b = Number(localStorage.getItem("4RGB_Temporary_B")); this.questionColor = { r,g,b, hex: savedHex }; }
        else { this.questionColor = utils.randColor(); localStorage.setItem("4RGB_Temporary_Hex", this.questionColor.hex); localStorage.setItem("4RGB_Temporary_R", this.questionColor.r); localStorage.setItem("4RGB_Temporary_G", this.questionColor.g); localStorage.setItem("4RGB_Temporary_B", this.questionColor.b); }
        this.els.sample.style.backgroundColor = this.questionColor.hex; this.els.R.value = 128; this.els.G.value = 128; this.els.B.value = 128; this.els.R.oninput();
        document.getElementById('survival-new-record').classList.add('hidden');
    },
    guess: function() {
        const r = parseInt(this.els.R.value); const g = parseInt(this.els.G.value); const b = parseInt(this.els.B.value); const q = this.questionColor;
        const score = utils.calcScore(q, {r, g, b});
        const target = this.aimScores[this.currentStage - 1]; 
        const isClear = Number(score) >= Number(target);
        
        app.showScreen('result-survival');
        const scoreText = document.getElementById('survival-score-text'); scoreText.innerText = isClear ? "Clear!" : "FAILED"; scoreText.style.color = isClear ? "var(--accent-green)" : "var(--accent-red)";
        document.getElementById('survival-result-score').innerText = score + "%"; document.getElementById('survival-result-goal').innerText = target + "%";
        document.getElementById('survival-ans-color').style.backgroundColor = q.hex; document.getElementById('survival-ans-text').innerText = `${q.r},${q.g},${q.b}`;
        document.getElementById('survival-your-color').style.backgroundColor = utils.rgbToHex(r,g,b); document.getElementById('survival-your-text').innerText = `${r},${g},${b}`;
        localStorage.setItem("4answer_rgb16_"+this.currentStage, q.hex); localStorage.setItem("4input_rgb16_"+this.currentStage, utils.rgbToHex(r,g,b));
        localStorage.setItem("4answer_rgb_"+this.currentStage, `(${q.r},${q.g},${q.b})`); localStorage.setItem("4input_rgb_"+this.currentStage, `(${r},${g},${b})`);
        
        const maxStage = Number(localStorage.getItem("4stage_record")) || 0;
        const recordEl = document.getElementById('survival-new-record');
        if(isClear && this.currentStage > maxStage) { recordEl.classList.remove('hidden'); } else { recordEl.classList.add('hidden'); }

        if(isClear) {
            this.els.nextBtn.innerText = "NEXT STAGE"; this.els.nextBtn.onclick = () => this.next();
            localStorage.setItem("4stage_number" + this.currentStage, score);
            if(this.currentStage > maxStage) { localStorage.setItem("4stage_record", this.currentStage); }
            this.currentStage++; localStorage.setItem("4stage_number", this.currentStage); localStorage.removeItem("4RGB_Temporary_Hex");
        } else {
            this.els.nextBtn.innerText = "RESTART"; this.els.nextBtn.onclick = () => this.quickRestart();
        }
        this.updateHistory();
    },
    next: function() { if(this.currentStage > 25) { app.alert("ALL CLEAR! CONGRATULATIONS!", ()=>this.resetData()); return; } this.setupStage(); app.showScreen('survival'); },
    quickRestart: function() {
        for(let i=1; i<=26; i++) { localStorage.removeItem("4stage_number"+i); localStorage.removeItem("4answer_rgb16_"+i); localStorage.removeItem("4input_rgb16_"+i); localStorage.removeItem("4answer_rgb_"+i); localStorage.removeItem("4input_rgb_"+i); }
        localStorage.setItem("4stage_number", 1); localStorage.removeItem("4RGB_Temporary_Hex"); this.currentStage = 1; this.setupStage(); this.updateHistory(); app.showScreen('survival');
    },
    updateHistory: function() {
        const pb = localStorage.getItem("4stage_record"); document.getElementById('survival-pb').innerText = pb ? `${pb}` : "1";
        let html = "";
        for(let i = this.currentStage - 1; i >= 1; i--) {
            const sc = localStorage.getItem("4stage_number"+i); const goal = this.aimScores[i-1];
            const ansHex = localStorage.getItem("4answer_rgb16_"+i) || '#000'; const myHex = localStorage.getItem("4input_rgb16_"+i) || '#000';
            const ansTxt = localStorage.getItem("4answer_rgb_"+i) || ''; const myTxt = localStorage.getItem("4input_rgb_"+i) || '';
            if(sc) {
                const stNum = i.toString().padStart(2, '0');
                html += `<div class="history-item"><div class="history-index" style="width:auto; min-width:30px;"><span class="stage-badge-history">${stNum}</span></div><div class="history-colors"><div class="color-row"><span class="label-box" style="color:#aaa">TARGET</span><span class="chip-xs" style="background:${ansHex}"></span><span>${ansTxt}</span></div><div class="color-row"><span class="label-box" style="color:#fff">YOU</span><span class="chip-xs" style="background:${myHex}"></span><span>${myTxt}</span></div></div><div class="history-right"><div class="history-score-val">${sc}%</div><div class="history-goal-text">GOAL ${goal}%</div></div></div>`;
            }
        }
        document.getElementById('survival-history').innerHTML = html;
    },
    resetData: function() { 
        app.confirm("Survivalモードの記録をリセットしますか？", (y)=>{ if(y) { this.quickRestart(); localStorage.removeItem("4stage_record"); } }) 
    }
};

const anotherGame = {
    init: function() {
        this.els = { R: document.getElementById('another-R'), G: document.getElementById('another-G'), B: document.getElementById('another-B'), valR: document.getElementById('another-val-R'), valG: document.getElementById('another-val-G'), valB: document.getElementById('another-val-B'), myColor: document.getElementById('another-input-color') };
        const update = () => this.updateMyColor(); 
        this.els.R.oninput = update; this.els.G.oninput = update; this.els.B.oninput = update;
        this.els.R.value = 128; this.els.G.value = 128; this.els.B.value = 128; 
        this.updateMyColor(); this.updateHistory();
    },
    updateMyColor: function() {
        const r = parseInt(this.els.R.value); const g = parseInt(this.els.G.value); const b = parseInt(this.els.B.value);
        this.els.valR.innerText = r; this.els.valG.innerText = g; this.els.valB.innerText = b;
        this.els.myColor.style.backgroundColor = utils.rgbToHex(r, g, b);
    },
    saveColor: function() {
        const r = parseInt(this.els.R.value); const g = parseInt(this.els.G.value); const b = parseInt(this.els.B.value);
        const hex = utils.rgbToHex(r, g, b);
        let val = Number(localStorage.getItem("3index")) || 1;
        localStorage.setItem("3input_rgb16"+val, hex);
        localStorage.setItem("3input_rgb"+val, `(${r},${g},${b})`);
        localStorage.setItem("3date"+val, new Date().toLocaleString());
        localStorage.setItem("3index", val + 1);
        this.updateHistory();
    },
    updateHistory: function() {
        const list = document.getElementById('another-history'); 
        const val = Number(localStorage.getItem("3index")) || 1;
        let html = "";
        for(let i = val - 1; i > 0; i--) {
            const hex = localStorage.getItem("3input_rgb16"+i) || '#000'; const txt = localStorage.getItem("3input_rgb"+i) || ''; const date = localStorage.getItem("3date"+i) || '';
            html += `<div class="history-item" style="grid-template-columns: 40px 1fr;"><span class="history-index">#${i}</span><div class="history-colors"><div class="color-row"><span class="chip-xs" style="background:${hex}; width:20px; height:20px;"></span><span style="font-size:1rem; font-weight:bold; color:#fff;">${txt}</span></div><div style="font-size:0.7rem; color:#666; margin-top:2px;">${date}</div></div></div>`;
        }
        list.innerHTML = html;
    },
    resetData: function() { 
        app.confirm("保存した色をすべて消去しますか？", (y)=>{ 
            if(y){ 
                const val = Number(localStorage.getItem("3index")) || 1;
                for(let i=1; i<val; i++) { localStorage.removeItem("3input_rgb16"+i); localStorage.removeItem("3input_rgb"+i); localStorage.removeItem("3date"+i); }
                localStorage.removeItem("3index");
                this.updateHistory();
            } 
        });
    }
};

// Daily Game Mode (Updated Share)
const dailyGame = {
    // ... (init, guess, showResult, startTimer, resetData は既存のまま) ...

    targetColor: {}, dateStr: "", timerInterval: null, els:{},
    init: function() {
        if(this.timerInterval) clearInterval(this.timerInterval);
        this.els = { R: document.getElementById('daily-R'), G: document.getElementById('daily-G'), B: document.getElementById('daily-B'), valR: document.getElementById('daily-val-R'), valG: document.getElementById('daily-val-G'), valB: document.getElementById('daily-val-B'), qColor: document.getElementById('daily-question-color') };
        
        // Ensure listener is added
        const guessBtn = document.getElementById('daily-guess-btn');
        if(guessBtn) guessBtn.onclick = () => this.guess();

        this.dateStr = utils.getTodayString();
        this.targetColor = utils.generateDailyColor(this.dateStr);
        
        const playedScore = localStorage.getItem("daily_score_" + this.dateStr);
        if (playedScore) {
            const savedInputHex = localStorage.getItem("daily_input_hex_" + this.dateStr) || "#000000";
            this.showResult(playedScore, this.targetColor, savedInputHex);
            return;
        }

        const update = () => { this.els.valR.innerText = this.els.R.value; this.els.valG.innerText = this.els.G.value; this.els.valB.innerText = this.els.B.value; };
        this.els.R.oninput = update; this.els.G.oninput = update; this.els.B.oninput = update;
        
        this.els.R.value = 128; this.els.G.value = 128; this.els.B.value = 128; 
        update();
        document.getElementById('daily-date-display').innerText = utils.getFormattedDate();
        this.els.qColor.style.backgroundColor = this.targetColor.hex;
    },

    guess: function() {
        const r = parseInt(this.els.R.value); const g = parseInt(this.els.G.value); const b = parseInt(this.els.B.value);
        const score = utils.calcScore(this.targetColor, {r, g, b});
        localStorage.setItem("daily_score_" + this.dateStr, score);
        localStorage.setItem("daily_input_hex_" + this.dateStr, utils.rgbToHex(r, g, b));
        this.showResult(score, this.targetColor, utils.rgbToHex(r, g, b));
    },

    showResult: function(score, target, inputHex) {
        if(this.timerInterval) clearInterval(this.timerInterval);
        app.showScreen('result-daily');
        document.getElementById('daily-res-date').innerText = utils.getFormattedDate();
        document.getElementById('daily-score').innerText = score + "%";
        document.getElementById('daily-ans-color').style.backgroundColor = target.hex;
        document.getElementById('daily-ans-text').innerText = `${target.r}, ${target.g}, ${target.b}`; 
        document.getElementById('daily-your-color').style.backgroundColor = inputHex;
        document.getElementById('daily-your-text').innerText = utils.hexToRgbString(inputHex);
        this.startTimer();
    },

    startTimer: function() {
        const updateTimer = () => {
            const now = new Date();
            const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
            const diff = tomorrow - now;
            if (diff <= 0) { document.getElementById('daily-next-timer').innerText = "Refresh to Play!"; return; }
            const h = Math.floor(diff / (1000 * 60 * 60));
            const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
            const s = Math.floor((diff % (1000 * 60)) / 1000);
            const timerEl = document.getElementById('daily-next-timer');
            if(timerEl) timerEl.innerText = `${h.toString().padStart(2,'0')}:${m.toString().padStart(2,'0')}:${s.toString().padStart(2,'0')}`;
        };
        updateTimer();
        this.timerInterval = setInterval(updateTimer, 1000);
    },

    // ★修正: Canvas描画ロジックの改善 (Originとデザイン統一)
    shareResult: function() {
        const canvas = document.getElementById('share-canvas');
        const ctx = canvas.getContext('2d');
        const dateText = utils.getFormattedDate();
        const score = document.getElementById('daily-score').innerText;
        const targetHex = this.targetColor.hex;
        const savedInputHex = localStorage.getItem("daily_input_hex_" + this.dateStr) || "#000000";
        
        // Background
        const grad = ctx.createLinearGradient(0, 0, 600, 400);
        grad.addColorStop(0, '#1a1a2e'); grad.addColorStop(1, '#16213e');
        ctx.fillStyle = grad; ctx.fillRect(0, 0, 600, 400);

        // Icon
        const img = document.getElementById('source-logo-icon');
        if (img && img.complete) { ctx.drawImage(img, 25, 25, 50, 50); }
        
        // Header
        ctx.font = '900 32px "Inter", sans-serif'; ctx.fillStyle = '#ffffff'; ctx.textAlign = 'left'; ctx.fillText("RETINA", 90, 65);
        ctx.font = '700 16px "JetBrains Mono", monospace'; ctx.fillStyle = '#ffd700'; ctx.fillText("DAILY CHALLENGE", 420, 65);

        // Info Line
        ctx.beginPath(); ctx.moveTo(30, 90); ctx.lineTo(570, 90); ctx.strokeStyle = 'rgba(255,255,255,0.2)'; ctx.lineWidth = 1; ctx.stroke();
        ctx.font = '16px "JetBrains Mono", monospace'; ctx.fillStyle = '#aaa'; ctx.textAlign = 'center'; ctx.fillText(dateText, 300, 120);

        // Score
        ctx.font = '900 90px "Inter", sans-serif'; ctx.textAlign = 'center'; ctx.fillStyle = '#ffffff'; ctx.fillText(score, 300, 220);
        
        // Colors
        const drawColor = (x, y, color, label) => {
            ctx.font = 'bold 14px sans-serif'; ctx.fillStyle = '#8b9bb4'; ctx.textAlign = 'center'; ctx.fillText(label, x, y - 55);
            ctx.save();
            ctx.beginPath(); ctx.arc(x, y, 40, 0, Math.PI * 2); ctx.fillStyle = color; ctx.fill();
            ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(255,255,255,0.2)'; ctx.stroke();
            ctx.restore();
            ctx.font = '14px "JetBrains Mono", monospace'; ctx.fillStyle = '#fff'; ctx.fillText(color.toUpperCase(), x, y + 60);
        };
        drawColor(200, 310, targetHex, "TARGET");
        drawColor(400, 310, savedInputHex, "YOU");

        // Footer
        ctx.font = '12px sans-serif'; ctx.fillStyle = 'rgba(255,255,255,0.4)'; ctx.textAlign = 'center'; ctx.fillText("rgb-guessr.web.app", 300, 385);

        canvas.toBlob(blob => {
            const file = new File([blob], "retina_daily.png", { type: "image/png" });
            if (navigator.canShare && navigator.canShare({ files: [file] })) {
                navigator.share({ files: [file], title: 'Retina Daily Result', text: `Retina - Daily Color Challenge ${dateText} | Score: ${score}` }).catch(console.error);
            } else {
                const link = document.createElement('a'); link.download = `retina_daily_${dateText}.png`; link.href = canvas.toDataURL(); link.click();
            }
        });
    }
};
// ... (Firebase Config, app, utils, menuLogic, originGame, rushGame, survivalGame, anotherGame, dailyGame are unchanged) ...
// ※ここでは省略していますが、必ず前回のコードを使用してください。

// ▼ 6. VERSUS MODE (Unified 2-4 Players) - FIXED Lobby
const versusGame = {
    roomId: null, role: null, roomRef: null,
    myName: "Player", currentRound: 0, 

    createRoom: function() {
        const name = document.getElementById('versus-name-input').value.trim();
        if(!name) return app.alert("Please enter your name.");
        
        let maxWins = parseInt(document.getElementById('versus-goal-input').value);
        if (isNaN(maxWins) || maxWins < 0) maxWins = 5;

        localStorage.setItem("friend_name", name);
        this.myName = name; this.role = 'p1'; 
        this.currentRound = 0;
        this.roomId = Math.floor(1000 + Math.random() * 9000).toString();
        this.roomRef = db.ref('rooms_versus/' + this.roomId);
        
        this.roomRef.set({
            state: 'waiting', 
            question: utils.randColor(), 
            round: 1,
            maxWins: maxWins, 
            players: {
                p1: { name: this.myName, score: 0, status: 'waiting' },
                p2: { name: '', score: 0, status: 'empty' },
                p3: { name: '', score: 0, status: 'empty' },
                p4: { name: '', score: 0, status: 'empty' }
            },
            winner: null
        });
        this.roomRef.onDisconnect().remove();
        this.listenToRoom();
        document.getElementById('versus-room-id-display').innerText = this.roomId;
        app.showScreen('versus-lobby');
    },

    showJoinScreen: function() {
        const name = document.getElementById('versus-name-input').value.trim();
        if(!name) return app.alert("Please enter your name.");
        localStorage.setItem("friend_name", name); this.myName = name;
        app.showScreen('versus-join');
    },

    joinRoom: function() {
        const inputEl = document.getElementById('versus-room-input');
        const inputId = inputEl.value;
        if(!/^\d{4}$/.test(inputId)) return app.alert("Enter 4-digit ID");
        
        const joinBtn = document.querySelector('#screen-versus-join .main-action-btn');
        joinBtn.disabled = true;

        this.roomId = inputId;
        this.roomRef = db.ref('rooms_versus/' + this.roomId);
        this.currentRound = 0;

        app.showScreen('versus-lobby');
        document.getElementById('versus-room-id-display').innerText = this.roomId;
        document.getElementById('versus-status-text').innerText = "Connecting...";
        
        this.roomRef.once('value').then(snapshot => {
            if(snapshot.exists()) {
                const data = snapshot.val();
                if (data.players.p2.status === 'empty') this.role = 'p2';
                else if (data.players.p3.status === 'empty') this.role = 'p3';
                else if (data.players.p4.status === 'empty') this.role = 'p4';
                else {
                    app.alert("Room is full (4/4)", () => { app.showScreen('versus-join'); });
                    joinBtn.disabled = false;
                    return;
                }
                this.roomRef.child(`players/${this.role}`).update({ name: this.myName, score: 0, status: 'waiting' });
                this.roomRef.child(`players/${this.role}`).onDisconnect().update({ name: '', score: 0, status: 'empty' });
                this.listenToRoom();
                joinBtn.disabled = false;
            } else { 
                app.alert("Room not found", () => { app.showScreen('versus-join'); });
                joinBtn.disabled = false;
            }
        }).catch(() => {
            app.alert("Connection Error", () => { app.showScreen('versus-join'); });
            joinBtn.disabled = false;
        });
    },

    listenToRoom: function() {
        this.roomRef.on('value', (snapshot) => {
            const data = snapshot.val();
            if(!data) { app.alert("Connection lost / Room closed", () => { this.exitRoom(true); }); return; }

            let activeCount = 0;
            let activeKeys = [];
            ['p1', 'p2', 'p3', 'p4'].forEach(key => {
                if (data.players[key].status !== 'empty') {
                    activeCount++;
                    activeKeys.push(key);
                }
            });

            if (data.state !== 'waiting' && activeCount < 2) {
                app.alert("Everyone left the game...", () => { this.exitRoom(); });
                return;
            }

            const goalText = (data.maxWins > 0) ? `First to ${data.maxWins} Wins` : "Endless Mode";
            document.getElementById('versus-lobby-goal').innerText = `GOAL: ${goalText}`;

            // ★修正: シンプルなテキストリスト更新
            ['p1', 'p2', 'p3', 'p4'].forEach((key, i) => {
                const el = document.getElementById(`versus-${key}-name`);
                const p = data.players[key];
                let label = (i === 0) ? "Host" : `Guest ${i}`;
                if (p.status !== 'empty') {
                    el.innerText = `${label}: ${p.name}`;
                    el.style.color = "#fff";
                } else {
                    el.innerText = `${label}: ---`;
                    el.style.color = "#666";
                }
            });

            document.getElementById('versus-status-text').innerText = `Waiting for players (${activeCount}/4)...`;

            const startArea = document.getElementById('host-start-area');
            if (this.role === 'p1' && data.state === 'waiting') {
                if (activeCount >= 2) startArea.classList.remove('hidden');
                else startArea.classList.add('hidden');
            } else {
                startArea.classList.add('hidden');
            }

            if (data.state === 'finished') {
                this.showResult(data);
                return;
            }

            if (data.state === 'playing') {
                if(!document.getElementById('screen-versus-battle').classList.contains('active')) {
                    this.startRound(data);
                } else if (this.currentRound !== data.round) {
                    this.startRound(data);
                }

                let waitingCount = 0;
                activeKeys.forEach(k => {
                    if (data.players[k].status !== 'guessed') waitingCount++;
                });
                
                const statusEl = document.getElementById('versus-opponent-status');
                if (waitingCount === 0) {
                    statusEl.innerText = "All players answered!";
                    statusEl.style.background = "rgba(255, 71, 87, 0.2)"; 
                    statusEl.style.color = "#ff4757";
                } else {
                    statusEl.innerText = `${waitingCount} player(s) thinking...`;
                    statusEl.style.background = "rgba(156, 136, 255, 0.1)"; 
                    statusEl.style.color = "var(--primary-multi)";
                }

                if (this.role === 'p1' && waitingCount === 0) {
                    this.calcResult(data);
                }
            }
        });
    },

    // ... (hostStartGame, startRound, updateColor, submitGuess, calcResult, showResult, voteContinue, nextRound, confirmExit, exitRoom は前回のまま) ...
    // ※文字数制限のため省略。前回のコードをそのまま使用してください。
    
    hostStartGame: function() { this.roomRef.update({ state: 'playing' }); },

    startRound: function(data) {
        if (this.currentRound === data.round && document.getElementById('screen-versus-battle').classList.contains('active')) return;
        app.showScreen('versus-battle');
        document.getElementById('versus-wait-msg').classList.add('hidden');
        document.getElementById('versus-guess-btn').classList.remove('hidden');
        const update = () => this.updateColor();
        document.getElementById('versus-R').oninput = update; document.getElementById('versus-G').oninput = update; document.getElementById('versus-B').oninput = update;
        this.currentRound = data.round;
        const q = data.question;
        document.getElementById('versus-R').value = 128; document.getElementById('versus-G').value = 128; document.getElementById('versus-B').value = 128;
        this.updateColor();
        document.getElementById('versus-round-display').innerText = "Round " + data.round;
        document.getElementById('versus-question-color').style.backgroundColor = q.hex; 
    },
    updateColor: function() {
        const r = document.getElementById('versus-R').value; const g = document.getElementById('versus-G').value; const b = document.getElementById('versus-B').value;
        document.getElementById('versus-val-R').innerText = r; document.getElementById('versus-val-G').innerText = g; document.getElementById('versus-val-B').innerText = b;
    },
    submitGuess: function() {
        const r = parseInt(document.getElementById('versus-R').value); const g = parseInt(document.getElementById('versus-G').value); const b = parseInt(document.getElementById('versus-B').value);
        this.roomRef.child(`players/${this.role}`).update({ color: {r, g, b, hex: utils.rgbToHex(r,g,b)}, status: 'guessed' });
        document.getElementById('versus-guess-btn').classList.add('hidden');
        document.getElementById('versus-wait-msg').classList.remove('hidden');
    },
    calcResult: function(data) {
        const q = data.question; let updates = {}; let scores = [];
        Object.keys(data.players).forEach(key => {
            const p = data.players[key];
            if (p.status !== 'empty') {
                const roundScore = utils.calcScoreValue(q, p.color);
                scores.push({ key: key, score: roundScore });
                updates[`players/${key}/lastScore`] = roundScore.toFixed(2);
            }
        });
        if (scores.length > 0) {
            scores.sort((a, b) => b.score - a.score); const maxScore = scores[0].score;
            scores.forEach(s => { if (s.score === maxScore) { const currentWins = data.players[s.key].score || 0; updates[`players/${s.key}/score`] = currentWins + 1; } });
        }
        updates['state'] = 'finished';
        this.roomRef.update(updates);
    },
    showResult: function(data) {
        if(!document.getElementById('screen-versus-result').classList.contains('active')) { app.showScreen('versus-result'); }
        const q = data.question; const myKey = this.role;
        let activePlayers = [];
        Object.keys(data.players).forEach(key => {
            const p = data.players[key];
            if (p.status !== 'empty') {
                activePlayers.push({ key: key, name: p.name, score: p.lastScore || "0.00", wins: p.score, color: p.color || {r:0,g:0,b:0,hex:'#000'}, me: (key === myKey) });
            }
        });
        activePlayers.sort((a, b) => Number(b.score) - Number(a.score));
        const resultContainer = document.getElementById('versus-result-container');
        let html = `<div class="res-grid-container players-${activePlayers.length}">`;
        activePlayers.forEach((p, idx) => {
            let rankClass = idx === 0 ? 'rank-1st' : (idx === 1 ? 'rank-2nd' : (idx === 2 ? 'rank-3rd' : ''));
            let rankText = idx === 0 ? '1st' : (idx === 1 ? '2nd' : (idx === 2 ? '3rd' : (idx+1)+'th'));
            html += `<div class="res-grid-box"><span class="res-grid-rank ${rankClass}">${rankText}</span><span class="res-grid-score">${p.score}%</span><span class="res-grid-name">${p.name}</span>${p.me ? '<span class="res-you-badge">(YOU)</span>' : ''}<div class="res-win-badge"><span style="font-size:0.7rem; color:#aaa;">WINS</span><span style="font-size:1.2rem; color:#fff; font-weight:bold;">${p.wins}</span></div></div>`;
        });
        html += '</div>';
        resultContainer.innerHTML = html;
        const title = document.getElementById('versus-result-title');
        const myRank = activePlayers.findIndex(p => p.me);
        if (myRank === 0) { title.innerText = "WINNER!"; title.style.color = "var(--accent-gold)"; } else if (myRank === 1) { title.innerText = "2nd PLACE"; title.style.color = "#c0c0c0"; } else if (myRank === 2) { title.innerText = "3rd PLACE"; title.style.color = "#cd7f32"; } else { title.innerText = (myRank + 1) + "th PLACE"; title.style.color = "#fff"; }
        const goal = data.maxWins || 5;
        document.getElementById('versus-goal-val').innerText = (goal > 0) ? goal : "∞";
        document.getElementById('versus-ans-color').style.backgroundColor = q.hex; document.getElementById('versus-ans-text').innerText = `${q.r}, ${q.g}, ${q.b}`;
        const playersCompContainer = document.getElementById('versus-players-compare');
        if (activePlayers.length === 4) { playersCompContainer.className = "multi-players-wrapper grid-2x2"; } else { playersCompContainer.className = "multi-players-wrapper flex-row"; }
        let compareHtml = ''; let sortedByKey = [...activePlayers].sort((a, b) => a.key.localeCompare(b.key));
        sortedByKey.forEach(p => { compareHtml += `<div class="multi-compare-item"><p class="multi-compare-label">${p.name}</p><div class="mini-box" style="background:${p.color.hex}"></div><span class="rgb-value-text">${p.color.r},${p.color.g},${p.color.b}</span></div>`; });
        playersCompContainer.innerHTML = compareHtml;
        let champion = null; if (goal > 0) { activePlayers.forEach(p => { if (p.wins >= goal) champion = p.name; }); }
        const winDeclare = document.getElementById('versus-final-winner'); const btn = document.getElementById('versus-continue-btn'); const contMsg = document.getElementById('versus-continue-status');
        if (champion) {
            winDeclare.classList.remove('hidden'); winDeclare.innerText = `🏆 ${champion} WINS THE GAME! 🏆`; title.innerText = "GAME SET"; title.style.color = "#fff";
            btn.innerText = "RETURN TO MENU"; btn.disabled = false; btn.style.background = "var(--primary-multi)"; btn.onclick = () => this.confirmExit(); contMsg.innerText = "Thanks for playing!";
        } else {
            winDeclare.classList.add('hidden'); btn.onclick = () => this.voteContinue();
            if (data.players[this.role].status === 'ready') { btn.disabled = true; btn.innerText = "WAITING..."; btn.style.background = "#555"; btn.style.opacity = "0.7"; } else { btn.disabled = false; btn.innerText = "CONTINUE"; btn.style.background = "var(--primary-multi)"; btn.style.opacity = "1"; }
            let readyCount = 0; let totalActive = activePlayers.length; activePlayers.forEach(p => { if (data.players[p.key].status === 'ready') readyCount++; });
            if(readyCount === totalActive) contMsg.innerText = "Starting next round..."; else contMsg.innerText = `Waiting for players (${readyCount}/${totalActive} ready)...`;
            if (this.role === 'p1' && readyCount === totalActive) { this.nextRound(data.round + 1); }
        }
    },
    voteContinue: function() { const btn = document.getElementById('versus-continue-btn'); btn.disabled = true; btn.innerText = "WAITING..."; btn.style.background = "#555"; btn.style.opacity = "0.7"; this.roomRef.child(`players/${this.role}`).update({ status: 'ready' }); },
    nextRound: function(nextRoundNum) { this.roomRef.once('value').then(snap => { const d = snap.val(); let updates = {}; updates['question'] = utils.randColor(); updates['round'] = nextRoundNum; updates['state'] = 'playing'; Object.keys(d.players).forEach(key => { if (d.players[key].status !== 'empty') { updates[`players/${key}/status`] = 'thinking'; } }); this.roomRef.update(updates); }); },
    confirmExit: function() { app.confirm("Exit Multiplayer?", (y) => { if(y) this.exitRoom(); }); },
    exitRoom: function(isPassive) { if(this.roomRef && !isPassive) { this.roomRef.off(); if (this.role) { this.roomRef.child(`players/${this.role}`).update({ name: '', score: 0, status: 'empty' }); } } this.roomId = null; app.showScreen('menu'); }
};

document.getElementById('versus-room-input').addEventListener('input', function(e) { this.value = this.value.replace(/[^0-9]/g, ''); });

// ▼ Initialize App
window.onload = function() {
    const savedScreen = localStorage.getItem('current_screen');
    menuLogic.init();

    if (savedScreen && savedScreen !== 'menu') {
        if (savedScreen === 'origin') originGame.init();
        else if (savedScreen === 'rush') rushGame.init();
        else if (savedScreen === 'survival') survivalGame.init();
        else if (savedScreen === 'daily') dailyGame.init();
        else if (savedScreen === 'anotherworld') anotherGame.init();
        app.showScreen(savedScreen);
    } else {
        app.showScreen('menu');
    }
};