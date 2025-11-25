const size = 17
const words = [
  { num: 1, text: "NORMAS", row: 1, col: 2, dir: "H", clue: "Reglas que orientan la conducta en actividades y juegos." },
  { num: 2, text: "JUEGO", row: 2, col: 7, dir: "H", clue: "Actividad con reglas para diversión o aprendizaje." },
  { num: 3, text: "CONVIVENCIA", row: 9, col: 4, dir: "H", clue: "Vida en común basada en respeto y colaboración." },
  { num: 4, text: "COMPETENCIA", row: 1, col: 12, dir: "V", clue: "Rivalidad por lograr objetivos; también habilidad demostrada." },
  { num: 5, text: "GAMIFICACIÓN", row: 6, col: 13, dir: "V", clue: "Uso de elementos de juego en contextos no lúdicos." },
  { num: 6, text: "RESPIRACIÓN", row: 5, col: 8, dir: "V", clue: "Proceso fisiológico de intercambio de gases." },
  { num: 7, text: "RECREACIÓN", row: 8, col: 10, dir: "V", clue: "Actividades de ocio que favorecen bienestar y descanso." },
  { num: 8, text: "EMOCIONES", row: 7, col: 5, dir: "V", clue: "Estados afectivos como alegría, miedo y sorpresa." },
  { num: 9, text: "SUDORACIÓN", row: 4, col: 14, dir: "V", clue: "Respuesta corporal que ayuda a regular la temperatura." },
  { num: 10, text: "AGITACIÓN", row: 4, col: 4, dir: "V", clue: "Estado de nerviosismo o movimiento acelerado; en ejercicio, ritmo alto." }
]
const gridEl = document.getElementById("grid")
const cluesEl = document.getElementById("clues")
const statusEl = document.getElementById("status")
const metaEl = document.getElementById("meta")
const timerEl = document.getElementById("timer")
const btnStartTimer = document.getElementById("start-timer")
const btnStopTimer = document.getElementById("stop-timer")
const btnCheck = document.getElementById("check")
const btnRevealLetter = document.getElementById("reveal-letter")
const btnRevealWord = document.getElementById("reveal-word")
const btnClear = document.getElementById("clear")
const btnReset = document.getElementById("reset")
const expected = Array.from({ length: size }, () => Array(size).fill(null))
const starts = {}
const inputs = Array.from({ length: size }, () => Array(size).fill(null))
const wordCells = new Map()
let activeCell = null
let activeWordNum = null
let timerRunning = false
let startStamp = 0
let elapsedMs = 0
let tick = null
function placeWords() {
  for (const w of words) {
    const cells = []
    let r = w.row - 1
    let c = w.col - 1
    if (!starts[`${r},${c}`]) starts[`${r},${c}`] = w.num
    for (let i = 0; i < w.text.length; i++) {
      const ch = w.text[i]
      const prev = expected[r][c]
      expected[r][c] = prev && prev !== ch ? ch : ch
      cells.push([r, c])
      if (w.dir === "H") c++
      else r++
    }
    wordCells.set(w.num, cells)
  }
}
function buildGrid() {
  gridEl.innerHTML = ""
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      const cell = document.createElement("div")
      cell.className = "cell"
      const n = starts[`${r},${c}`]
      if (n) {
        const num = document.createElement("div")
        num.className = "number"
        num.textContent = n
        cell.appendChild(num)
      }
      const need = expected[r][c]
      if (!need) {
        cell.classList.add("block")
      } else {
        const inp = document.createElement("input")
        inp.maxLength = 1
        inp.dataset.row = r
        inp.dataset.col = c
        inp.addEventListener("focus", () => {
          activeCell = [r, c]
          const foundNum = findWordStartForCell(r, c)
          setActiveWord(foundNum)
        })
        inp.addEventListener("input", e => {
          const v = normalizeChar(e.target.value)
          e.target.value = v
          e.target.classList.remove("correct", "incorrect")
          if (!timerRunning) startTimer()
          if (v && v.length === 1) moveNext(r, c)
        })
        inp.addEventListener("keydown", e => {
          if (e.key === "ArrowRight") { e.preventDefault(); nav(r, c, 0, 1) }
          else if (e.key === "ArrowLeft") { e.preventDefault(); nav(r, c, 0, -1) }
          else if (e.key === "ArrowDown") { e.preventDefault(); nav(r, c, 1, 0) }
          else if (e.key === "ArrowUp") { e.preventDefault(); nav(r, c, -1, 0) }
          else if (e.key === "Backspace") {
            const val = e.target.value
            if (val) return
            e.preventDefault()
            nav(r, c, 0, -1)
          }
        })
        cell.appendChild(inp)
        inputs[r][c] = inp
      }
      gridEl.appendChild(cell)
    }
  }
}
function buildClues() {
  cluesEl.innerHTML = ""
  for (const w of words) {
    const li = document.createElement("li")
    li.className = "clue"
    li.dataset.num = String(w.num)
    li.textContent = `${w.num}. ${w.clue}`
    li.addEventListener("click", () => setActiveWord(w.num))
    cluesEl.appendChild(li)
  }
}
function setActiveWord(num) {
  activeWordNum = num
  for (const el of cluesEl.querySelectorAll(".clue")) {
    el.classList.toggle("active", Number(el.dataset.num) === num)
  }
  for (const cell of gridEl.querySelectorAll(".cell")) {
    cell.classList.remove("highlight")
  }
  const cells = wordCells.get(num)
  if (!cells) return
  for (const [r, c] of cells) {
    const inp = inputs[r][c]
    if (inp) inp.parentElement.classList.add("highlight")
  }
  const w = words.find(x => x.num === num)
  if (w) metaEl.textContent = `Pista ${w.num}: ${w.text} (${w.text.length} letras)`
}
function normalizeChar(ch) {
  if (!ch) return ""
  return ch.toUpperCase()
}
function stripDiacritics(s) {
  if (!s) return ""
  return s.normalize("NFD").replace(/[\u0300-\u036f]/g, "")
}
function formatTime(ms) {
  const total = Math.floor(ms / 1000)
  const m = String(Math.floor(total / 60)).padStart(2, "0")
  const s = String(total % 60).padStart(2, "0")
  return `${m}:${s}`
}
function renderTime() {
  if (timerEl) timerEl.textContent = formatTime(elapsedMs)
}
function startTimer() {
  if (timerRunning) return
  timerRunning = true
  startStamp = Date.now() - elapsedMs
  tick = setInterval(() => {
    elapsedMs = Date.now() - startStamp
    renderTime()
  }, 250)
}
function stopTimer() {
  if (!timerRunning) return
  timerRunning = false
  clearInterval(tick)
  tick = null
  elapsedMs = Date.now() - startStamp
  renderTime()
}
function resetTimer() {
  if (timerRunning) stopTimer()
  elapsedMs = 0
  renderTime()
}
function moveNext(r, c) {
  const num = activeWordNum
  const cells = wordCells.get(num)
  if (!cells) return
  let idx = cells.findIndex(([rr, cc]) => rr === r && cc === c)
  if (idx < 0) return
  idx = Math.min(idx + 1, cells.length - 1)
  const [nr, nc] = cells[idx]
  const inp = inputs[nr][nc]
  if (inp) inp.focus()
}
function nav(r, c, dr, dc) {
  let nr = r + dr
  let nc = c + dc
  while (nr >= 0 && nr < size && nc >= 0 && nc < size) {
    const inp = inputs[nr][nc]
    if (inp) { inp.focus(); return }
    nr += dr
    nc += dc
  }
}
function findWordStartForCell(r, c) {
  for (const w of words) {
    const cells = wordCells.get(w.num)
    if (cells && cells.some(([rr, cc]) => rr === r && cc === c)) return w.num
  }
  return null
}
function checkAll() {
  let total = 0
  let correct = 0
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      const need = expected[r][c]
      const inp = inputs[r][c]
      if (!need || !inp) continue
      total++
      const val = normalizeChar(inp.value)
      if (!val) {
        inp.classList.remove("correct", "incorrect")
        continue
      }
      if (stripDiacritics(val) === stripDiacritics(need)) {
        inp.classList.add("correct")
        inp.classList.remove("incorrect")
        correct++
      } else {
        inp.classList.add("incorrect")
        inp.classList.remove("correct")
      }
    }
  }
  statusEl.textContent = `Correctas: ${correct}/${total}`
  if (total > 0 && correct === total) {
    stopTimer()
    statusEl.textContent = `Completado en ${formatTime(elapsedMs)} — Correctas: ${correct}/${total}`
  }
}
function revealLetter() {
  if (!activeCell) return
  const [r, c] = activeCell
  const need = expected[r][c]
  const inp = inputs[r][c]
  if (!inp || !need) return
  inp.value = need
}
function revealWord() {
  const num = activeWordNum
  const cells = wordCells.get(num)
  if (!cells) return
  for (const [r, c] of cells) {
    const need = expected[r][c]
    const inp = inputs[r][c]
    if (inp) inp.value = need
  }
}
function clearAll() {
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      const inp = inputs[r][c]
      if (inp) {
        inp.value = ""
        inp.classList.remove("correct", "incorrect")
      }
    }
  }
  statusEl.textContent = ""
}
function resetPuzzle() {
  clearAll()
  setActiveWord(null)
  resetTimer()
}
btnCheck.addEventListener("click", checkAll)
btnRevealLetter.addEventListener("click", revealLetter)
btnRevealWord.addEventListener("click", revealWord)
btnClear.addEventListener("click", clearAll)
btnReset.addEventListener("click", resetPuzzle)
if (btnStartTimer) btnStartTimer.addEventListener("click", startTimer)
if (btnStopTimer) btnStopTimer.addEventListener("click", stopTimer)
placeWords()
buildGrid()
buildClues()
setActiveWord(1)
renderTime()
