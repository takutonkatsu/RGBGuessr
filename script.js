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
        } else if (partyGame.roomId) { // ★追加
            partyGame.confirmExit();
        }else {
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
        if(mode === 'party') { // ★追加
            this.showScreen('party-menu');
            const savedName = localStorage.getItem("friend_name"); // 名前保存は共有
            if(savedName) document.getElementById('party-name-input').value = savedName;
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

// ▼ Game Modes (Matching, Original, Challenge, AnotherWorld)

const matchingGame = {
    timerInterval: null, currentTime: 0, questionColor: {},
    init: function() {
        this.els = { R: document.getElementById('matching-R'), G: document.getElementById('matching-G'), B: document.getElementById('matching-B'), valR: document.getElementById('matching-val-R'), valG: document.getElementById('matching-val-G'), valB: document.getElementById('matching-val-B'), qColor: document.getElementById('matching-question-color'), myColor: document.getElementById('matching-input-color'), timer: document.getElementById('matching-timer') };
        const update = () => this.updateMyColor(); this.els.R.oninput = update; this.els.G.oninput = update; this.els.B.oninput = update;
        document.getElementById('matching-guess-btn').onclick = () => this.guess();
        // ★修正: 初期化時にNEW RECORDを隠す
        document.getElementById('matching-new-record').classList.add('hidden');
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
        // ★修正: リセット時もNEW RECORDを隠す
        document.getElementById('matching-new-record').classList.add('hidden');
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
        
        // ★修正: 単発記録更新またはAo5更新のどちらかがあればNEW RECORDを表示
        let isNewRecord = false;
        const pb = Number(localStorage.getItem("2my_1record")) || 0;
        if(score > pb) { 
            localStorage.setItem("2my_1record", score); 
            isNewRecord = true;
        }

        if(val >= 5) {
            let scores = []; for(let i=0; i<5; i++) scores.push(Number(localStorage.getItem("2score"+(val-i))));
            const max = Math.max(...scores); const min = Math.min(...scores); const sum = scores.reduce((a,b)=>a+b, 0); const ao5 = Math.ceil((sum - max - min)/3);
            localStorage.setItem("2Ao5"+val, ao5); 
            const ao5pb = Number(localStorage.getItem("2my_ao5record")) || 0; 
            if(ao5 > ao5pb) {
                localStorage.setItem("2my_ao5record", ao5);
                isNewRecord = true; // Ao5更新でもフラグを立てる
            }
        }
        
        // フラグに基づいて表示・非表示を切り替え
        const recordEl = document.getElementById('matching-new-record');
        if(isNewRecord) recordEl.classList.remove('hidden'); else recordEl.classList.add('hidden');

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
        // ★修正: 初期化時にNEW RECORDを隠す
        document.getElementById('original-new-record').classList.add('hidden');
        this.retry(); this.updateHistory();
    },
    retry: function() {
        const savedHex = localStorage.getItem("RGB_Temporary_Hex");
        if(savedHex) { const r = Number(localStorage.getItem("RGB_Temporary_R")); const g = Number(localStorage.getItem("RGB_Temporary_G")); const b = Number(localStorage.getItem("RGB_Temporary_B")); this.questionColor = { r, g, b, hex: savedHex }; }
        else { this.questionColor = utils.randColor(); localStorage.setItem("RGB_Temporary_Hex", this.questionColor.hex); localStorage.setItem("RGB_Temporary_R", this.questionColor.r); localStorage.setItem("RGB_Temporary_G", this.questionColor.g); localStorage.setItem("RGB_Temporary_B", this.questionColor.b); }
        this.els.qColor.style.backgroundColor = this.questionColor.hex; this.els.R.value = 128; this.els.G.value = 128; this.els.B.value = 128; this.els.R.oninput();
        // ★修正: リトライ時もNEW RECORDを隠す
        document.getElementById('original-new-record').classList.add('hidden');
    },
    nextColor: function() { localStorage.removeItem("RGB_Temporary_Hex"); this.retry(); app.showScreen('original'); },
    guess: function() {
        const r = parseInt(this.els.R.value); const g = parseInt(this.els.G.value); const b = parseInt(this.els.B.value); const q = this.questionColor;
        const index = 2; const square = (q.r-r)**index + (q.g-g)**index + (q.b-b)**index; const base = Math.max((255-q.r)**index, q.r**index) + Math.max((255-q.g)**index, q.g**index) + Math.max((255-q.b)**index, q.b**index);
        const score = Math.ceil(5000 - 5000 * square / base);
        let val = Number(localStorage.getItem("index")) || 1;
        localStorage.setItem("score"+val, score); localStorage.setItem("answer_rgb16"+val, q.hex); localStorage.setItem("input_rgb16"+val, utils.rgbToHex(r,g,b));
        localStorage.setItem("answer_rgb"+val, `(${q.r},${q.g},${q.b})`); localStorage.setItem("input_rgb"+val, `(${r},${g},${b})`);
        
        // ★修正: 単発記録またはAo5更新でNEW RECORDを表示
        let isNewRecord = false;
        const pb = Number(localStorage.getItem("my_1record")) || 0; 
        if(score > pb) { 
            localStorage.setItem("my_1record", score); 
            isNewRecord = true;
        } 

        if(val >= 5) {
            let scores = []; for(let i=0; i<5; i++) scores.push(Number(localStorage.getItem("score"+(val-i))));
            const max = Math.max(...scores); const min = Math.min(...scores); const sum = scores.reduce((a,b)=>a+b,0); const ao5 = Math.ceil((sum - max - min)/3);
            localStorage.setItem("Ao5"+val, ao5); 
            const ao5pb = Number(localStorage.getItem("my_ao5record")) || 0; 
            if(ao5 > ao5pb) {
                localStorage.setItem("my_ao5record", ao5);
                isNewRecord = true;
            }
        }
        
        // フラグに基づいて表示制御
        const recordEl = document.getElementById('original-new-record');
        if(isNewRecord) recordEl.classList.remove('hidden'); else recordEl.classList.add('hidden');

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

// ▼ Challenge Mode (修正版: NEW RECORD判定ロジック調整)
const challengeGame = {
    aimScores: [1000,2000,3000,4000,4100,4200,4300,4400,4500,4600,4700,4800,4900,4910,4920,4930,4940,4950,4960,4970,4980,4990,4995,4998,5000],
    currentStage: 1, questionColor: {},
    init: function() {
        this.els = { R: document.getElementById('challenge-R'), G: document.getElementById('challenge-G'), B: document.getElementById('challenge-B'), valR: document.getElementById('challenge-val-R'), valG: document.getElementById('challenge-val-G'), valB: document.getElementById('challenge-val-B'), sample: document.getElementById('challenge-sample'), nextBtn: document.getElementById('challenge-next-btn') };
        const update = () => { this.els.valR.innerText = this.els.R.value; this.els.valG.innerText = this.els.G.value; this.els.valB.innerText = this.els.B.value; };
        this.els.R.oninput = update; this.els.G.oninput = update; this.els.B.oninput = update;
        document.getElementById('challenge-guess-btn').onclick = () => this.guess();
        const savedStage = localStorage.getItem("4stage_number"); this.currentStage = savedStage ? Number(savedStage) : 1;
        // 初期化時にNEW RECORDを隠す
        document.getElementById('challenge-new-record').classList.add('hidden');
        this.setupStage(); this.updateHistory();
    },
    setupStage: function() {
        const stageStr = this.currentStage.toString().padStart(2, '0'); document.getElementById('challenge-stage-num').innerText = stageStr; document.getElementById('challenge-aim-score').innerText = this.aimScores[this.currentStage - 1];
        const savedHex = localStorage.getItem("4RGB_Temporary_Hex");
        if(savedHex) { const r = Number(localStorage.getItem("4RGB_Temporary_R")); const g = Number(localStorage.getItem("4RGB_Temporary_G")); const b = Number(localStorage.getItem("4RGB_Temporary_B")); this.questionColor = { r,g,b, hex: savedHex }; }
        else { this.questionColor = utils.randColor(); localStorage.setItem("4RGB_Temporary_Hex", this.questionColor.hex); localStorage.setItem("4RGB_Temporary_R", this.questionColor.r); localStorage.setItem("4RGB_Temporary_G", this.questionColor.g); localStorage.setItem("4RGB_Temporary_B", this.questionColor.b); }
        this.els.sample.style.backgroundColor = this.questionColor.hex; this.els.R.value = 128; this.els.G.value = 128; this.els.B.value = 128; this.els.R.oninput();
        document.getElementById('challenge-new-record').classList.add('hidden');
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
        
        // ★修正: 「今回のステージ」が「これまでの最高記録」を超えた場合のみ NEW RECORD 表示
        // ステージ10クリア時: currentStage(10) > maxStage(9) → NEW RECORD
        const maxStage = Number(localStorage.getItem("4stage_record")) || 0;
        const recordEl = document.getElementById('challenge-new-record');
        
        if(isClear && this.currentStage > maxStage) {
            recordEl.classList.remove('hidden');
        } else {
            recordEl.classList.add('hidden');
        }

        if(isClear) {
            this.els.nextBtn.innerText = "NEXT STAGE"; this.els.nextBtn.onclick = () => this.next();
            localStorage.setItem("4stage_number" + this.currentStage, score);
            
            // ★修正: 先にレコード更新（ステージ番号をそのまま保存することでズレを解消）
            if(this.currentStage > maxStage) {
                localStorage.setItem("4stage_record", this.currentStage);
            }

            // 次のステージへ進める
            this.currentStage++; 
            localStorage.setItem("4stage_number", this.currentStage);
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

// ★修正・追加: 欠落していた Another World (Color Storage) モードを実装
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
            const hex = localStorage.getItem("3input_rgb16"+i) || '#000'; 
            const txt = localStorage.getItem("3input_rgb"+i) || '';
            const date = localStorage.getItem("3date"+i) || '';
            html += `<div class="history-item" style="grid-template-columns: 40px 1fr;"><span class="history-index">#${i}</span><div class="history-colors"><div class="color-row"><span class="chip-xs" style="background:${hex}; width:20px; height:20px;"></span><span style="font-size:1rem; font-weight:bold; color:#fff;">${txt}</span></div><div style="font-size:0.7rem; color:#666; margin-top:2px;">${date}</div></div></div>`;
        }
        list.innerHTML = html;
    },
    resetData: function() { 
        app.confirm("保存した色をすべて消去しますか？", (y)=>{ 
            if(y){ 
                const val = Number(localStorage.getItem("3index")) || 1;
                for(let i=1; i<val; i++) {
                    localStorage.removeItem("3input_rgb16"+i);
                    localStorage.removeItem("3input_rgb"+i);
                    localStorage.removeItem("3date"+i);
                }
                localStorage.removeItem("3index");
                this.updateHistory();
            } 
        });
    }
};


// ▼ 5. FRIEND BATTLE MODE (2 Players) - Win Limit Added
const friendGame = {
    roomId: null, role: null, roomRef: null,
    myName: "Player", opponentName: "Opponent",
    currentRound: 0, 

    createRoom: function() {
        const name = document.getElementById('friend-name-input').value.trim();
        if(!name) return app.alert("Please enter your name.");
        
        // 勝利条件の取得
        let maxWins = parseInt(document.getElementById('friend-goal-input').value);
        if (isNaN(maxWins) || maxWins < 0) maxWins = 5;

        localStorage.setItem("friend_name", name);
        this.myName = name; this.role = 'host';
        this.currentRound = 0;
        this.roomId = Math.floor(1000 + Math.random() * 9000).toString();
        this.roomRef = db.ref('rooms_friend/' + this.roomId);
        this.roomRef.set({
            state: 'waiting', question: utils.randColor(), round: 1,
            maxWins: maxWins, // 勝利条件保存
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
        
        // 連打防止の即時遷移ロジック（Partyと同じ挙動に統一）
        const joinBtn = document.querySelector('#screen-friend-join .main-action-btn');
        joinBtn.disabled = true;

        this.roomId = inputId; this.role = 'guest'; 
        this.roomRef = db.ref('rooms_friend/' + this.roomId);
        this.currentRound = 0;

        // 即座にロビーへ遷移
        app.showScreen('friend-lobby');
        document.getElementById('friend-room-id-display').innerText = this.roomId;
        document.getElementById('friend-status-text').innerText = "Connecting...";
        document.getElementById('friend-lobby-goal').innerText = "GOAL: ---";

        this.roomRef.once('value').then(snapshot => {
            if(snapshot.exists()) {
                const data = snapshot.val();
                if(data.guest && data.guest.name) {
                    app.alert("Room is full", () => { app.showScreen('friend-join'); });
                    joinBtn.disabled = false;
                    return;
                }

                this.roomRef.child('guest').update({ name: this.myName, status: 'waiting' });
                this.roomRef.update({ state: 'playing' });
                this.roomRef.child('guest').onDisconnect().remove();
                
                this.listenToRoom();
                joinBtn.disabled = false;
            } else { 
                app.alert("Room not found", () => { app.showScreen('friend-join'); });
                joinBtn.disabled = false;
            }
        }).catch(() => {
            app.alert("Connection Error", () => { app.showScreen('friend-join'); });
            joinBtn.disabled = false;
        });
    },

    listenToRoom: function() {
        this.roomRef.on('value', (snapshot) => {
            const data = snapshot.val();
            if(!data) { app.alert("Connection lost", () => { this.exitRoom(true); }); return; }

            const opRole = this.role === 'host' ? 'guest' : 'host';
            if(data[opRole] && data[opRole].name) this.opponentName = data[opRole].name;
            if(this.role === 'host' && !data.guest) { app.alert("Opponent has left", () => { this.exitRoom(); }); return; }

            // ロビーのゴール表示更新
            const goalText = (data.maxWins && data.maxWins > 0) ? `First to ${data.maxWins} Wins` : "Endless Mode (∞)";
            document.getElementById('friend-lobby-goal').innerText = `GOAL: ${goalText}`;
            document.getElementById('friend-lobby-goal').style.color = (data.maxWins > 0) ? "#fff" : "var(--accent-yellow)";

            if (data.state === 'finished') { this.showResult(data); return; }

            if (data.state === 'playing') {
                if(!document.getElementById('screen-friend-battle').classList.contains('active')) {
                    this.startRound(data);
                } else if (this.currentRound !== data.round) {
                    this.startRound(data);
                }

                const opStatus = data[opRole] ? data[opRole].status : 'waiting';
                const statusEl = document.getElementById('friend-opponent-status');
                if(opStatus === 'guessed') {
                    statusEl.innerText = "Opponent has GUESSED!";
                    statusEl.style.background = "rgba(255, 71, 87, 0.2)"; statusEl.style.color = "#ff4757";
                } else {
                    statusEl.innerText = "Opponent is thinking...";
                    statusEl.style.background = "rgba(156, 136, 255, 0.1)"; statusEl.style.color = "#9c88ff";
                }

                if (this.role === 'host') {
                    if (data.host.status === 'guessed' && data.guest.status === 'guessed') {
                        this.calcResult(data);
                    }
                }
            }
        });
    },

    startRound: function(data) {
        if (this.currentRound === data.round && document.getElementById('screen-friend-battle').classList.contains('active')) return;

        app.showScreen('friend-battle');
        document.getElementById('friend-wait-msg').classList.add('hidden');
        document.getElementById('friend-guess-btn').classList.remove('hidden');

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
        this.roomRef.child(this.role).update({ color: {r, g, b, hex: utils.rgbToHex(r,g,b)}, status: 'guessed' });
        document.getElementById('friend-guess-btn').classList.add('hidden');
        document.getElementById('friend-wait-msg').classList.remove('hidden');
    },

    calcResult: function(data) {
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
        
        this.roomRef.update({ 'host/score': hostScore, 'guest/score': guestScore, wins: newWins, state: 'finished' });
    },

    showResult: function(data) {
        if(!document.getElementById('screen-friend-result').classList.contains('active')) {
            app.showScreen('friend-result');
        }

        const myData = data[this.role]; 
        const opRole = this.role === 'host' ? 'guest' : 'host';
        const opData = data[opRole]; 
        const q = data.question;

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
        const winDeclare = document.getElementById('friend-final-winner');

        if(myData.score > opData.score) { title.innerText = "WIN!"; title.style.color = "var(--accent-red)"; }
        else if (myData.score < opData.score) { title.innerText = "LOSE..."; title.style.color = "var(--accent-blue)"; }
        else { title.innerText = "DRAW"; title.style.color = "#fff"; }
        
        // 勝利数表示
        const myWin = data.wins[this.role]; 
        const opWin = data.wins[opRole];
        document.getElementById('f-stat-name-1').innerText = this.myName;
        document.getElementById('f-stat-score-val').innerText = `${myWin} - ${opWin}`;
        document.getElementById('f-stat-name-2').innerText = this.opponentName;
        
        // ゴール表示
        const goal = (data.maxWins > 0) ? data.maxWins : 0;
        document.getElementById('friend-goal-val').innerText = (goal > 0) ? goal : "∞";

        // 勝者判定
        let champion = null;
        if (goal > 0) {
            if (data.wins.host >= goal) champion = data.host.name;
            else if (data.wins.guest >= goal) champion = data.guest.name;
        }

        const btn = document.getElementById('friend-continue-btn');
        const contMsg = document.getElementById('friend-continue-status');

        if (champion) {
            // 決着
            winDeclare.classList.remove('hidden');
            winDeclare.innerText = `🏆 ${champion} WINS! 🏆`;
            title.innerText = "GAME SET";
            title.style.color = "#fff";
            
            btn.innerText = "RETURN TO MENU";
            btn.disabled = false;
            btn.style.background = "var(--primary-friend)";
            btn.onclick = () => this.confirmExit();
            contMsg.innerText = "Thanks for playing!";
        } else {
            // 継続
            winDeclare.classList.add('hidden');
            btn.onclick = () => this.voteContinue(); // ハンドラ戻す

            if (myData.status === 'ready') {
                btn.disabled = true; btn.innerText = "WAITING..."; btn.style.background = "#555"; btn.style.opacity = "0.7";
            } else {
                btn.disabled = false; btn.innerText = "CONTINUE"; btn.style.background = "var(--text-main)"; btn.style.opacity = "1";
            }

            const opContinue = data[opRole].status === 'ready';
            const myContinue = data[this.role].status === 'ready';
            
            if(opContinue) { contMsg.innerText = "Opponent wants a rematch!"; contMsg.style.color = "var(--accent-yellow)"; }
            else if(myContinue) { contMsg.innerText = "Waiting for opponent..."; contMsg.style.color = "#888"; }
            else { contMsg.innerText = ""; }

            if (myContinue && opContinue && this.role === 'host') {
                this.nextRound(data.round + 1);
            }
        }
    },

    voteContinue: function() {
        const btn = document.getElementById('friend-continue-btn');
        btn.disabled = true; btn.innerText = "WAITING..."; btn.style.background = "#555"; btn.style.opacity = "0.7";
        this.roomRef.child(this.role).update({ status: 'ready' });
    },

    nextRound: function(nextRoundNum) {
        this.roomRef.update({ question: utils.randColor(), round: nextRoundNum, state: 'playing', 'host/status': 'thinking', 'guest/status': 'thinking' });
    },

    confirmExit: function() { app.confirm("Exit Friend Battle?", (y) => { if(y) this.exitRoom(); }); },
    exitRoom: function(isPassive) { if(this.roomRef && !isPassive) { this.roomRef.off(); this.roomRef.remove(); } this.roomId = null; app.showScreen('menu'); }
};

// ▼ 6. PARTY BATTLE MODE (3 Players) - Flexible Goal
const partyGame = {
    roomId: null, role: null, roomRef: null,
    myName: "Player", 
    currentRound: 0, 

    createRoom: function() {
        const name = document.getElementById('party-name-input').value.trim();
        if(!name) return app.alert("Please enter your name.");
        
        // 勝利条件の取得 (空欄や0なら0=Endless)
        let maxWins = parseInt(document.getElementById('party-goal-input').value);
        if (isNaN(maxWins) || maxWins < 0) maxWins = 5; // デフォルト

        localStorage.setItem("friend_name", name);
        this.myName = name; this.role = 'host';
        this.currentRound = 0;
        this.roomId = Math.floor(1000 + Math.random() * 9000).toString();
        this.roomRef = db.ref('rooms_party/' + this.roomId);
        
        this.roomRef.set({
            state: 'waiting', question: utils.randColor(), round: 1,
            maxWins: maxWins, // 0 = Endless
            host: { name: this.myName, status: 'waiting', score: 0 },
            guest: { name: '', status: 'waiting', score: 0 },
            guest2: { name: '', status: 'waiting', score: 0 },
            wins: { host: 0, guest: 0, guest2: 0 }
        });
        this.roomRef.onDisconnect().remove();
        this.listenToRoom();
        document.getElementById('party-room-id-display').innerText = this.roomId;
        app.showScreen('party-lobby');
    },

    showJoinScreen: function() {
        const name = document.getElementById('party-name-input').value.trim();
        if(!name) return app.alert("Please enter your name.");
        localStorage.setItem("friend_name", name); this.myName = name;
        app.showScreen('party-join');
    },

    joinRoom: function() {
        const inputId = document.getElementById('party-room-input').value;
        if(inputId.length !== 4) return app.alert("Enter 4-digit ID");

        // 連打防止
        const joinBtn = document.querySelector('#screen-party-join .main-action-btn');
        joinBtn.disabled = true;

        this.roomId = inputId;
        this.roomRef = db.ref('rooms_party/' + this.roomId);
        this.currentRound = 0;

        // 即座にロビーへ遷移
        app.showScreen('party-lobby');
        document.getElementById('party-room-id-display').innerText = this.roomId;
        document.getElementById('party-status-text').innerText = "Connecting...";
        
        // 表示リセット
        document.getElementById('party-lobby-goal').innerText = "GOAL: ---";
        document.getElementById('party-p1-name').innerText = "Host: ---";
        document.getElementById('party-p2-name').innerText = "Guest 1: ---";
        document.getElementById('party-p3-name').innerText = "Guest 2: ---";

        this.roomRef.once('value').then(snapshot => {
            if(snapshot.exists()) {
                const data = snapshot.val();
                
                if (!data.guest || !data.guest.name) {
                    this.role = 'guest';
                } else if (!data.guest2 || !data.guest2.name) {
                    this.role = 'guest2';
                } else {
                    app.alert("Room is full (3/3)", () => { app.showScreen('party-join'); });
                    joinBtn.disabled = false;
                    return;
                }

                this.roomRef.child(this.role).update({ name: this.myName, status: 'waiting' });
                this.roomRef.child(this.role).onDisconnect().remove();
                
                if(data.host && data.guest && this.role === 'guest2') {
                    this.roomRef.update({ state: 'playing' });
                }
                
                this.listenToRoom();
                joinBtn.disabled = false;
            } else { 
                app.alert("Room not found", () => { app.showScreen('party-join'); });
                joinBtn.disabled = false;
            }
        }).catch(() => {
            app.alert("Connection Error", () => { app.showScreen('party-join'); });
            joinBtn.disabled = false;
        });
    },

    listenToRoom: function() {
        this.roomRef.on('value', (snapshot) => {
            const data = snapshot.val();
            if(!data) { app.alert("Connection lost / Room closed", () => { this.exitRoom(true); }); return; }

            // ▼ ロビー表示更新
            // ゴール条件の表示
            const goalText = (data.maxWins && data.maxWins > 0) ? `First to ${data.maxWins} Wins` : "Endless Mode (∞)";
            document.getElementById('party-lobby-goal').innerText = `GOAL: ${goalText}`;
            document.getElementById('party-lobby-goal').style.color = (data.maxWins > 0) ? "#fff" : "var(--accent-yellow)";

            if(data.host) document.getElementById('party-p1-name').innerText = "Host: " + data.host.name;
            else document.getElementById('party-p1-name').innerText = "Host: (Left)";
            
            if(data.guest && data.guest.name) document.getElementById('party-p2-name').innerText = "Guest 1: " + data.guest.name;
            else document.getElementById('party-p2-name').innerText = "Guest 1: (Waiting...)";
            
            if(data.guest2 && data.guest2.name) document.getElementById('party-p3-name').innerText = "Guest 2: " + data.guest2.name;
            else document.getElementById('party-p3-name').innerText = "Guest 2: (Waiting...)";

            let count = 0;
            if(data.host) count++;
            if(data.guest && data.guest.name) count++;
            if(data.guest2 && data.guest2.name) count++;
            document.getElementById('party-status-text').innerText = `Waiting for players (${count}/3)...`;

            if (this.role === 'host' && data.state === 'waiting' && count === 3) {
                 this.roomRef.update({ state: 'playing' });
            }

            if (data.state === 'finished') {
                this.showResult(data);
                return;
            }

            if (data.state === 'playing') {
                if(!document.getElementById('screen-party-battle').classList.contains('active')) {
                    this.startRound(data);
                } else if (this.currentRound !== data.round) {
                    this.startRound(data);
                }

                let waitingCount = 0;
                if (data.host && data.host.status !== 'guessed') waitingCount++;
                if (data.guest && data.guest.status !== 'guessed') waitingCount++;
                if (data.guest2 && data.guest2.status !== 'guessed') waitingCount++;
                
                const statusEl = document.getElementById('party-opponent-status');
                if (waitingCount === 0) {
                    statusEl.innerText = "All players answered!";
                    statusEl.style.background = "rgba(255, 71, 87, 0.2)"; statusEl.style.color = "#ff4757";
                } else {
                    statusEl.innerText = `${waitingCount} player(s) thinking...`;
                    statusEl.style.background = "rgba(0, 210, 211, 0.1)"; statusEl.style.color = "var(--primary-party)";
                }

                if (this.role === 'host') {
                    if (data.host && data.guest && data.guest2) {
                        if (data.host.status === 'guessed' && data.guest.status === 'guessed' && data.guest2.status === 'guessed') {
                            this.calcResult(data);
                        }
                    }
                }
            }
        });
    },

    startRound: function(data) {
        if (this.currentRound === data.round && document.getElementById('screen-party-battle').classList.contains('active')) return;
        
        app.showScreen('party-battle');
        document.getElementById('party-wait-msg').classList.add('hidden');
        document.getElementById('party-guess-btn').classList.remove('hidden');

        const update = () => this.updateColor();
        document.getElementById('party-R').oninput = update;
        document.getElementById('party-G').oninput = update;
        document.getElementById('party-B').oninput = update;

        this.currentRound = data.round;
        const q = data.question;
        document.getElementById('party-R').value = 128; 
        document.getElementById('party-G').value = 128; 
        document.getElementById('party-B').value = 128;
        this.updateColor();
        document.getElementById('party-round-display').innerText = "Round " + data.round;
        document.getElementById('party-question-color').style.backgroundColor = q.hex; 
    },

    updateColor: function() {
        const r = document.getElementById('party-R').value; 
        const g = document.getElementById('party-G').value; 
        const b = document.getElementById('party-B').value;
        document.getElementById('party-val-R').innerText = r; 
        document.getElementById('party-val-G').innerText = g; 
        document.getElementById('party-val-B').innerText = b;
    },

    submitGuess: function() {
        const r = parseInt(document.getElementById('party-R').value); 
        const g = parseInt(document.getElementById('party-G').value); 
        const b = parseInt(document.getElementById('party-B').value);
        this.roomRef.child(this.role).update({ color: {r, g, b, hex: utils.rgbToHex(r,g,b)}, status: 'guessed' });
        document.getElementById('party-guess-btn').classList.add('hidden');
        document.getElementById('party-wait-msg').classList.remove('hidden');
    },

    calcResult: function(data) {
        const q = data.question;
        const calcScore = (ans) => {
            const idx = 2; const sq = (q.r-ans.r)**idx + (q.g-ans.g)**idx + (q.b-ans.b)**idx;
            const base = Math.max((255-q.r)**idx, q.r**idx) + Math.max((255-q.g)**idx, q.g**idx) + Math.max((255-q.b)**idx, q.b**idx);
            return Math.ceil(5000 - 5000 * sq / base);
        };
        const s1 = calcScore(data.host.color); 
        const s2 = calcScore(data.guest.color);
        const s3 = calcScore(data.guest2.color);
        
        let newWins = data.wins || { host: 0, guest: 0, guest2: 0 };
        const maxScore = Math.max(s1, s2, s3);
        
        if(s1 === maxScore) newWins.host++;
        if(s2 === maxScore) newWins.guest++;
        if(s3 === maxScore) newWins.guest2++;
        
        this.roomRef.update({ 
            'host/score': s1, 'guest/score': s2, 'guest2/score': s3, 
            wins: newWins, state: 'finished' 
        });
    },

    showResult: function(data) {
        if(!document.getElementById('screen-party-result').classList.contains('active')) {
            app.showScreen('party-result');
        }

        const safeData = (pKey) => {
            if (data[pKey] && data[pKey].name) return data[pKey];
            return { name: "---", score: 0, color: {r:0, g:0, b:0, hex:'#000'}, status:'waiting' };
        };
        const hData = safeData('host');
        const g1Data = safeData('guest');
        const g2Data = safeData('guest2');

        const players = [
            { key: 'host', name: hData.name, score: hData.score, color: hData.color, me: (this.role === 'host') },
            { key: 'guest', name: g1Data.name, score: g1Data.score, color: g1Data.color, me: (this.role === 'guest') },
            { key: 'guest2', name: g2Data.name, score: g2Data.score, color: g2Data.color, me: (this.role === 'guest2') }
        ];

        players.sort((a, b) => b.score - a.score);

        if(players[0]) {
            document.getElementById('party-name-1').innerText = players[0].name;
            document.getElementById('party-score-1').innerText = players[0].score;
            document.getElementById('party-you-1').innerText = players[0].me ? "(YOU)" : "";
        }
        if(players[1]) {
            document.getElementById('party-name-2').innerText = players[1].name;
            document.getElementById('party-score-2').innerText = players[1].score;
        }
        if(players[2]) {
            document.getElementById('party-name-3').innerText = players[2].name;
            document.getElementById('party-score-3').innerText = players[2].score;
        }

        const myRank = players.findIndex(p => p.me);
        const title = document.getElementById('party-result-title');
        const winDeclare = document.getElementById('party-final-winner');
        
        if (myRank === 0) { title.innerText = "WINNER!"; title.style.color = "var(--accent-gold)"; }
        else { title.innerText = (myRank+1) + "rd PLACE"; title.style.color = "#fff"; }

        const wins = data.wins || { host: 0, guest: 0, guest2: 0 };
        const goal = (data.maxWins > 0) ? data.maxWins : 0; // 0なら無限

        document.getElementById('p-win-host').innerText = wins.host;
        document.getElementById('p-name-host').innerText = hData.name;
        document.getElementById('p-win-guest').innerText = wins.guest;
        document.getElementById('p-name-guest').innerText = g1Data.name;
        document.getElementById('p-win-guest2').innerText = wins.guest2;
        document.getElementById('p-name-guest2').innerText = g2Data.name;
        
        // ゴール表示 (0なら∞)
        document.getElementById('p-goal-val').innerText = (goal > 0) ? goal : "∞";

        // ▼ 勝者判定 (goal > 0 の時だけ判定)
        let champion = null;
        if (goal > 0) {
            if(wins.host >= goal) champion = hData.name;
            else if(wins.guest >= goal) champion = g1Data.name;
            else if(wins.guest2 >= goal) champion = g2Data.name;
        }

        const q = data.question;
        document.getElementById('party-ans-color').style.backgroundColor = q.hex; 
        document.getElementById('party-ans-text').innerText = `${q.r},${q.g},${q.b}`;

        const setP = (key, pData, labelId, colorId, textId) => {
             const c = pData.color;
             document.getElementById(colorId).style.backgroundColor = c.hex;
             document.getElementById(textId).innerText = `${c.r},${c.g},${c.b}`;
             document.getElementById(labelId).innerText = pData.name.substring(0,3).toUpperCase();
        };
        setP('p1', hData, 'party-label-p1', 'party-p1-color', 'party-p1-text');
        setP('p2', g1Data, 'party-label-p2', 'party-p2-color', 'party-p2-text');
        setP('p3', g2Data, 'party-label-p3', 'party-p3-color', 'party-p3-text');

        const myData = data[this.role] || { status: 'waiting' };
        const btn = document.getElementById('party-continue-btn');
        const contMsg = document.getElementById('party-continue-status');

        if (champion) {
            winDeclare.classList.remove('hidden');
            winDeclare.innerText = `🏆 ${champion} WINS THE GAME! 🏆`;
            title.innerText = "GAME SET";
            title.style.color = "#fff";
            
            btn.innerText = "RETURN TO MENU";
            btn.disabled = false;
            btn.style.background = "var(--primary-party)";
            btn.onclick = () => this.confirmExit();
            contMsg.innerText = "Thanks for playing!";
        } else {
            winDeclare.classList.add('hidden');
            btn.onclick = () => this.voteContinue();

            if (myData.status === 'ready') {
                btn.disabled = true; btn.innerText = "WAITING..."; btn.style.background = "#555"; btn.style.opacity = "0.7";
            } else {
                btn.disabled = false; btn.innerText = "CONTINUE"; btn.style.background = "var(--text-main)"; btn.style.opacity = "1";
            }

            let readyCount = 0;
            if(hData.status === 'ready') readyCount++;
            if(g1Data.status === 'ready') readyCount++;
            if(g2Data.status === 'ready') readyCount++;
            
            if(readyCount === 3) contMsg.innerText = "Starting next round...";
            else if(readyCount > 0) contMsg.innerText = `Waiting for players (${readyCount}/3 ready)...`;
            else contMsg.innerText = "";

            if (readyCount === 3 && this.role === 'host') {
                this.nextRound(data.round + 1);
            }
        }
    },

    voteContinue: function() {
        const btn = document.getElementById('party-continue-btn');
        btn.disabled = true; btn.innerText = "WAITING..."; btn.style.background = "#555"; btn.style.opacity = "0.7";
        this.roomRef.child(this.role).update({ status: 'ready' });
    },

    nextRound: function(nextRoundNum) {
        this.roomRef.update({ 
            question: utils.randColor(), round: nextRoundNum, state: 'playing', 
            'host/status': 'thinking', 'guest/status': 'thinking', 'guest2/status': 'thinking' 
        });
    },

    confirmExit: function() { app.confirm("Exit Party Battle?", (y) => { if(y) this.exitRoom(); }); },
    exitRoom: function(isPassive) { if(this.roomRef && !isPassive) { this.roomRef.off(); this.roomRef.remove(); } this.roomId = null; app.showScreen('menu'); }
};


// ▼ Initialize App (ページ読み込み時の処理)
window.onload = function() {
    // 最初にメニュー画面を表示（ここでmenuLogic.initが呼ばれ、記録が反映されます）
    app.showScreen('menu');
};

