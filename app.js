/**
 * TimeFlow - High Precision Stopwatch & Time Management Suite
 */

// ==========================================
// 1. SOUND SYNTHESIZER (Web Audio API)
// ==========================================
class SoundAlerts {
  constructor() {
    this.audioCtx = null;
    this.soundEnabled = localStorage.getItem('timeflow_sound') !== 'false';
  }

  initContext() {
    if (!this.audioCtx) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (AudioContextClass) {
        this.audioCtx = new AudioContextClass();
      }
    }
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
  }

  playChime() {
    if (!this.soundEnabled) return;
    try {
      this.initContext();
      if (!this.audioCtx) return;

      const now = this.audioCtx.currentTime;
      // 3-note harmonic chime (C5, E5, G5)
      const freqs = [523.25, 659.25, 783.99, 1046.5];
      freqs.forEach((freq, i) => {
        const osc = this.audioCtx.createOscillator();
        const gain = this.audioCtx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + i * 0.12);

        gain.gain.setValueAtTime(0, now + i * 0.12);
        gain.gain.linearRampToValueAtTime(0.18, now + i * 0.12 + 0.03);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + i * 0.12 + 0.8);

        osc.connect(gain);
        gain.connect(this.audioCtx.destination);

        osc.start(now + i * 0.12);
        osc.stop(now + i * 0.12 + 0.85);
      });
    } catch (e) {
      console.warn('Audio playback error:', e);
    }
  }

  playBeep() {
    if (!this.soundEnabled) return;
    try {
      this.initContext();
      if (!this.audioCtx) return;

      const now = this.audioCtx.currentTime;
      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(880, now);

      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

      osc.connect(gain);
      gain.connect(this.audioCtx.destination);

      osc.start(now);
      osc.stop(now + 0.16);
    } catch (e) {
      // ignore
    }
  }

  toggle() {
    this.soundEnabled = !this.soundEnabled;
    localStorage.setItem('timeflow_sound', this.soundEnabled);
    return this.soundEnabled;
  }
}

const sounds = new SoundAlerts();

// ==========================================
// 2. HELPER UTILITIES
// ==========================================
function formatTime(ms, includeMillis = true) {
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const millis = Math.floor(ms % 1000);

  const pad = (n, len = 2) => String(n).padStart(len, '0');

  if (includeMillis) {
    return {
      hours: pad(hours),
      minutes: pad(minutes),
      seconds: pad(seconds),
      millis: pad(millis, 3),
      formatted: `${pad(hours)}:${pad(minutes)}:${pad(seconds)}.${pad(millis, 3)}`
    };
  } else {
    return {
      hours: pad(hours),
      minutes: pad(minutes),
      seconds: pad(seconds),
      formatted: hours > 0 
        ? `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`
        : `${pad(minutes)}:${pad(seconds)}`
    };
  }
}

function showToast(message) {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.classList.remove('hidden');
  setTimeout(() => {
    toast.classList.add('hidden');
  }, 2400);
}

// ==========================================
// 3. STOPWATCH ENGINE
// ==========================================
class StopwatchEngine {
  constructor() {
    this.startTime = 0;
    this.elapsedTime = 0;
    this.timerId = null;
    this.isRunning = false;
    this.laps = [];
    this.lastLapElapsed = 0;

    // Elements
    this.hoursEl = document.getElementById('sw-hours');
    this.minutesEl = document.getElementById('sw-minutes');
    this.secondsEl = document.getElementById('sw-seconds');
    this.millisEl = document.getElementById('sw-millis');
    this.lapPreviewEl = document.getElementById('sw-current-lap-preview');
    this.badgeEl = document.getElementById('sw-status-badge');
    this.ringEl = document.getElementById('sw-ring-progress');

    this.btnStart = document.getElementById('sw-btn-start');
    this.btnLap = document.getElementById('sw-btn-lap');
    this.btnReset = document.getElementById('sw-btn-reset');
    this.startLabel = document.getElementById('sw-start-label');
    this.playIcon = document.getElementById('sw-play-icon');
    this.pauseIcon = document.getElementById('sw-pause-icon');

    this.lapTableBody = document.getElementById('lap-table-body');
    this.lapCountBadge = document.getElementById('lap-count-badge');
    this.statFastest = document.getElementById('stat-fastest-lap');
    this.statSlowest = document.getElementById('stat-slowest-lap');
    this.statAvg = document.getElementById('stat-avg-lap');

    this.circumference = 2 * Math.PI * 130; // 816.81
    this.ringEl.style.strokeDasharray = `${this.circumference}`;
    this.ringEl.style.strokeDashoffset = '0';

    this.initEvents();
  }

