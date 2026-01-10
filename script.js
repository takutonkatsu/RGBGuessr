// ▼ アプリ全体の管理
const app = {
    secretCount: 0,
    secretTimer: null,

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

    startGame: function(mode) {
        this.showScreen(mode);
        if(mode === 'matching') matchingGame.init();
        if(mode === 'original') originalGame.init();
        if(mode === 'challenge') challengeGame.init();
        if(mode === 'anotherworld') anotherGame.init();
    },

    triggerSecret: function() {
        this.secretCount++;
        clearTimeout(this.secretTimer);
        this.secretTimer = setTimeout(() => {
            this.secretCount = 0;
        }, 1000); 

        if(this.secretCount >= 5) {
            this.secretCount = 0;
            this.startGame('anotherworld');
        }
    }
};

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
        if(savedDate != ymd) {
            localStorage.setItem("date_key", ymd);
        }

        this.showDualRecord("2my_1record", "2my_ao5record", "menu-matching-record");
        this.showDualRecord("my_1record", "my_ao5record", "menu-original-record");
        
        const stageRec = localStorage.getItem("4stage_record");
        const stageElem = document.getElementById("menu-challenge-record");
        if(stageElem) {
            stageElem.innerHTML = stageRec ? `Max Stage: <span>${stageRec}</span>` : "Start: Stage 1";
        }

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
            if(!sRec && !aRec) {
                el.innerText = "NO RECORD";
            } else {
                let html = "";
                if(sRec) html += `Best: <span>${sRec}</span>`;
                if(sRec && aRec) html += " / ";
                if(aRec) html += `Ao5: <span>${aRec}</span>`;
                el.innerHTML = html;
            }
        }
    }
};


