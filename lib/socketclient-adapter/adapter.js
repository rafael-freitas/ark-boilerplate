module.exports = function setup (imports, done) {
  var assert = require('assert')
  var config = imports.config
  var log = imports.log.create('socketclient-adapter')
  var io = imports.socket
  var app = this

  //  SOCKET WAMP Adapter
  // ===========================================================================

  assert(typeof config.socket.clientAuthTicket !== 'undefined')

  log.debug('Connecting MAIN on ' + 'http://localhost:' + config.http.port)
  var socket = require('socket.io-client')('http://localhost:' + config.http.port, {
    extraHeaders: {
      // Authorization by Ticket on socket wmap server
      Authorization: 'Ticket ' + (config.socket.clientAuthTicket)
    }
  })
  require('socket.io-wamp')(socket)

  socket.connect()

  socket.on('connect', function () {
    var client = io.sockets.adapter.nsp.connected['/#' + socket.id]
    if (client) {
      socket.handshake = client.handshake

      // var $onpacket = client.onpacket
      // client.onpacket = function _onpacketWrapper (packet) {
      //   console.log('packet', packet)
      //   return $onpacket.apply(client, Array.prototype.slice.call(arguments))
      // }
    }
    /**
     * Return a socket client by ID
     * @example
     * 	```js
     *  socket.getClientById('MYgBl2M365dDXv5lAAAV')
     *  // or
     *  socket.getClientById('/#MYgBl2M365dDXv5lAAAV')
     *  ```
     *
     * @param  {String} id Socket connection id
     * @return {Socket}
     */
    socket.getClientById = function (id) {
      id = String(id).indexOf('/#') !== 0 ? '/#' + id : id
      return io.sockets.adapter.nsp.connected[id]
    }
    app.emit('socket.connect', socket)
  })
  socket.on('error', function (data) {
    log.error('Error at connecting MAIN socket', data)
    app.emit('socket.error', data)
  })
  socket.on('close', function (data) {
    app.emit('socket.close', data)
  })

  // var connectedClients = io.sockets.adapter.nsp.connected
  // var emit = socket.emit
  // socket.emit = function () {
  //   var args = Array.prototype.slice.call(arguments)
  //   if (args[0] === 'wamp_call_callee') {
  //     if (typeof args[1].fromClientId !== 'undefined' && typeof connectedClients[args[1].fromClientId] !== 'undefined') {
  //       socket.handshake.originClient = connectedClients[args[1].fromClientId]
  //     }
  //   }
  //   emit.apply(socket, args)
  //   delete socket.handshake.originClient
  // }

  var $onpacket = socket.onpacket
  socket.onpacket = function _onpacketWrapper (packet) {
    console.log('======================== packet =>', packet)
    return $onpacket.apply(socket, Array.prototype.slice.call(arguments))
  }

  // copy handshake for client connection
  // io.on('connection', function (client) {
  //   if (client.id === socket.id) {
  //     socket.handshake = client.handshake
  //   }
  // })
  // io.on('connection', function (client) {
  //   clients[client.id] = client
  //   if (client.id === socket.id) {
  //     socket.handshake = client.handshake
  //   }
  // })

  done()
}
