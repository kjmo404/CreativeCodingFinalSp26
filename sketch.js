// This project is a real-time color analysis predicting interface using ml5.js (FaceMesh), chroma.js, and a state machine.
// The goal is to take facial color data (forehead + cheeks) and classify it into a seasonal palette system.

// The app runs in four states:
// State 0: Intro screen with instructions and a start button.
// State 1: Analyze state where FaceMesh samples skin tones and extracts features over time.
// State 2: Results showing primary season, runner-up, and palette testing.
// The user can generate and regenerate color palettes, like/save them, or move on.
// State 3: Aura mode where the chosen palette color tints the camera.

// The system works as a pipeline:
// camera -> color sampling -> feature extraction -> classification -> palette generation -> visualization

// Some FaceMesh reference code adapted from:
// https://editor.p5js.org/codingtrain/sketches/HaGkT63qG


//VARIABLES
// video variables
var video; 
let faceMesh; 
let faces = []; 
function gotFaces(results) { faces = results; }
//state variables
let start = 0;  
let analyze = 1; 
let result = 2; 
let aura = 3; 
let state = start; 
// toggle selection indicator
let selectedSeasonLabel = "Primary"; 
// timer for the analyzing state
let timerStart = 0;
let timerDuration = 120; 
let loadingBarProgress = 0; 
// UI info
let sidebarWidth = 250; 
let smWidgetWidth = 60;
let lgWidgetWidth = 160; 
let widgetCornerRadi = 5;
let centeredX;
let sidebar;
let auraBtn, like, love, dislike, startBtn, generateBtn, toggleBtn;
let particles = [];
//Undertone detection variables
let forehead = [54,103,67,109,10,338,297,332,284,298,333,299,337,9,108,69,104,68];
let lCheek = [147,123,116,111,228,229,230,231,121,47,126,142,203,206,207,187];
let rCheek = [447,345,340,448,449,450,349,355,371,425,427,416,367,352,366,323];
let smoothColor = { r: 0, g: 0, b: 0 };
let currentResult = { primary: "Analyzing...", runnerUp: ""};
//storage for palettes 
let currentPalette = []; 
let savedPalettes = []; 
let selectedSeason = "";
let selectedPaletteColor = null;
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
const SEASON_PALETTES = {

  // 🌼 SPRING (warm + clear)
  "Bright Spring 🌼": [
    "#FF6F61", "#FF9A3C", "#FFD166",
    "#A8E063", "#00C49A", "#00AEEF",
    "#FF5E78", "#FFA07A", "#F4E04D",
    "#7ED957", "#2EC4B6", "#4CC9F0"
  ],

  "Light Spring 🌸": [
    "#FFD1DC", "#FFB7B2", "#FFE4A1",
    "#FFF3B0", "#C1E1C1", "#A0D6B4",
    "#FADADD", "#F6C1C1", "#FFE8A3",
    "#E6F2C2", "#BDE0C4", "#CDEDF6"
  ],

  "True Spring 🌻": [
    "#FFA500", "#FF7F50", "#FFD700",
    "#9ACD32", "#3CB371", "#20B2AA",
    "#FF8C00", "#FF6347", "#FFEA00",
    "#7FFF00", "#2ECC71", "#40E0D0"
  ],

  // 🍂 AUTUMN (warm + muted/deep)
  "Soft Autumn 🍂": [
  "#7BB5A3", "#233658", "#405E5C",
  "#345E8B", "#7BA0C0", "#568F91",
  "#29495C", "#8EC5B6", "#437D6D",
  "#527EA9", "#F8A3A4", "#782A39",
  "#AD3E48", "#BF6464", "#E29C93",
   "#D77E70", "#B35A66", "#FDC3C6",
   "#B44E5D", "#DC7178",  "#905F51",
   "#583432", "#56584C", "#855C4B", 
   "#A7A781", "#91946E", "#683B39",
   "#9B716B", "#535040", "#817A60",
   "#E1DBC9", "#C3BDAB", "#BAB696",
   "#DED7C8","#F0EBD7" ],

  "True Autumn 🌰": [
   "#9C9A40", "#C2C18D", "#424136",
   "#67592A", "#9AA067", "#5BACC3",
   "#097988", "#54AFBC", "#19454B",
   "#20706F", "#A73340", "#FB9F93",
   "#5B2B38", "#73272D", "#EA6B6A",
   "#C25A3C", "#BE4B3B", "#EC935E",
   "#8D3F2D", "#DC793E", "#A1665B",
   "#E6AF91", "#4B342F", "#7C423C",
   "#D99B7C", "#8A7963", "#685E4F",
   "#BFB9A3", "#46483D",  "#80856D", 
   "#D0C5B1", "#E6DAC4", "#E0C992",
   "#F3E0AC", "#DFD1BB"],

  "Deep Autumn 🍁": [
    "#4D9E9A", "#BE9B64", "#578270",
    "#4B4139", "#60C8B3", "#324241",
    "#755D24", "#63563B", "#12574A",
    "#9A8B4F", "#C65D52", "#263B51",
    "#BB4A4D", "#61234A", "#EC9688",
    "#6C2831", "#BA69A1", "#A3497C",
    "#7E3940", "#D8A1C4", "#8F8982",
    "#B37256", "#5A5348", "#C68F65",
    "#CBC1B3", "#534D50", "#B08E51",
    "#99642C", "#A69483", "#D6AF66",
    "#CEBBA8", "#C5A582", "#EAD3AE",
    "#EECFAD", "#E4D7C5"],

  // 🌷 SUMMER (cool + soft/light)
  "Light Summer 🌷": [
   "#159C88","#02B694", "#1A9E74",
   "#63DBBF","#2A675C","#279D9F",
   "#38AECD", "#8DCCDD", "#1B7F8E",
  "#44BBCA", "#5D81BC", "#80A0D4",
  "#36629F", "#94B2DF", "#1A5190",
  "#E35B8F", "#E6798E","#F5B0BD",
  "#BD4275", "#F18AAD", "#F56C73",
  "#F25F66", "#E4455E","#FF8D94",
 "#BE394F", "#675758", "#967C7F",
 "#BBA5A0", "#5D3C43", "#6C5656",
 "#C1BCAC", "#D6D1C0","#A89C94",
  "#E8E4DA","#827D77"],

  "Soft Summer 🌫️": [
  "#619187", "#DCD8A8", "#89C099",
  "#CFC486","#335749","#426972",
  "#7FBFC5","#648589", "#5D9CA4",
  "#274E55", "#858FB1", "#62617E",
  "#AAADC2", "#353A4C","#767BA5",
  "#A76E7A", "#DBA9B7", "#884C5E",
  "#CE8498", "#4E3246", "#EFA6AA",
  "#B45865", "#F4C6C3", "#95424E",
  "#E78B90", "#7B797B","#ABAFAE",
  "#5B585A","#686D6C", "#413E3D", 
  "#DDD5C7","#978D89", "#DBDDD1",
  "#736460", "#BBB1A8" ],

  "True Summer 💐": [
 "#7FBB9E", "#226C63","#2D80A7",
 "#3AA278", "#478589","#16525A",
 "#62BBC5","#5EB0CF","#3C7D90",
 "#1F6680", "#7C83BC","#E9738D",
 "#DE98AB","#D2738F", "#BC4869",
 "#842C48", "#646093", "#A2A9D1",
 "#48457A","#3A395F","#76849B",
  "#99888D","#C5C5C5", "#B5ACAB",
  "#73606A", "#48464A", "#99AEAE",
  "#8C9DAD","#697A7E", "#4E545B",
  "#605752", "#BEB7B0", "#DAD8C9",
   "#D3C9BE", "#918C86"],

  // ❄️ WINTER (cool + high contrast)
  "Bright Winter 🌟": [
    "#e6decf", "#aba798", "#827e7c",
    "#726f70", "#f2e6b1", "#f7d1d1",
    "#b8e2dc", "#f5d6e6", "#bfb4cb",
    "#ec8b8d", "#d94f71", "#d2386c",
    "#a32857", "#7c2946", "#d4367a",
    "#ca4286", "#c0428a", "#ab3475",
    "#8c3573", "#707bb4", "#5a5b9f",
    "#333e83", "#5b7ebd", "#3950a0", 
    "#5cc8d7", "#009499","#2da8d8", 
    "#0084bd", "#00698b", "#2b3042", 
    "#45413c", "#4e4b51", "#373838",
    "#28282d" ],

  "True Winter 🧊": [
    "#B4E8EC", "#F3D4DF", "#D2CFC4",
    "#E2E2DA", "#95908B", "#73706F",
    "#EDF1FF", "#BDC6DC", "#EEEA97",
    "#BCD9C8", "#823270", "#F1A6CC",
    "#DE9BC4", "#B73275", "#C180B5",
    "#AC5D98", "#EDBEDC", "#642B60",
    "#DA6CA1", "#92316F", "#23305B",
    "#2A6A8B", "#15A3C7", "#0B6F69",
    "#4A5FA5", "#203C7F", "#6E81BE",
    "#252A48", "#009B8C", "#27535A",
    "#392C2B", "#403F6F", "#544275",
    "#4E3E3A", "#252A48"],

  "Deep Winter ❄️": [
    "#2A2B2D", "#40A48E", "#006E52",
    "#194B46", "#1E3A3C", "#1F2C43",
    "#69BBDD", "#1578A7", "#104E67",
    "#266691", "#502E55", "#B085B7",
    "#634177", "#262735", "#9469A2",
    "#5D2935", "#B31B38", "#9F2436",
    "#8A2232", "#77202F", "#C43362",
    "#FB90A2", "#CE3D66", "#962D49",
    "#CF5C78", "#BAB8D3","#F0E79D", 
    "#BAE5D6","#B4DCEA", "#9C9B98",
    "#F4F7FF", "#CAC2B9","#6C6868", 
    "#DFDDD7"]
};

