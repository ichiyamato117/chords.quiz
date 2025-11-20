(function(){
/* ---- 音・進行ロジック (前の仕様を踏襲) ---- */
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
let score = 0;
let sequence = [];
let currentIndex = 0;
let currentProgressName = "";

// コード辞書
const chords = {
  'Dm': ['D4','F4','A4'],
  'A':  ['A3','C#4','E4'],
  'C':  ['C4','E4','G4'],
  'G':  ['G3','B3','D4'],
  'F':  ['F3','A3','C4'],
  'Em': ['E3','G3','B3'],
  'Am': ['A3','C4','E4'],
  'Bdim':['B3','D4','F4']
};
const chordNames = Object.keys(chords);
const chordToNum = {'C':1,'Dm':2,'Em':3,'F':4,'G':5,'Am':6,'Bdim':7};

// まとめ進行（J-POP20種類含む）
const progressions = {
  '丸の内進行':['C','Am','Dm','G'],
  '50年代進行':['C','Am','F','G'],
  'パッヘルベル進行':['C','G','Am','Em','F','C','F','G'],
  'J-POP1':['C','G','Am','F'],
  'J-POP2':['C','Am','F','G'],
  'J-POP3':['C','F','G'],
  'J-POP4':['C','Am','Dm','G'],
  'J-POP5':['C','Em','F','G'],
  'J-POP6':['C','G','F','G'],
  'J-POP7':['C','Am','F','Em'],
  'J-POP8':['C','F','Am','G'],
  'J-POP9':['C','G','Dm','F'],
  'J-POP10':['C','Am','F','C'],
  'J-POP11':['C','Em','Am','G'],
  'J-POP12':['C','F','Dm','G'],
  'J-POP13':['C','G','Am','Em'],
  'J-POP14':['C','Am','G','F'],
  'J-POP15':['C','F','C','G'],
  'J-POP16':['C','G','F','Em'],
  'J-POP17':['C','Am','F','Dm'],
  'J-POP18':['C','F','G','C'],
  'J-POP19':['C','G','Am','C'],
  'J-POP20':['C','Am','F','G']
};

// サウンド再生（少し余韻長め）
function playNotes(notes,duration=1.4){
  const now = audioCtx.currentTime;
  notes.forEach(n=>{
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type='sine';
    osc.frequency.value = noteToFreq(n);
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.6, now+0.03);
    gain.gain.exponentialRampToValueAtTime(0.0001, now+duration);
    osc.connect(gain).connect(audioCtx.destination);
    osc.start(now);
    osc.stop(now+duration+0.05);
  });
}
function noteToFreq(note){
  const m = note.match(/^([A-G])(#|b)?(\d)$/);
  if(!m) return 440;
  const [_,pc,acc,o]=m;
  let semis={'C':0,'D':2,'E':4,'F':5,'G':7,'A':9,'B':11}[pc];
  if(acc=='#') semis+=1;
  if(acc=='b') semis-=1;
  const octave=parseInt(o);
  const midi=(octave+1)*12+semis;
  return 440*Math.pow(2,(midi-69)/12);
}

/* UI要素 */
const boxesEl = document.getElementById('boxes');
const choicesEl = document.getElementById('choices');
const startBtn = document.getElementById('start');
const undoX = document.getElementById('undo-x');
const nextBtn = document.getElementById('next');
const modeSel = document.getElementById('mode');
const progressNameEl = document.getElementById('progress-name');
const progressNumEl = document.getElementById('progress-num');
const scoreEl = document.getElementById('score');

startBtn.addEventListener('click', startQuiz);
undoX.addEventListener('click', undoSelection);
nextBtn.addEventListener('click', nextQuestion);

/* 開始 */
function startQuiz(){
  if(audioCtx.state==='suspended') {
    audioCtx.resume();
  }
  score = 0;
  currentIndex = 0;
  const mode = modeSel.value;
  let len=1;
  currentProgressName = "";
  // リセットUI
  progressNumEl.style.opacity = 0.0;
  progressNumEl.innerText = '';
  nextBtn.style.display = 'none';

  if(mode==='1' || mode==='2' || mode==='3'){
    len = parseInt(mode);
    sequence = [];
    for(let i=0;i<len;i++){
      sequence.push(chordNames[Math.floor(Math.random()*chordNames.length)]);
    }
    currentProgressName = "ランダム進行";
  } else {
    const keys = Object.keys(progressions);
    currentProgressName = keys[Math.floor(Math.random()*keys.length)];
    sequence = progressions[currentProgressName].slice();
    len = sequence.length;
  }

  currentIndex = 0;
  boxesEl.innerHTML='';
  for(let i=0;i<len;i++){
    const b = document.createElement('div');
    b.className='box';
    b.addEventListener('click',()=>playNotes(chords[sequence[i]]));
    boxesEl.appendChild(b);
  }

  renderChoices();
  progressNameEl.innerText = currentProgressName;
  // progressNumElはresult時に表示
  playSequence(0);
}

/* 進行を順番に鳴らす */
function playSequence(idx){
  if(idx>=sequence.length) return;
  playNotes(chords[sequence[idx]]);
  setTimeout(()=>playSequence(idx+1), 1700);
}

/* 選択肢生成 */
function renderChoices(){
  choicesEl.innerHTML='';
  chordNames.forEach(name=>{
    const btn = document.createElement('button');
    btn.className='choice';
    btn.innerText=name;
    btn.onclick=()=>selectChord(name);
    choicesEl.appendChild(btn);
  });
}

/* 選んだとき */
function selectChord(name){
  const boxes = document.querySelectorAll('.box');
  if(currentIndex>=sequence.length) return;
  const box = boxes[currentIndex];
  box.innerText=name;
  boxes.forEach(b=>b.classList.remove('current'));
  box.classList.add('current');
  currentIndex++;
  if(currentIndex>=sequence.length){
    checkResult();
  }
}

/* ×取り消し（Undo） */
function undoSelection(){
  if(currentIndex<=0) return;
  currentIndex--;
  const boxes = document.querySelectorAll('.box');
  boxes[currentIndex].innerText='';
  boxes.forEach(b=>b.classList.remove('current'));
  if(currentIndex < boxes.length) boxes[currentIndex].classList.add('current');
}

/* 結果判定・表示（正解/不正解 + 同時に数字進行を表示）*/
function checkResult(){
  const boxes = document.querySelectorAll('.box');
  let allCorrect = true;
  boxes.forEach((b,i)=>{
    b.classList.remove('current');
    if(b.innerText===sequence[i]){
      b.classList.add('correct');
    } else{
      allCorrect=false;
      b.classList.add('wrong');
      const correctDiv = document.createElement('div');
      correctDiv.className='correct-answer';
      correctDiv.innerText = sequence[i];
      b.appendChild(correctDiv);
    }
  });

  // 数字進行（ここで表示）
  const numProgress = sequence.map(c=>chordToNum[c]||0).join('');
  progressNumEl.innerText = `（${numProgress}進行）`;
  progressNumEl.style.opacity = 1.0;

  // 連続正解スコア更新
  score = allCorrect? score+1 : 0;
  scoreEl.innerText = `連続正解: ${score}`;

  // Nextボタン表示（ユーザーが押すまで次へ進まない）
  nextBtn.style.display = 'inline-block';
}

/* Next押したら次問題 */
function nextQuestion(){
  startQuiz();
})();