// ============================================
// ▼ 1. マッチングモード (Matching)
// ============================================
const matchingGame = {
    timerInterval: null,
    currentTime: 0,
    questionColor: {},
    
    init: function() {
        this.els = {
            R: document.getElementById('matching-R'),
            G: document.getElementById('matching-G'),
            B: document.getElementById('matching-B'),
            valR: document.getElementById('matching-val-R'),
            valG: document.getElementById('matching-val-G'),
            valB: document.getElementById('matching-val-B'),
            qColor: document.getElementById('matching-question-color'),
            myColor: document.getElementById('matching-input-color'),
            timer: document.getElementById('matching-timer')
        };

        const update = () => this.updateMyColor();
        this.els.R.oninput = update;
        this.els.G.oninput = update;
        this.els.B.oninput = update;
        document.getElementById('matching-guess-btn').onclick = () => this.guess();

        this.updateHistory();
        this.resetGame();
    },

    resetGame: function() {
        this.currentTime = 0;
        
        const savedHex = localStorage.getItem("2RGB_Temporary_Hex");
        if (savedHex) {
            const r = Number(localStorage.getItem("2RGB_Temporary_R"));
            const g = Number(localStorage.getItem("2RGB_Temporary_G"));
            const b = Number(localStorage.getItem("2RGB_Temporary_B"));
            this.questionColor = { r, g, b, hex: savedHex };
        } else {
            this.questionColor = utils.randColor();
            localStorage.setItem("2RGB_Temporary_Hex", this.questionColor.hex);
            localStorage.setItem("2RGB_Temporary_R", this.questionColor.r);
            localStorage.setItem("2RGB_Temporary_G", this.questionColor.g);
            localStorage.setItem("2RGB_Temporary_B", this.questionColor.b);
        }

        this.els.qColor.style.backgroundColor = this.questionColor.hex;

        this.els.R.value = 128; this.els.G.value = 128; this.els.B.value = 128;
        this.updateMyColor();

        if(this.timerInterval) clearInterval(this.timerInterval);
        this.timerInterval = setInterval(() => {
            this.currentTime += 0.01;
            this.els.timer.innerText = this.currentTime.toFixed(2);
        }, 10);
    },

    updateMyColor: function() {
        const r = parseInt(this.els.R.value);
        const g = parseInt(this.els.G.value);
        const b = parseInt(this.els.B.value);
        this.els.valR.innerText = r;
        this.els.valG.innerText = g;
        this.els.valB.innerText = b;
        this.els.myColor.style.backgroundColor = utils.rgbToHex(r, g, b);
    },

    guess: function() {
        clearInterval(this.timerInterval);
        
        const r = parseInt(this.els.R.value);
        const g = parseInt(this.els.G.value);
        const b = parseInt(this.els.B.value);
        const q = this.questionColor;

        const square = (q.r-r)**2 + (q.g-g)**2 + (q.b-b)**2;
        const base = Math.max((255-q.r)**2, q.r**2) + Math.max((255-q.g)**2, q.g**2) + Math.max((255-q.b)**2, q.b**2);
        const colorScore = Math.ceil(4000 - 4000 * square / base);
        
        let timeScore = 0;
        if(this.currentTime > 3) {
            timeScore = Math.round(1000 * (3**0.5) / (this.currentTime**0.5));
        } else if(this.currentTime >= 0.4) {
            timeScore = 1000;
        }
        
        let totalScore = colorScore + timeScore;
        if(this.currentTime < 0.4) totalScore = 0;

        this.saveResult(totalScore, colorScore, timeScore, q, {r,g,b});
        this.showResult(totalScore, colorScore, timeScore, q, {r,g,b});
    },

    saveResult: function(score, cScore, tScore, q, input) {
        let val = Number(localStorage.getItem("2index")) || 1;
        
        localStorage.setItem("2score"+val, score);
        localStorage.setItem("2result_time"+val, this.currentTime.toFixed(2));
        
        localStorage.setItem("2answer_rgb16"+val, q.hex);
        localStorage.setItem("2input_rgb16"+val, utils.rgbToHex(input.r, input.g, input.b));
        localStorage.setItem("2answer_rgb"+val, `(${q.r},${q.g},${q.b})`);
        localStorage.setItem("2input_rgb"+val, `(${input.r},${input.g},${input.b})`);
        
        const pb = Number(localStorage.getItem("2my_1record")) || 0;
        if(score > pb) {
            localStorage.setItem("2my_1record", score);
            document.getElementById('matching-new-record').classList.remove('hidden');
        } else {
            document.getElementById('matching-new-record').classList.add('hidden');
        }

        if(val >= 5) {
            let scores = [];
            for(let i=0; i<5; i++) scores.push(Number(localStorage.getItem("2score"+(val-i))));
            const max = Math.max(...scores);
            const min = Math.min(...scores);
            const sum = scores.reduce((a,b)=>a+b, 0);
            const ao5 = Math.ceil((sum - max - min)/3);
            localStorage.setItem("2Ao5"+val, ao5);
            
            const ao5pb = Number(localStorage.getItem("2my_ao5record")) || 0;
            if(ao5 > ao5pb) localStorage.setItem("2my_ao5record", ao5);
        }

        localStorage.setItem("2index", val + 1);
        this.updateHistory();
    },

    showResult: function(score, cScore, tScore, q, input) {
        app.showScreen('result-matching');

        document.getElementById('matching-score').innerText = score;
        document.getElementById('matching-score-detail').innerText = `Color:${cScore} + Time:${tScore}`;
        
        document.getElementById('matching-ans-color').style.backgroundColor = q.hex;
        document.getElementById('matching-ans-text').innerText = `${q.r},${q.g},${q.b}`;
        
        document.getElementById('matching-your-color').style.backgroundColor = utils.rgbToHex(input.r, input.g, input.b);
        document.getElementById('matching-your-text').innerText = `${input.r},${input.g},${input.b}`;
    },

    updateHistory: function() {
        const list = document.getElementById('matching-history');
        const val = Number(localStorage.getItem("2index")) || 1;
        const pb = Number(localStorage.getItem("2my_1record")) || 0;
        const bestAo5 = Number(localStorage.getItem("2my_ao5record")) || 0;
        
        let html = "";
        
        for(let i = val - 1; i > 0; i--) {
            const sc = localStorage.getItem("2score"+i);
            const tm = localStorage.getItem("2result_time"+i);
            const ao5 = localStorage.getItem("2Ao5"+i);

            const ansHex = localStorage.getItem("2answer_rgb16"+i) || '#000';
            const myHex = localStorage.getItem("2input_rgb16"+i) || '#000';
            const ansTxt = localStorage.getItem("2answer_rgb"+i) || '';
            const myTxt = localStorage.getItem("2input_rgb"+i) || '';
            
            let ao5Html = "";
            if(ao5) {
                let badgeClass = "history-ao5-badge";
                if(Number(ao5) === bestAo5 && bestAo5 > 0) badgeClass += " highlight";
                ao5Html = `<div class="${badgeClass}">Ao5: ${ao5}</div>`;
            } else {
                ao5Html = `<div class="history-ao5-badge placeholder">Ao5: ----</div>`;
            }

            let rowClass = "history-item";
            let indexHtml = `<span class="history-index">#${i}</span>`;
            
            if(Number(sc) === pb && pb > 0) {
                rowClass += " best-record";
                indexHtml = `<span class="history-index">👑</span>`;
            }

            html += `
            <div class="${rowClass}">
                <div class="history-top-row">
                    ${indexHtml}
                    <div class="history-score-area">
                        <span class="history-score-val">${sc}</span>
                        <span style="font-size:0.7rem; color:#888;">(${tm}s)</span>
                        ${ao5Html}
                    </div>
                </div>
                <div class="history-bottom-row">
                    <div class="color-data-group">
                        <span class="label-mini">TGT</span>
                        <span class="chip-mini" style="background:${ansHex}"></span>
                        <span>${ansTxt}</span>
                    </div>
                    <div class="color-data-group">
                        <span class="label-mini">YOU</span>
                        <span class="chip-mini" style="background:${myHex}"></span>
                        <span>${myTxt}</span>
                    </div>
                </div>
            </div>`;
        }
        list.innerHTML = html;

        const ao5Rec = localStorage.getItem("2my_ao5record") || "--";
        document.getElementById('matching-pb').innerText = pb || "--";
        document.getElementById('matching-ao5').innerText = ao5Rec;
    },

    retry: function() {
        localStorage.removeItem("2RGB_Temporary_Hex");
        localStorage.removeItem("2RGB_Temporary_R");
        localStorage.removeItem("2RGB_Temporary_G");
        localStorage.removeItem("2RGB_Temporary_B");
        this.resetGame();
        app.showScreen('matching');
    },

    resetData: function() {
        if(confirm("記録を削除しますか？")) {
            const val = Number(localStorage.getItem("2index")) || 1;
            for(let i=1; i<val; i++) {
                localStorage.removeItem("2score"+i);
                localStorage.removeItem("2result_time"+i);
                localStorage.removeItem("2Ao5"+i);
                localStorage.removeItem("2answer_rgb16"+i);
                localStorage.removeItem("2input_rgb16"+i);
                localStorage.removeItem("2answer_rgb"+i);
                localStorage.removeItem("2input_rgb"+i);
            }
            localStorage.removeItem("2my_1record");
            localStorage.removeItem("2my_ao5record");
            localStorage.removeItem("2index");
            
            localStorage.removeItem("2RGB_Temporary_Hex");
            localStorage.removeItem("2RGB_Temporary_R");
            localStorage.removeItem("2RGB_Temporary_G");
            localStorage.removeItem("2RGB_Temporary_B");
            
            this.updateHistory();
            this.retry();
        }
    }
};


