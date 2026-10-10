"use strict";

/* CGPA Calc — fully offline CGPA calculator & grade planner. */

const STORAGE_KEY = "cgpacalc.v1";

const DEFAULT_SCALE = {
  "A": 4.0, "A-": 3.7, "B+": 3.3, "B": 3.0, "B-": 2.7,
  "C+": 2.3, "C": 2.0, "C-": 1.7, "D+": 1.3, "D": 1.0, "F": 0.0
};

let state = loadState();

function defaultState() {
  return { courses: [], scale: { ...DEFAULT_SCALE } };
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultState();
    const parsed = JSON.parse(raw);
    if (!parsed || !Array.isArray(parsed.courses)) return defaultState();
    const scale = (parsed.scale && typeof parsed.scale === "object") ? parsed.scale : { ...DEFAULT_SCALE };
    const courses = parsed.courses.filter(validateCourseObject);
    return { courses, scale: sanitizeScale(scale) };
  } catch (e) {
    return defaultState();
  }
}

function validateCourseObject(c) {
  return c && typeof c.name === "string" && c.name.trim().length > 0 &&
    typeof c.credits === "number" && isFinite(c.credits) && c.credits > 0 &&
    typeof c.grade === "string" && typeof c.semester === "string";
}

function sanitizeScale(s) {
  const out = {};
  for (const [g, p] of Object.entries(s)) {
    const v = Number(p);
    if (typeof g === "string" && g.length <= 3 && isFinite(v) && v >= 0 && v <= 4.3) {
      out[g] = Math.round(v * 100) / 100;
    }
  }
  return Object.keys(out).length ? out : { ...DEFAULT_SCALE };
}

function saveState() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e) { /* storage full or unavailable — app still works in memory */ }
}

/* ---------- math ---------- */

function gradePoint(grade) {
  const v = state.scale[grade];
  return typeof v === "number" ? v : null;
}

function computeStats(courses) {
  let credits = 0, points = 0;
  for (const c of courses) {
    const gp = gradePoint(c.grade);
    if (gp === null) continue;
    credits += c.credits;
    points += c.credits * gp;
  }
  return { credits, points, cgpa: credits > 0 ? points / credits : null };
}

function semestersOf(courses) {
  const map = new Map();
  for (const c of courses) {
    const key = c.semester.trim() || "Unsorted";
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(c);
  }
  return map;
}

function fmt(n) {
  return (Math.round(n * 100) / 100).toFixed(2);
}

function uid() {
  return "c" + Date.now().toString(36) + Math.floor(Math.random() * 1e6).toString(36);
}

/* ---------- rendering ---------- */

const $ = (id) => document.getElementById(id);

function gradeOptions(selected) {
  return Object.keys(state.scale)
    .map(g => `<option value="${g}"${g === selected ? " selected" : ""}>${g} (${fmt(state.scale[g])})</option>`)
    .join("");
}

function render() {
  renderGradeSelects();
  renderStats();
  renderCourses();
  renderSemesterDatalist();
  renderScaleEditor();
  renderPlanner();
  saveState();
}

function renderGradeSelects() {
  $("courseGrade").innerHTML = gradeOptions("A");
  $("whatifGrade").innerHTML = gradeOptions("A");
}

function renderStats() {
  const s = computeStats(state.courses);
  const sems = semestersOf(state.courses);
  if (s.cgpa === null) {
    $("cgpaValue").textContent = "—";
    $("cgpaSub").textContent = "No courses yet";
  } else {
    $("cgpaValue").textContent = fmt(s.cgpa);
    const best = Object.keys(state.scale).reduce((a, b) => state.scale[a] >= state.scale[b] ? a : b);
    $("cgpaSub").textContent = `out of ${fmt(state.scale[best])} max`;
  }
  $("creditsValue").textContent = trimNum(s.credits);
  $("pointsSub").textContent = `${fmt(s.points)} grade points`;
  $("coursesValue").textContent = state.courses.length;
  $("semestersValue").textContent = sems.size;
}

function trimNum(n) {
  return String(Math.round(n * 100) / 100);
}

