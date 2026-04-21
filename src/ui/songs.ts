// @module src/ui/songs.ts
// Static song catalog. Unlock state persisted in localStorage.
// Sessions 2–6 are placeholders until real AI tracks are added.

export type SongId = 'song-test' | 'song-02' | 'song-03' | 'song-04' | 'song-05' | 'song-06';

export interface ISongMeta {
  id: SongId;
  sessionNum: number;
  title: string;
  artist: string;
  bpm: number;
  duration: number; // seconds
  chartPath: string;
  unlockCondition: SongId | null; // null = always unlocked
}

export const SONGS: ISongMeta[] = [
  {
    id: 'song-test',
    sessionNum: 1,
    title: 'System Init',
    artist: 'Algorhythm Engine',
    bpm: 100,
    duration: 72,
    chartPath: '/charts/song-test.json',
    unlockCondition: null,
  },
  {
    id: 'song-02',
    sessionNum: 2,
    title: 'Neon Cascade',
    artist: 'AI Generation',
    bpm: 120,
    duration: 180,
    chartPath: '/charts/song-02.json',
    unlockCondition: 'song-test',
  },
  {
    id: 'song-03',
    sessionNum: 3,
    title: 'Void Protocol',
    artist: 'AI Generation',
    bpm: 130,
    duration: 180,
    chartPath: '/charts/song-03.json',
    unlockCondition: 'song-02',
  },
  {
    id: 'song-04',
    sessionNum: 4,
    title: 'Fractal Bloom',
    artist: 'AI Generation',
    bpm: 140,
    duration: 210,
    chartPath: '/charts/song-04.json',
    unlockCondition: 'song-03',
  },
  {
    id: 'song-05',
    sessionNum: 5,
    title: 'Quantum Drift',
    artist: 'AI Generation',
    bpm: 150,
    duration: 210,
    chartPath: '/charts/song-05.json',
    unlockCondition: 'song-04',
  },
  {
    id: 'song-06',
    sessionNum: 6,
    title: 'Algorhythm Core',
    artist: 'AI Generation',
    bpm: 160,
    duration: 240,
    chartPath: '/charts/song-06.json',
    unlockCondition: 'song-05',
  },
];

const STORAGE_KEY = 'algorhythm_completed';

function getCompleted(): Set<SongId> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return new Set();
    return new Set(JSON.parse(raw) as SongId[]);
  } catch {
    return new Set();
  }
}

export function markCompleted(id: SongId): void {
  const set = getCompleted();
  set.add(id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify([...set]));
}

export function isUnlocked(song: ISongMeta): boolean {
  if (song.unlockCondition === null) return true;
  return getCompleted().has(song.unlockCondition);
}

export function getSong(id: SongId): ISongMeta {
  return SONGS.find(s => s.id === id)!;
}

// ── High Score persistence ────────────────────────────────────────────────────
export interface IHighScore {
  score:      number;
  difficulty: 'easy' | 'medium' | 'expert';
  stars:      number;
}

export function saveHighScore(songId: SongId, hs: IHighScore): void {
  const key     = `hs_${songId}`;
  const current = getHighScore(songId);
  if (!current || hs.score > current.score) {
    localStorage.setItem(key, JSON.stringify(hs));
  }
}

export function getHighScore(songId: SongId): IHighScore | null {
  try {
    const raw = localStorage.getItem(`hs_${songId}`);
    return raw ? (JSON.parse(raw) as IHighScore) : null;
  } catch { return null; }
}
