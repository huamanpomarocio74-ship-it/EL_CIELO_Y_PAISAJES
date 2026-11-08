(() => {
  'use strict';

  /* ====== Contenido ====== */
  const COVER = 'assets/videos/PORTADA.mp4';
  const WORDS = [
    { word: 'NUBE',   art: 'la', video: 'assets/videos/NUBE.mp4',
      def: 'Es blanca, esponjosa y flota en el cielo.',
      ex:  'Miro la nube pasar despacito.' },
    { word: 'LLUVIA', art: 'la', video: 'assets/videos/LLUVIA.mp4',
      def: 'Son gotas de agua que caen del cielo.',
      ex:  'Abro mi paraguas cuando empieza a caer la lluvia.' },
    { word: 'RAYO',   art: 'el', video: 'assets/videos/RAYO.mp4',
      def: 'Es una luz brillante y rápida que cruza el cielo cuando hay tormenta.',
      ex:  'El rayo alumbró la ciudad.' },
    { word: 'ISLA',   art: 'la', video: 'assets/videos/ISLA.mp4',
      def: 'Es un trocito de tierra rodeado de agua.',
      ex:  'Hay una palmera creciendo en la isla.' },
    { word: 'OASIS',  art: 'el', video: 'assets/videos/OASIS.mp4',
      def: 'Es un lugar con agua y plantitas rodeado de arena.',
      ex:  'El desierto tiene un oasis.' }
  ];
  const OPTIONS_PER_ROUND = 4;

  /* ====== Utilidades ====== */
  const $ = id => document.getElementById(id);
  const el = {
    stage: $('stage'), slides: $('slides'), grid: $('gameGrid'), celebration: $('celebration'),
    welcome: $('welcome'), lesson: $('lesson'), game: $('game'), finish: $('finish'),
    word: $('word'), phrase: $('phrase'), dots: $('dots'), count: $('count'), listen: $('listen'),
    question: $('question'), feedback: $('feedback'), gameCount: $('gameCount'),
    controls: $('controls'), prev: $('prev'), next: $('next'), repeat: $('repeat'), home: $('home'),
    start: $('start'), again: $('again'), dictionary: $('dictionary'),
    sound: $('sound'), status: $('status')
  };
  const shuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const wait = ms => new Promise(r => setTimeout(r, ms));
  const cap = s => s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();

  /* ====== Voz ====== */
  let soundOn = true;
  let speakToken = 0;
  let voice = null;
  const synth = 'speechSynthesis' in window ? window.speechSynthesis : null;

  function pickVoice() {
    if (!synth) return;
    const vs = synth.getVoices();
    voice = vs.find(v => /^es[-_](CO|MX|US|419)/i.test(v.lang)) || vs.find(v => /^es/i.test(v.lang)) || null;
  }
  if (synth) { pickVoice(); synth.onvoiceschanged = pickVoice; }

  function say(text) {
    return new Promise(resolve => {
      if (!soundOn || !synth) return resolve();
      const u = new SpeechSynthesisUtterance(text);
      u.lang = (voice && voice.lang) || 'es-ES';
      if (voice) u.voice = voice;
      u.rate = 0.85; u.pitch = 1.1;
      u.onend = u.onerror = () => resolve();
      synth.speak(u);
    });
  }
  function stopSpeech() { speakToken++; if (synth) synth.cancel(); }
  async function sayAll(parts) {
    const t = ++speakToken;
    if (synth) synth.cancel();
    for (const p of parts) {
      if (t !== speakToken) return;
      await say(p);
      if (t !== speakToken) return;
      await wait(250);
    }
  }
  function announce(msg) { el.status.textContent = msg; }

  el.sound.addEventListener('click', () => {
    soundOn = !soundOn;
    el.sound.setAttribute('aria-pressed', String(soundOn));
    el.sound.setAttribute('aria-label', soundOn ? 'Desactivar voz' : 'Activar voz');
    if (!soundOn) stopSpeech();
  });

  /* ====== Videos del escenario (transición suave) ====== */
  const slideMap = {};
  function makeVideo(src) {
    const v = document.createElement('video');
    v.src = src; v.muted = true; v.loop = true; v.playsInline = true; v.preload = 'auto';
    v.setAttribute('playsinline', ''); v.setAttribute('muted', '');
    return v;
  }
  [['cover', COVER], ...WORDS.map((w, i) => [i, w.video])].forEach(([k, src]) => {
    const v = makeVideo(src); slideMap[k] = v; el.slides.appendChild(v);
  });
  function showSlide(key) {
    Object.entries(slideMap).forEach(([k, v]) => {
      if (String(k) === String(key)) {
        v.currentTime = 0; v.classList.add('active');
        const p = v.play(); if (p && p.catch) p.catch(() => {});
      } else {
        v.classList.remove('active');
        setTimeout(() => { if (!v.classList.contains('active')) v.pause(); }, 650);
      }
    });
  }

  /* ====== Pantallas ====== */
  function screen(name) {
    if (name !== 'game') gameRun++;
    ['welcome', 'lesson', 'game', 'finish'].forEach(n => el[n].hidden = n !== name);
    el.controls.hidden = name !== 'lesson';
    el.grid.hidden = name !== 'game';
    el.slides.hidden = name === 'game';
    el.celebration.hidden = true;
    if (name === 'welcome' || name === 'finish') showSlide('cover');
  }

  /* ====== Lección ====== */
  let idx = 0;
  function renderDots() {
    el.dots.innerHTML = WORDS.map((_, i) => `<i class="${i === idx ? 'on' : i < idx ? 'done' : ''}"></i>`).join('');
  }
  function showLesson(i, speak = true) {
    idx = Math.max(0, Math.min(WORDS.length - 1, i));
    const w = WORDS[idx];
    screen('lesson');
    el.word.textContent = w.word;
    el.phrase.innerHTML = `<span class="def"></span><span class="ex"></span>`;
    el.phrase.querySelector('.def').textContent = w.def;
    el.phrase.querySelector('.ex').textContent = w.ex;
    el.count.textContent = `${idx + 1} DE ${WORDS.length}`;
    el.prev.disabled = idx === 0;
    el.next.textContent = idx === WORDS.length - 1 ? '¡A JUGAR! ▶' : 'SIGUIENTE →';
    renderDots();
    showSlide(idx);
    announce(`${w.word}. ${w.def} ${w.ex}`);
    if (speak) sayAll([cap(w.word), w.def, w.ex]); else stopSpeech();
  }
  function replay() {
    const w = WORDS[idx];
    showSlide(idx);
    sayAll([cap(w.word), w.def, w.ex]);
  }

  el.start.addEventListener('click', () => showLesson(0));
  el.next.addEventListener('click', () => idx === WORDS.length - 1 ? startGame() : showLesson(idx + 1));
  el.prev.addEventListener('click', () => showLesson(idx - 1));
  el.repeat.addEventListener('click', replay);
  el.listen.addEventListener('click', replay);
  el.home.addEventListener('click', goHome);

  function goHome() { stopSpeech(); idx = 0; screen('welcome'); }

  /* ====== Juego ====== */
  let order = [], round = 0, locked = false, gameRun = 0;
  function startGame() {
    order = shuffle(WORDS.map((_, i) => i));
    round = 0;
    nextRound();
  }
  function nextRound() {
    if (round >= order.length) return finishGame();
    const keep = gameRun; screen('game'); gameRun = keep;
    locked = false;
    const answer = order[round];
    const w = WORDS[answer];
    const others = shuffle(WORDS.map((_, i) => i).filter(i => i !== answer)).slice(0, OPTIONS_PER_ROUND - 1);
    const opts = shuffle([answer, ...others]);

    el.grid.innerHTML = '';
    opts.forEach(i => {
      const b = document.createElement('button');
      b.type = 'button'; b.className = 'game-card';
      b.setAttribute('aria-label', `Video ${i + 1}`);
      const v = makeVideo(WORDS[i].video); v.autoplay = true;
      b.appendChild(v);
      b.addEventListener('click', () => choose(b, i === answer, w));
      el.grid.appendChild(b);
      const p = v.play(); if (p && p.catch) p.catch(() => {});
    });

    const q = `¿Cuál es ${w.art} ${w.word.toLowerCase()}?`;
    el.question.textContent = q.toUpperCase();
    el.feedback.textContent = '👆 TOCA EL VIDEO';
    el.feedback.classList.remove('bad');
    el.gameCount.textContent = `${round + 1} DE ${order.length}`;
    announce(q);
    sayAll([q]);
  }
  async function choose(btn, ok, w) {
    if (locked) return;
    if (!ok) {
      btn.classList.add('wrong');
      el.feedback.textContent = '🙂 INTÉNTALO DE NUEVO';
      el.feedback.classList.add('bad');
      setTimeout(() => btn.classList.remove('wrong'), 450);
      sayAll(['Inténtalo otra vez']);
      return;
    }
    locked = true;
    const run = gameRun;
    btn.classList.add('correct');
    el.grid.querySelectorAll('.game-card').forEach(c => { if (c !== btn) c.classList.add('dim'); });
    el.feedback.classList.remove('bad');
    el.feedback.textContent = `⭐ ¡MUY BIEN! ES ${w.art.toUpperCase()} ${w.word}`;
    el.celebration.hidden = false;
    speakToken++; if (synth) synth.cancel();
    await say(`¡Muy bien! Es ${w.art} ${w.word.toLowerCase()}`);
    await wait(900);
    if (run !== gameRun) return;
    round++;
    nextRound();
  }
  function finishGame() {
    screen('finish');
    announce('¡Excelente trabajo!');
    sayAll(['¡Excelente trabajo! Ya conoces las palabras del cielo y los paisajes.']);
  }
  el.again.addEventListener('click', startGame);
  el.dictionary.addEventListener('click', () => showLesson(0));

  /* ====== Teclado ====== */
  document.addEventListener('keydown', e => {
    if (el.lesson.hidden) return;
    if (e.key === 'ArrowRight') el.next.click();
    else if (e.key === 'ArrowLeft' && !el.prev.disabled) el.prev.click();
    else if (e.key === 'r' || e.key === 'R') replay();
  });

  /* ====== Inicio ====== */
  screen('welcome');
})();
