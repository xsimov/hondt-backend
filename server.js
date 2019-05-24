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
    const sessionId = Math.floor(Math.random() * 16777215).toString(16)
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

          console.log("msg", msg)
          console.log("returned from saving", item)
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

            console.log(result)
            keysForSessionId[msg.sessionId] = true
          }
        )

        console.log("sending default config")
        socket.emit("update", {
          config: defaultConfig,
        })

        return
      }

      collection.findOne({ sessionId: msg.sessionId }, (err, item) => {
        if (err) console.error(err)

        console.log("loading", item)
        socket.emit("update", {
          config: item.config,
        })
      })
    })

    socket.on("create", function(msg) {
      collection.insertOne(
        { sessionId: getSessionId(), config: defaultConfig },
        (err, result) => {
          if (err) console.error(err)

          console.log(result)
        }
      )
      socket.emit("created", { sessionId: sessionId })
    })
  })
})

const port = 8088
io.listen(port)
console.log("Listening on port " + port + "...")
