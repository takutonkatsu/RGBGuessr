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
    },

    backToMenu: function() {
        if(friendGame.roomId) {
            friendGame.confirmExit();
        } else {
            this.showScreen('menu');
        }
    },

    startGame: function(mode) {
        if(mode === 'friend') {
            this.showScreen('friend-menu');
            const savedName = localStorage.getItem("friend_name");
            if(savedName) document.getElementById('friend-name-input').value = savedName;
            return;
        }
        this.showScreen(mode);
        if(mode === 'matching') matchingGame.init();
        if(mode === 'original') originalGame.init();
        if(mode === 'challenge') challengeGame.init();
        if(mode === 'anotherworld') anotherGame.init();
    },

    triggerSecret: function() {
        this.secretCount++;
        clearTimeout(this.secretTimer);
        this.secretTimer = setTimeout(() => { this.secretCount = 0; }, 1000); 
        if(this.secretCount >= 5) { this.secretCount = 0; this.startGame('anotherworld'); }
    }
};

// ▼ Utils & Menu Logic (省略せず記載)
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
    }
};

const menuLogic = {
    init: function() {
        const today = new Date();
        const ymd = (today.getFullYear()-2024)*400 + today.getMonth()*31 + today.getDate();
        const savedDate = localStorage.getItem("date_key");
        if(savedDate != ymd) { localStorage.setItem("date_key", ymd); }

        this.showDualRecord("2my_1record", "2my_ao5record", "menu-matching-record");
        this.showDualRecord("my_1record", "my_ao5record", "menu-original-record");
        
        const stageRec = localStorage.getItem("4stage_record");
        const stageElem = document.getElementById("menu-challenge-record");
        if(stageElem) { stageElem.innerHTML = stageRec ? `Max Stage: <span>${stageRec}</span>` : "Start: Stage 1"; }

        const ao5Rec = Number(localStorage.getItem("my_ao5record")) || 0;
        const logoEl = document.getElementById("app-logo");
        if(logoEl) {
            if(ao5Rec >= 4990) {
                logoEl.innerHTML = `GOD<span class="logo-light">Guessr</span>`;
                logoEl.className = "logo logo-god";
            } else if(ao5Rec >= 4950) {
                logoEl.innerHTML = `PRO<span class="logo-light">Guessr</span>`;
                logoEl.className = "logo logo-pro";
            } else {
                logoEl.innerHTML = `<span class="logo-r">R</span><span class="logo-g">G</span><span class="logo-b">B</span><span class="logo-light">Guessr</span>`;
                logoEl.className = "logo";
            }
        }
    },
    showDualRecord: function(singleKey, ao5Key, elemId) {
        const sRec = localStorage.getItem(singleKey);
        const aRec = localStorage.getItem(ao5Key);
        const el = document.getElementById(elemId);
        if(el) {
            if(!sRec && !aRec) { el.innerText = "NO RECORD"; } else {
                let html = "";
                if(sRec) html += `Best: <span>${sRec}</span>`;
                if(sRec && aRec) html += " / ";
                if(aRec) html += `Ao5: <span>${aRec}</span>`;
                el.innerHTML = html;
            }
        }
    }
};

