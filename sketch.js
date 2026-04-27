// video variables
var video; 

//state variables
let start = 0;  // state 0 will include info about the projects, direections for the user to be set up properly, and the start button to transition to the next state
let analyze = 1; // sidebar shrinks/hides state 1 is where the face mesh will come in, it will focus on certain key points, cheeks, chins, and/or forehead and take the uundertone color of it(maybe using teachable machine or manually ), will probably put a loading bar here 
let result = 2; // sidebar reappears, the text will state a result and a short description of what colors to look for, a button with the words generate palette would be there, once clicked it would give a palette with six colors, three buttons will pop up under it, thumbs up for like, heart for love and thumbs down for dislike, if dislike is pressed, the color palette automatically regenerates, else the generate button can be pressed again, loved palettes can be saved.  Button for generate an aura like effect will be pressed which leads to the next state
let aura = 3; // once the aura button is pressed, the filter will give a couple of options for the screen, right now it can be either a tint gradient with the palette or an aura around the face, face mesh may be used here. user can hide the interface to take a screenshot, or press a return button to go back 
// later improvements if i have time, i can let the user cycle through their loved palettes list to look at different auras or from each color in the palette 

let state = start; 

// sidebar + widget info 
let sidebarWidth = 250; 
let smWidgetWidth = 70;
let lgWidgetWidth = 160; 
let widgetCornerRadi = 5; 

let sidebar;
let auraBtn, like, love, dislike, startBtn, generateBtn; 

function setup() {
 //init 
createCanvas(800, 800);

// setup for the face mesh pixels
pixelDensity(1);
video = createCapture(VIDEO);
video.size(width, height);
video.hide();

//sidebar 
sidebar = new SidebarUI(sidebarWidth);

//widgets
centeredX = sidebar.getCenterX();
like = new SmallWidgetUI (centeredX +200, height - 100, "👍"); 
love = new SmallWidgetUI (centeredX , height - 100, "❤️"); 
dislike = new SmallWidgetUI (centeredX + 200, height - 100, "👎"); 
startBtn = new LongWidgetUI(centeredX, 200, "Start!"); 
generateBtn = new LongWidgetUI(centeredX, 200, "Generate"); 
auraBtn = new LongWidgetUI(centeredX, 200, "Aura Filters"); 
}

function draw() {
  // put drawing code here
  background(220);
  // camera
   image(video, 0, 0); 

  // sidebar info
  sidebar.animate();
  sidebar.display();
//
  displayUI();
}

//state machine for UI

function displayUI() {
  
// state 0 
  if (state === start) {
    startBtn.x = centeredX;
    startBtn.display();
  }
// state 1
  else if (state === analyze) {
    fill(0);
    textAlign(CENTER);
    textSize(20);
    text("Analyzing...", width / 2, 50);
  }
// state 2
  else if (state === result) {
    generateBtn.x = centeredX;
    auraBtn.x = centeredX;

    generateBtn.display();
    auraBtn.display();

    like.x = centeredX - 60;
    love.x = centeredX;
    dislike.x = centeredX + 60;

    like.display();
    love.display();
    dislike.display();
  }
// state 3
  else if (state === aura) {
    fill(0);
    textAlign(CENTER);
    text("Aura Mode", width / 2, 50);
  }
}

function mousePressed() {
  if (state === start && startBtn.isClicked()) {
    state = analyze;
    sidebar.hide();
  }

  else if (state === analyze) {
    state = result;
    sidebar.show();
  }

  else if (state === result) {
    if (generateBtn.isClicked()) {
     // generate code palette
    }

    if (auraBtn.isClicked()) {
      state = aura;
      sidebar.hide();
    }

    if (like.isClicked()){ }
    if (love.isClicked()) { }
    if (dislike.isClicked()) { }
  }

  else if (state === aura) {
    state = result;
    sidebar.show();
  }
}

// classes
class SidebarUI{ // may include an arrow tab to click on and if clicked, it controls the showing and hiding of the sidebar and its widgets
   constructor(w) {
    this.w = w;
    this.x = width - w;     // current position
    this.targetX = this.x;  // where it wants to go
    this.speed = 10;
    this.visible = true;
  }

  animate() {
    if (this.x < this.targetX) {
      this.x += this.speed;
    } else if (this.x > this.targetX) {
      this.x -= this.speed;
    }
  }

  display() {

    rectMode(CORNER);
    noStroke();
    fill(250);
    rect(this.x, 0, this.w, height); 
  }

  show() {
    this.targetX = width - this.w;
    this.visible = true;
  }

  hide() {
    this.targetX = width;
    this.visible = false;
  }

  toggle() {
    if (this.visible) this.hide();
    else this.show();
  }

  getCenterX() {return this.x + this.w / 2;}
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

    // box
    fill(240);
    rect(this.x, this.y, this.w, this.w, this.cornerradi); 

    // icon for the widget
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