const grid = document.getElementById('grid');
const statusText = document.getElementById('message');
const gridSize = 4;
const sequenceLength = 4;
let sequence = [];
let userInput = [];
let acceptingInput = false;
const tileElements = [];
let participantID = null;
let realTrial = false;
let userDropLocations = [];
let score = 0;
let trialSummaryData = [
  ['participantID', 'trialNumber', 'sequenceLength', 'trialDuration(ms)', 'scoreThisTrial']
];
let dragPathData = [["participantID", "trialNumber", "DragNumber", "X", "Y", "Timestamp"]];
let trialStartTime = null;
let trialEndTime = null;
let practiceTrialCounter = 0;
let realTrialCounter = 0;
let currentDragPath = [];
let dragNumberThisTrial = 0;
let isDragging = false;
document.addEventListener('dragover', e => {
  if (!isDragging) return;
  dragPathData.push([
    participantID,
    realTrial ? realTrialCounter : `P${practiceTrialCounter}`,
    dragNumberThisTrial,
    e.clientX,
    e.clientY,
    Date.now()
  ]);
});

// safety: if a drag is canceled, make sure we stop logging
document.addEventListener('dragend', () => {
  isDragging = false;
});

//hard coded shape duration
const realTrialDurations = [
  800, //trial 0
  700, //trial 1 
  600, //trial 2
  800, //trial 3
  700, //trial 4
  600, //trial 5
  1000, //trial 6
  900, //trial 7
  800, //trial 8
  800,
  700,
  600,
  800,
  700,
  600,
  1000, // trial 15
  900,
  800,
  800,
  700,
  600,
  800,
  700,
  600,
  800,
  700 //trial 25
];

const timeBetweenShapes = [
  1000, //trial 0
  900, //trial 1 
  800, //trial 2
  700, //trial 3
  600, //trial 4
  500, //trial 5
  1000, //trial 6
  900, //trial 7
  800, //trial 8
  800,
  700,
  600,
  800,
  700,
  600,
  1000, // trial 15
  900,
  800,
  800,
  700,
  600,
  800,
  700,
  600,
  800,
  700 //trial 25
];

const pracTrialDuration = [
  1200,
  1200
];

//making the 4x4 grid
tileElements.length = 0;
for (let i = 0; i < gridSize * gridSize; i++) {
  const tile = document.createElement('div');
  tile.classList.add('tile');
  tile.dataset.index = i;
  tile.addEventListener('click', handleTileClick);
  grid.appendChild(tile);
  tileElements.push(tile);
}

document.getElementById('enter-btn').addEventListener('click', () => {
  const input = document.getElementById('participant-id').value.trim();
  if (!input) {
    alert("Please enter your ID before starting.");
    return;
  }
  participantID = input;
  document.getElementById('start-screen').style.display = 'none';
  document.getElementById('all-grids').style.display = 'grid';  

  document.getElementById('overlay-message').style.display = 'flex';
  //add participant ID to jsPsych 
  console.log("Participant ID:", participantID);
});

document.getElementById('settings-btn').addEventListener('click', () => {
  const panel = document.getElementById('settings-panel');
  panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
});


document.addEventListener('keydown', e => {
  const overlay = document.getElementById('overlay-message');
  const msg = document.getElementById('message-box').textContent;
  if (overlay.style.display !== 'flex') return;

  if (e.code === 'Space') {
    overlay.style.display = 'none';

    if (msg.includes("start the practice trial")) {
      // first time: begin practice
      startTrial();

    } else if (msg.includes("begin the experiment")) {
      // after practice: reset & start real experiment
      realTrial = true;
      resetScore();
      startRealTrial();
    }

  } else if (e.code === 'Enter' && msg.includes("repeat practice")) {
    // after practice: repeat practice without touching realTrial
    overlay.style.display = 'none';
    realTrial = false;
    resetScore();
    startTrial();
  } else {
    console.log("Ignored ENTER");
  }
});


