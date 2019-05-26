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
        if (item.adminToken !== msg.adminToken) return

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
      const adminToken = getSessionId()

      if (!keysForSessionId[msg.sessionId]) {
        collection.insertOne(
          {
            adminToken: adminToken,
            sessionId: msg.sessionId,
            config: defaultConfig,
          },
          (err, result) => {
            if (err) console.error(err)
          }
        )

        socket.emit("update", {
          admin: true,
          adminToken: adminToken,
          sessionId: msg.sessionId,
          config: defaultConfig,
        })

        return
      }

      collection.findOne({ sessionId: msg.sessionId }, (err, item) => {
        if (err) console.error(err)

        socket.emit("update", {
          sessionId: msg.sessionId,
          admin: item.adminToken === msg.adminToken,
          config: item.config,
        })
      })
    })

    socket.on("create", function(msg) {
      const newSessionId = getSessionId()
      const adminToken = getSessionId()

      collection.insertOne(
        {
          adminToken: adminToken,
          sessionId: newSessionId,
          config: defaultConfig,
        },
        (err, result) => {
          if (err) console.error(err)
        }
      )
      socket.emit("created", {
        sessionId: newSessionId,
        adminToken: adminToken,
        admin: true,
        config: defaultConfig,
      })
    })

    socket.on("duplicate", function(msg) {
      const newSessionId = getSessionId()
      const newAdminToken = getSessionId()

      collection.insertOne(
        {
          adminToken: newAdminToken,
          admin: true,
          sessionId: newSessionId,
          config: msg.data,
        },
        (err, result) => {
          if (err) console.error(err)
        }
      )

      socket.emit("duplicated", {
        sessionId: newSessionId,
        adminToken: newAdminToken,
      })
    })
  })
})

const port = 8088
io.listen(port)
console.log("Listening on port " + port + "...")
