let strokes = [];

function addStrokes({color, x, y}){
    strokes.push({color, x, y});
}

function showStrokes(){
    return strokes;
}

module.exports = {
    addStrokes,
    showStrokes
};