// ▼ Game Modes (Matching, Original, Challenge, AnotherWorld) - Same as before
const matchingGame = {
    timerInterval: null, currentTime: 0, questionColor: {},
    init: function() {
        this.els = { R: document.getElementById('matching-R'), G: document.getElementById('matching-G'), B: document.getElementById('matching-B'), valR: document.getElementById('matching-val-R'), valG: document.getElementById('matching-val-G'), valB: document.getElementById('matching-val-B'), qColor: document.getElementById('matching-question-color'), myColor: document.getElementById('matching-input-color'), timer: document.getElementById('matching-timer') };
        const update = () => this.updateMyColor(); this.els.R.oninput = update; this.els.G.oninput = update; this.els.B.oninput = update;
        document.getElementById('matching-guess-btn').onclick = () => this.guess();
        this.updateHistory(); this.resetGame();
    },
    resetGame: function() {
        this.currentTime = 0;
        const savedHex = localStorage.getItem("2RGB_Temporary_Hex");
        if (savedHex) {
            const r = Number(localStorage.getItem("2RGB_Temporary_R")); const g = Number(localStorage.getItem("2RGB_Temporary_G")); const b = Number(localStorage.getItem("2RGB_Temporary_B"));
            this.questionColor = { r, g, b, hex: savedHex };
        } else {
            this.questionColor = utils.randColor();
            localStorage.setItem("2RGB_Temporary_Hex", this.questionColor.hex); localStorage.setItem("2RGB_Temporary_R", this.questionColor.r); localStorage.setItem("2RGB_Temporary_G", this.questionColor.g); localStorage.setItem("2RGB_Temporary_B", this.questionColor.b);
        }
        this.els.qColor.style.backgroundColor = this.questionColor.hex;
        this.els.R.value = 128; this.els.G.value = 128; this.els.B.value = 128; this.updateMyColor();
        if(this.timerInterval) clearInterval(this.timerInterval);
        this.timerInterval = setInterval(() => { this.currentTime += 0.01; this.els.timer.innerText = this.currentTime.toFixed(2); }, 10);
    },
    updateMyColor: function() {
        const r = parseInt(this.els.R.value); const g = parseInt(this.els.G.value); const b = parseInt(this.els.B.value);
        this.els.valR.innerText = r; this.els.valG.innerText = g; this.els.valB.innerText = b;
        this.els.myColor.style.backgroundColor = utils.rgbToHex(r, g, b);
    },
    guess: function() {
        clearInterval(this.timerInterval);
        const r = parseInt(this.els.R.value); const g = parseInt(this.els.G.value); const b = parseInt(this.els.B.value); const q = this.questionColor;
        const square = (q.r-r)**2 + (q.g-g)**2 + (q.b-b)**2; const base = Math.max((255-q.r)**2, q.r**2) + Math.max((255-q.g)**2, q.g**2) + Math.max((255-q.b)**2, q.b**2);
        const colorScore = Math.ceil(4000 - 4000 * square / base);
        let timeScore = 0; if(this.currentTime > 3) timeScore = Math.round(1000 * (3**0.5) / (this.currentTime**0.5)); else if(this.currentTime >= 0.4) timeScore = 1000;
        let totalScore = colorScore + timeScore; if(this.currentTime < 0.4) totalScore = 0;
        this.saveResult(totalScore, colorScore, timeScore, q, {r,g,b}); this.showResult(totalScore, colorScore, timeScore, q, {r,g,b});
    },
    saveResult: function(score, cScore, tScore, q, input) {
        let val = Number(localStorage.getItem("2index")) || 1;
        localStorage.setItem("2score"+val, score); localStorage.setItem("2result_time"+val, this.currentTime.toFixed(2));
        localStorage.setItem("2answer_rgb16"+val, q.hex); localStorage.setItem("2input_rgb16"+val, utils.rgbToHex(input.r, input.g, input.b));
        localStorage.setItem("2answer_rgb"+val, `(${q.r},${q.g},${q.b})`); localStorage.setItem("2input_rgb"+val, `(${input.r},${input.g},${input.b})`);
        const pb = Number(localStorage.getItem("2my_1record")) || 0;
        if(score > pb) { localStorage.setItem("2my_1record", score); document.getElementById('matching-new-record').classList.remove('hidden'); } else { document.getElementById('matching-new-record').classList.add('hidden'); }
        if(val >= 5) {
            let scores = []; for(let i=0; i<5; i++) scores.push(Number(localStorage.getItem("2score"+(val-i))));
            const max = Math.max(...scores); const min = Math.min(...scores); const sum = scores.reduce((a,b)=>a+b, 0); const ao5 = Math.ceil((sum - max - min)/3);
            localStorage.setItem("2Ao5"+val, ao5); const ao5pb = Number(localStorage.getItem("2my_ao5record")) || 0; if(ao5 > ao5pb) localStorage.setItem("2my_ao5record", ao5);
        }
        localStorage.setItem("2index", val + 1); this.updateHistory();
    },
    showResult: function(score, cScore, tScore, q, input) {
        app.showScreen('result-matching'); document.getElementById('matching-score').innerText = score; document.getElementById('matching-score-detail').innerText = `Color:${cScore} + Time:${tScore}`;
        document.getElementById('matching-ans-color').style.backgroundColor = q.hex; document.getElementById('matching-ans-text').innerText = `${q.r},${q.g},${q.b}`;
        document.getElementById('matching-your-color').style.backgroundColor = utils.rgbToHex(input.r, input.g, input.b); document.getElementById('matching-your-text').innerText = `${input.r},${input.g},${input.b}`;
    },
    updateHistory: function() {
        const list = document.getElementById('matching-history'); const val = Number(localStorage.getItem("2index")) || 1;
        const pb = Number(localStorage.getItem("2my_1record")) || 0; const bestAo5 = Number(localStorage.getItem("2my_ao5record")) || 0;
        let html = "";
        for(let i = val - 1; i > 0; i--) {
            const sc = localStorage.getItem("2score"+i); const tm = localStorage.getItem("2result_time"+i); const ao5 = localStorage.getItem("2Ao5"+i);
            const ansHex = localStorage.getItem("2answer_rgb16"+i) || '#000'; const myHex = localStorage.getItem("2input_rgb16"+i) || '#000';
            const ansTxt = localStorage.getItem("2answer_rgb"+i) || ''; const myTxt = localStorage.getItem("2input_rgb"+i) || '';
            let ao5Html = ao5 ? `<div class="history-ao5-badge ${Number(ao5)===bestAo5&&bestAo5>0?'highlight':''}">Ao5: ${ao5}</div>` : `<div class="history-ao5-badge placeholder">Ao5: ----</div>`;
            let rowClass = "history-item"; let indexHtml = `<span class="history-index">#${i}</span>`;
            if(Number(sc) === pb && pb > 0) { rowClass += " best-record"; indexHtml = `<span class="history-index">👑</span>`; }
            html += `<div class="${rowClass}">${indexHtml}<div class="history-colors"><div class="color-row"><span class="label-box" style="color:#aaa">TARGET</span><span class="chip-xs" style="background:${ansHex}"></span><span>${ansTxt}</span></div><div class="color-row"><span class="label-box" style="color:#fff">YOU</span><span class="chip-xs" style="background:${myHex}"></span><span>${myTxt}</span></div></div><div class="history-right"><div class="history-score-val">${sc}</div><div style="font-size:0.7rem; color:#888;">(${tm}s)</div>${ao5Html}</div></div>`;
        }
        list.innerHTML = html;
        document.getElementById('matching-pb').innerText = pb || "--"; document.getElementById('matching-ao5').innerText = localStorage.getItem("2my_ao5record") || "--";
    },
    retry: function() { localStorage.removeItem("2RGB_Temporary_Hex"); this.resetGame(); app.showScreen('matching'); },
    resetData: function() { app.confirm("記録を削除しますか？", (y)=>{ if(y){ localStorage.clear(); location.reload(); } }) }
};