function resetScore() {
  score = 0;
  document.getElementById('score-display').textContent = `Score: ${score}`;
}

//function to generate the random shape sequence 
function generateShapeSequence(length) {
  const result = [];
  const usedIndices = new Set();

  while (result.length < length) {
    const shapeId = Math.floor(Math.random() * 16);
    const gridIndex = Math.floor(Math.random() * 16);
    if (!usedIndices.has(gridIndex)) {
      result.push({ shapeId, gridIndex });
      usedIndices.add(gridIndex);
    }
  }

  return result;
}

let shapesDropped = 0;
let currentTrialSequence = [];
let currentTrialScoreData = [];

function playShapeSequenceWithRealDuration(sequence, duration, onComplete) {
  document.body.classList.add('hide-cursor');
  let i = 0;
  const ISI = 1000; // blank gap between shapes in ms — adjust as needed

  function showNext() {
    // Clear the grid (blank screen during ISI)
    tileElements.forEach(tile => tile.innerHTML = '');

    if (i >= sequence.length) {
      document.body.classList.remove('hide-cursor');
      if (typeof onComplete === 'function') onComplete();
      return;
    }

    // Show shape after ISI gap
    setTimeout(() => {
      const { shapeId, gridIndex } = sequence[i];
      const tile = tileElements[gridIndex];

      const img = document.createElement('img');
      img.src = getShapeImageById(shapeId);
      img.style.width = '100%';
      img.style.height = '100%';
      img.style.objectFit = 'contain';
      tile.appendChild(img);

      i++;

      // Wait for shape duration, then move to next (which clears first)
      setTimeout(showNext, duration);
    }, ISI);
  }

  showNext();
}
// function playShapeSequenceWithRealDuration(sequence, duration, onComplete) {
//   document.body.classList.add('hide-cursor');
//   let i = 0;
//   const interval = setInterval(() => {
//     tileElements.forEach(tile => tile.innerHTML = '');

//     if (i >= sequence.length) {
//       clearInterval(interval);
//       document.body.classList.remove('hide-cursor');
//       if (typeof onComplete === 'function') onComplete();
//       return;
//     }

//     const { shapeId, gridIndex } = sequence[i];
//     const tile = tileElements[gridIndex];

//     const img = document.createElement('img');
//     img.src = getShapeImageById(shapeId);
//     img.style.width = '100%';
//     img.style.height = '100%';
//     img.style.objectFit = 'contain';

//     tile.appendChild(img);
//     i++;
//   }, duration);
// }

//PRACTICE TRIAL
function startTrial() {
  const practiceLengths = [2, 2];
  let curr = 0;
  acceptingInput = false;

  function runNext() {
    if (curr >= practiceLengths.length) {
      const overlay = document.getElementById('overlay-message');
      document.getElementById('message-box').textContent = "Practice complete! Press SPACE to begin the experiment, or press ENTER to repeat practice.";
      overlay.style.display = 'flex';
      realTrial = true;
      return;
    }

    const shapeCount = practiceLengths[curr];
    currentTrialSequence = generateShapeSequence(shapeCount);
    playShapeSequenceWithRealDuration(currentTrialSequence, pracTrialDuration[curr], () => {
      userDropLocations = [];
      currentTrialScoreData = [];
      tileElements.forEach(tile => tile.innerHTML = '');
      userInput = [];
      shapesDropped = 0;
      dragNumberThisTrial = 0;

      setTimeout(() => {
        acceptingInput = true;
        enableDragAndDrop();
        trialStartTime = performance.now();
      }, 60);

      //Wait for user to drop all shapes
      const interval = setInterval(() => {
        if (!acceptingInput) {
          clearInterval(interval);
          curr++;
          setTimeout(runNext, 1000); //pause between trials, constant
        }
      }, 1000);
    });
  }
  runNext();
}

