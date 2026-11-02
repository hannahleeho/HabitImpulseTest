// ============================================================
// Study 3 - Habit Impulse Model Test
// The experiment timeline. Settings live in config.js.
// Cue = a contact. Response = which app to reach them on.
// Phases: hand choice -> training -> timing practice (old pairings) ->
//         two contacts swap apps -> new-pairing practice -> forced-response test
// ============================================================

const jsPsych = initJsPsych({
  on_finish: function () {
    if (CONFIG.saveLocalCSV && !blockedDevice) {
      jsPsych.data.get().localSave("csv", `study3_${participantId}.csv`);
    }
  },
});

// ---------- Participant ID (from Prolific/SONA URL if present, else random)
const urlId =
  jsPsych.data.getURLVariable("PROLIFIC_PID") || jsPsych.data.getURLVariable("id");
const participantId = urlId || "local_" + jsPsych.randomization.randomID(6);

// ---------- Device check
const blockedDevice =
  CONFIG.blockPhonesAndTablets &&
  /Mobi|Android|iPhone|iPad|iPod|Tablet/i.test(navigator.userAgent);

// ---------- Pairings (contact id -> app id), shuffled per participant
const contactIds = CONFIG.contacts.map((c) => c.id);
const appOrder = CONFIG.randomiseMapping
  ? jsPsych.randomization.shuffle(CONFIG.apps.map((a) => a.id))
  : CONFIG.apps.map((a) => a.id);
const oldMap = {};
contactIds.forEach((cid, i) => (oldMap[cid] = appOrder[i]));

// Two contacts swap apps. The third stays the same (control).
const switchedPair = CONFIG.randomiseMapping
  ? jsPsych.randomization.shuffle(contactIds).slice(0, 2)
  : contactIds.slice(0, 2);
const unchangedContact = contactIds.find((c) => !switchedPair.includes(c));
const newMap = { ...oldMap };
newMap[switchedPair[0]] = oldMap[switchedPair[1]];
newMap[switchedPair[1]] = oldMap[switchedPair[0]];

// ---------- Keys (set after the hand question)
let hand = "right";
let keys = CONFIG.keysByHand.right;
const appIndex = Object.fromEntries(CONFIG.apps.map((a, i) => [a.id, i]));
const keyForApp = (appId) => keys[appIndex[appId]];
const appForKey = (k) => {
  const i = keys.indexOf(k);
  return i >= 0 ? CONFIG.apps[i].id : null;
};

jsPsych.data.addProperties({
  participant: participantId,
  quick_mode: CONFIG.quickMode,
  map_old: JSON.stringify(oldMap),
  map_new: JSON.stringify(newMap),
  switched_contacts: switchedPair.join("|"),
  unchanged_contact: unchangedContact,
});

// ---------- Points
let score = 0;
let lastPoints = 0;
const pointsOn = () => CONFIG.points && CONFIG.points.enabled;
const scoreLine = () => (pointsOn() ? `<div class="score">Score: ${score}</div>` : "");
const pointsText = (p) =>
  pointsOn() ? ` <span class="pts">${p > 0 ? "+" + p : "+0"}</span>` : "";

// Points rules for the beep trials, shown on instruction pages.
function beepPointsText() {
  if (!pointsOn()) return "";
  const P = CONFIG.points;
  return `<p><b>Points.</b> On the beat and the right app earns <b>${P.onTimeCorrect}</b>. On the beat but the wrong app earns <b>${P.onTimeWrong}</b>. Too early or too late earns nothing. So always press on the beat, even if you have to guess.</p>`;
}

// ---------- Drawing
const contactById = Object.fromEntries(CONFIG.contacts.map((c) => [c.id, c]));
const appById = Object.fromEntries(CONFIG.apps.map((a) => [a.id, a]));

function avatar(c, size = 110) {
  return `<svg width="${size}" height="${size}" viewBox="0 0 100 100">
    <circle cx="50" cy="50" r="48" fill="${c.colour}"/>
    <circle cx="50" cy="38" r="17" fill="#fff" opacity="0.9"/>
    <path d="M18 86 Q50 50 82 86" fill="#fff" opacity="0.9"/>
  </svg>`;
}