function renderCourses() {
  const groups = semestersOf(state.courses);
  const box = $("courseGroups");
  box.innerHTML = "";
  $("coursesEmpty").hidden = state.courses.length > 0;

  for (const [sem, list] of groups) {
    const s = computeStats(list);
    const div = document.createElement("div");
    div.className = "semester-group";
    const gpaText = s.cgpa === null ? "—" : `GPA ${fmt(s.cgpa)}`;
    div.innerHTML = `<div class="semester-title"><strong></strong><span>${gpaText} · ${trimNum(s.credits)} cr</span></div>`;
    div.querySelector("strong").textContent = sem;
    for (const c of list) {
      const row = document.createElement("div");
      row.className = "course-row";
      row.dataset.id = c.id;
      const name = document.createElement("span");
      name.className = "course-name";
      name.textContent = c.name;
      name.title = c.name;
      const cr = document.createElement("span");
      cr.className = "course-credits";
      cr.textContent = `${trimNum(c.credits)} cr`;
      const sel = document.createElement("select");
      sel.className = "course-grade";
      sel.setAttribute("aria-label", `Grade for ${c.name}`);
      sel.innerHTML = gradeOptions(c.grade);
      sel.addEventListener("change", () => {
        c.grade = sel.value;
        render();
      });
      const actions = document.createElement("div");
      actions.className = "course-actions";
      const wi = document.createElement("button");
      wi.type = "button";
      wi.className = "icon-btn";
      wi.textContent = "What-if";
      wi.addEventListener("click", () => openWhatIf(c.id));
      const del = document.createElement("button");
      del.type = "button";
      del.className = "icon-btn danger";
      del.textContent = "Delete";
      del.addEventListener("click", () => {
        if (confirm(`Delete "${c.name}"?`)) {
          state.courses = state.courses.filter(x => x.id !== c.id);
          render();
        }
      });
      actions.append(wi, del);
      row.append(name, cr, sel, actions);
      div.appendChild(row);
    }
    box.appendChild(div);
  }
}

function renderSemesterDatalist() {
  const dl = $("semesterList");
  dl.innerHTML = "";
  for (const sem of semestersOf(state.courses).keys()) {
    const o = document.createElement("option");
    o.value = sem;
    dl.appendChild(o);
  }
}

function renderScaleEditor() {
  const box = $("scaleEditor");
  box.innerHTML = "";
  for (const g of Object.keys(state.scale)) {
    const wrap = document.createElement("label");
    wrap.className = "scale-item";
    const tag = document.createElement("span");
    tag.className = "g";
    tag.textContent = g;
    const inp = document.createElement("input");
    inp.type = "number";
    inp.min = "0";
    inp.max = "4.3";
    inp.step = "0.1";
    inp.value = state.scale[g];
    inp.setAttribute("aria-label", `Points for grade ${g}`);
    inp.addEventListener("change", () => {
      const v = Number(inp.value);
      if (!isFinite(v) || v < 0 || v > 4.3) {
        inp.value = state.scale[g];
        return;
      }
      state.scale[g] = Math.round(v * 100) / 100;
      render();
    });
    wrap.append(tag, inp);
    box.appendChild(wrap);
  }
}

/* ---------- add course ---------- */

function showError(el, msg) {
  el.textContent = msg;
  el.hidden = !msg;
}

$("courseForm").addEventListener("submit", (e) => {
  e.preventDefault();
  const name = $("courseName").value.trim();
  const credits = Number($("courseCredits").value);
  const grade = $("courseGrade").value;
  const semester = $("courseSemester").value.trim();

  if (!name) return showError($("formError"), "Please enter a course name.");
  if (!isFinite(credits) || credits <= 0) return showError($("formError"), "Credits must be a number greater than 0.");
  if (credits > 12) return showError($("formError"), "Credits look too high — maximum is 12 per course.");
  if (!(grade in state.scale)) return showError($("formError"), "Please choose a valid grade.");
  showError($("formError"), "");

  state.courses.push({ id: uid(), name, credits: Math.round(credits * 100) / 100, grade, semester });
  $("courseName").value = "";
  $("courseCredits").value = "";
  $("courseSemester").value = "";
  $("courseName").focus();
  render();
});

$("clearAllBtn").addEventListener("click", () => {
  if (!state.courses.length) return;
  if (confirm("Delete ALL courses? This cannot be undone.")) {
    state.courses = [];
    render();
  }
});

/* ---------- target planner ---------- */

function renderPlanner() {
  const target = Number($("targetCgpa").value);
  const remaining = Number($("remainingCredits").value);
  const box = $("plannerResult");

  if (!$("targetCgpa").value && !$("remainingCredits").value) {
    box.hidden = true;
    showError($("plannerError"), "");
    return;
  }
  const s = computeStats(state.courses);
  if (!isFinite(target) || target < 0 || target > 4.3) {
    box.hidden = true;
    return showError($("plannerError"), "Target CGPA must be between 0 and 4.3.");
  }
  if (!isFinite(remaining) || remaining <= 0) {
    box.hidden = true;
    return showError($("plannerError"), "Remaining credits must be greater than 0.");
  }
  if (s.cgpa === null) {
    box.hidden = true;
    return showError($("plannerError"), "Add your completed courses first — the planner needs your current record.");
  }
  showError($("plannerError"), "");

  const required = (target * (s.credits + remaining) - s.points) / remaining;
  const maxScale = Math.max(...Object.values(state.scale));
  $("requiredGp").textContent = required <= 0 ? "0.00" : fmt(required);
  let note;
  if (required <= 0) {
    note = "You have already secured your target — even straight Fs from here keep you at or above it.";
  } else if (required > maxScale) {
    note = `Not possible: you'd need ${fmt(required)} per credit, but the highest grade on your scale is ${fmt(maxScale)}. Lower the target or retake a course.`;
  } else {
    const closest = Object.keys(state.scale)
      .filter(g => state.scale[g] >= required)
      .sort((a, b) => state.scale[a] - state.scale[b])[0];
    note = closest
      ? `Aim for an average of ${closest} (${fmt(state.scale[closest])}) or better in your remaining ${trimNum(remaining)} credits.`
      : `You need ${fmt(required)} per credit on average across your remaining ${trimNum(remaining)} credits.`;
  }
  $("plannerNote").textContent = note;
  box.hidden = false;
}