//REAL TRIAL 
function startRealTrial() {
  // const trialSetSizes = [
  //   ...Array(6).fill(2),
  //   ...Array(9).fill(3),
  //   ...Array(11).fill(4)
  // ];
  //for testing purposes

  //trial set sizes range from 2 to 4, 26 trials
  // trials 0-6: 2 shapes in seq
  // trials 7-15: 3 shapes in seq
  // trials 16+: 4 shapes in seq
  const trialSetSizes = [2, 2, 2, 2, 2, 2, 3, 3, 3, 3, 3, 3, 3, 3, 3, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4];
  
  let curr = 0;
  acceptingInput = false;

  function runNext() {
    if (curr >= trialSetSizes.length) {
      const overlay = document.getElementById('overlay-message');
      document.getElementById('message-box').textContent = "Experiment complete! Thank you for participating. Please call over the proctor.";
      overlay.style.display = 'flex';

      //trigger CSV download of both logs
      const id = fileSafeId(participantID);
      downloadCSV(`${id}_trialsum.csv`, trialSummaryData);
      downloadCSV(`${id}_dragpath.csv`, dragPathData);

      return;
    }
    const shapeCount = trialSetSizes[curr];
    currentTrialSequence = generateShapeSequence(shapeCount);

    playShapeSequenceWithRealDuration(currentTrialSequence, realTrialDurations[curr], () => {
      userDropLocations = [];
      currentTrialScoreData = []; 
      tileElements.forEach(tile => tile.innerHTML = '');
      userInput = [];
      shapesDropped = 0;
      dragNumberThisTrial = 0;

      setTimeout(() => {
        acceptingInput = true;
        enableDragAndDrop();
        trialStartTime = performance.now();
      }, 60);

      const interval = setInterval(() => {
        if (!acceptingInput) {
          clearInterval(interval);
          curr++;
          setTimeout(runNext, 1000); //1s pause before next sequence
        }
      }, 1000);
    });
  }

  runNext();
}

//POINT calculation - now evaluates after single drop
function evaluateUserInput(tileIndex, imgSrc, expected) {
  console.log("Evaluating drop at tile", tileIndex);

  const fullCreditSequence = [15, 30, 60, 120];
  // let totalCurrTrial = 0;
  // let tileScores = [];
  // let hadMistake = true;

  // Map expected gridIndex -> { shapeId, order }
  const expectedMap = new Map();
  expected.forEach((item, i) => {
    expectedMap.set(item.gridIndex, {
      shapeId: item.shapeId,
      order: i
    });
  });

  // Score based on user drop locations
  // userDropLocations.forEach((drop) => {
  //   const tileIndex = drop.tileIndex;
  //   const expected = expectedMap.get(tileIndex);
  //   let points = 0;

  const isFirstDropOfTrial = currentTrialScoreData.length === 0;

  // see if there were mistakes in prev drop
  const lastDrop = currentTrialScoreData[currentTrialScoreData.length - 1];
  const previousWasPerfect = lastDrop && lastDrop.points >= 15;

  const expectedItem = expectedMap.get(tileIndex);
  let points = 0;


  if (!expectedItem) {
    points = 0;
    //hadMistake = true;
  } else {
    const [dDropped, cDropped] = imgSrc.split('/').pop().replace('.png', '').split('-');
    const [dExpected, cExpected] = getShapeImageById(expectedItem.shapeId).split('/').pop().replace('.png', '').split('-');

    const shapeCorrect = dDropped === dExpected;
    const colorCorrect = cDropped === cExpected;

    if (!shapeCorrect && !colorCorrect) {
      points = 5;
      //hadMistake = true;
    } else if (shapeCorrect ^ colorCorrect) {
      points = 10;
      //hadMistake = true;
    } else {
      if (!previousWasPerfect || isFirstDropOfTrial) {
        points = 15;
      } else {
        let lastPerfectScore = 15;
        for(let i = currentTrialScoreData.length -1; i>=0; i--){
          if (currentTrialScoreData[i].points >= 15) {
            lastPerfectScore = currentTrialScoreData[i].points;
            break;
          }
        }
        points = Math.min(lastPerfectScore * 2, 120);
        //hadMistake = false
      }
    }
  }

  //totalCurrTrial += points;
  //tileScores.push({ index: tileIndex, points });

  return {index: tileIndex, points}
}