  initEvents() {
    this.btnStart.addEventListener('click', () => this.toggle());
    this.btnLap.addEventListener('click', () => this.recordLap());
    this.btnReset.addEventListener('click', () => this.reset());

    document.getElementById('btn-copy-laps').addEventListener('click', () => this.copyLaps());
    document.getElementById('btn-export-laps').addEventListener('click', () => this.exportCSV());
    document.getElementById('btn-clear-laps').addEventListener('click', () => this.clearLaps());
  }

  toggle() {
    sounds.initContext();
    if (this.isRunning) {
      this.pause();
    } else {
      this.start();
    }
  }

  start() {
    if (this.isRunning) return;
    this.isRunning = true;
    this.startTime = performance.now() - this.elapsedTime;
    this.btnLap.disabled = false;

    this.badgeEl.textContent = 'RUNNING';
    this.badgeEl.className = 'timer-status-badge running';
    this.startLabel.textContent = 'Pause';
    this.playIcon.classList.add('hidden');
    this.pauseIcon.classList.remove('hidden');

    const updateFrame = () => {
      if (!this.isRunning) return;
      this.elapsedTime = performance.now() - this.startTime;
      this.render();
      this.timerId = requestAnimationFrame(updateFrame);
    };
    this.timerId = requestAnimationFrame(updateFrame);
  }

  pause() {
    if (!this.isRunning) return;
    this.isRunning = false;
    cancelAnimationFrame(this.timerId);

    this.badgeEl.textContent = 'PAUSED';
    this.badgeEl.className = 'timer-status-badge paused';
    this.startLabel.textContent = 'Resume';
    this.playIcon.classList.remove('hidden');
    this.pauseIcon.classList.add('hidden');
  }

  reset() {
    this.pause();
    this.elapsedTime = 0;
    this.lastLapElapsed = 0;
    this.btnLap.disabled = true;

    this.badgeEl.textContent = 'READY';
    this.badgeEl.className = 'timer-status-badge';
    this.startLabel.textContent = 'Start';
    this.playIcon.classList.remove('hidden');
    this.pauseIcon.classList.add('hidden');

    this.ringEl.style.strokeDashoffset = '0';
    this.lapPreviewEl.textContent = `Lap ${this.laps.length + 1}: 00:00.000`;
    this.render();
  }

  recordLap() {
    if (!this.isRunning && this.elapsedTime === 0) return;
    sounds.playBeep();

    const currentTotal = this.elapsedTime;
    const lapDuration = currentTotal - this.lastLapElapsed;
    this.lastLapElapsed = currentTotal;

    const lapNumber = this.laps.length + 1;
    this.laps.unshift({
      number: lapNumber,
      lapTime: lapDuration,
      splitTime: currentTotal,
      timestamp: new Date().toLocaleTimeString()
    });

    this.renderLapTable();
    showToast(`Lap ${lapNumber} recorded!`);
  }

  clearLaps() {
    this.laps = [];
    this.lastLapElapsed = this.isRunning ? this.elapsedTime : 0;
    this.renderLapTable();
    showToast('Laps cleared');
  }

  render() {
    const formatted = formatTime(this.elapsedTime, true);
    this.hoursEl.textContent = formatted.hours;
    this.minutesEl.textContent = formatted.minutes;
    this.secondsEl.textContent = formatted.seconds;
    this.millisEl.textContent = formatted.millis;

    // Sub-second progress ring animation (sweeps smoothly every 60 seconds)
    const secondFraction = (this.elapsedTime % 60000) / 60000;
    const offset = this.circumference - (secondFraction * this.circumference);
    this.ringEl.style.strokeDashoffset = `${offset}`;

    // Current lap live timer preview
    const curLapTime = this.elapsedTime - this.lastLapElapsed;
    const curLapFormatted = formatTime(curLapTime, true);
    this.lapPreviewEl.textContent = `Lap ${this.laps.length + 1}: ${curLapFormatted.minutes}:${curLapFormatted.seconds}.${curLapFormatted.millis}`;
  }

