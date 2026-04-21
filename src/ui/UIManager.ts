// @module src/ui/UIManager.ts
// Controls which HTML panel is visible and handles all DOM-level UI rendering.
// Receives state transitions from GameStateMachine and renders accordingly.

import type { GameStateId, IGameContext } from '@state/GameStateMachine';
import { SONGS, isUnlocked, getHighScore, type ISongMeta } from '@ui/songs';
import type { Difficulty } from '@midi/noteTypes';

// ── Panel IDs ─────────────────────────────────────────────────────────────────
const PANEL_IDS = [
  'panel-main-menu',
  'panel-session-book',
  'panel-countdown',
  'panel-results',
  'panel-game-over',
  'panel-pause',
  'panel-options',
] as const;

type PanelId = typeof PANEL_IDS[number];

// ── Callbacks the UIManager calls back into the game orchestrator ─────────────
export interface IUICallbacks {
  onStartTestSong(): void;
  onSongChosen(song: ISongMeta): void;
  onDifficultyChosen(diff: Difficulty): void;
  onRetry(): void;
  onMainMenu(): void;
  onSongSelect(): void;
  onResume(): void;
  onVolumeChange(v: number): void;
  onOffsetChange(ms: number): void;
}

export class UIManager {
  private readonly _panels = new Map<PanelId, HTMLElement>();
  private readonly _optionsPreviousPanel: PanelId[] = [];
  private _selectedSong: ISongMeta | null = null;

  constructor(private readonly _cb: IUICallbacks) {
    for (const id of PANEL_IDS) {
      const el = document.getElementById(id);
      if (el) this._panels.set(id, el);
    }
    this._bindStaticButtons();
  }

  // ── Show / Hide ───────────────────────────────────────────────────────────
  private _hideAll(): void {
    for (const el of this._panels.values()) {
      el.style.display = 'none';
    }
  }

  private _show(id: PanelId, instant = false): void {
    this._hideAll();
    const el = this._panels.get(id);
    if (!el) return;

    if (id === 'panel-session-book') {
      // Use fade-in for the book panel
      el.style.display = 'block';
      el.style.opacity = '0';
      if (instant) {
        el.style.opacity = '1';
      } else {
        requestAnimationFrame(() => requestAnimationFrame(() => { el.style.opacity = '1'; }));
      }
    } else {
      el.style.display = 'flex';
      requestAnimationFrame(() => { el.style.opacity = '1'; });
    }
  }

  // ── State → UI ────────────────────────────────────────────────────────────
  onStateChange(state: GameStateId, ctx: IGameContext): void {
    switch (state) {
      case 'MAIN_MENU':         this._showMainMenu(); break;
      case 'SONG_SELECT':       this._showSessionBook(); break;
      case 'DIFFICULTY_SELECT': this._showSessionBook(ctx.song ?? undefined); break;
      case 'COUNTDOWN':
        this._hideAll();
        this._showHUD(true);
        break;
      case 'PLAYING':           this._hideAll(); this._showHUD(true); break;
      case 'PAUSED':            this._show('panel-pause'); break;
      case 'RESULTS':           this._showResults(ctx); break;
      case 'GAME_OVER':         this._showGameOver(ctx); break;
    }
  }

  showCountdownTick(n: number | string): void {
    const el = document.getElementById('countdown-number');
    if (el) { el.textContent = String(n); el.classList.remove('pop'); void el.offsetWidth; el.classList.add('pop'); }
    const panel = this._panels.get('panel-countdown');
    if (panel) panel.style.display = 'flex';
  }

  hideCountdown(): void {
    const panel = this._panels.get('panel-countdown');
    if (panel) panel.style.display = 'none';
  }

  showHUD(visible: boolean): void { this._showHUD(visible); }

  private _showHUD(visible: boolean): void {
    const hud = document.getElementById('hud');
    if (hud) hud.style.opacity = visible ? '1' : '0';
  }

  // ── Main Menu ─────────────────────────────────────────────────────────────
  private _showMainMenu(): void {
    this._showHUD(false);
    this._show('panel-main-menu');
  }

  // ── Session Book (song list + difficulty) ─────────────────────────────────
  private _showSessionBook(forSong?: ISongMeta): void {
    this._buildSongList();

    const rightPage   = document.getElementById('book-right-page');
    const rightNav    = document.getElementById('book-nav-right');
    const highscore   = document.getElementById('book-highscore');

    if (forSong) {
      // Show difficulty selector on right page
      this._selectedSong = forSong;

      const titleEl = document.getElementById('book-song-selected-title');
      if (titleEl) titleEl.textContent = forSong.title;

      rightPage?.classList.remove('hidden');
      rightNav?.classList.remove('hidden');

      // Highlight selected song in list
      document.querySelectorAll('#book-song-list .song-item').forEach(el => {
        el.classList.toggle('selected', (el as HTMLElement).dataset['id'] === forSong.id);
      });

      // Show high score if exists
      const hs = getHighScore(forSong.id);
      if (hs && highscore) {
        const stars = '★'.repeat(hs.stars) + '☆'.repeat(Math.max(0, 6 - hs.stars));
        highscore.innerHTML = `
          <p class="hs-label">Best Score</p>
          <p class="hs-score">${String(hs.score).padStart(6, '0')}</p>
          <p style="color:var(--text-muted); font-size:0.58rem; margin-top:4px;">
            ${hs.difficulty.charAt(0).toUpperCase() + hs.difficulty.slice(1)}&nbsp;·&nbsp;${stars}
          </p>`;
        highscore.style.display = 'block';
      } else if (highscore) {
        highscore.style.display = 'none';
      }
    } else {
      // Show only song list (right page hidden)
      this._selectedSong = null;
      rightPage?.classList.add('hidden');
      rightNav?.classList.add('hidden');
      if (highscore) highscore.style.display = 'none';
    }

    this._show('panel-session-book');
  }

