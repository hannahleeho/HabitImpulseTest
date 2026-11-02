// ============================================================
// Forced-response trial for jsPsych 7.
// A run of beeps plays. The participant must respond on the last beep.
// The stimulus appears some time before the last beep (the preparation time).
// You should not need to edit this file.
// ============================================================

var jsPsychForcedResponse = (function (jspsych) {
  "use strict";

  const info = {
    name: "forced-response",
    parameters: {
      stimulus: { type: jspsych.ParameterType.HTML_STRING, default: "" },
      choices: { type: jspsych.ParameterType.KEYS, default: [] },
      n_beeps: { type: jspsych.ParameterType.INT, default: 4 },
      beep_interval: { type: jspsych.ParameterType.INT, default: 500 },
      beep_hz: { type: jspsych.ParameterType.INT, default: 1000 },
      beep_duration: { type: jspsych.ParameterType.INT, default: 60 },
      prep_time: { type: jspsych.ParameterType.INT, default: 500 }, // planned ms before last beep
      tolerance: { type: jspsych.ParameterType.INT, default: 100 },
      window_after: { type: jspsych.ParameterType.INT, default: 400 },
      feedback_duration: { type: jspsych.ParameterType.INT, default: 600 },
      footer: { type: jspsych.ParameterType.HTML_STRING, default: "" }, // always visible (e.g. app bar)
      // Optional function(timing_status, key) returning extra feedback HTML (e.g. points).
      extra_feedback: { type: jspsych.ParameterType.FUNCTION, default: null },
    },
  };

  // One shared audio context for the whole session.
  let audioCtx = null;
  function getAudio() {
    if (!audioCtx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      audioCtx = new AC();
    }
    if (audioCtx.state === "suspended") audioCtx.resume();
    return audioCtx;
  }

  window.unlockAudio = getAudio;

  class ForcedResponsePlugin {
    constructor(jsPsych) {
      this.jsPsych = jsPsych;
    }

    trial(display_element, trial) {
      const lead = 100; // ms of silence before the first beep
      const target = lead + (trial.n_beeps - 1) * trial.beep_interval; // last beep time
      const planned_onset = Math.max(0, target - trial.prep_time);

      // ---- Build the display: beep dots on top, stimulus area below
      let dots = "";
      for (let i = 0; i < trial.n_beeps; i++) {
        dots += `<span class="fr-dot" id="fr-dot-${i}"></span>`;
      }
      display_element.innerHTML = `
        <div class="fr-wrap">
          <div class="fr-dots">${dots}</div>
          <div class="fr-stim" id="fr-stim"><div class="fr-fix">+</div></div>
          <div class="fr-feedback" id="fr-feedback"></div>
          ${trial.footer}
        </div>`;

      // ---- Schedule beeps on the audio clock
      const ctx = getAudio();
      const audioStart = ctx.currentTime;
      for (let i = 0; i < trial.n_beeps; i++) {
        const t = audioStart + (lead + i * trial.beep_interval) / 1000;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.frequency.value = trial.beep_hz;
        gain.gain.setValueAtTime(0.25, t);
        gain.gain.setValueAtTime(0, t + trial.beep_duration / 1000);
        osc.connect(gain).connect(ctx.destination);
        osc.start(t);
        osc.stop(t + trial.beep_duration / 1000 + 0.02);
      }

      const t0 = performance.now();
      let stim_shown = false;
      let actual_onset = null;
      let dotsLit = 0;
      let response = null;
      let ended = false;
      let raf = null;

      // ---- Frame loop. Shows the stimulus and lights the dots on time.
      const tick = () => {
        const now = performance.now() - t0;
        if (!stim_shown && now >= planned_onset) {
          document.getElementById("fr-stim").innerHTML = trial.stimulus;
          actual_onset = now;
          stim_shown = true;
        }
        while (dotsLit < trial.n_beeps && now >= lead + dotsLit * trial.beep_interval) {
          const d = document.getElementById("fr-dot-" + dotsLit);
          if (d) d.classList.add("on");
          dotsLit++;
        }
        if (!ended && now >= target + trial.window_after) {
          finish();
          return;
        }
        if (!ended) raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);

      // ---- Keyboard
      const allowed = trial.choices.map((k) => k.toLowerCase());
      const onKey = (e) => {
        if (ended || response) return;
        const key = e.key.toLowerCase();
        if (!allowed.includes(key)) return;
        response = { key: key, time: performance.now() - t0 };
        finish();
      };
      document.addEventListener("keydown", onKey);

      // ---- End of trial
      const finish = () => {
        if (ended) return;
        ended = true;
        cancelAnimationFrame(raf);
        document.removeEventListener("keydown", onKey);

        let timing = "none";
        let timing_error = null;
        let actual_pt = null;
        if (response) {
          timing_error = response.time - target;
          if (timing_error < -trial.tolerance) timing = "early";
          else if (timing_error > trial.tolerance) timing = "late";
          else timing = "ok";
          // Actual preparation time = response time minus when the stimulus really appeared.
          // Negative means they responded before the stimulus was shown.
          actual_pt = stim_shown ? response.time - actual_onset : response.time - planned_onset;
        }

        const msg = {
          ok: "<span style='color:#2a9d4b'>Good timing</span>",
          early: "<span style='color:#c0392b'>Too early</span>",
          late: "<span style='color:#c0392b'>Too late</span>",
          none: "<span style='color:#c0392b'>Respond on the last beep</span>",
        }[timing];
        const extra =
          typeof trial.extra_feedback === "function"
            ? trial.extra_feedback(timing, response ? response.key : null)
            : "";
        document.getElementById("fr-feedback").innerHTML = msg + extra;

        const data = {
          response: response ? response.key : null,
          response_time: response ? Math.round(response.time) : null,
          target_time: target,
          timing_error: timing_error === null ? null : Math.round(timing_error),
          timing_status: timing,
          planned_pt: trial.prep_time,
          planned_onset: Math.round(planned_onset),
          actual_onset: actual_onset === null ? null : Math.round(actual_onset),
          actual_pt: actual_pt === null ? null : Math.round(actual_pt),
          stim_shown_before_response: stim_shown,
        };

        this.jsPsych.pluginAPI.setTimeout(() => {
          display_element.innerHTML = "";
          this.jsPsych.finishTrial(data);
        }, trial.feedback_duration);
      };
    }
  }
  ForcedResponsePlugin.info = info;
  return ForcedResponsePlugin;
})(jsPsychModule);