// PRELOAD, SETUP, AND DRAW LOOPS 

// preload function to enable the faceMesh features 
function preload() {
  faceMesh = ml5.faceMesh({ maxFaces: 1, flipped: true});
} // Initialize FaceMesh model with a maximum of one face and flipped video input 

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

    for(let i = 0; i < 45; i++){ particles.push(makeParticle()); }

    like = new SmallWidgetUI (centeredX +200, height - 150, "👍"); 
    love = new SmallWidgetUI (centeredX , height - 150, "❤️"); 
    dislike = new SmallWidgetUI (centeredX + 200, height - 150, "👎"); 

    startBtn = new LongWidgetUI(centeredX, 200, "Start!"); 
    generateBtn = new LongWidgetUI(centeredX, 100, "Generate"); 
    auraBtn = new LongWidgetUI(centeredX, 170, "Tint Camera"); 
    toggleBtn = new LongWidgetUI(centeredX, 240, "Toggle Season");
}

// draw loop
function draw() {
  let bgColor = selectedPaletteColor || "#ffffff";
  background(bgColor);
  if (state == aura && selectedPaletteColor) {
    let tintColor = color(selectedPaletteColor);
    tint(red(tintColor), green(tintColor), blue(tintColor), 225);
  }
  else if (state == result && selectedPaletteColor) {tint(255, 230); }
  image(video, 0, 0, width, height);
  noTint();
  if (state == result) { drawSeasonParticles();}

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
  return Math.sqrt(pow((a.temp - b.temp) * 2.0, 2) + pow((a.value - b.value) * 1.0, 2) + pow((a.chroma - b.chroma) * 1.0, 2) + pow((a.contrast - b.contrast) * 1.5, 2)  );
} // calculates how close the user is to each season based on undertone and constrast