  private _buildSongList(): void {
    const list = document.getElementById('book-song-list');
    if (!list) return;
    list.innerHTML = '';

    for (const song of SONGS) {
      const unlocked = isUnlocked(song);
      const item = document.createElement('button');
      item.className = `song-item ${unlocked ? 'unlocked' : 'locked'}`;
      item.disabled  = !unlocked;
      item.dataset['id'] = song.id;

      item.innerHTML = `
        <span class="session-num">Session #${song.sessionNum}</span>
        <span class="song-title">${song.title}</span>
        <span class="song-meta" style="grid-column:2">${song.bpm} BPM · ${Math.floor(song.duration / 60)}:${String(song.duration % 60).padStart(2, '0')}</span>
        ${!unlocked ? `<span class="lock-hint">Complete Session #${song.sessionNum - 1} to unlock</span>` : ''}
      `;

      if (unlocked) {
        item.addEventListener('click', () => {
          this._cb.onSongChosen(song);
        });
      }

      list.appendChild(item);
    }
  }

  // ── Results ───────────────────────────────────────────────────────────────
  private _showResults(ctx: IGameContext): void {
    const scoreEl = document.getElementById('results-score');
    const accEl   = document.getElementById('results-accuracy');
    const starsEl = document.getElementById('results-stars');
    const songEl  = document.getElementById('results-song-name');

    if (scoreEl)  scoreEl.textContent  = String(ctx.score).padStart(6, '0');
    if (accEl)    accEl.textContent    = `${ctx.accuracy.toFixed(1)}%`;
    if (songEl)   songEl.textContent   = ctx.song?.title ?? '';
    if (starsEl)  {
      starsEl.innerHTML = '';
      for (let i = 0; i < 6; i++) {
        const star = document.createElement('span');
        star.className = i < ctx.stars ? 'star on' : 'star off';
        star.textContent = '★';
        starsEl.appendChild(star);
      }
    }

    this._show('panel-results');
  }

  // ── Game Over ─────────────────────────────────────────────────────────────
  private _showGameOver(ctx: IGameContext): void {
    const msgEl = document.getElementById('gameover-msg');
    if (msgEl) {
      const name = ctx.song?.title ?? 'the song';
      msgEl.textContent = `You failed "${name}" at ${ctx.progressAtFail.toFixed(0)}%`;
    }
    this._show('panel-game-over');
  }

  // ── Static button bindings ────────────────────────────────────────────────
  private _bindStaticButtons(): void {
    this._bind('btn-start-session',  () => this._cb.onSongSelect());
    this._bind('btn-play-test',      () => this._cb.onStartTestSong());
    this._bind('btn-options-main',   () => this._openOptions('panel-main-menu'));
    this._bind('btn-back-to-main',   () => this._cb.onMainMenu());

    // Session book difficulty buttons
    this._bind('book-diff-easy',   () => { if (this._selectedSong) this._cb.onDifficultyChosen('easy'); });
    this._bind('book-diff-medium', () => { if (this._selectedSong) this._cb.onDifficultyChosen('medium'); });
    this._bind('book-diff-expert', () => { if (this._selectedSong) this._cb.onDifficultyChosen('expert'); });
    this._bind('btn-choose-other', () => this._cb.onSongSelect()); // back to song list

    // Pause
    this._bind('pause-resume',     () => this._cb.onResume());
    this._bind('pause-retry',      () => this._cb.onRetry());
    this._bind('pause-mainmenu',   () => this._cb.onMainMenu());
    this._bind('pause-songselect', () => this._cb.onSongSelect());
    this._bind('pause-options',    () => this._openOptions('panel-pause'));

    // Results
    this._bind('results-retry',      () => this._cb.onRetry());
    this._bind('results-mainmenu',   () => this._cb.onMainMenu());
    this._bind('results-songselect', () => this._cb.onSongSelect());

    // Game Over
    this._bind('gameover-retry',      () => this._cb.onRetry());
    this._bind('gameover-mainmenu',   () => this._cb.onMainMenu());
    this._bind('gameover-songselect', () => this._cb.onSongSelect());

    // Options
    this._bind('options-back', () => this._closeOptions());

    // Volume slider
    const vol = document.getElementById('opt-volume') as HTMLInputElement | null;
    vol?.addEventListener('input', () => this._cb.onVolumeChange(Number(vol.value) / 100));

    // Offset slider
    const off = document.getElementById('opt-offset') as HTMLInputElement | null;
    off?.addEventListener('input', () => this._cb.onOffsetChange(Number(off.value)));
    off?.addEventListener('input', () => {
      const label = document.getElementById('opt-offset-value');
      if (label) label.textContent = `${off.value} ms`;
    });
  }

  private _bind(id: string, fn: () => void): void {
    document.getElementById(id)?.addEventListener('click', fn);
  }

  private _openOptions(returnTo: PanelId): void {
    this._optionsPreviousPanel.push(returnTo);
    this._show('panel-options');
  }

  private _closeOptions(): void {
    const ret = this._optionsPreviousPanel.pop() ?? 'panel-main-menu';
    this._show(ret);
  }
}
