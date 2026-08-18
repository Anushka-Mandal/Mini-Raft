const express = require("express");
const router = express.Router();

const DB = require('../store');

router.post("/", async(req,res)=>{
    DB.addStrokes(req.body);
    const allStrokes = DB.showStrokes();
    res.send({
        data : allStrokes[allStrokes.length - 1],
        status : res.statusCode,
        message: "stroke saved"
    })
})

router.get("/", async(req,res)=>{
    res.json(DB.showStrokes());
})


module.exports = router;