// Classifying Logic
function classifySeason(features) {
  let results = [];
  for (let name in SEASONS) {
    let d = getDistance(features, SEASONS[name]);
    results.push({ name, score: 1 / (d + 0.001) });
  }
  results.sort((a,b)=>b.score-a.score);
  let sum = results.reduce((s,r)=>s+r.score,0);
  results = results.map(r=>({name:r.name,prob:r.score/sum}));
  return {primary: results[0].name, runnerUp: results[1].name};
} // lists what season the user is, with the runner up to make up for possible computer camera quality

// Creating Palettes
function generatePalette(seasonName) {
  let palette = SEASON_PALETTES[seasonName];
  if (!palette) return [];
  // pick 6 random colors
  let selected = shuffle([...palette]).slice(0, 6);
  //slight variation
  selected = selected.map(c => chroma(c).saturate(random(-0.15, 0.15)).hex());
  return selected;
}// given the first season given to user, it generates a compatible palette for the user

// Color Analysis
function runColorAnalysis() {
  if (faces.length === 0) return;
  let face = faces[0];
  let kp = face.keypoints;

  let f = getAverageColor(kp, forehead);
  let l = getAverageColor(kp, lCheek);
  let r = getAverageColor(kp, rCheek);
  let combined = { r:(f.r+l.r+r.r)/3,  g:(f.g+l.g+r.g)/3, b:(f.b+l.b+r.b)/3 };

  smoothColor.r = lerp(smoothColor.r, combined.r, 0.1);
  smoothColor.g = lerp(smoothColor.g, combined.g, 0.1);
  smoothColor.b = lerp(smoothColor.b, combined.b, 0.1);

  let hsv = rgbToHsv(smoothColor.r, smoothColor.g, smoothColor.b);
  let features = {temp: (hsv.h < 60 || hsv.h > 300) ? 1 : -1,value: hsv.v, chroma: hsv.s,contrast: 0.5 };
  let result = classifySeason(features);
  smoothResults(result);
}
 // collects the average color from each region (forehead + cheeks) and averages them into one value for r, g, and b
