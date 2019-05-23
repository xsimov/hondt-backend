const io = require("socket.io")()

const config = {}

const defaultConfig = {
  cutOut: 5,
  totalSeats: 21,
  parties: [],
  places: [],
}

const getSessionId = () => {
  const sessionId = Math.floor(Math.random() * 16777215).toString(16)
  if (Object.keys(config).includes(sessionId)) return getSessionId()

  return sessionId
}

io.on("connection", function(socket) {
  socket.on("save", function(msg) {
    config[msg.sessionId] = msg.data
    socket.broadcast.emit("update", {
      sessionId: msg.sessionId,
      config: msg.data,
    })
  })

  socket.on("load", function(msg) {
    console.log(msg)
    socket.emit("update", { config: config[msg.sessionId] || defaultConfig })
  })

  socket.on("create", function(msg) {
    const sessionId = getSessionId()
    config[sessionId] = defaultConfig
    socket.emit("created", { sessionId: sessionId })
  })
})

const port = 8088
io.listen(port)
console.log("Listening on port " + port + "...")
