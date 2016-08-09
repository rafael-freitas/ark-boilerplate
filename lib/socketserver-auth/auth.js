module.exports = function setup (imports, done) {
  // var assert = require('assert')
  var config = imports.config
  var auth = imports.auth
  var io = imports.socket
  var log = imports.log.create('auth-socketserver')

  //  SOCKET AUTHENTICATION CHECK
  // ===========================================================================

  /**
   * Check if ticket is listed on config authorized tickets
   * 	{
   * 		socket: {
   * 		 authentication: [
   * 		 	"My_Ticket_Here"
   * 		 ]
   * 		}
   * 	}
   *
   * @param  {[type]} ticket [description]
   * @return {[type]}        [description]
   */
  function checkTicket (ticket) {
    if (config.hasOwnProperty('socket') && config.socket.hasOwnProperty('authentication')) {
      if (config.socket.authentication.hasOwnProperty('tickets') && Array.isArray(config.socket.authentication.tickets)) {
        return config.socket.authentication.tickets.indexOf(ticket) !== -1
      }
    }
    return false
  }

  /**
   * Search for Authentication ticket on socket http headers
   * Authentication: Ticket My_Ticket_Here
   * or
   * Check if user is authenticated on session
   */
  io.use(function (socket, next) {
    // check ticket authentication
    if (socket.handshake.headers.hasOwnProperty('authorization')) {
      var authorization = String(socket.handshake.headers.authorization)
      if (authorization.indexOf('Ticket') === 0) {
        log.debug('Trying authenticate by Ticket')
        // getting the password: "Ticket s3cr3t123"
        var password = authorization.split('Ticket ').pop()
        if (checkTicket(password)) {
          next()
          return true
        }
      }
    }

    // grant session is availible on socket.requist
    socket.request.session = socket.request.session || socket.handshake.session
    return auth.isAuthenticated()(socket.request, socket.request.res, function (err) {
      // try to send error message to socket.io client
      if (err) {
        return next({
          message: err.name || err.code || err.message
        })
      }
      next()
    })
  })

  // io.set('authorization', function(handshakeData, accept) {
  //
  //     if (handshakeData.headers.cookie) {
  //
  //         handshakeData.cookie = cookie.parse(handshakeData.headers.cookie)
  //
  //         handshakeData.sessionID = connect.utils.parseSignedCookie(handshakeData.cookie['express.sid'], 'secret')
  //
  //         if (handshakeData.cookie['express.sid'] == handshakeData.sessionID) {
  //             return accept('Cookie is invalid.', false)
  //         }
  //
  //     } else {
  //         return accept('No cookie transmitted.', false)
  //     }
  //
  //     accept(null, true)
  // })

  done()
}
