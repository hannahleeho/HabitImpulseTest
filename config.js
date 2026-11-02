// ============================================================
// Study 3 - Habit Impulse Model Test
// SETTINGS. Every number you might want to change lives here.
// ============================================================

const CONFIG = {
  // true = tiny version for checking it works (a few minutes).
  // false = full run.
  quickMode: true,

  // Response keys, left to right. Participants pick a hand at the start.
  keysByHand: {
    left: ["s", "d", "f"],  // ring, middle, index
    right: ["j", "k", "l"], // index, middle, ring
  },

  // Three apps, shown left to right above the keys the whole time.
  // icon can be "phone", "message" or "email".
  apps: [
    { id: "phone", label: "Call", icon: "phone", colour: "#2a9d4b" },
    { id: "message", label: "Text", icon: "message", colour: "#1d6fd1" },
    { id: "email", label: "Email", icon: "email", colour: "#c0662a" },
  ],

  // Three contacts (the cues). Neutral names. Which contact gets which app
  // is shuffled for every participant, so names never line up with an app by design.
  contacts: [
    { id: "c1", name: "Alex", colour: "#8e5bb5" },
    { id: "c2", name: "Jordan", colour: "#d1495b" },
    { id: "c3", name: "Sam", colour: "#00798c" },
  ],

  // Shuffle contact -> app pairing per participant (keep true for real data).
  randomiseMapping: true,

  // ---------- Phase 1. Training (free responding, accuracy feedback)
  // Full run is one session, under 30 minutes (about 25).
  training: {
    blocks: 8,
    repsPerContactPerBlock: 15, // 3 contacts x 15 = 45 trials per block, 360 in total
    feedbackMs: 400,
    itiMs: 300,
  },

  // ---------- Phase 2. Learn the beep timing with the OLD pairings
  timingPractice: { repsPerContact: 8 },

  // ---------- Phase 3. Practise the NEW pairings (free responding)
  newMappingPractice: { repsPerContact: 8 },

  // ---------- Phase 4. Test (forced response, new pairings)
  test: {
    blocks: 4,
    repsPerContactPerBlock: 18, // 54 trials per block, 216 in total
  },

  // ---------- Forced-response timing (all in milliseconds)
  forcedResponse: {
    nBeeps: 4,              // respond on the last beep
    beepIntervalMs: 500,
    beepToneHz: 1000,
    beepDurationMs: 60,
    toleranceMs: 100,       // "on time" if within +/- this of the last beep
    responseWindowAfterMs: 400,
    feedbackMs: 600,
    itiMs: 400,
    // Preparation time = how long before the last beep the contact appears.
    // Sampled at random between these values (like Hardwick et al., 2019).
    // Or set ptLevels to a list, e.g. [100, 250, 400, 550, 700, 850].
    ptMinMs: 0,
    ptMaxMs: 1000,
    ptLevels: null,
  },

  // ---------- Depletion block between test blocks (placeholder for now)
  depletion: { enabled: false, afterTestBlock: 2 },

  // ---------- Points (for engagement). Shown as a running score.
  // Money or prize draws are a separate decision (needs ethics approval).
  points: {
    enabled: true,
    trainingCorrect: 1,  // free-response trials (kept small so the main task matters more)
    onTimeCorrect: 10,   // beep trials, on the beat and right app
    onTimeWrong: 2,      // beep trials, on the beat but wrong app (keeps people responding on time)
  },

  // ---------- Devices
  blockPhonesAndTablets: true,

  // ---------- Data
  // Download a CSV at the end, but only when the task is opened from your
  // own computer (double-clicking index.html). The online link never
  // downloads a file, so supervisors and participants don't get one.
  // Online data saving is handled by DataPipe -> OSF (added later).
  saveLocalCSV: window.location.protocol === "file:",

  // Send the data to DataPipe (which puts it in your Google Drive folder)
  // at the end of the task. Only happens on the online link, never when
  // opened from your own computer. Nothing saves unless "Accept new data"
  // is switched on for the experiment at pipe.jspsych.org.
  saveOnline: true,
  dataPipeExperimentId: "61jsTFu8kne2",
};

// Quick mode = short demo (about 3 minutes), e.g. for supervisors.
if (CONFIG.quickMode) {
  CONFIG.training.blocks = 1;
  CONFIG.training.repsPerContactPerBlock = 8;
  CONFIG.timingPractice.repsPerContact = 2;
  CONFIG.newMappingPractice.repsPerContact = 3;
  CONFIG.test.blocks = 1;
  CONFIG.test.repsPerContactPerBlock = 6;
}