function appIcon(a, size = 56) {
  const stroke = `stroke="#fff" stroke-width="7" fill="none" stroke-linecap="round" stroke-linejoin="round"`;
  const glyph = {
    phone: `<path transform="translate(22 22) scale(2.35)" fill="#fff" d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z"/>`,
    message: `<path d="M24 30 H76 V62 H46 L32 74 V62 H24 Z" ${stroke}/>`,
    email: `<rect x="22" y="32" width="56" height="38" rx="3" ${stroke}/><path d="M22 34 L50 54 L78 34" ${stroke}/>`,
  }[a.icon];
  return `<svg width="${size}" height="${size}" viewBox="0 0 100 100">
    <rect x="4" y="4" width="92" height="92" rx="22" fill="${a.colour}"/>${glyph}</svg>`;
}

// The app bar shown under every trial: icon, name, key.
function appBar() {
  return (
    `<div class="appbar">` +
    CONFIG.apps
      .map(
        (a, i) =>
          `<div class="appbar-item">${appIcon(a)}<div class="appbar-label">${a.label}</div><div class="appbar-key">${keys[i].toUpperCase()}</div></div>`
      )
      .join("") +
    `</div>`
  );
}

// Contact card shown as the cue.
function contactCard(cid) {
  const c = contactById[cid];
  return `<div class="card">${avatar(c)}<div class="card-name">${c.name}</div><div class="card-sub">wants to get in touch</div></div>`;
}

// Who-uses-what table for instruction pages only (never shown during trials).
function pairingTable(map, highlight = []) {
  return (
    `<div class="pairs">` +
    contactIds
      .map((cid) => {
        const hl = highlight.includes(cid) ? " hl" : "";
        return `<div class="pair${hl}">${avatar(contactById[cid], 64)}<div class="pair-name">${contactById[cid].name}</div><div class="pair-arrow">uses</div>${appIcon(appById[map[cid]], 48)}<div class="pair-app">${appById[map[cid]].label}</div></div>`;
      })
      .join("") +
    `</div>`
  );
}

// ---------- Helpers
function contactList(reps) {
  const list = [];
  contactIds.forEach((cid) => {
    for (let i = 0; i < reps; i++) list.push(cid);
  });
  return jsPsych.randomization.shuffle(list);
}

function samplePT() {
  const fr = CONFIG.forcedResponse;
  if (Array.isArray(fr.ptLevels) && fr.ptLevels.length) {
    return jsPsych.randomization.sampleWithReplacement(fr.ptLevels, 1)[0];
  }
  return Math.round(fr.ptMinMs + Math.random() * (fr.ptMaxMs - fr.ptMinMs));
}

function page(htmlFn, button = "Continue") {
  return {
    type: jsPsychHtmlButtonResponse,
    stimulus: () => `<div class="instr">${typeof htmlFn === "function" ? htmlFn() : htmlFn}</div>`,
    choices: [button],
    data: { phase: "instructions" },
  };
}

// Scores a response against the current and old pairings.
function scoreTrial(data, cid, map) {
  const key = data.response ? String(data.response).toLowerCase() : null;
  const respApp = key ? appForKey(key) : null;
  const switched = switchedPair.includes(cid);
  data.response = key;
  data.response_app = respApp;
  data.contact = cid;
  data.switched_contact = switched;
  data.correct_app = map[cid];
  data.old_app = oldMap[cid];
  data.hand = hand;
  data.correct = respApp !== null && respApp === map[cid];
  // Habitual error = the OLD app for a contact whose app changed.
  data.habitual_error = switched && map === newMap && respApp === oldMap[cid];
  // Other error = wrong, and not the old app (guessing or inattention).
  data.other_error = respApp !== null && !data.correct && !data.habitual_error;
}

// ---------- Free-response trial with feedback (training and new-pairing practice)
function freeTrial(cid, map, phase, block) {
  return [
    {
      type: jsPsychHtmlKeyboardResponse,
      stimulus: () => `<div class="trial">${scoreLine()}${contactCard(cid)}${appBar()}</div>`,
      choices: () => keys,
      data: { phase: phase, block: block, trial_type_label: "free" },
      on_finish: (data) => {
        scoreTrial(data, cid, map);
        lastPoints = pointsOn() && data.correct ? CONFIG.points.trainingCorrect : 0;
        score += lastPoints;
        data.points = lastPoints;
        data.score = score;
      },
    },
    {
      type: jsPsychHtmlKeyboardResponse,
      stimulus: () => {
        const last = jsPsych.data.get().last(1).values()[0];
        const c = contactById[cid].name;
        const a = appById[map[cid]].label;
        const fb = last.correct
          ? `<div class="fb ok">Correct${pointsText(lastPoints)}</div>`
          : `<div class="fb bad">Wrong. ${c} uses ${a}</div>`;
        return `<div class="trial">${scoreLine()}<div class="card-space">${fb}</div>${appBar()}</div>`;
      },
      choices: "NO_KEYS",
      trial_duration: () =>
        jsPsych.data.get().last(1).values()[0].correct
          ? CONFIG.training.feedbackMs
          : CONFIG.training.feedbackMs * 4,
      post_trial_gap: CONFIG.training.itiMs,
      data: { phase: "feedback" },
    },
  ];
}

