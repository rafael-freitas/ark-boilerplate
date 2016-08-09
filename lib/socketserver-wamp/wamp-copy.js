/**
 * WAMP is an open source protocol which provides RPC and PubSub messaging patterns.
 * @param  {[type]}   imports [description]
 * @param  {Function} done    [description]
 * @return {[type]}           [description]
 */
module.exports = function setup (imports, done) {
  /*
      Requires
      ------------------------------------------------------------------------
   */
  const util = require('util')
  const assert = require('assert')
  const q = require('q')
  const SocketWampError = require('./SocketWampError')
  const _ = require('lodash')

  /*
      Imports
      ------------------------------------------------------------------------
   */
  var log = imports.log.create('socketserver-wamp')
  var io = imports.socket

  /*
      Main Asserts
      ------------------------------------------------------------------------
   */
  assert.ok(_.isObject(io), 'Socket.io is not present')

  /*
      Script body
      ------------------------------------------------------------------------
   */

  var poolRPC = {}
  var poolPubSub = {}

  /*
      Events handle
      ------------------------------------------------------------------------
   */

  io.on('connection', function (client) {
    log.debug('Setting up RPC interface for client', client.id)

    client.on('disconnect', function () {
      log.debug('Client has been disconnected! ' + client.id)

      unregisterProcedures(client)
      unregisterSubscriber(client)

      client.disconnect()
    })

    // var connectedClients = io.sockets.adapter.nsp.connected
    // var emit = client.emit
    // client.emit = function () {
    //   var args = Array.prototype.slice.call(arguments)
    //   if (args[0] === 'wamp_call_callee') {
    //     if (typeof args[1].fromClientId !== 'undefined' && typeof connectedClients[args[1].fromClientId] !== 'undefined') {
    //       client.handshake.originClient = connectedClients[args[1].fromClientId]
    //     }
    //   }
    //   emit.apply(client, args)
    //   // delete client.handshake.originClient
    // }

    // var $onpacket = client.onpacket
    // client.onpacket = function _onpacketWrapper (packet) {
    //   console.log('packet', packet)
    //   return $onpacket.apply(client, Array.prototype.slice.call(arguments))
    // }
    // var $onevent = client.onevent
    // client.onevent = function _oneventWrapper (packet) {
    //   console.log('event', packet)
    //   return $onevent.apply(client, Array.prototype.slice.call(arguments))
    // }

    /*
        RPC
        ====================================================================
     */

    /**
     * EVENT: For register RPC routes
     * @param  {String} routeName
     * @param  {Function} callback
     */
    client.on('wamp_register', function (routeName, callback) {
      // RPC method already is registred
      if (isRegistred(routeName)) {
        log.error('Procedure is already registred', log.colors.info(routeName))
        return callback(makeError('Procedure is alread registred', 'wamp_error_register'))
      }

      registerProcedure(routeName, client)

      log.debug('Procedure registred successful', routeName)
      callback(makeOk('Procedure registred successful', 'wamp_registred_success'))
    })

    /**
     * EVENT: For intercept RPC calls
     * @param  {Object} pack
     * @param  {Function} callback
     */
    client.on('wamp_call', function (pack, callback) {
      if (isRegistred(pack.procedure)) {
        var procedure = poolRPC[pack.procedure]
        if (procedure.type === 'emit') {
          // send the origin client id
          pack.fromClientId = client.id
          procedure.client.emit('wamp_call_callee', pack, function (pack2) {
            log.debug('call callee', pack2)
            callback(pack2)
          })
        } else {
          if (typeof procedure.procedure === 'function') {
            var result = procedure.procedure.call(client, pack.args)
            if (isPromise(result)) {
              result.then(function (response) {
                callback(response)
              })
            } else {
              callback(result)
            }
          }
        }
      } else {
        // TODO enviar erro de procedure nao encontrada
        callback(makeOk('The procedure `' + pack.procedure + '` not exists', 'wamp_call_fail'))
      }
    })

    /**
     * register a RPC procedure
     * @param  {String}   routeName Procedure name
     * @param  {Function} fn          callback
     */
    client.register = function register (routeName, fn) {
      // RPC method already is registred
      if (isRegistred(routeName)) {
        throw makeError('Method alread registred', 'wamp_error_register')
      }

      poolRPC[routeName] = {
        name: routeName,
        type: 'fn',
        procedure: fn,
        client: client
      }

      log.debug('Method registred successful on server side', routeName)
    }

    /**
     * Call a procedure
     * @param  {String} name procedure name
     * @param  {mixed}  args Optional parameters
     */
    client.call = function call (name, args) {
      var dfd = q.defer()

      client.emit('wamp_call', {procedure: name, args: args}, function _wamp_call_callback (pack) {
        if (pack.code === 'wamp_call_fail') {
          dfd.reject(new SocketWampError(pack))
        } else {
          dfd.resolve(pack.args)
        }
      })

      return q.promise
    }

    /*
        PUBSUB
        ====================================================================
     */

    function registerSubscriber (topic, client, callback) {
      if (typeof poolPubSub[topic] === 'undefined') {
        poolPubSub[topic] = {
          name: topic,
          callbacks: [],
          clients: []
        }
      }

      poolPubSub[topic].clients.push(client)
      if (typeof callback === 'function') {
        poolPubSub[topic].callbacks.push(callback)
        if (!client.hasOwnProperty('$subscribers')) {
          client.$subscribers = []
        }
        client.$subscribers.push(callback)
      }
    }

    function unregisterSubscriber (client, topic) {
      if (topic) {
      }
      for (var j in poolPubSub) {
        if (poolPubSub.hasOwnProperty(j)) {
          var route = poolPubSub[j]
          for (var i = route.clients.length - 1; i >= 0; i--) {
            if (route.clients[i] === client) {
              route.clients.splice(i, 1) // remove from array

              if (route.clients.hasOwnProperty('$subscribers')) {
                for (var ii = 0; ii < route.clients.$subscribers.length; ii++) {
                  var index = route.callbacks.indexOf(route.clients.$subscribers[ii])
                  if (index > -1) {
                    route.callbacks.splice(index, 1)
                  }
                }
              }
            }
          }
        }
      }
    }

    /**
     * EVENT: For register RPC routes
     * @param  {String} topic
     * @param  {Function} callback
     */
    client.on('wamp_subscribe', function (topic, callback) {
      // if (isRegistred(topic)) {
      //     log.error('Procedure is already registred', log.colors.info(topic))
      //     return callback(makeError('Procedure is alread registred', 'wamp_error_register'))
      // }

      registerSubscriber(topic, client)

      log.debug('Client registred successful for ', topic)
      callback(makeOk('Client registred successful for ' + topic, 'wamp_subscribe_success'))
    })

    /**
     * EVENT: For register RPC routes
     * @param  {String} topic
     * @param  {Function} callback
     */
    client.on('wamp_unsubscribe', function (topic, callback) {
      unregisterSubscriber()
      callback(makeOk(util.format('Topic `%s` unsubscribed', topic), 'wamp_subscribe_success'))
    })

    /**
     * EVENT: For intercept RPC calls
     * @param  {Object} pack
     * @param  {Function} callback
     */
    client.on('wamp_publish', function (pack, callback) {
      if (hasSubscribers(pack.route)) {
        var pubsub = poolPubSub[pack.route]
        for (var i = 0; i < pubsub.clients.length; i++) {
          pubsub.clients[i].emit('wamp_publish_callee', pack)
        }
      }
      callback(makeOk('`' + pack.route + '` ok', 'wamp_publish_ok'))
    })

    client.on('wamp_publish_callee', function (pack) {
      if (poolPubSub.hasOwnProperty(pack.route)) {
        for (var i = 0; i < poolPubSub[pack.route].callbacks.length; i++) {
          try {
            var fn = poolPubSub[pack.route].callbacks[i]
            fn.apply(client, pack.args)
          } catch (e) {} finally {}
        }
      }
    })

    /**
     * register a RPC procedure
     * @param  {String}   topic Procedure name
     * @param  {Function} callback
     */
    client.subscribe = function register (topic, callback) {
      registerSubscriber(topic, client, callback)
    }

    /**
     * Call a procedure
     * @param  {String} name procedure name
     * @param  {mixed}  args Optional parameters
     */
    client.publish = function publish (topic, args) {
      var dfd = q.defer()
      client.emit('wamp_publish', {route: topic, args: args}, function _wamp_publish_callback (pack) {
        if (pack.code !== 'wamp_publish_ok') {
          // console.error('SocketWampError', pack)
          dfd.reject(new SocketWampError(pack))
        } else {
          dfd.resolve(pack)
        }
      })
      return q.promise
    }
  })

  /**
   * Easy create WAMP response object
   * @param  {String} msg
   * @param  {String} code
   * @return {Object}
   */
  function makeOk (msg, code) {
    return {
      code: code,
      message: msg
    }
  }

  /**
   * Easy create an Error object
   * @param  {String} msg  - error message
   * @param  {String} code - code for wamp client or server decode
   * @param  {Object | Array | String} details - details about the error like Exception native object
   * @return {Error} - return a native object Error instance
   */
  function makeError (msg, code, details) {
    var err = new Error(msg)
    err.code = code
    if (typeof details !== 'undefined') {
      err.details = details
    }
    return err
  }

  function isPromise (subject) {
    return typeof subject === 'object' && typeof subject.then === 'function' && typeof subject.catch === 'function'
  }

  function unregisterProcedures (client) {
    if (Array.isArray(client.rpcProcedures)) {
      for (var i in client.rpcProcedures) {
        if (client.rpcProcedures.hasOwnProperty(i)) {
          delete poolRPC[client.rpcProcedures[i]]
        }
      }
    }
  }

  function registerProcedure (routeName, client) {
    poolRPC[routeName] = {
      name: routeName,
      type: 'emit',
      client: client
    }
    if (typeof client.rpcProcedures === 'undefined') {
      client.rpcProcedures = []
    }
    client.rpcProcedures.push(routeName)
  }

  function hasSubscribers (routeName) {
    return poolPubSub.hasOwnProperty(routeName)
  }

  function isRegistred (routeName) {
    return poolRPC.hasOwnProperty(routeName)
  }

  done()
}