  renderLapTable() {
    this.lapCountBadge.textContent = `${this.laps.length} Lap${this.laps.length === 1 ? '' : 's'}`;

    if (this.laps.length === 0) {
      this.lapTableBody.innerHTML = `
        <tr class="empty-row">
          <td colspan="4">No laps recorded yet. Press Start and then Lap!</td>
        </tr>
      `;
      this.statFastest.textContent = '--:--.---';
      this.statSlowest.textContent = '--:--.---';
      this.statAvg.textContent = '--:--.---';
      return;
    }

    let fastest = this.laps[0];
    let slowest = this.laps[0];
    let totalLapDuration = 0;

    for (const lap of this.laps) {
      if (lap.lapTime < fastest.lapTime) fastest = lap;
      if (lap.lapTime > slowest.lapTime) slowest = lap;
      totalLapDuration += lap.lapTime;
    }

    const avgDuration = totalLapDuration / this.laps.length;

    const fFmt = formatTime(fastest.lapTime, true);
    const sFmt = formatTime(slowest.lapTime, true);
    const aFmt = formatTime(avgDuration, true);

    this.statFastest.textContent = `${fFmt.minutes}:${fFmt.seconds}.${fFmt.millis}`;
    this.statSlowest.textContent = `${sFmt.minutes}:${sFmt.seconds}.${sFmt.millis}`;
    this.statAvg.textContent = `${aFmt.minutes}:${aFmt.seconds}.${aFmt.millis}`;

    // Generate table rows
    this.lapTableBody.innerHTML = this.laps.map(lap => {
      const lapFmt = formatTime(lap.lapTime, true);
      const splitFmt = formatTime(lap.splitTime, true);

      let badgeHtml = '';
      if (this.laps.length >= 2) {
        if (lap.number === fastest.number) {
          badgeHtml = '<span class="lap-badge fastest">Fastest</span>';
        } else if (lap.number === slowest.number) {
          badgeHtml = '<span class="lap-badge slowest">Slowest</span>';
        }
      }

      return `
        <tr>
          <td>#${String(lap.number).padStart(2, '0')}</td>
          <td><strong>${lapFmt.minutes}:${lapFmt.seconds}.${lapFmt.millis}</strong></td>
          <td>${splitFmt.hours}:${splitFmt.minutes}:${splitFmt.seconds}.${splitFmt.millis}</td>
          <td>${badgeHtml || '<span style="opacity:0.35">—</span>'}</td>
        </tr>
      `;
    }).join('');
  }

  copyLaps() {
    if (this.laps.length === 0) {
      showToast('No laps to copy!');
      return;
    }
    const lines = ['Lap,Lap Time,Split Time'];
    this.laps.slice().reverse().forEach(l => {
      const lf = formatTime(l.lapTime, true);
      const sf = formatTime(l.splitTime, true);
      lines.push(`${l.number},${lf.minutes}:${lf.seconds}.${lf.millis},${sf.hours}:${sf.minutes}:${sf.seconds}.${sf.millis}`);
    });
    navigator.clipboard.writeText(lines.join('\n'))
      .then(() => showToast('Laps copied to clipboard!'))
      .catch(() => showToast('Failed to copy.'));
  }

  exportCSV() {
    if (this.laps.length === 0) {
      showToast('No laps to export!');
      return;
    }
    const lines = ['Lap,Lap Time,Overall Split'];
    this.laps.slice().reverse().forEach(l => {
      const lf = formatTime(l.lapTime, true);
      const sf = formatTime(l.splitTime, true);
      lines.push(`${l.number},${lf.minutes}:${lf.seconds}.${lf.millis},${sf.hours}:${sf.minutes}:${sf.seconds}.${sf.millis}`);
    });

    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Stopwatch_Laps_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('CSV downloaded!');
  }
}