function showFeedbackInTiles(scoreData) {
  // 1) Show the per-tile feedback
  scoreData.forEach(({ index, points }) => {
    const tile = tileElements[index];
    tile.innerHTML = '';
    const feedback = document.createElement('div');
    feedback.className = 'feedback';
    feedback.textContent = `${points} pts`;
    tile.appendChild(feedback);
  });

  // 2) Compute exactly what you just showed and add it
  const delta = scoreData.reduce((sum, s) => sum + s.points, 0);
  //debugging
  const label = realTrial ? "🛠 Real trial" : "✅ Practice";
  console.log(`${label} – adding ${delta} to score (before: ${score})`);

  score += delta;
  document.getElementById('score-display').textContent = `Score: ${score}`;

  // 3) Clear the tiles after a pause
  setTimeout(() => {
    tileElements.forEach(tile => tile.innerHTML = '');
  }, 1200);
} 

function enableDragAndDrop() {
  // Sidebar pieces
  document.querySelectorAll('.sidebars .tile img').forEach(img => {
    img.draggable = true;
    img.ondragstart = e => {
      // increment when a NEW drag begins
      dragNumberThisTrial++;

      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', e.target.src);
      const w = e.target.width || 60, h = e.target.height || 60;
      try { e.dataTransfer.setDragImage(e.target, w / 2, h / 2); } catch (_) {}

      // start tracking this drag
      isDragging = true;
    };
  });

  // Grid tiles
  document.querySelectorAll('#grid .tile').forEach(tile => {
  tile.ondragover = e => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  tile.ondrop = e => {
    e.preventDefault();
    if (!acceptingInput) return;

    // stop live path logging for this drag
    isDragging = false;

    const src = e.dataTransfer.getData('text/plain');
    if (!src) return;

    const tileIndex = Number(tile.dataset.index);
    if (!tile.firstChild) shapesDropped++;

    userDropLocations.push({ tileIndex, imgSrc: src });

    tile.innerHTML = '';
    const img = document.createElement('img');
    img.src = src;
    img.draggable = false;
    img.style.width = '100%';
    img.style.height = '100%';
    img.style.objectFit = 'contain';
    tile.appendChild(img);

    // evaluate drop immediately
    const dropScore = evaluateUserInput(tileIndex, src, currentTrialSequence);
    currentTrialScoreData.push(dropScore);

    score += dropScore.points;
    const scoreDisplay = document.getElementById('score-display');
    scoreDisplay.textContent = `Score: ${score}`;

    const immediateFeedback = document.createElement('div');
    immediateFeedback.style.position = 'absolute';
    immediateFeedback.style.top = '50%';
    immediateFeedback.style.left = '50%';
    immediateFeedback.style.transform = 'translate(-50%, -50%)';
    immediateFeedback.style.color = 'white';
    immediateFeedback.style.fontSize = '20px';
    immediateFeedback.style.fontWeight = 'bold';
    immediateFeedback.style.textShadow = '2px 2px 4px rgba(0,0,0,0.8)';
    immediateFeedback.style.pointerEvents = 'none';
    immediateFeedback.style.zIndex = '1000';
    immediateFeedback.textContent = `+${dropScore.points}`;
    tile.style.position = 'relative';
    tile.appendChild(immediateFeedback);

    setTimeout(() => {
      tile.innerHTML = '';
    }, 800);

    const label = realTrial ? "Real trial" : "Practice";
    console.log(`${label} – tile ${tileIndex}: ${dropScore.points} pts (total now: ${score})`);

    if (shapesDropped >= currentTrialSequence.length) {
      acceptingInput = false;
      requestAnimationFrame(() => {
        setTimeout(() => {
          //const scoreData = evaluateUserInput(currentTrialSequence);
          showFeedbackInTiles(currentTrialScoreData);

          trialEndTime = performance.now();
          const durationMs = trialEndTime - trialStartTime;

          const trialLabel = realTrial ? `${realTrialCounter++}` : `P${practiceTrialCounter++}`;
          trialSummaryData.push([
            participantID,
            trialLabel,
            currentTrialSequence.length,
            Math.round(durationMs),
            currentTrialScoreData.reduce((sum, s) => sum + s.points, 0)
          ]);
        }, 800);
      });
    }
  }
});

}