const originalGame = {
    questionColor: {},
    init: function() {
        this.els = { R: document.getElementById('original-R'), G: document.getElementById('original-G'), B: document.getElementById('original-B'), valR: document.getElementById('original-val-R'), valG: document.getElementById('original-val-G'), valB: document.getElementById('original-val-B'), qColor: document.getElementById('original-question-color') };
        const update = () => { this.els.valR.innerText = this.els.R.value; this.els.valG.innerText = this.els.G.value; this.els.valB.innerText = this.els.B.value; };
        this.els.R.oninput = update; this.els.G.oninput = update; this.els.B.oninput = update;
        document.getElementById('original-guess-btn').onclick = () => this.guess();
        this.retry(); this.updateHistory();
    },
    retry: function() {
        const savedHex = localStorage.getItem("RGB_Temporary_Hex");
        if(savedHex) { const r = Number(localStorage.getItem("RGB_Temporary_R")); const g = Number(localStorage.getItem("RGB_Temporary_G")); const b = Number(localStorage.getItem("RGB_Temporary_B")); this.questionColor = { r, g, b, hex: savedHex }; }
        else { this.questionColor = utils.randColor(); localStorage.setItem("RGB_Temporary_Hex", this.questionColor.hex); localStorage.setItem("RGB_Temporary_R", this.questionColor.r); localStorage.setItem("RGB_Temporary_G", this.questionColor.g); localStorage.setItem("RGB_Temporary_B", this.questionColor.b); }
        this.els.qColor.style.backgroundColor = this.questionColor.hex; this.els.R.value = 128; this.els.G.value = 128; this.els.B.value = 128; this.els.R.oninput();
    },
    nextColor: function() { localStorage.removeItem("RGB_Temporary_Hex"); this.retry(); app.showScreen('original'); },
    guess: function() {
        const r = parseInt(this.els.R.value); const g = parseInt(this.els.G.value); const b = parseInt(this.els.B.value); const q = this.questionColor;
        const index = 2; const square = (q.r-r)**index + (q.g-g)**index + (q.b-b)**index; const base = Math.max((255-q.r)**index, q.r**index) + Math.max((255-q.g)**index, q.g**index) + Math.max((255-q.b)**index, q.b**index);
        const score = Math.ceil(5000 - 5000 * square / base);
        let val = Number(localStorage.getItem("index")) || 1;
        localStorage.setItem("score"+val, score); localStorage.setItem("answer_rgb16"+val, q.hex); localStorage.setItem("input_rgb16"+val, utils.rgbToHex(r,g,b));
        localStorage.setItem("answer_rgb"+val, `(${q.r},${q.g},${q.b})`); localStorage.setItem("input_rgb"+val, `(${r},${g},${b})`);
        const pb = Number(localStorage.getItem("my_1record")) || 0; if(score > pb) { localStorage.setItem("my_1record", score); document.getElementById('original-new-record').classList.remove('hidden'); } else { document.getElementById('original-new-record').classList.add('hidden'); }
        if(val >= 5) {
            let scores = []; for(let i=0; i<5; i++) scores.push(Number(localStorage.getItem("score"+(val-i))));
            const max = Math.max(...scores); const min = Math.min(...scores); const sum = scores.reduce((a,b)=>a+b,0); const ao5 = Math.ceil((sum - max - min)/3);
            localStorage.setItem("Ao5"+val, ao5); const ao5pb = Number(localStorage.getItem("my_ao5record")) || 0; if(ao5 > ao5pb) localStorage.setItem("my_ao5record", ao5);
        }
        localStorage.setItem("index", val + 1); localStorage.removeItem("RGB_Temporary_Hex");
        this.showResult(score, q, {r,g,b}); this.updateHistory();
    },
    showResult: function(score, q, input) {
        app.showScreen('result-original'); document.getElementById('original-score').innerText = score;
        document.getElementById('original-ans-color').style.backgroundColor = q.hex; document.getElementById('original-ans-text').innerText = `${q.r},${q.g},${q.b}`;
        document.getElementById('original-your-color').style.backgroundColor = utils.rgbToHex(input.r,input.g,input.b); document.getElementById('original-your-text').innerText = `${input.r},${input.g},${input.b}`;
        document.querySelector('#screen-result-original .btn-primary').onclick = () => this.nextColor();
    },
    updateHistory: function() {
        const val = Number(localStorage.getItem("index")) || 1; const pb = Number(localStorage.getItem("my_1record")) || 0; const bestAo5 = Number(localStorage.getItem("my_ao5record")) || 0;
        let html = "";
        for(let i = val - 1; i > 0; i--) {
            const sc = localStorage.getItem("score"+i); const ao5 = localStorage.getItem("Ao5"+i);
            const ansHex = localStorage.getItem("answer_rgb16"+i) || '#000'; const myHex = localStorage.getItem("input_rgb16"+i) || '#000';
            const ansTxt = localStorage.getItem("answer_rgb"+i) || ''; const myTxt = localStorage.getItem("input_rgb"+i) || '';
            let ao5Html = ao5 ? `<div class="history-ao5-badge ${Number(ao5)===bestAo5&&bestAo5>0?'highlight':''}">Ao5: ${ao5}</div>` : `<div class="history-ao5-badge placeholder">Ao5: ----</div>`;
            let rowClass = "history-item"; let indexHtml = `<span class="history-index">#${i}</span>`;
            if(Number(sc) === pb && pb > 0) { rowClass += " best-record"; indexHtml = `<span class="history-index">👑</span>`; }
            html += `<div class="${rowClass}">${indexHtml}<div class="history-colors"><div class="color-row"><span class="label-box" style="color:#aaa">TARGET</span><span class="chip-xs" style="background:${ansHex}"></span><span>${ansTxt}</span></div><div class="color-row"><span class="label-box" style="color:#fff">YOU</span><span class="chip-xs" style="background:${myHex}"></span><span>${myTxt}</span></div></div><div class="history-right"><div class="history-score-val">${sc}</div>${ao5Html}</div></div>`;
        }
        document.getElementById('original-history').innerHTML = html;
        document.getElementById('original-pb').innerText = pb || "--"; document.getElementById('original-ao5').innerText = localStorage.getItem("my_ao5record") || "--";
    },
    resetData: function() { app.confirm("記録を削除しますか？", (y)=>{ if(y){ localStorage.clear(); location.reload(); } }) }
};