// ============================================
// ▼ 2. オリジナルモード
// ============================================
const originalGame = {
    questionColor: {},
    
    init: function() {
        this.els = {
            R: document.getElementById('original-R'),
            G: document.getElementById('original-G'),
            B: document.getElementById('original-B'),
            valR: document.getElementById('original-val-R'),
            valG: document.getElementById('original-val-G'),
            valB: document.getElementById('original-val-B'),
            qColor: document.getElementById('original-question-color')
        };
        
        const update = () => {
            this.els.valR.innerText = this.els.R.value;
            this.els.valG.innerText = this.els.G.value;
            this.els.valB.innerText = this.els.B.value;
        };
        this.els.R.oninput = update;
        this.els.G.oninput = update;
        this.els.B.oninput = update;
        document.getElementById('original-guess-btn').onclick = () => this.guess();

        this.retry();
        this.updateHistory();
    },

    retry: function() {
        const savedHex = localStorage.getItem("RGB_Temporary_Hex");
        if(savedHex) {
            const r = Number(localStorage.getItem("RGB_Temporary_R"));
            const g = Number(localStorage.getItem("RGB_Temporary_G"));
            const b = Number(localStorage.getItem("RGB_Temporary_B"));
            this.questionColor = { r, g, b, hex: savedHex };
        } else {
            this.questionColor = utils.randColor();
            localStorage.setItem("RGB_Temporary_Hex", this.questionColor.hex);
            localStorage.setItem("RGB_Temporary_R", this.questionColor.r);
            localStorage.setItem("RGB_Temporary_G", this.questionColor.g);
            localStorage.setItem("RGB_Temporary_B", this.questionColor.b);
        }

        this.els.qColor.style.backgroundColor = this.questionColor.hex;
        
        this.els.R.value = 128; this.els.G.value = 128; this.els.B.value = 128;
        this.els.R.oninput();
    },
    
    nextColor: function() {
        localStorage.removeItem("RGB_Temporary_Hex");
        localStorage.removeItem("RGB_Temporary_R");
        localStorage.removeItem("RGB_Temporary_G");
        localStorage.removeItem("RGB_Temporary_B");
        this.retry();
        app.showScreen('original');
    },

    guess: function() {
        const r = parseInt(this.els.R.value);
        const g = parseInt(this.els.G.value);
        const b = parseInt(this.els.B.value);
        const q = this.questionColor;

        const index = 2;
        const square = (q.r-r)**index + (q.g-g)**index + (q.b-b)**index;
        const base = Math.max((255-q.r)**index, q.r**index) + Math.max((255-q.g)**index, q.g**index) + Math.max((255-q.b)**index, q.b**index);
        const score = Math.ceil(5000 - 5000 * square / base);

        let val = Number(localStorage.getItem("index")) || 1;
        
        localStorage.setItem("score"+val, score);
        localStorage.setItem("answer_rgb16"+val, q.hex);
        localStorage.setItem("input_rgb16"+val, utils.rgbToHex(r,g,b));
        localStorage.setItem("answer_rgb"+val, `(${q.r},${q.g},${q.b})`);
        localStorage.setItem("input_rgb"+val, `(${r},${g},${b})`);

        const pb = Number(localStorage.getItem("my_1record")) || 0;
        if(score > pb) {
            localStorage.setItem("my_1record", score);
            document.getElementById('original-new-record').classList.remove('hidden');
        } else {
            document.getElementById('original-new-record').classList.add('hidden');
        }

        if(val >= 5) {
            let scores = [];
            for(let i=0; i<5; i++) scores.push(Number(localStorage.getItem("score"+(val-i))));
            const max = Math.max(...scores);
            const min = Math.min(...scores);
            const sum = scores.reduce((a,b)=>a+b,0);
            const ao5 = Math.ceil((sum - max - min)/3);
            localStorage.setItem("Ao5"+val, ao5);
            
            const ao5pb = Number(localStorage.getItem("my_ao5record")) || 0;
            if(ao5 > ao5pb) localStorage.setItem("my_ao5record", ao5);
        }

        localStorage.setItem("index", val + 1);
        
        localStorage.removeItem("RGB_Temporary_Hex");
        
        this.showResult(score, q, {r,g,b});
        this.updateHistory();
    },

    showResult: function(score, q, input) {
        app.showScreen('result-original');

        document.getElementById('original-score').innerText = score;
        
        document.getElementById('original-ans-color').style.backgroundColor = q.hex;
        document.getElementById('original-ans-text').innerText = `${q.r},${q.g},${q.b}`;
        document.getElementById('original-your-color').style.backgroundColor = utils.rgbToHex(input.r,input.g,input.b);
        document.getElementById('original-your-text').innerText = `${input.r},${input.g},${input.b}`;
        
        const retryBtn = document.querySelector('#screen-result-original .btn-primary');
        retryBtn.onclick = () => this.nextColor();
    },

    updateHistory: function() {
        const val = Number(localStorage.getItem("index")) || 1;
        const pb = Number(localStorage.getItem("my_1record")) || 0;
        const bestAo5 = Number(localStorage.getItem("my_ao5record")) || 0;
        let html = "";
        
        for(let i = val - 1; i > 0; i--) {
            const sc = localStorage.getItem("score"+i);
            const ao5 = localStorage.getItem("Ao5"+i);
            
            const ansHex = localStorage.getItem("answer_rgb16"+i) || '#000';
            const myHex = localStorage.getItem("input_rgb16"+i) || '#000';
            const ansTxt = localStorage.getItem("answer_rgb"+i) || '';
            const myTxt = localStorage.getItem("input_rgb"+i) || '';

            let ao5Html = "";
            if(ao5) {
                let badgeClass = "history-ao5-badge";
                if(Number(ao5) === bestAo5 && bestAo5 > 0) badgeClass += " highlight";
                ao5Html = `<div class="${badgeClass}">Ao5: ${ao5}</div>`;
            } else {
                ao5Html = `<div class="history-ao5-badge placeholder">Ao5: ----</div>`;
            }

            let rowClass = "history-item";
            let indexHtml = `<span class="history-index">#${i}</span>`;
            
            if(Number(sc) === pb && pb > 0) {
                rowClass += " best-record";
                indexHtml = `<span class="history-index">👑</span>`;
            }

            html += `
            <div class="${rowClass}">
                <div class="history-top-row">
                    ${indexHtml}
                    <div class="history-score-area">
                        <span class="history-score-val">${sc}</span>
                        ${ao5Html}
                    </div>
                </div>
                <div class="history-bottom-row">
                    <div class="color-data-group">
                        <span class="label-mini">TGT</span>
                        <span class="chip-mini" style="background:${ansHex}"></span>
                        <span>${ansTxt}</span>
                    </div>
                    <div class="color-data-group">
                        <span class="label-mini">YOU</span>
                        <span class="chip-mini" style="background:${myHex}"></span>
                        <span>${myTxt}</span>
                    </div>
                </div>
            </div>`;
        }
        document.getElementById('original-history').innerHTML = html;

        const ao5Rec = localStorage.getItem("my_ao5record") || "--";
        document.getElementById('original-pb').innerText = pb || "--";
        document.getElementById('original-ao5').innerText = ao5Rec;
    },
    
    resetData: function() {
        if(confirm("記録を削除しますか？")) {
            const val = Number(localStorage.getItem("index")) || 1;
            for(let i=1; i<val; i++) {
                localStorage.removeItem("score"+i);
                localStorage.removeItem("Ao5"+i);
                localStorage.removeItem("answer_rgb16"+i);
                localStorage.removeItem("input_rgb16"+i);
                localStorage.removeItem("answer_rgb"+i);
                localStorage.removeItem("input_rgb"+i);
            }
            localStorage.removeItem("my_1record");
            localStorage.removeItem("my_ao5record");
            localStorage.removeItem("index");
            
            localStorage.removeItem("RGB_Temporary_Hex");
            localStorage.removeItem("RGB_Temporary_R");
            localStorage.removeItem("RGB_Temporary_G");
            localStorage.removeItem("RGB_Temporary_B");

            this.updateHistory();
            this.retry();
        }
    }
};


