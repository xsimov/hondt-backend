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
      collection.findOne({ sessionId: msg.sessionId }, (err, item) => {
        if (item.adminId !== socket.id) return

        collection.updateOne(
          { sessionId: msg.sessionId },
          { $set: { config: msg.data } },
          (err, item) => {
            if (err) console.error(err)
          }
        )

        socket.broadcast.emit("update", {
          admin: false,
          sessionId: msg.sessionId,
          config: msg.data,
        })
      })
    })

    socket.on("load", function(msg) {
      if (!keysForSessionId[msg.sessionId]) {
        collection.insertOne(
          {
            adminId: socket.id,
            sessionId: msg.sessionId,
            config: defaultConfig,
          },
          (err, result) => {
            if (err) console.error(err)

            keysForSessionId[msg.sessionId] = true
          }
        )

        socket.emit("update", {
          admin: true,
          sessionId: msg.sessionId,
          config: defaultConfig,
        })

        return
      }

      collection.findOne({ sessionId: msg.sessionId }, (err, item) => {
        if (err) console.error(err)

        let admin = false

        if (!item.adminId) {
          admin = true

          collection.updateOne(
            { sessionId: msg.sessionId },
            { $set: { adminId: socket.id } },
            (err, item) => {
              if (err) console.error(err)
            }
          )
        }

        if (item.adminId === socket.id) admin = true

        socket.emit("update", {
          admin: admin,
          sessionId: msg.sessionId,
          config: item.config,
        })
      })
    })

    socket.on("create", function(msg) {
      const newSessionId = getSessionId()
      collection.insertOne(
        { adminId: socket.id, sessionId: newSessionId, config: defaultConfig },
        (err, result) => {
          if (err) console.error(err)
        }
      )
      socket.emit("created", {
        sessionId: newSessionId,
        admin: true,
        config: defaultConfig,
      })
    })

    socket.on("duplicate", function(msg) {
      const newSessionId = getSessionId()

      collection.insertOne(
        {
          adminId: socket.id,
          sessionId: newSessionId,
          config: msg.data,
        },
        (err, result) => {
          if (err) console.error(err)
        }
      )

      socket.emit("duplicated", {
        sessionId: newSessionId,
      })
    })

    socket.on("disconnect", function(msg) {
      collection.updateOne(
        { adminId: socket.id },
        { $set: { adminId: null } },
        (err, item) => {
          if (err) console.error(err)
        }
      )
    })
  })
})

const port = 8088
io.listen(port)
console.log("Listening on port " + port + "...")