// ==========================================
// 4. POMODORO FOCUS TIMER
// ==========================================
class PomodoroEngine {
  constructor() {
    this.durations = {
      focus: 25 * 60,
      shortBreak: 5 * 60,
      longBreak: 15 * 60
    };

    this.currentMode = 'focus';
    this.totalSeconds = this.durations.focus;
    this.remainingSeconds = this.totalSeconds;
    this.cycleCount = 1; // 1 to 4
    this.isRunning = false;
    this.intervalId = null;

    // Elements
    this.displayEl = document.getElementById('pomo-display');
    this.badgeEl = document.getElementById('pomo-status-badge');
    this.ringEl = document.getElementById('pomo-ring-progress');
    this.startBtn = document.getElementById('pomo-btn-start');
    this.resetBtn = document.getElementById('pomo-btn-reset');
    this.skipBtn = document.getElementById('pomo-btn-skip');
    this.startLabel = document.getElementById('pomo-start-label');
    this.playIcon = document.getElementById('pomo-play-icon');
    this.pauseIcon = document.getElementById('pomo-pause-icon');
    this.cyclesContainer = document.getElementById('pomo-cycles');

    this.modeButtons = document.querySelectorAll('.pomo-mode-btn');

    this.circumference = 2 * Math.PI * 130;
    this.ringEl.style.strokeDasharray = `${this.circumference}`;

    this.initEvents();
    this.render();
  }

  initEvents() {
    this.startBtn.addEventListener('click', () => this.toggle());
    this.resetBtn.addEventListener('click', () => this.reset());
    this.skipBtn.addEventListener('click', () => this.skip());

    this.modeButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const mode = btn.dataset.mode;
        this.switchMode(mode);
      });
    });

    // Custom durations apply
    document.getElementById('pomo-btn-apply-settings').addEventListener('click', () => {
      const f = parseInt(document.getElementById('pomo-input-focus').value) || 25;
      const s = parseInt(document.getElementById('pomo-input-short').value) || 5;
      const l = parseInt(document.getElementById('pomo-input-long').value) || 15;

      this.durations.focus = f * 60;
      this.durations.shortBreak = s * 60;
      this.durations.longBreak = l * 60;

      this.totalSeconds = this.durations[this.currentMode];
      this.remainingSeconds = this.totalSeconds;
      this.render();
      showToast('Pomodoro durations updated!');
    });
  }

  switchMode(mode) {
    this.pause();
    this.currentMode = mode;
    this.totalSeconds = this.durations[mode];
    this.remainingSeconds = this.totalSeconds;

    this.modeButtons.forEach(b => b.classList.toggle('active', b.dataset.mode === mode));

    if (mode === 'focus') {
      this.badgeEl.textContent = 'READY TO FOCUS';
      this.startLabel.textContent = 'Start Focus';
    } else if (mode === 'shortBreak') {
      this.badgeEl.textContent = 'SHORT BREAK';
      this.startLabel.textContent = 'Start Break';
    } else {
      this.badgeEl.textContent = 'LONG BREAK';
      this.startLabel.textContent = 'Start Long Break';
    }

    this.render();
  }

  toggle() {
    sounds.initContext();
    if (this.isRunning) {
      this.pause();
    } else {
      this.start();
    }
  }

  start() {
    if (this.isRunning) return;
    this.isRunning = true;
    this.badgeEl.textContent = this.currentMode === 'focus' ? 'FOCUSING' : 'ON BREAK';
    this.badgeEl.className = 'timer-status-badge running';
    this.startLabel.textContent = 'Pause';
    this.playIcon.classList.add('hidden');
    this.pauseIcon.classList.remove('hidden');

    this.intervalId = setInterval(() => {
      if (this.remainingSeconds > 0) {
        this.remainingSeconds--;
        this.render();
      } else {
        this.handleComplete();
      }
    }, 1000);
  }

  pause() {
    if (!this.isRunning) return;
    this.isRunning = false;
    clearInterval(this.intervalId);
    this.badgeEl.textContent = 'PAUSED';
    this.badgeEl.className = 'timer-status-badge paused';
    this.startLabel.textContent = 'Resume';
    this.playIcon.classList.remove('hidden');
    this.pauseIcon.classList.add('hidden');
  }

  reset() {
    this.pause();
    this.remainingSeconds = this.totalSeconds;
    this.badgeEl.textContent = this.currentMode === 'focus' ? 'READY TO FOCUS' : 'REST';
    this.badgeEl.className = 'timer-status-badge';
    this.startLabel.textContent = this.currentMode === 'focus' ? 'Start Focus' : 'Start Break';
    this.render();
  }

  skip() {
    this.handleComplete(true);
  }

  handleComplete(skipped = false) {
    this.pause();
    if (!skipped) {
      sounds.playChime();
      showToast(this.currentMode === 'focus' ? '🎉 Focus session finished! Time for a break.' : '⏰ Break is over! Ready to focus?');
    }

    if (this.currentMode === 'focus') {
      if (this.cycleCount % 4 === 0) {
        this.cycleCount = 1;
        this.switchMode('longBreak');
      } else {
        this.cycleCount++;
        this.switchMode('shortBreak');
      }
    } else {
      this.switchMode('focus');
    }
    this.renderCycles();
  }

  render() {
    const mins = Math.floor(this.remainingSeconds / 60);
    const secs = this.remainingSeconds % 60;
    this.displayEl.textContent = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;

    const progressRatio = this.totalSeconds > 0 ? (this.remainingSeconds / this.totalSeconds) : 0;
    const offset = this.circumference * (1 - progressRatio);
    this.ringEl.style.strokeDashoffset = `${offset}`;
    this.renderCycles();
  }

  renderCycles() {
    const dots = this.cyclesContainer.querySelectorAll('.dot');
    dots.forEach((dot, idx) => {
      dot.classList.toggle('active', idx < this.cycleCount);
    });
    const label = this.cyclesContainer.querySelector('.cycle-text');
    if (label) {
      label.textContent = `Session ${this.cycleCount} of 4`;
    }
  }
}