const challengeGame = {
    aimScores: [1000,2000,3000,4000,4100,4200,4300,4400,4500,4600,4700,4800,4900,4910,4920,4930,4940,4950,4960,4970,4980,4990,4995,4998,5000],
    currentStage: 1, questionColor: {},
    init: function() {
        this.els = { R: document.getElementById('challenge-R'), G: document.getElementById('challenge-G'), B: document.getElementById('challenge-B'), valR: document.getElementById('challenge-val-R'), valG: document.getElementById('challenge-val-G'), valB: document.getElementById('challenge-val-B'), sample: document.getElementById('challenge-sample'), nextBtn: document.getElementById('challenge-next-btn') };
        const update = () => { this.els.valR.innerText = this.els.R.value; this.els.valG.innerText = this.els.G.value; this.els.valB.innerText = this.els.B.value; };
        this.els.R.oninput = update; this.els.G.oninput = update; this.els.B.oninput = update;
        document.getElementById('challenge-guess-btn').onclick = () => this.guess();
        const savedStage = localStorage.getItem("4stage_number"); this.currentStage = savedStage ? Number(savedStage) : 1;
        this.setupStage(); this.updateHistory();
    },
    setupStage: function() {
        const stageStr = this.currentStage.toString().padStart(2, '0'); document.getElementById('challenge-stage-num').innerText = stageStr; document.getElementById('challenge-aim-score').innerText = this.aimScores[this.currentStage - 1];
        const savedHex = localStorage.getItem("4RGB_Temporary_Hex");
        if(savedHex) { const r = Number(localStorage.getItem("4RGB_Temporary_R")); const g = Number(localStorage.getItem("4RGB_Temporary_G")); const b = Number(localStorage.getItem("4RGB_Temporary_B")); this.questionColor = { r,g,b, hex: savedHex }; }
        else { this.questionColor = utils.randColor(); localStorage.setItem("4RGB_Temporary_Hex", this.questionColor.hex); localStorage.setItem("4RGB_Temporary_R", this.questionColor.r); localStorage.setItem("4RGB_Temporary_G", this.questionColor.g); localStorage.setItem("4RGB_Temporary_B", this.questionColor.b); }
        this.els.sample.style.backgroundColor = this.questionColor.hex; this.els.R.value = 128; this.els.G.value = 128; this.els.B.value = 128; this.els.R.oninput();
    },
    guess: function() {
        const r = parseInt(this.els.R.value); const g = parseInt(this.els.G.value); const b = parseInt(this.els.B.value); const q = this.questionColor;
        const square = (q.r-r)**2 + (q.g-g)**2 + (q.b-b)**2; const base = Math.max((255-q.r)**2, q.r**2) + Math.max((255-q.g)**2, q.g**2) + Math.max((255-q.b)**2, q.b**2);
        const score = Math.ceil(5000 - 5000 * square / base);
        const target = this.aimScores[this.currentStage - 1]; const isClear = score >= target;
        app.showScreen('result-challenge');
        const scoreText = document.getElementById('challenge-score-text'); scoreText.innerText = isClear ? "Clear!" : "FAILED"; scoreText.style.color = isClear ? "var(--accent-green)" : "var(--accent-red)";
        document.getElementById('challenge-result-score').innerText = score; document.getElementById('challenge-result-goal').innerText = target;
        document.getElementById('challenge-ans-color').style.backgroundColor = q.hex; document.getElementById('challenge-ans-text').innerText = `${q.r},${q.g},${q.b}`;
        document.getElementById('challenge-your-color').style.backgroundColor = utils.rgbToHex(r,g,b); document.getElementById('challenge-your-text').innerText = `${r},${g},${b}`;
        localStorage.setItem("4answer_rgb16_"+this.currentStage, q.hex); localStorage.setItem("4input_rgb16_"+this.currentStage, utils.rgbToHex(r,g,b));
        localStorage.setItem("4answer_rgb_"+this.currentStage, `(${q.r},${q.g},${q.b})`); localStorage.setItem("4input_rgb_"+this.currentStage, `(${r},${g},${b})`);
        if(isClear) {
            this.els.nextBtn.innerText = "NEXT STAGE"; this.els.nextBtn.onclick = () => this.next();
            localStorage.setItem("4stage_number" + this.currentStage, score); this.currentStage++; localStorage.setItem("4stage_number", this.currentStage);
            const maxStage = Number(localStorage.getItem("4stage_record")) || 0; if(this.currentStage > maxStage) localStorage.setItem("4stage_record", this.currentStage);
            localStorage.removeItem("4RGB_Temporary_Hex");
        } else {
            this.els.nextBtn.innerText = "RESTART"; this.els.nextBtn.onclick = () => this.quickRestart();
        }
        this.updateHistory();
    },
    next: function() { if(this.currentStage > 25) { app.alert("ALL CLEAR! CONGRATULATIONS!", ()=>this.resetData()); return; } this.setupStage(); app.showScreen('challenge'); },
    quickRestart: function() {
        for(let i=1; i<=26; i++) { localStorage.removeItem("4stage_number"+i); localStorage.removeItem("4answer_rgb16_"+i); localStorage.removeItem("4input_rgb16_"+i); localStorage.removeItem("4answer_rgb_"+i); localStorage.removeItem("4input_rgb_"+i); }
        localStorage.setItem("4stage_number", 1); localStorage.removeItem("4RGB_Temporary_Hex"); this.currentStage = 1; this.setupStage(); this.updateHistory(); app.showScreen('challenge');
    },
    updateHistory: function() {
        const pb = localStorage.getItem("4stage_record"); document.getElementById('challenge-pb').innerText = pb ? `${pb}` : "1";
        let html = "";
        for(let i = this.currentStage - 1; i >= 1; i--) {
            const sc = localStorage.getItem("4stage_number"+i); const goal = this.aimScores[i-1];
            const ansHex = localStorage.getItem("4answer_rgb16_"+i) || '#000'; const myHex = localStorage.getItem("4input_rgb16_"+i) || '#000';
            const ansTxt = localStorage.getItem("4answer_rgb_"+i) || ''; const myTxt = localStorage.getItem("4input_rgb_"+i) || '';
            if(sc) {
                const stNum = i.toString().padStart(2, '0');
                html += `<div class="history-item"><div class="history-index" style="width:auto; min-width:30px;"><span class="stage-badge-history">${stNum}</span></div><div class="history-colors"><div class="color-row"><span class="label-box" style="color:#aaa">TARGET</span><span class="chip-xs" style="background:${ansHex}"></span><span>${ansTxt}</span></div><div class="color-row"><span class="label-box" style="color:#fff">YOU</span><span class="chip-xs" style="background:${myHex}"></span><span>${myTxt}</span></div></div><div class="history-right"><div class="history-score-val">${sc}</div><div class="history-goal-text">GOAL ${goal}</div></div></div>`;
            }
        }
        document.getElementById('challenge-history').innerHTML = html;
    },
    resetData: function() { app.confirm("リセットしますか？", (y)=>{ if(y) this.quickRestart(); }) }
};


