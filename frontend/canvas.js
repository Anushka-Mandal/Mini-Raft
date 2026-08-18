//const ws = new WebSocket("ws://localhost:3000");
const ws = new WebSocket(`ws://${window.location.host}`);
ws.onopen = () => console.log("connected to server");

const canvasContainer = document.querySelector('.canvas-area');
var canvas = document.querySelector('canvas');
var ctx = canvas.getContext("2d");


ws.onmessage = (event) => {
    const data = JSON.parse(event.data);

    if (data.type === "users") {
        document.querySelector('.right-panel').innerHTML = `<div>Users online: ${data.count}</div>`;
        return;
    }

    if(data.type === "replay"){
        for(let i = 0 ; i < data.strokes.length ; i++){
            drawStroke(data.strokes[i].data);
        }
        return;
    }
    drawStroke(data);
};

function drawStroke(data){
    if (data.points.length > 1) {

        ctx.strokeStyle = data.color;
        ctx.lineWidth = data.strokeWidth;
        ctx.globalAlpha = data.opacity;

        ctx.beginPath();

        data.points.forEach((point, i) => {
            if (i === 0)
                ctx.moveTo(point.x, point.y);
            else
                ctx.lineTo(point.x, point.y);
        });

        ctx.stroke();

    } else {
        startX = data.startX;
        startY = data.startY;
        endX = data.endX;
        endY = data.endY;

        draw(data.tool, data.color, data.strokeWidth, data.opacity);
    }
}


function resizeCanvas() {
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;
}

resizeCanvas();

const COLORS = [
  '#FFFFFF','#94a3b8','#64748b',
  '#f87171','#fb923c','#fbbf24',
  '#4ade80','#34d399','#22d3ee',
  '#60a5fa','#818cf8','#c084fc',
  '#f472b6','#d28ece','#a3e635',
];

const colorGrid = document.querySelector(".color-grid");

let currentColor = COLORS[0];


COLORS.forEach((color, index) => {
    const colorButton = document.createElement("button");

    colorButton.classList.add("color-btn");

    if(index === 0){
        colorButton.classList.add("active");
    }
    
    colorButton.style.backgroundColor = color;

    colorButton.onclick = ()=>{
        document.querySelectorAll(".color-btn").forEach(btn => {
            btn.classList.remove("active");
        });
        currentColor = COLORS[index];
        colorButton.classList.add("active");
    }

    colorGrid.append(colorButton);
});




let strokeWidth = 4;

const strokeSlider = document.querySelector("#stroke-slider");
const strokeValue = document.querySelector("#stroke-value");
strokeSlider.addEventListener("input", () => {
    strokeWidth = strokeSlider.value;
    strokeValue.textContent = strokeWidth;
});



let opacity = 1;

const opacitySlider = document.querySelector("#opacity-slider");
const opacityValue = document.querySelector("#opacity-value");
opacitySlider.addEventListener("input", () => {
    opacity = (opacitySlider.value)/100;
    opacityValue.textContent = opacity;
});


let currentTool = "pen";
let startX , startY   , endX  , endY ;

function setTool(tool, event) {

    currentTool = tool;

    document.querySelectorAll(".tool-btn").forEach(btn => {
        btn.classList.remove("active");
    });

    event.target.classList.add("active");
}

let point = [];

function getCoordinate(){
    let c = canvas.getBoundingClientRect();
    
    
    let isDrawing = false;
    
    canvas.addEventListener("mousedown", (event) => {
        c = canvas.getBoundingClientRect();
        const x = event.clientX - c.left;
        const y = event.clientY - c.top;
    
        point = [];

        if (currentTool === "pen" || currentTool === "eraser") {
            isDrawing = true;
            ctx.lineWidth = strokeWidth;
            ctx.globalAlpha = opacity;
            ctx.beginPath();
            ctx.moveTo(x, y);

            
            if (currentTool === "pen") {
                ctx.strokeStyle = currentColor;
            } else {
                const bgColor = getComputedStyle(canvas).backgroundColor;
                ctx.strokeStyle = bgColor;
            }
        } 
        else {
            startX = x;
            startY = y;
        }
        point.push({x,y});
    });

    canvas.addEventListener("mousemove", (event) => {
        if (!isDrawing) return;

        const x = event.clientX - c.left;
        const y = event.clientY - c.top;

        ctx.lineTo(x, y);
        ctx.stroke();
        point.push({x,y});
    });
    
    canvas.addEventListener("mouseup", (event) => {

        
        if (currentTool === "pen" || currentTool === "eraser") {
            isDrawing = false;
            ctx.closePath();
        } 
        else {
            endX = event.clientX - c.left;
            endY = event.clientY - c.top;
            
            draw(currentTool , currentColor , strokeWidth , opacity);
        }

        ws.send(JSON.stringify({
            tool: currentTool,
            color: ctx.strokeStyle,
            strokeWidth,
            opacity,
            startX,
            startY,
            endX,
            endY,
            points: point
        }));
    });
}



function draw(currentTool , currentColor ,strokeWidth , opacity){
    ctx.strokeStyle = currentColor;
    ctx.lineWidth = strokeWidth;    
    ctx.globalAlpha = opacity;

    switch (currentTool){
        case "line" : 
            ctx.beginPath();
            ctx.moveTo(startX , startY);
            ctx.lineTo(endX , endY);
            ctx.stroke();
            break;

        case "rect" : 
            ctx.beginPath();
            ctx.strokeRect(startX, startY, endX-startX, endY-startY);
            ctx.stroke();
            break;
        
        case "circle" :
            ctx.beginPath();

            let centerX = (startX + endX) / 2;
            let centerY = (startY + endY) / 2;

            let radiusX = Math.abs(endX - startX) / 2;
            let radiusY = Math.abs(endY - startY) / 2;

            ctx.ellipse(centerX , centerY , radiusX ,radiusY, 0 ,0 , 2 * Math.PI);
            ctx.stroke();

            break;
        default :
            currentTool = "pen";       
    }
}


window.addEventListener("load", getCoordinate);