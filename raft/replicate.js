const express = require('express');
const axios = require('axios');
const app = express();

app.use(express.json());

let electionTimer;
let heartbeatTimer;

let state = {
    id: process.env.NODE_ID,
    currentTerm: 0,
    role: "FOLLOWER",
    votedFor: null,
    commitIndex : -1,
    log : []
};

let peers = process.env.PEERS.split(",");

app.get("/", (req, res) => {
    res.send("Hello from " + state.id);
});

app.get("/status", (req, res) => {
    res.json(state);
});

function resetElectionTimer() {
    clearTimeout(electionTimer);

    let timeout = 3000 + Math.random() * 2000;

    electionTimer = setTimeout(() => {
        becomeCandidate();
        sendVotingRequest();
    }, timeout);
}

function becomeCandidate() {
    state.currentTerm++;
    state.role = "CANDIDATE";
    state.votedFor = state.id;

    console.log(state.id, "became candidate for term", state.currentTerm);
}

async function sendVotingRequest() {

    let count = 1; 

    for (let i = 0; i < peers.length; i++) {

        try {

            const response = await axios.post(peers[i] + "/request-vote", {
                Candidate_id: state.id,
                Candidate_term: state.currentTerm
            });

            if (response.data) {
                count++;
            }

            let totalNodes = peers.length + 1;

            if (state.role === "CANDIDATE" && count > Math.floor(totalNodes / 2)
            ) {

                state.role = "LEADER";

                clearTimeout(electionTimer);

                clearInterval(heartbeatTimer);

                heartbeatTimer = setInterval(heartbeat, 150);

                console.log(state.id, "became LEADER");

                return;
            }

        } catch (err) {
            console.log(peers[i], "crashed");
        }
    }
    if(state.role === "CANDIDATE"){
        resetElectionTimer() 
    }
}

app.post("/request-vote", (req, res) => {

    const { Candidate_id, Candidate_term } = req.body;

    let voteGranted = false;

    if (Candidate_term > state.currentTerm) {

        state.currentTerm = Candidate_term;
        state.role = "FOLLOWER";
        state.votedFor = null;

        clearInterval(heartbeatTimer);
    }

    if (Candidate_term === state.currentTerm && state.votedFor === null) {

        state.votedFor = Candidate_id;
        voteGranted = true;

        resetElectionTimer();
    }

    res.send(voteGranted);
});

function heartbeat() {

    if (state.role !== "LEADER") return;

    for (let i = 0; i < peers.length; i++) {

        axios.post(peers[i] + "/heartbeat", {
            Leader_id: state.id,
            term: state.currentTerm,
            commitIndex: state.commitIndex
        }).catch(() => {
            console.log(peers[i], "crashed");
        });
    }
}

app.post("/heartbeat", (req, res) => {

    const { Leader_id, term , commitIndex} = req.body;

    if (term >= state.currentTerm) {

        state.currentTerm = term;
        state.role = "FOLLOWER";
        state.commitIndex = commitIndex

        clearInterval(heartbeatTimer);

        resetElectionTimer();
    }

    console.log("Heartbeat received from", Leader_id);

    res.send("ok");
});

app.post("/stroke" , async (req,res)=>{

    const stroke = req.body;
    if(state.role == "LEADER"){
        state.log.push({
            term: state.currentTerm,
            data: stroke
        })
        res.send("ok");

        let count = 0;
        let prevLogIndex = state.log.length - 2;
        let prevLogTerm = prevLogIndex >= 0 ? state.log[prevLogIndex].term : -1
;

        for (let i = 0; i < peers.length; i++) {
            const response = await axios.post(peers[i] + "/append-entries" , {
                logEntry : state.log[state.log.length - 1],
                prevLogIndex : prevLogIndex,
                prevLogTerm : prevLogTerm
            })
            
            .catch(() => {
                console.log(peers[i], "crashed");
            })

            if (response && response.data) {
                count++;
            }

            let totalNodes = peers.length + 1;

            if (count > Math.floor(totalNodes / 2)){
                state.commitIndex = state.log.length - 1;
            }
            
        }
    }
    else{
        res.status(400).json({ error: "not the leader" });
    }
})


app.post("/append-entries" , (req,res)=>{
    const { logEntry, prevLogIndex, prevLogTerm } = req.body;

    if (prevLogIndex === -1) {
        state.log.push(logEntry);
        return res.send(true);
    }

    if (state.log[prevLogIndex] && state.log[prevLogIndex].term === prevLogTerm) {
        state.log.push(logEntry);
        return res.send(true);
    }
    return res.send(false);    
})

app.get("/log" , (req , res)=>{
    res.json(state.log.slice(0, state.commitIndex + 1));
})

app.listen(process.env.PORT, () => {

    console.log(state.id, "started");

    resetElectionTimer();
});
