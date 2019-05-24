const io = require("socket.io")()
const mongo = require("mongodb").MongoClient

const url = "mongodb://localhost:27017"

mongo.connect(url, (err, client) => {
  if (err) console.error(err)

  const db = client.db("dhondt")
  const collection = db.collection("sessions")

  const keysForSessionId = {}

  const defaultConfig = {
    cutOut: 5,
    totalSeats: 21,
    parties: [],
    places: [],
  }

  const getSessionId = () => {
    let accum = ""
    for (i = 0; i < 64; i++) {
      accum = accum + Math.round(Math.random())
    }
    const sessionId = parseInt(accum, 2).toString(16)
    if (keysForSessionId[sessionId]) return getSessionId()

    keysForSessionId[sessionId] = true
    return sessionId
  }

  io.on("connection", function(socket) {
    socket.on("save", function(msg) {
      collection.updateOne(
        { sessionId: msg.sessionId },
        { $set: { config: msg.data } },
        (err, item) => {
          if (err) console.error(err)
        }
      )

      socket.broadcast.emit("update", {
        sessionId: msg.sessionId,
        config: msg.data,
      })
    })

    socket.on("load", function(msg) {
      if (!keysForSessionId[msg.sessionId]) {
        collection.insertOne(
          { sessionId: msg.sessionId, config: defaultConfig },
          (err, result) => {
            if (err) console.error(err)

            keysForSessionId[msg.sessionId] = true
          }
        )

        socket.emit("update", {
          config: defaultConfig,
        })

        return
      }

      collection.findOne({ sessionId: msg.sessionId }, (err, item) => {
        if (err) console.error(err)

        socket.emit("update", {
          sessionId: msg.sessionId,
          config: item.config,
        })
      })
    })

    socket.on("create", function(msg) {
      const newSessionId = getSessionId()
      collection.insertOne(
        { sessionId: newSessionId, config: defaultConfig },
        (err, result) => {
          if (err) console.error(err)
        }
      )
      socket.emit("created", { sessionId: newSessionId })
    })
  })
})

const port = 8088
io.listen(port)
console.log("Listening on port " + port + "...")
