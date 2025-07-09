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

//making the 4x4 grid
tileElements.length = 0;
for(let i = 0; i < gridSize * gridSize; i++) {
    const tile = document.createElement('div');
    tile.classList.add('tile');
    tile.dataset.index = i;
    tile.addEventListener('click', handleTileClick);
    grid.appendChild(tile);
    tileElements.push(tile);
}

document.getElementById('enter-btn').addEventListener('click',() => {
    const input = document.getElementById('participant-id').value.trim();
    if(!input) {
        alert("Please enter your ID before starting.");
        return;
    }

    participantID = input;

    document.getElementById('start-screen').style.display = 'none';
    document.getElementById('all-grids').style.display = 'grid';  // or 'flex' depending on your layout

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
  if(overlay.style.display !== 'flex') return;

  if(e.code === 'Space') {
    overlay.style.display = 'none';

    if(msg.includes("start the practice trial")) {
      // first time: begin practice
      startTrial();

    } else if(msg.includes("begin the experiment")) {
      // after practice: reset & start real experiment
      realTrial = true;
      resetScore();
      startRealTrial();
    }

  } else if(e.code === 'Enter' && msg.includes("repeat practice")) {
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
  
    while(result.length < length) {
      const shapeId = Math.floor(Math.random() * 16);
      const gridIndex = Math.floor(Math.random() * 16);
      if(!usedIndices.has(gridIndex)) {
        result.push({ shapeId, gridIndex });
        usedIndices.add(gridIndex);
      }
    }
  
    return result;
  }
  
//then display/play it
function playShapeSequence(sequence, onComplete) {
    let i = 0;
    const interval = setInterval(() => {
      tileElements.forEach(tile => tile.innerHTML = '');  //clear all tiles
  
      if(i >= sequence.length) {
        clearInterval(interval);
        if(typeof onComplete === 'function') onComplete();
        return;
      }
  
      const { shapeId, gridIndex } = sequence[i];
      const tile = tileElements[gridIndex];
  
      const img = document.createElement('img');
      img.src = getShapeImageById(shapeId);
      img.style.width = '100%';
      img.style.height = '100%';
      img.style.objectFit = 'contain';
  
      tile.appendChild(img);
      i++;
    }, 1000); //show each shape for 1 second
}
let shapesDropped = 0;
let currentTrialSequence = [];

//PRACTICE TRIAL
function startTrial() {
  console.log("▶️ Starting practice trial");

  const practiceLengths = [2, 2];
  let curr = 0;
  fullCreditIndex = 0;
  userDropLocations = [];
  shapesDropped = 0;
  acceptingInput = true;

  function runNext() {
    if(curr >= practiceLengths.length) {
      const overlay = document.getElementById('overlay-message');
      document.getElementById('message-box').textContent = "Practice complete! Press SPACE to begin the experiment, or press ENTER to repeat practice.";
      overlay.style.display = 'flex';
      realTrial = true;
      return;
    }
    
    const shapeCount = practiceLengths[curr];
    currentTrialSequence = generateShapeSequence(shapeCount);  
    playShapeSequence(currentTrialSequence,() => {
      tileElements.forEach(tile => tile.innerHTML = '');
      fullCreditIndex = 0;
      userDropLocations = [];
      acceptingInput = true;
      userInput = [];
      shapesDropped = 0;
      enableDragAndDrop();
      //Wait for user to drop all shapes
      const interval = setInterval(() => {
        if(!acceptingInput) {
          clearInterval(interval);
          curr++;
          setTimeout(runNext, 1000); //pause between trials, constant
        }
      }, 1000); //In real trial, presentation time will not be constant
    });
  }
  runNext();
}

//REAL TRIAL 
function startRealTrial() {
  const trialSetSizes = [
    ...Array(6).fill(2),
    ...Array(9).fill(3),
    ...Array(11).fill(4)
  ];

  let curr = 0;

  function runNext() {
    if(curr >= trialSetSizes.length) {
      const overlay = document.getElementById('overlay-message');
      document.getElementById('message-box').textContent = "Experiment complete! Thank you for participating. Please call over the proctor.";
      overlay.style.display = 'flex';
      return;
    }

    const shapeCount = trialSetSizes[curr];
    currentTrialSequence = generateShapeSequence(shapeCount);

    playShapeSequence(currentTrialSequence, () => {
      tileElements.forEach(tile => tile.innerHTML = '');
      fullCreditIndex = 0;
      acceptingInput = true;
      userInput = [];
      userDropLocations = []; //reset for new trial
      shapesDropped = 0;
      enableDragAndDrop();

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

//POINT calculation
function evaluateUserInput(expected) {
  const fullCreditSequence = [15, 30, 60, 120];
  let totalCurrTrial = 0;
  let tileScores = [];
  let hadMistake = false;

  // Evaluate every drop the user made
  userDropLocations.forEach((drop) => {
    // Try to find the expected item for this drop
    const exp = expected.find((item) => item.gridIndex === drop.tileIndex);
    let points = 0;

    if (!exp) {
      // No expected item for this location
      points = 0;
      hadMistake = true;
    } else {
      const [dDropped, cDropped] = drop.imgSrc.split("/").pop().replace(".png", "").split("-");
      const [dExpected, cExpected] = getShapeImageById(exp.shapeId).split("/").pop().replace(".png", "").split("-");

      const shapeCorrect = dDropped === dExpected;
      const colorCorrect = cDropped === cExpected;

      if (!shapeCorrect && !colorCorrect) {
        points = 5;
        hadMistake = true;
      } else if (shapeCorrect ^ colorCorrect) {
        points = 10;
        hadMistake = true;
      } else {
        // All right
        if (hadMistake) {
          points = 15;
        } else {
          // IMPORTANT: Use exp.order, NOT drop order
          points = fullCreditSequence[exp.order] ?? 15;
        }
      }
    }

    totalCurrTrial += points;

    // Push the result with the drop location
    tileScores.push({ index: drop.tileIndex, points });
  });

  return tileScores;
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
  score += delta;
  document.getElementById('score-display').textContent = `Score: ${score}`;

  // 3) Clear the tiles after a pause
  setTimeout(() => {
    tileElements.forEach(tile => tile.innerHTML = '');
  }, 1200);
}

function enableDragAndDrop() {
    document.querySelectorAll('.sidebars .tile img').forEach(img => {
      img.addEventListener('dragstart', e => {
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', e.target.src);
        const w = e.target.width, h = e.target.height;
        e.dataTransfer.setDragImage(e.target, w / 2, h / 2);
      });
    });
  
    //make grid cells droppable
    const gridTiles = document.querySelectorAll('#grid .tile');
    gridTiles.forEach(tile => {
      tile.addEventListener('dragover', e => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
      });
  
      tile.addEventListener('drop', e => {
        e.preventDefault();
        const src = e.dataTransfer.getData('text/plain');
        if(src) {
            if(!tile.firstChild) shapesDropped++; // only count if it's a new drop
            userDropLocations.push({
            tileIndex: parseInt(tile.dataset.index),
            imgSrc: src
            });

            tile.innerHTML = '';
            const img = document.createElement('img');
            img.src = src;
            img.draggable = false;
            img.style.width = '100%';
            img.style.height = '100%';
            img.style.objectFit = 'contain';
            tile.appendChild(img);
        }
        //check if user dropped enough shapes
        if(shapesDropped >= currentTrialSequence.length && acceptingInput) {
          acceptingInput = false;

          // Wait one animation frame to ensure last shape renders before clearing
          requestAnimationFrame(() => {
            setTimeout(() => {
              const scoreData = evaluateUserInput(currentTrialSequence);
              showFeedbackInTiles(scoreData);
            }, 0); // or 20ms if needed
          });
        }
      });
    });
  }

function handleTileClick(e) {
    if(!acceptingInput) return;
    const index = parseInt(e.target.dataset.index);
    userInput.push(index);
    if(userInput.length === sequence.length) {
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
    return shapeURLs[id % shapeURLs.length];
  }
  
  
  
  