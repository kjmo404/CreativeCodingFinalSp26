// This project is a real-time color analysis predicting interface using ml5.js (FaceMesh), chroma.js, and a state machine.
// The goal is to take facial color data (forehead + cheeks) and classify it into a seasonal palette system.

// The app runs in four states:
// State 0: Intro screen with instructions and a start button.
// State 1: Analyze state where FaceMesh samples skin tones and extracts features over time.
// State 2: Results showing primary season, runner-up, and confidence level.
// The user can generate and regenerate color palettes, like/save them, or move on.
// State 3: Aura mode where the palette is visualized as gradients or effects around the face.

// The system works as a pipeline:
// camera → color sampling → feature extraction → classification → palette generation → visualization

// Confidence represents how strongly one season stands out compared to others.
// High Confidence (70% - 90%) = clear match, medium confidence (40%-60%) = clear season, but overlap between two, Low Confidence(<30%) = ambigous, need to change lighting or more blended between different seasons. 

// Some FaceMesh reference code adapted from:
// https://editor.p5js.org/codingtrain/sketches/HaGkT63qG


//VARIABLES
// video variables
var video; 
let faceMesh; 
let faces =[]; 
function gotFaces(results) {faces = results;}
//state variables
let start = 0;  
let analyze = 1; 
let result = 2; 
let aura = 3; 
let state = start; 

// timer for the analyzing state
let timerStart = 0;
let timerDuration = 120; 
let loadingBarProgress = 0; 

// sidebar + widget info 
let sidebarWidth = 250; 
let smWidgetWidth = 60;
let lgWidgetWidth = 160; 
let widgetCornerRadi = 5; 
let centeredX;
let sidebar;
let auraBtn, like, love, dislike, startBtn, generateBtn; 

//Undertone detection variables
let forehead = [54,103,67,109,10,338,297,332,284,298,333,299,337,9,108,69,104,68];
let lCheek = [147,123,116,111,228,229,230,231,121,47,126,142,203,206,207,187];
let rCheek = [447,345,340,448,449,450,349,355,371,425,427,416,367,352,366,323];

let smoothColor = { r: 0, g: 0, b: 0 };
let smoothConfidence = 0;

let currentResult = { primary: "Analyzing...", runnerUp: "", confidence: 0};

//storage for palettes 
let currentPalette = []; 

//season categories, with base starter color and identity features 
const SEASONS = {
  "Bright Spring 🌼": {base: "#FFB347", temp: 1, value: 0.8, chroma: 0.9, contrast: 0.6},
  "Light Spring 🌸": {base: "#FFD1DC", temp: 1, value: 0.9, chroma: 0.5, contrast: 0.3},
  "True Spring 🌻": { base: "#FFA500", temp: 1, value: 0.7, chroma: 0.8, contrast: 0.4},

  "Soft Autumn 🍂": {base: "#C19A6B", temp: 1, value: 0.5, chroma: 0.3, contrast: 0.3},
  "Deep Autumn 🍁": {base: "#8B4000", temp: 1, value: 0.3, chroma: 0.6, contrast: 0.8},
  "True Autumn 🌰": {base: "#A0522D", temp: 1, value: 0.5, chroma: 0.5, contrast: 0.5 },

  "Light Summer 🌷": {base: "#E6A8D7", temp: -1, value: 0.9, chroma: 0.4, contrast: 0.2},
  "Soft Summer 🌫️": { base: "#B0C4DE", temp: -1, value: 0.6, chroma: 0.3, contrast: 0.2},
  "True Summer 💐": { base: "#7FB3D5", temp: -1, value: 0.7, chroma: 0.5, contrast: 0.3 },

  "Deep Winter ❄️": { base: "#2C2C54", temp: -1, value: 0.2, chroma: 0.8, contrast: 0.9 },
  "Bright Winter 🌟": { base: "#00AEEF", temp: -1, value: 0.6, chroma: 1.0, contrast: 0.9 },
  "True Winter 🧊": { base: "#4682B4", temp: -1, value: 0.4, chroma: 0.9, contrast: 0.7}
};

// PRELOAD, SETUP, AND DRAW LOOPS 

// preload function to enable the faceMesh features 
function preload() {faceMesh = ml5.faceMesh({ maxFaces: 1, flipped: true});} // Initialize FaceMesh model with a maximum of one face and flipped video input 

