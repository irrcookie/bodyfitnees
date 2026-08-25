export const MUSCLES = [
  { id: "chest", label: "胸" },
  { id: "shoulders", label: "肩" },
  { id: "biceps", label: "二頭" },
  { id: "triceps", label: "三頭" },
  { id: "forearms", label: "前臂" },
  { id: "back", label: "背" },
  { id: "core", label: "核心" },
  { id: "quads", label: "股四頭" },
  { id: "glutes", label: "臀" },
  { id: "hamstrings", label: "腿後" },
  { id: "calves", label: "小腿" },
];

const KEYWORDS = [
  ["chest", /胸|臥推|bench| pec|飛鳥|夾胸/i],
  ["shoulders", /肩|推舉|側平舉|前平舉|shoulder|military/i],
  ["triceps", /三頭|臂屈伸|down.?press|tricep|踢後/i],
  ["biceps", /二頭|彎舉|curl|bicep/i],
  ["forearms", /前臂|腕|forearm/i],
  ["back", /背|划船|引體|lat|row|下拉|硬拉|deadlift/i],
  ["core", /腹|核心|plank|crunch|抬腿|滾輪/i],
  ["quads", /蹲|腿伸|股四|squat|leg.?press|hack/i],
  ["glutes", /臀|hip.?thrust|橋式|kickback/i],
  ["hamstrings", /腿後|腿彎|romanian|rdl|hamstring/i],
  ["calves", /小腿|提踵|calf/i],
];

export function labelFor(id) {
  return MUSCLES.find((m) => m.id === id)?.label || id;
}

export function inferMuscles(name = "", given = []) {
  const set = new Set((given || []).filter(Boolean));
  const text = String(name);
  for (const [id, re] of KEYWORDS) {
    if (re.test(text)) set.add(id);
  }
  return [...set];
}

function parseReps(reps) {
  if (reps == null || reps === "") return 0;
  if (typeof reps === "number") return reps;
  const m = String(reps).match(/(\d+(?:\.\d+)?)/);
  return m ? Number(m[1]) : 0;
}

export function exerciseLoad(ex = {}) {
  const sets = Number(ex.sets) || 0;
  const reps = parseReps(ex.reps);
  const weight = Number(ex.weightKg) || 0;
  const time = Number(ex.durationMin) || 0;
  const work = reps || time || 0;
  const nSets = sets || (work || weight ? 1 : 0);
  const volume = weight * nSets * (work || 1);
  const e1rm = weight && reps ? weight * (1 + reps / 30) : weight || 0;
  return { volume: volume || 0, e1rm: e1rm || 0, sets: nSets, reps, weight, time };
}

export function muscleStats(records = []) {
  const byId = Object.fromEntries(
    MUSCLES.map((m) => [
      m.id,
      { id: m.id, label: m.label, volume: 0, e1rm: 0, sessions: 0, series: [] },
    ]),
  );
  const byDate = {};
  for (const rec of records || []) {
    const date = rec.date || String(rec.trainedAt || "").slice(0, 10);
    const sessionHits = new Set();
    for (const ex of rec.exercises || []) {
      const groups = inferMuscles(ex.name, ex.muscleGroups?.length ? ex.muscleGroups : rec.muscleGroups);
      if (!groups.length) continue;
      const load = exerciseLoad(ex);
      for (const id of groups) {
        if (!byId[id]) continue;
        byId[id].volume += load.volume;
        byId[id].e1rm = Math.max(byId[id].e1rm, load.e1rm);
        sessionHits.add(id);
        if (!byDate[date]) byDate[date] = {};
        if (!byDate[date][id]) byDate[date][id] = { volume: 0, e1rm: 0 };
        byDate[date][id].volume += load.volume;
        byDate[date][id].e1rm = Math.max(byDate[date][id].e1rm, load.e1rm);
      }
    }
    for (const id of sessionHits) byId[id].sessions += 1;
  }
  const dates = Object.keys(byDate).sort();
  for (const id of Object.keys(byId)) {
    byId[id].series = dates
      .filter((d) => byDate[d][id])
      .map((d) => ({ date: d, volume: byDate[d][id].volume, e1rm: byDate[d][id].e1rm }));
  }
  const maxVol = Math.max(0, ...MUSCLES.map((m) => byId[m.id].volume));
  for (const row of Object.values(byId)) {
    row.heat = maxVol ? row.volume / maxVol : 0;
  }
  return { byId, maxVol };
}

export function heatColor(t) {
  const x = Math.max(0, Math.min(1, t || 0));
  const r = Math.round(30 + (61 - 30) * x);
  const g = Math.round(36 + (158 - 36) * x);
  const b = Math.round(48 + (255 - 48) * x);
  const a = 0.22 + x * 0.72;
  return `rgba(${r},${g},${b},${a.toFixed(2)})`;
}