// ▼ 5. FRIEND BATTLE MODE (同期バグ修正・安定化版)
const friendGame = {
    roomId: null, role: null, roomRef: null,
    myName: "Player", opponentName: "Opponent",
    currentRound: 0, 

    createRoom: function() {
        const name = document.getElementById('friend-name-input').value.trim();
        if(!name) return app.alert("Please enter your name.");
        localStorage.setItem("friend_name", name);
        this.myName = name; this.role = 'host';
        this.currentRound = 0;
        this.roomId = Math.floor(1000 + Math.random() * 9000).toString();
        this.roomRef = db.ref('rooms/' + this.roomId);
        this.roomRef.set({
            state: 'waiting', question: utils.randColor(), round: 1,
            host: { name: this.myName, status: 'waiting', score: 0 },
            guest: { name: '', status: 'waiting', score: 0 },
            wins: { host: 0, guest: 0 }
        });
        this.roomRef.onDisconnect().remove();
        this.listenToRoom();
        document.getElementById('friend-room-id-display').innerText = this.roomId;
        document.getElementById('friend-status-text').innerText = "Waiting for friend...";
        app.showScreen('friend-lobby');
    },

    showJoinScreen: function() {
        const name = document.getElementById('friend-name-input').value.trim();
        if(!name) return app.alert("Please enter your name.");
        localStorage.setItem("friend_name", name); this.myName = name;
        app.showScreen('friend-join');
    },

    joinRoom: function() {
        const inputId = document.getElementById('friend-room-input').value;
        if(inputId.length !== 4) return app.alert("Enter 4-digit ID");
        this.roomId = inputId; this.role = 'guest'; this.roomRef = db.ref('rooms/' + this.roomId);
        this.currentRound = 0;
        this.roomRef.once('value').then(snapshot => {
            if(snapshot.exists()) {
                this.roomRef.child('guest').update({ name: this.myName, status: 'waiting' });
                this.roomRef.update({ state: 'playing' });
                this.roomRef.child('guest').onDisconnect().remove();
                this.listenToRoom();
            } else { app.alert("Room not found"); }
        });
    },

    listenToRoom: function() {
        this.roomRef.on('value', (snapshot) => {
            const data = snapshot.val();
            // 接続切れチェック
            if(!data) { 
                app.alert("Connection lost", () => { this.exitRoom(true); }); 
                return; 
            }

            // 相手の名前更新
            const opRole = this.role === 'host' ? 'guest' : 'host';
            if(data[opRole] && data[opRole].name) this.opponentName = data[opRole].name;
            
            // Hostの場合、相手が消えていないかチェック
            if(this.role === 'host' && !data.guest) { 
                app.alert("Opponent has left", () => { this.exitRoom(); }); 
                return; 
            }

            // ★【最重要修正】状態管理の優先順位を明確化
            // 1. もしゲームが終了(finished)なら、何をおいてもリザルト画面へ
            if (data.state === 'finished') {
                this.showResult(data);
                return; // ここで処理を止め、playingの処理が走らないようにする
            }

            // 2. プレイ中(playing)の場合の処理
            if (data.state === 'playing') {
                // まだ画面がBattleになっていなければ移動
                if(!document.getElementById('screen-friend-battle').classList.contains('active')) {
                    this.startRound(data);
                } else if (this.currentRound !== data.round) {
                    // ラウンドが進んでいる場合も再セットアップ
                    this.startRound(data);
                }

                // 相手のステータス表示更新
                const opStatus = data[opRole] ? data[opRole].status : 'waiting';
                const statusEl = document.getElementById('friend-opponent-status');
                if(opStatus === 'guessed') {
                    statusEl.innerText = "Opponent has GUESSED!";
                    statusEl.style.background = "rgba(255, 71, 87, 0.2)"; 
                    statusEl.style.color = "#ff4757";
                } else {
                    statusEl.innerText = "Opponent is thinking...";
                    statusEl.style.background = "rgba(156, 136, 255, 0.1)"; 
                    statusEl.style.color = "#9c88ff";
                }

                // Hostのみが実行する判定: 両者回答済みなら結果集計へ
                // ※ stateがplayingの時だけ行うことで、二重計算を防ぐ
                if (this.role === 'host') {
                    if (data.host.status === 'guessed' && data.guest.status === 'guessed') {
                        this.calcResult(data);
                    }
                }
            }
        });
    },

    startRound: function(data) {
        // 現在のラウンドと同じなら、誤ってリセットしないようにガード
        if (this.currentRound === data.round && document.getElementById('screen-friend-battle').classList.contains('active')) {
            return;
        }

        app.showScreen('friend-battle');
        document.getElementById('friend-wait-msg').classList.add('hidden');
        document.getElementById('friend-guess-btn').classList.remove('hidden');

        // スライダーイベントの再登録（バグ防止）
        const update = () => this.updateColor();
        document.getElementById('friend-R').oninput = update;
        document.getElementById('friend-G').oninput = update;
        document.getElementById('friend-B').oninput = update;

        this.currentRound = data.round;

        const q = data.question;
        document.getElementById('friend-R').value = 128; 
        document.getElementById('friend-G').value = 128; 
        document.getElementById('friend-B').value = 128;
        this.updateColor();
        document.getElementById('friend-round-display').innerText = "Round " + data.round;
        document.getElementById('friend-question-color').style.backgroundColor = q.hex; 
    },

    updateColor: function() {
        const r = document.getElementById('friend-R').value; 
        const g = document.getElementById('friend-G').value; 
        const b = document.getElementById('friend-B').value;
        document.getElementById('friend-val-R').innerText = r; 
        document.getElementById('friend-val-G').innerText = g; 
        document.getElementById('friend-val-B').innerText = b;
    },

    submitGuess: function() {
        const r = parseInt(document.getElementById('friend-R').value); 
        const g = parseInt(document.getElementById('friend-G').value); 
        const b = parseInt(document.getElementById('friend-B').value);
        
        // 自分のステータスのみ更新。計算はリスナーに任せる。
        this.roomRef.child(this.role).update({ color: {r, g, b, hex: utils.rgbToHex(r,g,b)}, status: 'guessed' });

        // 待機表示へ
        document.getElementById('friend-guess-btn').classList.add('hidden');
        document.getElementById('friend-wait-msg').classList.remove('hidden');
    },

    calcResult: function(data) {
        // 計算処理はHostのみが行い、stateをfinishedにする
        // これにより全員のリスナーが発火し、showResultへ飛ぶ
        const q = data.question;
        const calcScore = (ans) => {
            const idx = 2; const sq = (q.r-ans.r)**idx + (q.g-ans.g)**idx + (q.b-ans.b)**idx;
            const base = Math.max((255-q.r)**idx, q.r**idx) + Math.max((255-q.g)**idx, q.g**idx) + Math.max((255-q.b)**idx, q.b**idx);
            return Math.ceil(5000 - 5000 * sq / base);
        };
        const hostScore = calcScore(data.host.color); 
        const guestScore = calcScore(data.guest.color);
        
        let newWins = data.wins || { host: 0, guest: 0 };
        if(hostScore > guestScore) newWins.host++; 
        else if(guestScore > hostScore) newWins.guest++;
        
        // stateをfinishedに更新。これが全てのトリガーになる。
        this.roomRef.update({ 'host/score': hostScore, 'guest/score': guestScore, wins: newWins, state: 'finished' });
    },

    showResult: function(data) {
        // リザルト画面への遷移を強制
        if(!document.getElementById('screen-friend-result').classList.contains('active')) {
            app.showScreen('friend-result');
        }

        const myData = data[this.role]; 
        const opRole = this.role === 'host' ? 'guest' : 'host';
        const opData = data[opRole]; 
        const q = data.question;

        // --- 以下、表示更新ロジック ---
        document.getElementById('friend-name-p1').innerText = this.myName; 
        document.getElementById('friend-name-p2').innerText = this.opponentName;
        document.getElementById('friend-my-score').innerText = myData.score; 
        document.getElementById('friend-op-score').innerText = opData.score;
        
        document.getElementById('friend-ans-color').style.backgroundColor = q.hex; 
        document.getElementById('friend-ans-text').innerText = `${q.r},${q.g},${q.b}`;
        
        document.getElementById('friend-my-color').style.backgroundColor = myData.color.hex; 
        document.getElementById('friend-my-text').innerText = `${myData.color.r},${myData.color.g},${myData.color.b}`;
        
        document.getElementById('friend-op-color').style.backgroundColor = opData.color.hex; 
        document.getElementById('friend-op-text').innerText = `${opData.color.r},${opData.color.g},${opData.color.b}`;
        
        document.getElementById('friend-label-you').innerHTML = this.myName + ' <span style="font-size:0.6em;color:var(--accent-green)">(YOU)</span>';
        document.getElementById('friend-label-op').innerHTML = this.opponentName + ' <span style="font-size:0.6em;color:var(--accent-red)">(OPP)</span>';

        const title = document.getElementById('friend-result-title');
        if(myData.score > opData.score) { title.innerText = "WIN!"; title.style.color = "var(--accent-red)"; }
        else if (myData.score < opData.score) { title.innerText = "LOSE..."; title.style.color = "var(--accent-blue)"; }
        else { title.innerText = "DRAW"; title.style.color = "#fff"; }
        
        const myWin = data.wins[this.role]; 
        const opWin = data.wins[opRole];
        document.getElementById('f-stat-name-1').innerText = this.myName;
        document.getElementById('f-stat-score-val').innerText = `${myWin} - ${opWin}`;
        document.getElementById('f-stat-name-2').innerText = this.opponentName;

        // CONTINUE状況のメッセージ表示
        const opContinue = data[opRole].status === 'ready';
        const myContinue = data[this.role].status === 'ready';
        const contMsg = document.getElementById('friend-continue-status');
        
        if(opContinue) { 
            contMsg.innerText = "Opponent wants a rematch!"; 
            contMsg.style.color = "var(--accent-yellow)"; 
        } else if(myContinue) { 
            contMsg.innerText = "Waiting for opponent..."; 
            contMsg.style.color = "#888"; 
        } else { 
            contMsg.innerText = ""; 
        }

        // CONTINUEボタンの状態管理
        const btn = document.getElementById('friend-continue-btn');
        if (myContinue) {
            // 自分が押した後はWaiting状態を維持
            btn.disabled = true;
            btn.innerText = "WAITING...";
            btn.style.background = "#555";
            btn.style.opacity = "0.7";
        } else {
            // まだ押していない、または次のラウンド待ち
            btn.disabled = false;
            btn.innerText = "CONTINUE";
            btn.style.background = "var(--text-main)";
            btn.style.opacity = "1";
        }

        // Hostのみ判定: 両者CONTINUEなら次へ
        if (myContinue && opContinue && this.role === 'host') {
            // 少し遅延を入れて視認性を確保しても良いが、即時遷移とする
            this.nextRound(data.round + 1);
        }
    },

    voteContinue: function() {
        // ボタン即時反映（通信ラグ対策）
        const btn = document.getElementById('friend-continue-btn');
        btn.disabled = true;
        btn.innerText = "WAITING...";
        btn.style.background = "#555";
        btn.style.opacity = "0.7";
        
        this.roomRef.child(this.role).update({ status: 'ready' });
    },

    nextRound: function(nextRoundNum) {
        // 次のラウンドへ。stateがplayingになるため、listenToRoomが反応して全員画面遷移する
        this.roomRef.update({ 
            question: utils.randColor(), 
            round: nextRoundNum, 
            state: 'playing', 
            'host/status': 'thinking', 
            'guest/status': 'thinking' 
        });
    },

    confirmExit: function() { app.confirm("Exit Friend Battle?", (y) => { if(y) this.exitRoom(); }); },
    exitRoom: function(isPassive) { if(this.roomRef && !isPassive) { this.roomRef.off(); this.roomRef.remove(); } this.roomId = null; app.showScreen('menu'); }
};