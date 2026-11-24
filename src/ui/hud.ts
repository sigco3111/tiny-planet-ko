// All DOM UI for play mode: title card, pause card, HUD (mode chip, sun dial, hints, crosshair), toasts.
// Self-contained: injects its own <style>, uses system fonts only, no assets.
import { STYLE } from './style';

const ICON = {
  planet: `<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="6.2" fill="currentColor" opacity=".9"/><ellipse cx="12" cy="12" rx="10.5" ry="3.6" fill="none" stroke="currentColor" stroke-width="1.5" transform="rotate(-18 12 12)" opacity=".75"/></svg>`,
  walk: `<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="13.5" cy="4.2" r="2.1" fill="currentColor"/><path d="M10.2 21l2.2-6.4 2.6 2.6V21M8 12.6l2.6-4.4 3.2 1.2 1.6 3.2 2.4 1M12.4 14.6l-.9-5.1" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  fly: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 13.5c3.2-.4 5.6-1.8 7.4-4.4l1.6 2.6 1.6-2.6c1.8 2.6 4.2 4 7.4 4.4-2.2 1.4-4.8 1.8-7.4 1.2L12 17l-1.6-2.3c-2.6.6-5.2.2-7.4-1.2z" fill="currentColor"/></svg>`,
  swim: `<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="16.5" cy="7" r="2.1" fill="currentColor"/><path d="M5 12.2l4.2-3 3.4 2.6 3.2-1.4M3 16.5c1.5 0 1.5-1 3-1s1.5 1 3 1 1.5-1 3-1 1.5 1 3 1 1.5-1 3-1 1.5 1 3 1" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  mouse: `<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="6.5" y="3" width="11" height="18" rx="5.5" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M12 6.5v3.5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>`,
  sound: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z" fill="currentColor"/><path d="M15.5 9a4 4 0 010 6M18 6.5a7.5 7.5 0 010 11" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>`,
  mute: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z" fill="currentColor"/><path d="M16 9.5l5 5M21 9.5l-5 5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>`,
};

const key = (k: string, wide = false) => `<kbd class="tp-k${wide ? ' tp-kw' : ''}">${k}</kbd>`;

const LEGEND = `
  <div class="tp-legend">
    <div class="tp-row"><span class="tp-keys">${key('W')}${key('A')}${key('S')}${key('D')}</span><span>이동</span></div>
    <div class="tp-row"><span class="tp-keys"><span class="tp-ico">${ICON.mouse}</span></span><span>시점</span></div>
    <div class="tp-row"><span class="tp-keys">${key('Shift', true)}</span><span>달리기</span></div>
    <div class="tp-row"><span class="tp-keys">${key('Space', true)}</span><span>점프</span></div>
    <div class="tp-row"><span class="tp-keys">${key('F')}</span><span>비행</span></div>
    <div class="tp-row"><span class="tp-keys">${key('Esc', true)}</span><span>일시정지</span></div>
  </div>`;

const WALK_HINT = `${key('W')}${key('A')}${key('S')}${key('D')} 이동 <i></i> ${key('Shift', true)} 달리기 <i></i> ${key('Space', true)} 점프 <i></i> ${key('F')} 비행 <i></i> ${key('M')} 소리`;
const FLY_HINT = `${key('Space', true)} 상승 <i></i> ${key('C')} 하강 <i></i> ${key('Shift', true)} 가속 <i></i> ${key('F')} 착지`;

export type Screen = 'title' | 'blend' | 'play' | 'pause';
export type ModeName = 'Walking' | 'Flying' | 'Swimming';

/** Korean display labels for the internal mode names (comparisons and CSS hooks keep the English values). */
const MODE_LABEL: Record<ModeName, string> = { Walking: '걷기', Flying: '비행', Swimming: '수영' };

export class Hud {
  readonly root: HTMLDivElement;
  private title: HTMLDivElement;
  private pause: HTMLDivElement;
  private hud: HTMLDivElement;
  private chip: HTMLDivElement;
  private chipIcon: HTMLSpanElement;
  private chipText: HTMLSpanElement;
  private chipAlt: HTMLSpanElement;
  private dial: HTMLDivElement;
  private dialSun: SVGGElement;
  private dialLabel: HTMLSpanElement;
  private hint: HTMLDivElement;
  private toastEl: HTMLDivElement;
  private pauseNote: HTMLDivElement;
  private style: HTMLStyleElement;
  private mode: ModeName | '' = '';
  private hintTimer = 0;
  private toastTimer = 0;
  private lastLabel = '';
  private lastAlt = '';
  private lastSun = '';
  screen: Screen = 'title';

  constructor(host: HTMLElement, onStart: () => void) {
    this.style = document.createElement('style');
    this.style.textContent = STYLE;
    document.head.appendChild(this.style);

    const root = (this.root = document.createElement('div'));
    root.className = 'tp-root';
    root.innerHTML = `
      <div class="tp-scrim"></div>
      <div class="tp-title" role="dialog" aria-label="타이니 플래닛">
        <div class="tp-eyebrow"><span class="tp-ico">${ICON.planet}</span>주머니 속 작은 세상</div>
        <h1>타이니 플래닛</h1>
        <p class="tp-sub">해변을 거닐고, 풍차 언덕에 오르고, 하늘로 날아올라 세상을 감싸며 도는 석양을 바라보세요.</p>
        <button class="tp-cta" type="button"><span class="tp-pulse"></span>클릭해서 시작</button>
        ${LEGEND}
      </div>
      <div class="tp-pause" role="dialog" aria-label="일시정지">
        <div class="tp-card">
          <div class="tp-pause-h">일시정지</div>
          <div class="tp-pause-sub">아무 곳이나 클릭하면 탐험을 계속합니다</div>
          ${LEGEND}
          <div class="tp-note"></div>
        </div>
      </div>
      <div class="tp-hud">
        <div class="tp-chip"><span class="tp-ico"></span><span class="tp-chip-t"></span><span class="tp-chip-alt"></span></div>
        <div class="tp-dial">
          <svg viewBox="0 0 40 30" aria-hidden="true">
            <defs>
              <clipPath id="tp-sky"><rect x="0" y="0" width="40" height="22"/></clipPath>
            </defs>
            <circle cx="20" cy="22" r="13" class="tp-dial-arc" clip-path="url(#tp-sky)"/>
            <line x1="3" y1="22" x2="37" y2="22" class="tp-dial-hz"/>
            <g class="tp-dial-sun">
              <g class="tp-sun"><circle r="6.5" class="tp-sun-glow"/><circle r="3.6" class="tp-sun-disc"/></g>
              <path class="tp-moon" d="M1.2,-3.9 A4.1,4.1 0 1,0 3.6,2.1 A3.3,3.3 0 0,1 1.2,-3.9Z"/>
            </g>
          </svg>
          <span class="tp-dial-l"></span>
        </div>
        <div class="tp-cross"></div>
        <div class="tp-hint"></div>
      </div>
      <div class="tp-toast"></div>`;
    host.appendChild(root);
    const q = <T extends Element>(s: string) => root.querySelector(s) as T;
    this.title = q('.tp-title');
    this.pause = q('.tp-pause');
    this.hud = q('.tp-hud');
    this.chip = q('.tp-chip');
    this.chipIcon = q('.tp-chip .tp-ico');
    this.chipText = q('.tp-chip-t');
    this.chipAlt = q('.tp-chip-alt');
    this.dial = q('.tp-dial');
    this.dialSun = q('.tp-dial-sun');
    this.dialLabel = q('.tp-dial-l');
    this.hint = q('.tp-hint');
    this.toastEl = q('.tp-toast');
    this.pauseNote = q('.tp-note');

    // Click anywhere on the title / pause cards (which cover the screen) to start / resume.
    const start = (e: Event) => {
      e.preventDefault();
      onStart();
    };
    this.title.addEventListener('click', start);
    q('.tp-scrim').addEventListener('click', start);
    this.pause.addEventListener('click', start);
    this.setScreen('title');
    this.setMode('Walking');
  }

  setScreen(s: Screen) {
    this.screen = s;
    this.root.dataset.screen = s;
    if (s === 'play') this.showHint(this.mode === 'Flying' ? FLY_HINT : WALK_HINT, 7);
  }

  setMode(m: ModeName) {
    if (m === this.mode) return;
    const prev = this.mode;
    this.mode = m;
    this.chipText.textContent = MODE_LABEL[m];
    this.chipIcon.innerHTML = m === 'Flying' ? ICON.fly : m === 'Swimming' ? ICON.swim : ICON.walk;
    this.chip.dataset.mode = m;
    this.chip.classList.remove('tp-bump');
    void this.chip.offsetWidth;
    this.chip.classList.add('tp-bump');
    if (this.screen === 'play' && (m === 'Flying' || prev === 'Flying')) this.showHint(m === 'Flying' ? FLY_HINT : WALK_HINT, 5);
  }

  /** Altitude readout in the chip (flying only). */
  setAltitude(m: number | null) {
    const s = m == null ? '' : `${Math.round(m)} m`;
    if (s !== this.lastAlt) {
      this.lastAlt = s;
      this.chipAlt.textContent = s;
    }
  }

  showHint(html: string, seconds: number) {
    this.hint.innerHTML = html;
    this.hint.classList.add('tp-on');
    this.hintTimer = seconds;
  }

  toast(html: string, seconds = 1.8) {
    this.toastEl.innerHTML = html;
    this.toastEl.classList.add('tp-on');
    this.toastTimer = seconds;
  }

  mutedToast(muted: boolean) {
    this.toast(`<span class="tp-ico">${muted ? ICON.mute : ICON.sound}</span>${muted ? '소리 끔' : '소리 켬'}`);
  }

  pauseMessage(text: string) {
    this.pauseNote.textContent = text;
  }

  /**
   * Sun dial. h = local sun height (sin of elevation), rising = whether it is climbing.
   * The marker runs round a circle: left horizon = sunrise, top = noon, right horizon = sunset.
   */
  setSun(h: number, rising: boolean) {
    const el = Math.asin(Math.max(-1, Math.min(1, h)));
    const night = h < -0.06;
    // 0 = east horizon, pi/2 = noon, pi = west horizon. At night the moon rides the opposite side.
    let phi = rising ? el : Math.PI - el;
    if (night) phi += Math.PI;
    const x = 20 - 13 * Math.cos(phi);
    const y = 22 - 13 * Math.sin(phi);
    const label =
      h > 0.55 ? '한낮' : h > 0.18 ? (rising ? '아침' : '오후') : h > -0.04 ? (rising ? '일출' : '일몰') : h > -0.2 ? (rising ? '새벽' : '황혼') : '밤';
    const key = `${x.toFixed(1)},${y.toFixed(1)},${night}`;
    if (key !== this.lastSun) {
      this.lastSun = key;
      this.dialSun.setAttribute('transform', `translate(${x.toFixed(2)} ${y.toFixed(2)})`);
      this.dial.dataset.night = night ? '1' : '0';
      // Sky tint of the dial: day blue -> sunset amber -> night navy.
      const t = Math.max(0, Math.min(1, (h + 0.05) / 0.4));
      const s = Math.max(0, 1 - Math.abs(h - 0.02) / 0.2);
      this.dial.style.setProperty('--sky-a', `${(0.15 + 0.25 * t).toFixed(3)}`);
      this.dial.style.setProperty('--dusk', s.toFixed(3));
    }
    if (label !== this.lastLabel) {
      this.lastLabel = label;
      this.dialLabel.textContent = label;
    }
  }

  /** Call every frame with real (unscaled) dt for UI timers. */
  tick(dt: number) {
    if (this.hintTimer > 0) {
      this.hintTimer -= dt;
      if (this.hintTimer <= 0) this.hint.classList.remove('tp-on');
    }
    if (this.toastTimer > 0) {
      this.toastTimer -= dt;
      if (this.toastTimer <= 0) this.toastEl.classList.remove('tp-on');
    }
  }

  dispose() {
    this.root.remove();
    this.style.remove();
  }
}