// ---------- Forced-response trial
function forcedTrial(cid, map, phase, block) {
  const fr = CONFIG.forcedResponse;
  return {
    type: jsPsychForcedResponse,
    stimulus: () => contactCard(cid),
    footer: () => appBar() + scoreLine(),
    extra_feedback: (timing, key) => {
      if (!pointsOn()) return "";
      const ok = key && appForKey(key) === map[cid];
      lastPoints = timing === "ok" ? (ok ? CONFIG.points.onTimeCorrect : CONFIG.points.onTimeWrong) : 0;
      score += lastPoints;
      const el = document.querySelector(".fr-wrap .score");
      if (el) el.textContent = `Score: ${score}`;
      // Only say right or wrong app when the timing was on the beat.
      const appMsg =
        timing === "ok"
          ? ok
            ? ` <span style='color:#2a9d4b'>· Right app</span>`
            : ` <span style='color:#c0392b'>· Wrong app</span>`
          : "";
      return appMsg + pointsText(lastPoints);
    },
    choices: () => keys,
    n_beeps: fr.nBeeps,
    beep_interval: fr.beepIntervalMs,
    beep_hz: fr.beepToneHz,
    beep_duration: fr.beepDurationMs,
    prep_time: () => samplePT(),
    tolerance: fr.toleranceMs,
    window_after: fr.responseWindowAfterMs,
    feedback_duration: fr.feedbackMs,
    post_trial_gap: fr.itiMs,
    data: { phase: phase, block: block, trial_type_label: "forced" },
    on_finish: (data) => {
      scoreTrial(data, cid, map);
      data.points = pointsOn() ? lastPoints : 0;
      data.score = score;
    },
  };
}

const fingerText = () =>
  hand === "left"
    ? "Rest your ring, middle and index fingers on <b>S D F</b>. Your index finger sits on F (it usually has a small bump)."
    : "Rest your index, middle and ring fingers on <b>J K L</b>. Your index finger sits on J (it usually has a small bump).";

// ============================================================
// Timeline
// ============================================================
const timeline = [];

