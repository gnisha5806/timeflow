<div align="center">

# ⏱️ TimeFlow

### High-Precision Stopwatch & Modern Time Management Suite

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Vanilla JS](https://img.shields.io/badge/Vanilla-JavaScript-F7DF1E?logo=javascript&logoColor=black)](https://developer.mozilla.org/en-US/docs/Web/JavaScript)
[![HTML5](https://img.shields.io/badge/HTML5-E34F26?logo=html5&logoColor=white)](https://developer.mozilla.org/en-US/docs/Web/Guide/HTML/HTML5)
[![CSS3](https://img.shields.io/badge/CSS3-1572B6?logo=css3&logoColor=white)](https://developer.mozilla.org/en-US/docs/Web/CSS)
[![Zero Dependencies](https://img.shields.io/badge/dependencies-0-success.svg)](package.json)
[![Status](https://img.shields.io/badge/status-active-brightgreen.svg)]()

A sleek, responsive, and zero-dependency web application engineered for deep focus, interval timing, athletic tracking, and personal productivity.

[Features](#-key-features) • [Quick Start](#-quick-start) • [Keyboard Shortcuts](#-keyboard-shortcuts) • [Architecture](#-architecture) • [License](#-license)

</div>

---

## 🌟 Key Features

### 1. ⏱️ Precision Stopwatch & Lap Tracking
* **Sub-millisecond Precision:** Built on the high-resolution `performance.now()` API to eliminate tab throttling and timer drift.
* **Lap & Split Times:** Records individual lap durations along with cumulative split times.
* **Intelligent Lap Analysis:**
  * 🟢 **Fastest Lap:** Highlighted in emerald green.
  * 🔴 **Slowest Lap:** Highlighted in rose red.
  * 📊 **Average Lap Calculation:** Real-time summary metrics.
* **Export Options:** One-click **Copy to Clipboard** and **Export to CSV** file.
* **Visual Sweeper:** 60-second circular SVG track synchronized with running seconds.

### 2. 🍅 Pomodoro Focus Timer
* **Productivity Intervals:** Pre-loaded with standard 25-minute Focus sessions, 5-minute Short Breaks, and 15-minute Long Breaks.
* **Cycle Tracking:** 4-stage visual session dots indicating your daily progress.
* **Customizable Durations:** Adjust session and break durations from the settings drawer.
* **Synthesized Audio Chimes:** Built-in multi-tone chime using Web Audio API (100% offline, zero audio file dependencies).

### 3. ⏳ Countdown Timer
* **Custom Precision Input:** Flexible hours, minutes, and seconds input pickers.
* **Instant Presets:** Quick addition buttons (`+1m`, `+5m`, `+10m`, `+15m`, `+30m`, `+1h`).
* **Depleting Circular Gauge:** Animated SVG ring that depletes smoothly as time elapses.
* **Completion Alarm:** Sound alert and status indicator when the timer hits zero.

### 4. 📊 Task & Activity Time Tracker
* **Categorized Sessions:** Log tasks across categories (💼 Work, 📚 Study, 💻 Coding, 🏋️ Fitness, 🎨 Creative, 📖 Reading, ⚡ Other).
* **Live Task Banner:** Real-time pulse indicator showing the currently tracked task.
* **Daily History & Summary:** Review all logged activities with category tags, timestamps, and total daily focus hours.
* **Persistent Local Storage:** All tasks and laps persist across page reloads via `localStorage`.

### 5. 🎨 Multi-Theme Design & Glassmorphism
* **4 Curated Themes:**
  * 🌙 **Deep Dark** (Default modern dark slate with neon accents)
  * ⚡ **Cyberpunk** (High-contrast neon pink and cyan)
  * 🌲 **Forest Zen** (Calming deep emerald greens)
  * ☀️ **Crisp Light** (Clean porcelain aesthetic)
* **Zero Dependencies:** Pure HTML5, modern CSS variables, and ES6 JavaScript. No bundlers or build steps needed.

---

## 🚀 Quick Start

No installation or node modules required! You can run the app directly in any modern browser:

### Option A: Open directly in your browser
Simply double-click `index.html` or open it with your browser of choice (Chrome, Edge, Firefox, Safari).

### Option B: Launch via Terminal

**Windows (PowerShell):**
```powershell
Start-Process "index.html"
```

**macOS:**
```bash
open index.html
```

**Linux:**
```bash
xdg-open index.html
```

---

## ⌨️ Keyboard Shortcuts

| Shortcut | Description |
| :---: | :--- |
| <kbd>Space</kbd> | Start / Pause active timer or stopwatch |
| <kbd>L</kbd> | Record Stopwatch Lap |
| <kbd>R</kbd> | Reset current timer |
| <kbd>1</kbd> | Switch to Stopwatch |
| <kbd>2</kbd> | Switch to Pomodoro Timer |
| <kbd>3</kbd> | Switch to Countdown Timer |
| <kbd>4</kbd> | Switch to Task Tracker |
| <kbd>M</kbd> | Toggle Sound alerts On / Off |
| <kbd>Esc</kbd> | Close shortcuts guide |

---

## 📁 Architecture & File Structure

```
timeflow/
├── index.html        # Semantic layout, SVG progress rings & tab panels
├── style.css         # Modern glassmorphism CSS, responsive design tokens & themes
├── app.js            # Timing engines, Web Audio synthesizer, and state persistence
├── .gitignore        # Standard Git ignore rules
├── LICENSE           # MIT Open Source License
└── README.md         # Documentation & guide
```

---

## 👤 Author

* **GitHub:** [@gnisha5806](https://github.com/gnisha5806)

---

## 📄 License

This project is open-source and licensed under the [MIT License](LICENSE).