// setup function to enable variables/widgets
function setup() {
    createCanvas(800, 800);//init canvas
    // setup for the face mesh pixels
    // pixelDensity(1); // initially used to track region points
    video = createCapture(VIDEO);
    video.size(width, height);
    video.hide();
    faceMesh.detectStart(video, gotFaces);

    //sidebar + widget Init
    sidebar = new SidebarUI(sidebarWidth);
    centeredX = sidebar.getCenterX();

    like = new SmallWidgetUI (centeredX +200, height - 100, "👍"); 
    love = new SmallWidgetUI (centeredX , height - 100, "❤️"); 
    dislike = new SmallWidgetUI (centeredX + 200, height - 100, "👎"); 

    startBtn = new LongWidgetUI(centeredX, 200, "Start!"); 
    generateBtn = new LongWidgetUI(centeredX, 100, "Generate"); 
    auraBtn = new LongWidgetUI(centeredX, 200, "Aura Filters"); 
}
// draw loop
function draw() {
   background(220);
  // camera
   image(video, 0, 0); 

  //sidebar methods
  sidebar.animate();
  sidebar.display();
  // sidebar logic
  displayUI();
}
// FUNCTIONS 

// Feature Extraction and Math
function extractFeatures(rgb, hsv, contrast) {
  return {
    temp: (hsv.h < 60 || hsv.h > 300) ? 1 : -1, // warm vs cool
    value: hsv.v,                                // brightness value
    chroma: hsv.s,                    // clamp low saturation
    contrast: constrain(contrast / 100, 0, 1)
  };
} // breaks the color into features to classify seasons
function rgbToHsv(r, g, b) {
  r /= 255; g /= 255; b /= 255;

  let maxVal = max(r, g, b);
  let minVal = min(r, g, b);
  let d = maxVal - minVal;

  let h = 0;
  if (d !== 0) {
    if (maxVal === r) h = ((g - b) / d) % 6;
    else if (maxVal === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h *= 60;
    if (h < 0) h += 360;
  }

  let s = maxVal === 0 ? 0 : d / maxVal;
  let v = maxVal;

  return { h, s, v };
} // takes the rgb values of the undertone and converts it to hue, saturation, and value values for categorizing, math from https://math.stackexchange.com/questions/556341/rgb-to-hsv-color-conversion-algorithm
function getDistance(a, b) {
  return Math.sqrt(
    pow((a.temp - b.temp) * 2.0, 2) +      
    pow((a.value - b.value) * 1.0, 2) +
    pow((a.chroma - b.chroma) * 1.0, 2) +
    pow((a.contrast - b.contrast) * 1.5, 2) 
  );
} // calculates how close the user is to each season based on undertone and constrast

// Classifying Logic
function classifySeason(features) {
  let results = [];

  for (let name in SEASONS) {
    let dist = getDistance(features, SEASONS[name]);
    let score = 1 / (dist + 0.001);

    results.push({ name, score });
  }

  // normalize scores
  let total = results.reduce((sum, r) => sum + r.score, 0);

  results = results.map(r => ({
    name: r.name,
    prob: r.score / total
  }));

  // sharpen probabilities
  results = results.map(r => ({
    name: r.name,
    prob: pow(r.prob, 1.5)
  }));

  // renormalize after sharpening
  total = results.reduce((sum, r) => sum + r.prob, 0);

  results = results.map(r => ({
    name: r.name,
    prob: r.prob / total
  }));

  // sort
  results.sort((a, b) => b.prob - a.prob);

  return {
    primary: results[0].name,
    runnerUp: results[1].name,
    confidence: results[0].prob * 100
  };
} // lists what season the user is, with the runner up and confidence level to make up for possible computer camera quality

// Creating Palettes
function generatePalette(seasonName) {
  let s = SEASONS[seasonName];
  let base = chroma(s.base);

let contrastRange = map(s.contrast, 0, 1, 5, 25);

let jitterLight = random(-contrastRange, contrastRange);
let jitterDark = random(-contrastRange, contrastRange);

  let lightL = constrain(s.value * 100 + 20 + jitterLight, 0, 100);
  let darkL  = constrain(s.value * 100 - 20 + jitterDark, 0, 100);

  let scale = chroma.scale([
    base.set('lch.l', lightL),
    base,
    base.set('lch.l', darkL)
  ])
  .mode('lch')
  .correctLightness();

  let colors = scale.colors(6);

  // 🎨 chroma shaping (with slight randomness too 👀)
  colors = colors.map(c => {
    let chromaJitter = random(-0.2, 0.2);
    return chroma(c)
      .saturate((s.chroma - 0.5) * 2 + chromaJitter)
      .hex();
  });

  return colors;
} // given the first season given to user, it generates a compatible palette for the user

// Color Analysis
function runColorAnalysis() {
  if (faces.length === 0) return;

  let face = faces[0];
  let kp = face.keypoints;

  let fColor = getAverageColor(kp, forehead);
  let lColor = getAverageColor(kp, lCheek);
  let rColor = getAverageColor(kp, rCheek);

  let combined = { r: (fColor.r + lColor.r + rColor.r) / 3, g: (fColor.g + lColor.g + rColor.g) / 3, b: (fColor.b + lColor.b + rColor.b) / 3};

  // smooth color over time
  smoothColor.r = lerp(smoothColor.r, combined.r, 0.1);
  smoothColor.g = lerp(smoothColor.g, combined.g, 0.1);
  smoothColor.b = lerp(smoothColor.b, combined.b, 0.1);

  let hsv = rgbToHsv(smoothColor.r, smoothColor.g, smoothColor.b);

  // penalty instead of early return
  let penalty = 1;
  if (hsv.s < 0.1 || hsv.v < 0.15) {penalty = 0.5; }

  let hairCol = getHairSample(kp);
  let hairBrightness = (hairCol[0] + hairCol[1] + hairCol[2]) / 3;
  let skinBrightness = (smoothColor.r + smoothColor.g + smoothColor.b) / 3;
  let contrast = abs(skinBrightness - hairBrightness);

  let features = extractFeatures(smoothColor, hsv, contrast);
  let result = classifySeason(features);

  // apply penalty
  result.confidence *= penalty;
  smoothResults(result);
} // collects the average color from each region (forehead + cheeks) and averages them into one value for r, g, and b
function smoothResults(newResult) {
  smoothConfidence = lerp(smoothConfidence, newResult.confidence, 0.1);

  currentResult.primary = newResult.primary;
  currentResult.runnerUp = newResult.runnerUp;
  currentResult.confidence = smoothConfidence;
} // smooth the results of the undertone classifier so it doesnt change the outcome in every frame

// Sampling Helpers 
function getAverageColor(kp, indices) {
  let r = 0, g = 0, b = 0;

  for (let i of indices) {
    let p = kp[i];
    let col = get(int(p.x), int(p.y));

    r += col[0];
    g += col[1];
    b += col[2];
  }

  let n = indices.length;

  return { r: r / n, g: g / n, b: b / n };
} // retrieves the avarage undertone color from a region by measuring rgb values from each point
function getHairSample(kp) {
  let p = kp[10];
  return get(int(p.x), int(p.y - 40));
} //using position for the highest keypoint  of the faceMesh to create keypoint that analyzes hair as well

// UI Helpers
function displayUI() {
// state 0 
  if (state == start) {
    startBtn.x = centeredX;
    startBtn.display();
  }
// state 1
  else if (state == analyze) {
   runAnalyzeState(); 
  }
// state 2
  else if (state == result) {
    generateBtn.x = centeredX;
    auraBtn.x = centeredX;

    generateBtn.display();
    auraBtn.display();

    like.x = centeredX - 60;
    love.x = centeredX;
    dislike.x = centeredX + 60;

    drawPalette(currentPalette);

    like.display();
    love.display();
    dislike.display();

    fill(0);
    textAlign(CENTER);
    textSize(16);

    text(currentResult.primary, centeredX, 320);
    text("Runner-up: " + currentResult.runnerUp, centeredX, 350);
    text("Confidence: " + nf(currentResult.confidence,1,1) + "%", centeredX, 380);
  }
// state 3
  else if (state == aura) {
    fill(0);
    textAlign(CENTER);
    text("Aura Mode", width / 2, 50);
  }
} // controls the Ui sidebar + widgets mechanics for the state machine
function drawPalette(colors) {
  if (!colors || colors.length === 0) return;

  let boxSize = 45;
  let spacing = 5;

  let totalWidth = colors.length * (boxSize + spacing);
  let startX = centeredX - totalWidth / 2;
  let y = 430;

  for (let i = 0; i < colors.length; i++) {
    fill(colors[i]);
    rect(startX + i * (boxSize + spacing), y, boxSize, boxSize, 8);
  }
} // designs how the palette looks like on the UI sidebar
function drawLoadingBar(progress) {
 // loading bar variables
  let margin = 40;
  let y = 50;
  let startX = margin;
  let endX = width - margin;
  let currentX = startX + (endX - startX) * progress;

  //base line shadow
  stroke(200);
  strokeWeight(3);
  line(startX, y, endX, y);

  // growing loading line
  stroke(0, 150, 255);
  strokeWeight(5);
  line(startX, y, currentX, y);

  // text
  noStroke();
  fill(0);
  textAlign(CENTER);
  textSize(16);
  text("Scanning...", width / 2, y + 25);
} // creates the loading bar for the analyzing state

//Interaction Function
function mousePressed() {
  if (state == start && startBtn && startBtn.isClicked()) {
    state = analyze;
    // init loading bar mechanics
    sidebar.hide();
    timerStart= 0; 
    loadingBarProgress = 0; 
  }

  else if (state == analyze) {
    fill(255, 255, 255, 120);
    rect(0, 0, width, height);
  }

  else if (state == result) {
    // generates the palette for the first choice season
    if (generateBtn && generateBtn.isClicked()) {
       if (SEASONS[currentResult.primary]) { currentPalette = generatePalette(currentResult.primary); }
 }

    if (auraBtn && auraBtn.isClicked()) {
      state = aura;
      sidebar.hide();
    }

    // if the user pressed dislike, another palette is generated
    if (dislike && dislike.isClicked()) { 
        if (SEASONS[currentResult.primary]) { currentPalette = generatePalette(currentResult.primary);}
    }
    }

  else if (state == aura) {
    //switches back from aura to result
    state = result;
    sidebar.show();
  }
}// state machine 
function runAnalyzeState() {

  // loading bar step forward
  timerStart += 1;
  loadingBarProgress += 1 / timerDuration;
  loadingBarProgress = constrain(loadingBarProgress, 0, 1);

  runColorAnalysis(); // run color analysis

  drawLoadingBar(loadingBarProgress); // draw loading bar UI

  if (timerStart >= timerDuration) {
    state = result;
    sidebar.show();
  } // if done, state == result
}// loading bar mechanics and runs the color analysis while the loading animation is going on

// CLASSES FOR UI FEATURES
class SidebarUI{ // may include an arrow tab to click on and if clicked, it controls the showing and hiding of the sidebar and its widgets
   constructor(w) {
    this.w = w;
    this.x = width - w;     // current position from top left
    this.targetX = this.x;  // where it wants to go for the animation
    this.speed = 10;
    this.visible = true;
  }

  animate() {
    if (this.x < this.targetX) { this.x += this.speed;} // for showing sidebar
    else if (this.x > this.targetX) {this.x -= this.speed; } // for hiding sidebar
  }

  display() {
    rectMode(CORNER);
    noStroke();
    fill(250);
    rect(this.x, 0, this.w, height); 
  }

   getCenterX() {return this.x + this.w / 2;} //used for the placement of widgets
   
   hide() {
    this.targetX = width;
    this.visible = false;
  }

  show() {
    this.targetX = width - this.w;
    this.visible = true;
  }

  toggle() {
    if (this.visible) this.hide();
    else this.show(); 
  } // switches between show and hide
}
class SmallWidgetUI{
  constructor(x,y,emoji){
    this.x = x; 
    this.y = y; 
    this.w = smWidgetWidth; 
    this.cornerradi = widgetCornerRadi; 
    this.icon = emoji; 
  }

  display(){  
    noStroke();
    rectMode(CENTER);

    // shadow
    fill(200,200);
    rect(this.x + 5, this.y, this.w, this.w, this.cornerradi);
    rect(this.x + 5, this.y + 5, this.w, this.w, this.cornerradi);

    // button
    fill(240);
    rect(this.x, this.y, this.w, this.w, this.cornerradi); 

    // icon
    push();  
    textAlign(CENTER, CENTER);
    textSize(50);               
    text(this.icon, this.x, this.y);      
    pop();
  } 

  isClicked(){
    let d = dist(mouseX, mouseY, this.x, this.y); 
    return d < this.w / 2; 
  }
}
class LongWidgetUI{
  constructor(x,y,text){
    this.x = x; 
    this.y = y; 
    this.w = lgWidgetWidth; 
    this.h = smWidgetWidth; 
    this.cornerradi = widgetCornerRadi; 
    this.txt = text; 
  }

  display(){
    rectMode(CENTER);
    noStroke();

    // shadow
    fill(200,200);
    rect(this.x + 4, this.y + 4, this.w, this.h, this.cornerradi);

    // button
    fill(255);
    rect(this.x, this.y, this.w, this.h, this.cornerradi);

    // text
    fill(0);
    textAlign(CENTER, CENTER);
    textSize(14);
    text(this.txt, this.x, this.y);
  }

 isClicked(){
  return (
    mouseX > this.x - this.w/2 &&
    mouseX < this.x + this.w/2 &&
    mouseY > this.y - this.h/2 &&
    mouseY < this.y + this.h/2
  );
}
}