if (blockedDevice) {
  timeline.push({
    type: jsPsychHtmlButtonResponse,
    stimulus: `<div class="instr"><h2>Please use a computer</h2>
      <p>This study needs a computer with a physical keyboard. It cannot be done on a phone or tablet.</p>
      <p>Please open the same link on a laptop or desktop computer.</p></div>`,
    choices: [],
  });
} else {
  const welcome = page(
    `<h2>Welcome</h2>
     <p>In this task you get messages from three people. Each person prefers to be contacted on a particular app. Your job is to reply on the right app.</p>
     <p>Please use a computer with a keyboard, and turn your sound on or wear headphones.</p>
     <p>Click Start to turn on the sound.</p>`,
    "Start"
  );
  welcome.on_finish = () => window.unlockAudio();
  timeline.push(welcome);

  // ---------- Hand choice
  timeline.push({
    type: jsPsychHtmlButtonResponse,
    stimulus: `<div class="instr"><h2>Which hand?</h2>
      <p>You will use three fingers of one hand for the whole task. Which hand would you like to use?</p></div>`,
    choices: ["Left hand (S D F)", "Right hand (J K L)"],
    data: { phase: "hand_choice" },
    on_finish: (data) => {
      hand = data.response === 0 ? "left" : "right";
      keys = CONFIG.keysByHand[hand];
      jsPsych.data.addProperties({ hand: hand });
    },
  });

  // ---------- Phase 1. Training
  timeline.push(
    page(
      () => `<h2>Part 1. Who uses what</h2>
       <p>Here is how each person likes to be contacted.</p>
       ${pairingTable(oldMap)}
       <p>${fingerText()}</p>
       <p>The apps and their keys will always be shown at the bottom of the screen. You only need to remember <b>which person uses which app</b>.</p>
       <p>When a message arrives, press the key for that person's app as quickly and accurately as you can.</p>
       ${pointsOn() ? `<p>You earn <b>${CONFIG.points.trainingCorrect} point</b> for each correct answer. Most of the points come later in the main task.</p>` : ""}`
    )
  );
  for (let blk = 1; blk <= CONFIG.training.blocks; blk++) {
    contactList(CONFIG.training.repsPerContactPerBlock).forEach((cid) =>
      timeline.push(...freeTrial(cid, oldMap, "training", blk))
    );
    if (blk < CONFIG.training.blocks) {
      timeline.push(page(() => `<p>End of training block ${blk} of ${CONFIG.training.blocks}.</p>${scoreLine()}<p>Press Continue when you're ready.</p>`));
    }
  }

  // ---------- Phase 2. Timing practice with the old pairings
  timeline.push(
    page(
      `<h2>Part 2. Reply on the beat</h2>
       <p>Now you will hear <b>${CONFIG.forcedResponse.nBeeps} beeps</b>. The dots at the top light up with each beep.</p>
       <p>Always press a key <b>exactly on the last beep</b>. Not before, not after.</p>
       <p>The message will appear at different times. Sometimes it appears very late and you will have to guess. That is expected and fine. Hitting the timing matters most.</p>
       <p>Same people, same apps as before.</p>
       ${beepPointsText()}`
    )
  );
  contactList(CONFIG.timingPractice.repsPerContact).forEach((cid) =>
    timeline.push(forcedTrial(cid, oldMap, "timing_practice", 0))
  );

  // ---------- Phase 3. The switch
  timeline.push(
    page(
      () => `<h2>Part 3. Two people have changed apps</h2>
       <p><b>${contactById[switchedPair[0]].name}</b> and <b>${contactById[switchedPair[1]].name}</b> have swapped how they want to be contacted. <b>${contactById[unchangedContact].name}</b> has not changed.</p>
       ${pairingTable(newMap, switchedPair)}
       <p>Take a moment to learn the new arrangement. Then practise at your own pace.</p>`
    )
  );
  contactList(CONFIG.newMappingPractice.repsPerContact).forEach((cid) =>
    timeline.push(...freeTrial(cid, newMap, "new_mapping_practice", 0))
  );

  // ---------- Phase 4. Forced-response test with the new pairings
  timeline.push(
    page(
      `<h2>Part 4. Main task</h2>
       <p>Use the <b>new</b> arrangement. Reply exactly on the last beep, like before.</p>
       ${beepPointsText()}`
    )
  );
  for (let blk = 1; blk <= CONFIG.test.blocks; blk++) {
    contactList(CONFIG.test.repsPerContactPerBlock).forEach((cid) =>
      timeline.push(forcedTrial(cid, newMap, "test", blk))
    );
    if (CONFIG.depletion.enabled && blk === CONFIG.depletion.afterTestBlock) {
      timeline.push(page(`<p>[Depletion task goes here. Placeholder only.]</p>`));
    }
    if (blk < CONFIG.test.blocks) {
      timeline.push(
        page(() => `<p>End of block ${blk} of ${CONFIG.test.blocks}.</p>${scoreLine()}<p>Press Continue when you're ready.</p>`)
      );
    }
  }

  // ---------- Save to DataPipe (online link only)
  if (CONFIG.saveOnline && window.location.protocol !== "file:") {
    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    timeline.push({
      type: jsPsychPipe,
      action: "save",
      experiment_id: CONFIG.dataPipeExperimentId,
      filename: `${CONFIG.quickMode ? "demo_" : ""}study3_${participantId}_${stamp}.csv`,
      data_string: () => jsPsych.data.get().csv(),
      wait_message: "<p>Saving your answers. Please don't close this page.</p>",
      on_finish: (data) => {
        if (!data.success) console.warn("DataPipe save failed", data.result);
      },
    });
  }

  timeline.push(
    page(
      () => `<h2>All done</h2>${scoreLine()}<p>Thank you for taking part.</p>${
        CONFIG.saveLocalCSV ? "<p>Your data file will download when you click Finish.</p>" : ""
      }`,
      "Finish"
    )
  );
}

jsPsych.run(timeline);