// ==========================================
// 5. COUNTDOWN TIMER
// ==========================================
class CountdownTimerEngine {
  constructor() {
    this.totalSeconds = 600; // 10 minutes default
    this.remainingSeconds = 600;
    this.isRunning = false;
    this.intervalId = null;

    // Elements
    this.inputHours = document.getElementById('cd-input-hours');
    this.inputMinutes = document.getElementById('cd-input-minutes');
    this.inputSeconds = document.getElementById('cd-input-seconds');
    this.pickerEl = document.getElementById('cd-picker');
    this.displayEl = document.getElementById('cd-display');
    this.dispHours = document.getElementById('cd-disp-hours');
    this.dispMinutes = document.getElementById('cd-disp-minutes');
    this.dispSeconds = document.getElementById('cd-disp-seconds');
    this.badgeEl = document.getElementById('cd-status-badge');
    this.ringEl = document.getElementById('timer-ring-progress');

    this.startBtn = document.getElementById('cd-btn-start');
    this.resetBtn = document.getElementById('cd-btn-reset');
    this.startLabel = document.getElementById('cd-start-label');
    this.playIcon = document.getElementById('cd-play-icon');
    this.pauseIcon = document.getElementById('cd-pause-icon');

    this.circumference = 2 * Math.PI * 130;
    this.ringEl.style.strokeDasharray = `${this.circumference}`;

    this.initEvents();
  }

  initEvents() {
    this.startBtn.addEventListener('click', () => this.toggle());
    this.resetBtn.addEventListener('click', () => this.reset());

    // Preset pills
    document.querySelectorAll('.preset-pill').forEach(btn => {
      btn.addEventListener('click', () => {
        const addSec = parseInt(btn.dataset.seconds, 10);
        let current = this.getSecondsFromInputs();
        current += addSec;
        this.setInputsFromSeconds(current);
        sounds.playBeep();
      });
    });

    [this.inputHours, this.inputMinutes, this.inputSeconds].forEach(inp => {
      inp.addEventListener('change', () => {
        if (inp.value < 0) inp.value = 0;
      });
    });
  }

  getSecondsFromInputs() {
    const h = parseInt(this.inputHours.value, 10) || 0;
    const m = parseInt(this.inputMinutes.value, 10) || 0;
    const s = parseInt(this.inputSeconds.value, 10) || 0;
    return Math.max(0, h * 3600 + m * 60 + s);
  }

  setInputsFromSeconds(totalSec) {
    const h = Math.floor(totalSec / 3600);
    const m = Math.floor((totalSec % 3600) / 60);
    const s = totalSec % 60;
    this.inputHours.value = String(h).padStart(2, '0');
    this.inputMinutes.value = String(m).padStart(2, '0');
    this.inputSeconds.value = String(s).padStart(2, '0');
  }

  toggle() {
    sounds.initContext();
    if (this.isRunning) {
      this.pause();
    } else {
      this.start();
    }
  }

