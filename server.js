const io = require('socket.io')()

io.on('connection', function (socket) {
  console.log("someone connected!")
})

const port = 1337
io.listen(port)
console.log('Listening on port ' + port + '...')

