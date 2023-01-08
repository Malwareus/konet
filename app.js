const http = require('http');
const express = require("express")
const app = express()

app.get("/", (req, res) => {
    res.sendFile(__dirname + "/index.html")
})

app.get("/veri", (req, res) => {
    res.sendFile(__dirname + "/veri.html")
})

app.listen(3000)