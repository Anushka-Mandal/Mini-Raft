
const express = require("express");
const http = require('http');
const app = express();
const { WebSocketServer } = require("ws")

//const strokeRoute = require('./routes/strokes')

//const DB = require('./store');

const { default: axios } = require("axios");

app.use(express.static('frontend'));

app.use(express.json());

let urls = process.env.URLS.split(",");

let currentLeader = null ;
async function findLeader(){
    for (let i = 0; i < urls.length; i++) {
        const response = await axios.get(urls[i] + "/status")
        .catch(() => {
            console.log(urls[i], "crashed");
        })

        if(response && response.data && response.data.role == "LEADER"){
            currentLeader =  urls[i];
            break;
        }
    }
    return currentLeader;
}

app.get("/" , (req,res)=>{
    console.log(req.url);
    res.send("Hello World");
})

app.get("/status" , (req,res)=>{
    var datetime = new Date();
    res.json({
        status : res.statusCode,
        datetime
    })
})

//app.use("/stroke" , strokeRoute);

const server = http.createServer(app);

const wss = new WebSocketServer({ server });

function broadcastUserCount() {
    const message = JSON.stringify({
        type: "users",
        count: wss.clients.size
    });

    wss.clients.forEach((client) => {
        client.send(message);
    });
}


wss.on("connection", async (socket) => {
    
    console.log("New user connected");
    broadcastUserCount();

    if(currentLeader == null) currentLeader = await findLeader();
    
    if(currentLeader) {
        const response = await axios.get(currentLeader + "/log").catch(() => null);
        if(response && response.data) {
            socket.send(JSON.stringify({
                type: "replay",
                strokes: response.data
            }));
        }
    }

    socket.on("message", async (message) => {

        if(currentLeader == null){
            currentLeader = await findLeader();
        }
        const data  = JSON.parse(message);
        //DB.addStrokes(data);

        const respond = await axios.post(currentLeader + "/stroke" , data)
        .catch(()=>{ currentLeader = null})

        if(respond){
            console.log(data);
            wss.clients.forEach(function(client){
                client.send( message.toString());
            })
        }
    });
    socket.on("close", () => {
        console.log("User disconnected");
        broadcastUserCount();
    });
});


server.listen(3000);