$("targetCgpa").addEventListener("input", renderPlanner);
$("remainingCredits").addEventListener("input", renderPlanner);

/* ---------- what-if ---------- */

let whatifId = null;

function openWhatIf(id) {
  const c = state.courses.find(x => x.id === id);
  if (!c) return;
  whatifId = id;
  $("whatifCourse").textContent = `${c.name} — currently ${c.grade} (${fmt(gradePoint(c.grade))})`;
  $("whatifGrade").value = c.grade;
  updateWhatIf();
  $("whatifBackdrop").hidden = false;
}

function updateWhatIf() {
  const c = state.courses.find(x => x.id === whatifId);
  if (!c) return closeWhatIf();
  const current = computeStats(state.courses).cgpa;
  const alt = state.courses.map(x => x.id === whatifId ? { ...x, grade: $("whatifGrade").value } : x);
  const projected = computeStats(alt).cgpa;
  $("whatifCurrent").textContent = fmt(current);
  $("whatifProjected").textContent = fmt(projected);
  const delta = projected - current;
  const dEl = $("whatifDelta");
  dEl.textContent = (delta >= 0 ? "+" : "") + fmt(delta);
  dEl.className = "value " + (delta > 0.0005 ? "up" : delta < -0.0005 ? "down" : "");
}

function closeWhatIf() {
  whatifId = null;
  $("whatifBackdrop").hidden = true;
}

$("whatifGrade").addEventListener("change", updateWhatIf);
$("whatifCancel").addEventListener("click", closeWhatIf);
$("whatifBackdrop").addEventListener("click", (e) => {
  if (e.target === $("whatifBackdrop")) closeWhatIf();
});
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && !$("whatifBackdrop").hidden) closeWhatIf();
});
$("whatifApply").addEventListener("click", () => {
  const c = state.courses.find(x => x.id === whatifId);
  if (c) c.grade = $("whatifGrade").value;
  closeWhatIf();
  render();
});

/* ---------- grade scale ---------- */

$("resetScaleBtn").addEventListener("click", () => {
  if (confirm("Reset the grade scale to the default 4.0 scale?")) {
    state.scale = { ...DEFAULT_SCALE };
    render();
  }
});

/* ---------- export / import ---------- */

$("exportBtn").addEventListener("click", () => {
  const blob = new Blob([JSON.stringify({ app: "cgpa-calc", version: 1, courses: state.courses, scale: state.scale }, null, 2)], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "cgpa-calc-backup.json";
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 5000);
  showOk("Exported backup file downloaded.");
});

$("importBtn").addEventListener("click", () => $("importFile").click());

$("importFile").addEventListener("change", () => {
  const file = $("importFile").files[0];
  showError($("dataError"), "");
  $("dataOk").hidden = true;
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const data = JSON.parse(reader.result);
      if (!data || !Array.isArray(data.courses)) throw new Error("bad shape");
      const courses = data.courses.filter(validateCourseObject).map(c => ({
        id: typeof c.id === "string" ? c.id : uid(),
        name: c.name.trim().slice(0, 60),
        credits: Math.round(c.credits * 100) / 100,
        grade: String(c.grade),
        semester: String(c.semester || "").slice(0, 30)
      }));
      const unknownGrades = courses.filter(c => !(c.grade in (data.scale || state.scale)));
      if (unknownGrades.length) throw new Error("unknown grades");
      if (data.scale && typeof data.scale === "object") {
        state.scale = sanitizeScale(data.scale);
      }
      state.courses = courses;
      render();
      showOk(`Imported ${courses.length} course${courses.length === 1 ? "" : "s"}.`);
    } catch (e) {
      showError($("dataError"), "That file is not a valid CGPA Calc backup.");
    }
    $("importFile").value = "";
  };
  reader.readAsText(file);
});

function showOk(msg) {
  $("dataOk").textContent = msg;
  $("dataOk").hidden = false;
}

/* ---------- init ---------- */

render();