  start() {
    if (this.isRunning) return;

    if (this.pickerEl.classList.contains('hidden') === false) {
      this.totalSeconds = this.getSecondsFromInputs();
      if (this.totalSeconds <= 0) {
        showToast('Please set a duration greater than 0');
        return;
      }
      this.remainingSeconds = this.totalSeconds;
    }

    this.isRunning = true;
    this.pickerEl.classList.add('hidden');
    this.displayEl.classList.remove('hidden');

    this.badgeEl.textContent = 'COUNTING DOWN';
    this.badgeEl.className = 'timer-status-badge running';
    this.startLabel.textContent = 'Pause';
    this.playIcon.classList.add('hidden');
    this.pauseIcon.classList.remove('hidden');

    this.render();

    this.intervalId = setInterval(() => {
      if (this.remainingSeconds > 0) {
        this.remainingSeconds--;
        this.render();
      } else {
        this.handleComplete();
      }
    }, 1000);
  }

  pause() {
    if (!this.isRunning) return;
    this.isRunning = false;
    clearInterval(this.intervalId);

    this.badgeEl.textContent = 'PAUSED';
    this.badgeEl.className = 'timer-status-badge paused';
    this.startLabel.textContent = 'Resume';
    this.playIcon.classList.remove('hidden');
    this.pauseIcon.classList.add('hidden');
  }

  reset() {
    this.pause();
    this.remainingSeconds = 0;
    this.pickerEl.classList.remove('hidden');
    this.displayEl.classList.add('hidden');

    this.badgeEl.textContent = 'SET TIME';
    this.badgeEl.className = 'timer-status-badge';
    this.startLabel.textContent = 'Start Timer';
    this.ringEl.style.strokeDashoffset = '0';
  }

  handleComplete() {
    this.pause();
    sounds.playChime();
    showToast('⏰ Countdown Timer Finished!');
    this.badgeEl.textContent = 'COMPLETED';
    this.badgeEl.className = 'timer-status-badge';
  }

  render() {
    const h = Math.floor(this.remainingSeconds / 3600);
    const m = Math.floor((this.remainingSeconds % 3600) / 60);
    const s = this.remainingSeconds % 60;

    this.dispHours.textContent = String(h).padStart(2, '0');
    this.dispMinutes.textContent = String(m).padStart(2, '0');
    this.dispSeconds.textContent = String(s).padStart(2, '0');

    const progressRatio = this.totalSeconds > 0 ? (this.remainingSeconds / this.totalSeconds) : 0;
    const offset = this.circumference * (1 - progressRatio);
    this.ringEl.style.strokeDashoffset = `${offset}`;
  }
}

// ==========================================
// 6. TASK TIME TRACKER
// ==========================================
class TaskTrackerEngine {
  constructor() {
    this.tasks = JSON.parse(localStorage.getItem('timeflow_tasks') || '[]');
    this.activeTask = null;
    this.taskStartTime = 0;
    this.taskTimerId = null;

    // Elements
    this.taskNameInput = document.getElementById('task-name-input');
    this.categorySelect = document.getElementById('task-category-select');
    this.toggleBtn = document.getElementById('task-toggle-btn');
    this.btnText = document.getElementById('task-btn-text');
    this.activeBanner = document.getElementById('active-task-banner');
    this.activeName = document.getElementById('active-task-name');
    this.activeCat = document.getElementById('active-task-cat-badge');
    this.activeTimer = document.getElementById('active-task-time');
    this.taskList = document.getElementById('task-list');
    this.totalTimeEl = document.getElementById('total-tracked-time');
    this.clearBtn = document.getElementById('btn-clear-tasks');

    this.initEvents();
    this.render();
  }