function smoothResults(newResult) {
  currentResult.primary = newResult.primary;
  currentResult.runnerUp = newResult.runnerUp;
} // smooth the results of the undertone classifier so it doesnt change the outcome in every frame

// Sampling Helpers 
function getAverageColor(kp, indices) {
  let r = 0, g = 0, b = 0;
  let validSamples = 0;

  for (let i of indices) {
    let p = kp[i];
    let x = int(p.x);
    let y = int(p.y);

    if (x >= 0 && x < width && y >= 0 && y < height) {
      let col = get(x, y);
      r += col[0];
      g += col[1];
      b += col[2];
      validSamples++;
    }
  }
  if (validSamples === 0) return { r: 128, g: 128, b: 128 };
  return { r: r / validSamples, g: g / validSamples, b: b / validSamples };
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
    drawSeasonGuide();
  }
// state 1
  else if (state == analyze) {
   runAnalyzeState(); 
  }
// state 2
  else if (state == result) {
    generateBtn.x = centeredX;
    auraBtn.x = centeredX;
    toggleBtn.x = centeredX;
    toggleBtn.txt = selectedSeasonLabel === "Primary" ? "Show Runner-up" : "Show Primary";

    generateBtn.display();
    auraBtn.display();
    toggleBtn.display();

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
    textSize(14);
    text("Showing: " + selectedSeasonLabel, centeredX, 390);
  }
// state 3
  else if (state == aura) {
    fill(0);
    textAlign(LEFT);
    textSize(14);
    text("Click anywhere to exit Aura Mode", 20, height - 20);
  }
} // controls the Ui sidebar + widgets mechanics for the state machine
function drawSeasonGuide(){
   let seasons = [
    ["🌸","Spring","warm + bright tones"],
    ["☀️","Summer","cool + soft tones"],
    ["🍂","Autumn","warm + muted tones"],
    ["❄️","Winter","cool + bold tones"]
  ];

  for(let i = 0; i < seasons.length; i++){
    let x = 70 + i * 160;
    fill(255,230);
    rect(x,520,130,140,20);
    fill(0);
    textAlign(CENTER);
    textSize(40);
    text(seasons[i][0],x ,500);
    textSize(18);
    text(seasons[i][1],x,540);
    textSize(12);
    text(seasons[i][2],x,560);
  }
} //description of the seasons for the user to understand the results at the start

function getSeasonFamily(seasonName) {
  if (!seasonName) return "";
  if (seasonName.includes("Spring")) return "Spring";
  if (seasonName.includes("Summer")) return "Summer";
  if (seasonName.includes("Autumn")) return "Autumn";
  if (seasonName.includes("Winter")) return "Winter";
  return "";
} // helper function to categorize the season into one of the four families for the particle effects in the result state

function makeParticle() {
  return {x: random(width), y: random(height), size: random(8, 24), speed: random(0.6, 2.1), drift: random(-1.1, 1.1), spin: random(TWO_PI)};
}// create particles
function resetParticle(p) {
  p.x = random(width);
  p.y = random(-80, -10);
  p.size = random(8, 24);
  p.speed = random(0.6, 2.1);
 p.drift = random(-1.1, 1.1);
} // resets particles to the top of the screen