function handleTileClick(e) {
  if (!acceptingInput) return;
  const index = parseInt(e.target.dataset.index);
  userInput.push(index);
  if (userInput.length === sequence.length) {
    acceptingInput = false;
    storeTrial(sequence, userInput);
  }
}

function storeTrial(pattern, response) {
  //to save data (WORK ON MORE)
  console.log("Trial stored:", {
    pattern: [...pattern],
    response: [...response],
    timestamp: Date.now()
  });
}

//csv file 

function fileSafeId(id) {
  return String(id || 'anon').trim().replace(/\s+/g, '_').replace(/[^\w\-]/g, '');
}

function downloadCSV(filename, rows) {
  if (!rows || rows.length === 0) {
    console.warn(`No data to export for ${filename}`);
    return;
  }

  const csvContent = rows.map(row =>
    row.map(field => {
      const clean = String(field ?? "").replace(/"/g, '""'); // Escape quotes
      return `"${clean}"`;
    }).join(",")
  ).join("\n");

  const blob = new Blob([csvContent], { type: "text/csv" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.style.display = "none";
  document.body.appendChild(a);
  a.click();

  // Cleanup
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// FILE UPLOAD
// upload folder
const inputFolder = document.getElementById('custom-images');
const orderFile = document.getElementById('textFile');
const img_files = [];

orderFile.addEventListener('change', function () {
  const files = inputFolder.files;
  const order = orderFile.files[0]
 for(let i = 0; i < files.length; i++){
    console.log(files[i].name);
 }

  // put files in right order
  let reader = new FileReader();
  reader.onload = function(progressEvent) {
    const text = this.result;
    orderFile.innerText = text;

    let lines = text.split('\n');
    for(let line = 0; line < lines.length; line++){
      for(let i = 0; i < files.length; i++){
        if (lines[line] === files[i].name){
          img_files.push(files[i]);
        }
      }
      console.log(lines[line])
    }
      // display file names 
    for(let i = 0; i<img_files.length; i++){
      let fileName = img_files[i] ? img_files[i].name : 'No file chosen';
      const para = document.createElement("p");
      para.innerHTML = 'Selected file ' + (i+1) + ': '  + fileName;
      document.getElementById("settings-panel").appendChild(para);
    }

    if(img_files.length > 0){
      for(let i = 0; i < img_files.length; i++){
        let shape_num = i + 1;
        let shape_id = "shape" + shape_num;
        console.log(shape_id)
        const img_replace = document.getElementById(shape_id);
        img_replace.src = URL.createObjectURL(img_files[i]);
      }
    }
  };
  reader.readAsText(order);
});

function getShapeImageById(id) {
  const shapeURLs = [
    'shapes/circle-red.png',
    'shapes/square-red.png',
    'shapes/triangle-red.png',
    'shapes/diamond-red.png',
    'shapes/circle-blue.png',
    'shapes/square-blue.png',
    'shapes/triangle-blue.png',
    'shapes/diamond-blue.png',
    'shapes/circle-green.png',
    'shapes/square-green.png',
    'shapes/triangle-green.png',
    'shapes/diamond-green.png',
    'shapes/circle-yellow.png',
    'shapes/square-yellow.png',
    'shapes/triangle-yellow.png',
    'shapes/diamond-yellow.png'
  ];
  if (img_files.length > 0){
    return URL.createObjectURL(img_files[id % img_files.length]);
  }
  return shapeURLs[id % shapeURLs.length];
}