  initEvents() {
    this.toggleBtn.addEventListener('click', () => this.toggleTracking());
    this.clearBtn.addEventListener('click', () => this.clearHistory());

    this.taskNameInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        this.toggleTracking();
      }
    });
  }

  toggleTracking() {
    if (this.activeTask) {
      this.stopTracking();
    } else {
      this.startTracking();
    }
  }

  startTracking() {
    const name = this.taskNameInput.value.trim() || 'Untitled Session';
    const category = this.categorySelect.value;

    this.activeTask = {
      name,
      category,
      startTime: Date.now()
    };
    this.taskStartTime = performance.now();

    this.activeBanner.classList.remove('hidden');
    this.activeName.textContent = name;
    this.activeCat.textContent = category;
    this.btnText.textContent = 'Stop & Save';
    this.toggleBtn.style.background = 'var(--color-red)';

    const updateTaskFrame = () => {
      if (!this.activeTask) return;
      const elapsed = performance.now() - this.taskStartTime;
      const fmt = formatTime(elapsed, false);
      this.activeTimer.textContent = fmt.formatted;
      this.taskTimerId = requestAnimationFrame(updateTaskFrame);
    };
    this.taskTimerId = requestAnimationFrame(updateTaskFrame);
    showToast(`Tracking: ${name}`);
  }

  stopTracking() {
    if (!this.activeTask) return;
    cancelAnimationFrame(this.taskTimerId);

    const elapsedMs = performance.now() - this.taskStartTime;
    if (elapsedMs > 1000) { // record if at least 1s
      this.tasks.unshift({
        id: Date.now(),
        name: this.activeTask.name,
        category: this.activeTask.category,
        durationMs: elapsedMs,
        date: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      });
      this.save();
      showToast('Task session saved!');
    }

    this.activeTask = null;
    this.activeBanner.classList.add('hidden');
    this.btnText.textContent = 'Start Tracking';
    this.toggleBtn.style.background = '';
    this.taskNameInput.value = '';
    this.render();
  }

  deleteTask(id) {
    this.tasks = this.tasks.filter(t => t.id !== id);
    this.save();
    this.render();
    showToast('Task deleted');
  }

  clearHistory() {
    if (this.tasks.length === 0) return;
    this.tasks = [];
    this.save();
    this.render();
    showToast('Task history cleared');
  }

  save() {
    localStorage.setItem('timeflow_tasks', JSON.stringify(this.tasks));
  }

  render() {
    // Total calculation
    const totalMs = this.tasks.reduce((sum, t) => sum + t.durationMs, 0);
    const totalSecs = Math.floor(totalMs / 1000);
    const hrs = Math.floor(totalSecs / 3600);
    const mins = Math.floor((totalSecs % 3600) / 60);
    const secs = totalSecs % 60;
    this.totalTimeEl.textContent = `${hrs}h ${mins}m ${secs}s`;

    if (this.tasks.length === 0) {
      this.taskList.innerHTML = `<li class="empty-task-placeholder">No tracked tasks yet today. Start tracking an activity above!</li>`;
      return;
    }

    this.taskList.innerHTML = this.tasks.map(t => {
      const fmt = formatTime(t.durationMs, false);
      return `
        <li class="task-item">
          <div class="task-item-left">
            <span class="task-cat-pill">${t.category}</span>
            <div>
              <span class="task-item-name">${t.name}</span>
              <span class="task-item-time">• ${t.date}</span>
            </div>
          </div>
          <div class="task-item-right">
            <span class="task-item-duration">${fmt.formatted}</span>
            <button class="task-btn-delete" title="Delete entry" onclick="window.taskTracker.deleteTask(${t.id})">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="3 6 5 6 21 6"></polyline>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
              </svg>
            </button>
          </div>
        </li>
      `;
    }).join('');
  }
}

// ==========================================
// 7. APP CONTROLLER & GLOBAL EVENTS
// ==========================================
class AppController {
  constructor() {
    this.currentTab = 'stopwatch';
    this.stopwatch = new StopwatchEngine();
    this.pomodoro = new PomodoroEngine();
    this.countdown = new CountdownTimerEngine();
    this.tracker = new TaskTrackerEngine();
    window.taskTracker = this.tracker; // expose for onclick

    this.initClock();
    this.initTabs();
    this.initThemes();
    this.initSoundToggle();
    this.initModal();
    this.initKeyboardShortcuts();
  }

  initClock() {
    const clockEl = document.getElementById('current-clock-display');
    const updateTime = () => {
      const now = new Date();
      clockEl.textContent = now.toLocaleTimeString([], { hour12: true });
    };
    updateTime();
    setInterval(updateTime, 1000);
  }