function drawSeasonParticles() {
  let family = getSeasonFamily(selectedSeason);
  if (!family) return;

  for (let p of particles) {
    p.y += p.speed;
    p.x += sin(frameCount * 0.02 + p.spin) * p.drift;
    p.spin += 0.03;

    if (p.y > height + 40 || p.x < -40 || p.x > width + 40) {
      resetParticle(p);
    }

    noStroke();
    if (family === "Spring") {
      fill(255, 142, 186, 170);
      ellipse(p.x, p.y, p.size, p.size * 0.72);
      ellipse(p.x + p.size * 0.28, p.y - p.size * 0.15, p.size * 0.75, p.size * 0.5);
    }// if the result is in the spring region, petals will fall down from the top 
    else if (family === "Summer") {
      noFill();
      stroke(160, 220, 235, 170);
      strokeWeight(2);
      ellipse(p.x, p.y, p.size, p.size);
    }// if the result is in the summer region, bubbles will fall down from the top 
    else if (family === "Autumn") {
      push();
      translate(p.x, p.y);
      rotate(p.spin);
      fill(191, 100, 64, 175);
      ellipse(0, 0, p.size * 1.25, p.size * 0.65);
      stroke(115, 60, 42, 120);
      strokeWeight(1);
      line(-p.size * 0.5, 0, p.size * 0.5, 0);
      pop();
    }// if the result is in the autumn region, leaves will fall down from the top
    else if (family === "Winter") {
      stroke(230, 250, 255, 180);
      strokeWeight(2);
      line(p.x - p.size * 0.45, p.y, p.x + p.size * 0.45, p.y);
      line(p.x, p.y - p.size * 0.45, p.x, p.y + p.size * 0.45);
      line(p.x - p.size * 0.3, p.y - p.size * 0.3, p.x + p.size * 0.3, p.y + p.size * 0.3);
      line(p.x - p.size * 0.3, p.y + p.size * 0.3, p.x + p.size * 0.3, p.y - p.size * 0.3);
    }// if the result is in the winter region, snowflakes will fall down from the top 
  }
} // draws the seasonal particles that fall down from the top of the screen in the result state, with different shapes for each season
function drawPalette(colors) {
  if (!colors || colors.length === 0) return;
  let layout = getPaletteLayout(colors.length);
  rectMode(CORNER);

  for (let i = 0; i < colors.length; i++) {
    let x = layout.startX + i * (layout.boxW + layout.spacing);
    // swatch
    fill(colors[i]);
    noStroke();
    rect(x, layout.y, layout.boxW, layout.boxH, 12);
    // selected outline
    if (selectedPaletteColor === colors[i]) {
      noFill();
      stroke(0);
      strokeWeight(4);
      rect(x, layout.y, layout.boxW, layout.boxH, 12);
    }
  }
}// designs how the palette looks like at the bottom of the screen and highlights the color that is selected for the aura/tint mode

function getPaletteLayout(colorCount) {
  let boxW = 90;
  let boxH = 50;
  let spacing = 10;
  let webcamWidth = width - sidebarWidth;
  let webcamCenter = webcamWidth / 2;
  let totalWidth = colorCount * boxW + (colorCount - 1) * spacing;
  return {
    boxW: boxW,
    boxH: boxH,
    spacing: spacing,
    startX: webcamCenter - totalWidth / 2,
    y: height - 120
  };
}// fixes the layout of the palette swatches

function getPaletteSwatchAt(px, py) {
  if (!currentPalette || currentPalette.length === 0) return null;
  let layout = getPaletteLayout(currentPalette.length);

  for (let i = 0; i < currentPalette.length; i++) {
    let x = layout.startX + i * (layout.boxW + layout.spacing);
    if (px >= x && px <= x + layout.boxW && py >= layout.y && py <= layout.y + layout.boxH) { return currentPalette[i];}
  }
  return null;
}// Lets the user click on a color swatch from the palette to select it for the aura/tint mode
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
    let clickedSwatch = getPaletteSwatchAt(mouseX, mouseY);
    if (clickedSwatch) {
      selectedPaletteColor = clickedSwatch;
      return;
    }

    // generates the palette for the first choice season
    if (generateBtn && generateBtn.isClicked()) {
       if (SEASONS[selectedSeason]) {
        currentPalette = generatePalette(selectedSeason);
        selectedPaletteColor = currentPalette[0] || null;
      }
 }

    if (auraBtn && auraBtn.isClicked()) {
      state = aura;
      sidebar.hide();
    }
    
    if(toggleBtn && toggleBtn.isClicked()){
      if(selectedSeason == currentResult.primary){
        selectedSeason = currentResult.runnerUp;
        selectedSeasonLabel = "Runner-up";
      }
      else{
        selectedSeason = currentResult.primary;
        selectedSeasonLabel = "Primary";
      }
      currentPalette = generatePalette(selectedSeason);
      selectedPaletteColor = currentPalette[0] || null;
    }

    // if the user pressed dislike, another palette is generated
    if (dislike && dislike.isClicked()) { 
        if (SEASONS[selectedSeason]) {
          currentPalette = generatePalette(selectedSeason);
          selectedPaletteColor = currentPalette[0] || null;
        }
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
    selectedSeason = currentResult.primary;
    selectedSeasonLabel = "Primary";
    currentPalette = generatePalette(selectedSeason);
    selectedPaletteColor = currentPalette[0] || null;
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