// ============================================
// ▼ 3. チャレンジモード
// ============================================
const challengeGame = {
    aimScores: [1000,2000,3000,4000,4100,4200,4300,4400,4500,4600,4700,4800,4900,4910,4920,4930,4940,4950,4960,4970,4980,4990,4995,4998,5000],
    currentStage: 1,
    questionColor: {},
    
    init: function() {
        this.els = {
            R: document.getElementById('challenge-R'),
            G: document.getElementById('challenge-G'),
            B: document.getElementById('challenge-B'),
            valR: document.getElementById('challenge-val-R'),
            valG: document.getElementById('challenge-val-G'),
            valB: document.getElementById('challenge-val-B'),
            sample: document.getElementById('challenge-sample'),
            nextBtn: document.getElementById('challenge-next-btn')
        };
        const update = () => {
            this.els.valR.innerText = this.els.R.value;
            this.els.valG.innerText = this.els.G.value;
            this.els.valB.innerText = this.els.B.value;
        };
        this.els.R.oninput = update; this.els.G.oninput = update; this.els.B.oninput = update;
        document.getElementById('challenge-guess-btn').onclick = () => this.guess();

        const savedStage = localStorage.getItem("4stage_number");
        this.currentStage = savedStage ? Number(savedStage) : 1;
        
        this.setupStage();
        this.updateHistory();
    },

    setupStage: function() {
        const stageStr = this.currentStage.toString().padStart(2, '0');
        document.getElementById('challenge-stage-num').innerText = stageStr;
        document.getElementById('challenge-aim-score').innerText = this.aimScores[this.currentStage - 1];

        const savedHex = localStorage.getItem("4RGB_Temporary_Hex");
        if(savedHex) {
             const r = Number(localStorage.getItem("4RGB_Temporary_R"));
             const g = Number(localStorage.getItem("4RGB_Temporary_G"));
             const b = Number(localStorage.getItem("4RGB_Temporary_B"));
             this.questionColor = { r,g,b, hex: savedHex };
        } else {
             this.questionColor = utils.randColor();
             localStorage.setItem("4RGB_Temporary_Hex", this.questionColor.hex);
             localStorage.setItem("4RGB_Temporary_R", this.questionColor.r);
             localStorage.setItem("4RGB_Temporary_G", this.questionColor.g);
             localStorage.setItem("4RGB_Temporary_B", this.questionColor.b);
        }

        this.els.sample.style.backgroundColor = this.questionColor.hex;
        
        this.els.R.value = 128; this.els.G.value = 128; this.els.B.value = 128;
        this.els.R.oninput();
    },

    guess: function() {
        const r = parseInt(this.els.R.value);
        const g = parseInt(this.els.G.value);
        const b = parseInt(this.els.B.value);
        const q = this.questionColor;

        const square = (q.r-r)**2 + (q.g-g)**2 + (q.b-b)**2;
        const base = Math.max((255-q.r)**2, q.r**2) + Math.max((255-q.g)**2, q.g**2) + Math.max((255-q.b)**2, q.b**2);
        const score = Math.ceil(5000 - 5000 * square / base);

        const target = this.aimScores[this.currentStage - 1];
        const isClear = score >= target;

        app.showScreen('result-challenge');

        const scoreText = document.getElementById('challenge-score-text');
        
        scoreText.innerText = isClear ? "Clear!" : "FAILED";
        scoreText.style.color = isClear ? "var(--accent-green)" : "var(--accent-red)";
        
        document.getElementById('challenge-result-score').innerText = score;
        document.getElementById('challenge-result-goal').innerText = target;
        
        document.getElementById('challenge-ans-color').style.backgroundColor = q.hex;
        document.getElementById('challenge-ans-text').innerText = `${q.r},${q.g},${q.b}`;
        document.getElementById('challenge-your-color').style.backgroundColor = utils.rgbToHex(r,g,b);
        document.getElementById('challenge-your-text').innerText = `${r},${g},${b}`;

        localStorage.setItem("4answer_rgb16_"+this.currentStage, q.hex);
        localStorage.setItem("4input_rgb16_"+this.currentStage, utils.rgbToHex(r,g,b));
        localStorage.setItem("4answer_rgb_"+this.currentStage, `(${q.r},${q.g},${q.b})`);
        localStorage.setItem("4input_rgb_"+this.currentStage, `(${r},${g},${b})`);

        if(isClear) {
            this.els.nextBtn.innerText = "NEXT STAGE";
            this.els.nextBtn.onclick = () => this.next();
            localStorage.setItem("4stage_number" + this.currentStage, score);
            this.currentStage++;
            localStorage.setItem("4stage_number", this.currentStage);
            
            const maxStage = Number(localStorage.getItem("4stage_record")) || 0;
            if(this.currentStage > maxStage) localStorage.setItem("4stage_record", this.currentStage);
            
            localStorage.removeItem("4RGB_Temporary_Hex");

        } else {
            this.els.nextBtn.innerText = "RESTART";
            this.els.nextBtn.onclick = () => this.quickRestart();
        }
        this.updateHistory();
    },

    next: function() {
        if(this.currentStage > 25) {
            alert("ALL CLEAR! CONGRATULATIONS!");
            this.resetData();
            return;
        }
        this.setupStage();
        app.showScreen('challenge');
    },
    
    quickRestart: function() {
        for(let i=1; i<=26; i++) {
            localStorage.removeItem("4stage_number"+i);
            localStorage.removeItem("4answer_rgb16_"+i);
            localStorage.removeItem("4input_rgb16_"+i);
            localStorage.removeItem("4answer_rgb_"+i);
            localStorage.removeItem("4input_rgb_"+i);
        }
        localStorage.setItem("4stage_number", 1);
        localStorage.removeItem("4RGB_Temporary_Hex");
        
        this.currentStage = 1;
        this.setupStage();
        this.updateHistory();
        app.showScreen('challenge');
    },

    updateHistory: function() {
        const pb = localStorage.getItem("4stage_record");
        document.getElementById('challenge-pb').innerText = pb ? `${pb}` : "1";
        
        let html = "";
        for(let i = this.currentStage - 1; i >= 1; i--) {
            const sc = localStorage.getItem("4stage_number"+i);
            const goal = this.aimScores[i-1];
            
            const ansHex = localStorage.getItem("4answer_rgb16_"+i) || '#000';
            const myHex = localStorage.getItem("4input_rgb16_"+i) || '#000';
            const ansTxt = localStorage.getItem("4answer_rgb_"+i) || '';
            const myTxt = localStorage.getItem("4input_rgb_"+i) || '';

            if(sc) {
                const stNum = i.toString().padStart(2, '0');
                
                html += `
                <div class="history-item">
                    <div class="history-top-row">
                        <span class="stage-badge-history">STAGE ${stNum}</span>
                        <div class="history-score-area">
                            <span class="history-score-val">${sc}</span>
                            <span class="history-goal-text">GOAL ${goal}</span>
                        </div>
                    </div>
                    <div class="history-bottom-row">
                        <div class="color-data-group">
                            <span class="label-mini">TGT</span>
                            <span class="chip-mini" style="background:${ansHex}"></span>
                            <span>${ansTxt}</span>
                        </div>
                        <div class="color-data-group">
                            <span class="label-mini">YOU</span>
                            <span class="chip-mini" style="background:${myHex}"></span>
                            <span>${myTxt}</span>
                        </div>
                    </div>
                </div>`;
            }
        }
        document.getElementById('challenge-history').innerHTML = html;
    },

    // ★ 修正: Reset DataでMax Stageも削除するように変更
    resetData: function() {
        if(confirm("チャレンジモードの全記録（MAX STAGE含む）を削除しますか？")) {
            for(let i=1; i<=26; i++) {
                localStorage.removeItem("4stage_number"+i);
                localStorage.removeItem("4answer_rgb16_"+i);
                localStorage.removeItem("4input_rgb16_"+i);
                localStorage.removeItem("4answer_rgb_"+i);
                localStorage.removeItem("4input_rgb_"+i);
            }
            localStorage.removeItem("4stage_number");
            localStorage.removeItem("4RGB_Temporary_Hex");
            localStorage.removeItem("4stage_record"); // ★ Max Stageも削除

            this.currentStage = 1;
            this.setupStage();
            this.updateHistory();
            app.showScreen('challenge');
        }
    }
};