  initTabs() {
    const tabButtons = document.querySelectorAll('.tab-btn');
    tabButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        this.switchTab(btn.dataset.tab);
      });
    });
  }

  switchTab(tabName) {
    this.currentTab = tabName;
    document.querySelectorAll('.tab-btn').forEach(b => {
      b.classList.toggle('active', b.dataset.tab === tabName);
    });
    document.querySelectorAll('.tab-pane').forEach(p => {
      p.classList.toggle('active', p.id === `pane-${tabName}`);
    });
  }

  initThemes() {
    const themeBtn = document.getElementById('btn-theme');
    const themeMenu = document.getElementById('theme-menu');
    const savedTheme = localStorage.getItem('timeflow_theme') || 'dark';
    document.body.setAttribute('data-theme', savedTheme);

    this.updateActiveThemeOption(savedTheme);

    themeBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      themeMenu.classList.toggle('hidden');
    });

    document.addEventListener('click', () => {
      themeMenu.classList.add('hidden');
    });

    document.querySelectorAll('.theme-opt').forEach(opt => {
      opt.addEventListener('click', () => {
        const val = opt.dataset.themeVal;
        document.body.setAttribute('data-theme', val);
        localStorage.setItem('timeflow_theme', val);
        this.updateActiveThemeOption(val);
        themeMenu.classList.add('hidden');
        showToast(`Theme changed to ${opt.textContent.trim()}`);
      });
    });
  }

  updateActiveThemeOption(theme) {
    document.querySelectorAll('.theme-opt').forEach(opt => {
      opt.classList.toggle('active', opt.dataset.themeVal === theme);
    });
  }

  initSoundToggle() {
    const btn = document.getElementById('btn-sound-toggle');
    const onIcon = document.getElementById('icon-sound-on');
    const offIcon = document.getElementById('icon-sound-off');

    const updateIcons = (enabled) => {
      onIcon.classList.toggle('hidden', !enabled);
      offIcon.classList.toggle('hidden', enabled);
    };

    updateIcons(sounds.soundEnabled);

    btn.addEventListener('click', () => {
      const enabled = sounds.toggle();
      updateIcons(enabled);
      showToast(enabled ? 'Sound alerts enabled 🔔' : 'Sound alerts muted 🔕');
    });
  }

  initModal() {
    const modal = document.getElementById('modal-shortcuts');
    const openBtn = document.getElementById('btn-shortcuts');
    const footerBtn = document.getElementById('btn-footer-shortcuts');
    const closeBtn = document.getElementById('btn-close-modal');

    const open = () => modal.classList.remove('hidden');
    const close = () => modal.classList.add('hidden');

    openBtn.addEventListener('click', open);
    footerBtn.addEventListener('click', open);
    closeBtn.addEventListener('click', close);

    modal.addEventListener('click', (e) => {
      if (e.target === modal) close();
    });
  }

  initKeyboardShortcuts() {
    window.addEventListener('keydown', (e) => {
      // Don't intercept if user is typing in an input
      if (['INPUT', 'SELECT', 'TEXTAREA'].includes(document.activeElement.tagName)) {
        return;
      }

      if (e.code === 'Space') {
        e.preventDefault();
        if (this.currentTab === 'stopwatch') this.stopwatch.toggle();
        else if (this.currentTab === 'pomodoro') this.pomodoro.toggle();
        else if (this.currentTab === 'timer') this.countdown.toggle();
        else if (this.currentTab === 'tracker') this.tracker.toggleTracking();
      } else if (e.code === 'KeyL') {
        if (this.currentTab === 'stopwatch') {
          e.preventDefault();
          this.stopwatch.recordLap();
        }
      } else if (e.code === 'KeyR') {
        e.preventDefault();
        if (this.currentTab === 'stopwatch') this.stopwatch.reset();
        else if (this.currentTab === 'pomodoro') this.pomodoro.reset();
        else if (this.currentTab === 'timer') this.countdown.reset();
      } else if (e.key === '1') {
        this.switchTab('stopwatch');
      } else if (e.key === '2') {
        this.switchTab('pomodoro');
      } else if (e.key === '3') {
        this.switchTab('timer');
      } else if (e.key === '4') {
        this.switchTab('tracker');
      } else if (e.code === 'KeyM') {
        document.getElementById('btn-sound-toggle').click();
      } else if (e.code === 'Escape') {
        document.getElementById('modal-shortcuts').classList.add('hidden');
      }
    });
  }
}

// Boot
window.addEventListener('DOMContentLoaded', () => {
  new AppController();
});