// ============================================
// ▼ 4. 裏世界
// ============================================
const anotherGame = {
    colors: [],

    init: function() {
        this.els = {
            R: document.getElementById('another-R'),
            G: document.getElementById('another-G'),
            B: document.getElementById('another-B'),
            valR: document.getElementById('another-val-R'),
            valG: document.getElementById('another-val-G'),
            valB: document.getElementById('another-val-B'),
            box: document.getElementById('another-input-color')
        };
        const update = () => this.updateColor();
        this.els.R.oninput = update; this.els.G.oninput = update; this.els.B.oninput = update;
        this.loadColors();
        this.updateColor();
        this.renderHistory();
    },

    loadColors: function() {
        const saved = localStorage.getItem("another_world_data");
        if (saved) {
            this.colors = JSON.parse(saved);
        } else {
            this.colors = [];
            const count = Number(localStorage.getItem("3index")) || 1;
            for (let i = 1; i < count; i++) {
                const txt = localStorage.getItem("3input_rgb" + i);
                const hex = localStorage.getItem("3input_rgb16" + i);
                if (txt && hex) {
                    this.colors.push({ text: txt, hex: hex });
                }
            }
            if (this.colors.length > 0) {
                this.saveToStorage();
            }
        }
    },

    saveToStorage: function() {
        localStorage.setItem("another_world_data", JSON.stringify(this.colors));
    },

    updateColor: function() {
        const r = parseInt(this.els.R.value); const g = parseInt(this.els.G.value); const b = parseInt(this.els.B.value);
        this.els.valR.innerText = r; this.els.valG.innerText = g; this.els.valB.innerText = b;
        this.els.box.style.backgroundColor = utils.rgbToHex(r,g,b);
    },

    saveColor: function() {
        const r = this.els.R.value; const g = this.els.G.value; const b = this.els.B.value;
        const hex = utils.rgbToHex(parseInt(r), parseInt(g), parseInt(b));
        const text = `(${r},${g},${b})`;
        
        this.colors.unshift({ text: text, hex: hex });
        this.saveToStorage();
        this.renderHistory();
    },

    deleteColor: function(index) {
        if(confirm("Delete this color?")) {
            this.colors.splice(index, 1);
            this.saveToStorage();
            this.renderHistory();
        }
    },

    setColor: function(index) {
        const c = this.colors[index];
        const match = c.text.match(/\d+/g);
        if(match && match.length === 3) {
            this.els.R.value = match[0];
            this.els.G.value = match[1];
            this.els.B.value = match[2];
            this.updateColor();
            window.scrollTo(0,0);
        }
    },

    copyColor: function(text) {
        navigator.clipboard.writeText(text).then(() => {
            alert("Copied: " + text);
        });
    },

    renderHistory: function() {
        const container = document.getElementById('another-history');
        if (this.colors.length === 0) {
            container.innerHTML = "<p style='text-align:center; padding:20px;'>No colors saved.</p>";
            return;
        }

        let html = "";
        this.colors.forEach((c, i) => {
            html += `
            <div class="void-list-item">
                <div class="void-info">
                    <div class="void-color-preview" style="background:${c.hex}"></div>
                    <div class="void-text">
                        <span>${c.text}</span>
                        <span class="void-hex">${c.hex}</span>
                    </div>
                </div>
                <div class="void-actions">
                    <button class="void-btn btn-set" onclick="anotherGame.setColor(${i})">SET</button>
                    <button class="void-btn" onclick="anotherGame.copyColor('${c.hex}')">COPY</button>
                    <button class="void-btn btn-del" onclick="anotherGame.deleteColor(${i})">✕</button>
                </div>
            </div>`;
        });
        container.innerHTML = html;
    },

    resetData: function() {
        if(confirm("Delete ALL saved colors?")) {
            this.colors = [];
            this.saveToStorage();
            this.renderHistory();
            localStorage.removeItem("3index");
        }
    }
};

document.addEventListener('DOMContentLoaded', () => {
    app.showScreen('menu');
});