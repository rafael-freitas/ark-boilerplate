/**
 * WAMP Router Server
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

  var routerUriStorage = {}

  io.on('connection', function (client) {
    joinClient(client)
  })

  function subscribeClientToTopic (pack) {
    if (!Array.isArray(routerUriStorage[pack.uri])) {
      routerUriStorage[pack.uri] = []
    }
    // search the client on storage for this uri
    // var hasClientSubscribedList = _.filter(routerUriStorage[pack.uri], function (o) {
    //   return o.client === pack.client
    // })

    _.remove(routerUriStorage[pack.uri], function (o) {
      return o.client === pack.client
    })
    // // if the client is already subscribed this topic replace the subscription
    // if (hasClientSubscribedList.length > 0) {
    //
    // }
    routerUriStorage[pack.uri].push(pack)
  }

  function joinClient (client) {
    // use this array to facilitate remove the attached procedures
    client.routerUriStorage = []

    log.debug('Setting up RPC interface for client', client.id)

    // when the client disconnect
    client.on('disconnect', function () {
      log.debug(util.format('Client has been %s `%s`', log.colors.red('disconnected!'), log.colors.grey(client.id)))
      unregisterClient(client)
      client.disconnect()
    })

    // listen all messages from clients and parse them
    client.on('wamp_pack_server', wamp_pack)

    function wamp_pack (pack, done) {
      // handle clients packs

      switch (pack.type) {
        // subscribe procedure
        case 'subscribe':
          // save client
          pack.client = client
          // save pack into client URI storage
          // client.routerUriStorage.push(pack)
          subscribeClientToTopic(pack)
          done(makeOk('Topic subscribed', 'wamp_subscribe_ok'))
          // debug
          log.debug(util.format('PACK `%s` for uri `%s` from `%s` to `%s`'
            , log.colors.cyan(pack.type)
            , log.colors.green(pack.uri)
            , log.colors.grey(pack.caller)
            , log.colors.grey(client.id)))
          log.debug(util.format('Total subscribed clients `%s` for uri `%s`'
            , log.colors.cyan(routerUriStorage[pack.uri].length)
            , log.colors.green(pack.uri)))
          break

        // subscribe topic
        case 'unsubscribe':
          // uri already registred
          delete routerUriStorage[pack.uri]
          var foundPack = _.find(client.routerUriStorage, function (o) { return o.uri === pack.uri })
          client.routerUriStorage.slice(client.routerUriStorage.indexOf(foundPack), 1)
          done(makeOk('Topic unsubscribed', 'wamp_unsubscribe_ok'))
          // debug
          log.debug(util.format('PACK `%s` for uri `%s` from `%s` to `%s`'
            , log.colors.cyan(pack.type)
            , log.colors.green(pack.uri)
            , log.colors.grey(pack.caller)
            , log.colors.grey(client.id)))
          break

        // publish on a topic
        case 'publish':
          // uri already registred
          if (typeof routerUriStorage[pack.uri] === 'undefined') {
            // we don't have any subscribers
            done(makeOk('ok', 'wamp_publish_not_exists'))
          } else {
            // make a copy of the current pack (representation of the origin caller pack)
            // {
            //   type: 'publish',
            //   uri: topic,
            //   args: args,
            //   kwargs: kwargs,
            //   options: options
            // }
            var clonedPack = _.clone(pack, true)
            // change the pack type (will be used on remote client)
            clonedPack.type = 'remote_publish'
            // set the current client like caller
            clonedPack.caller = client.id

            // debug
            log.debug(util.format('PACK `%s` for uri `%s` from `%s` to `%s`'
              , log.colors.cyan(pack.type)
              , log.colors.green(pack.uri)
              , log.colors.grey(pack.caller)
              , log.colors.grey(routerUriStorage[pack.uri].length)))

            // search for subscribers for the topic of `pack.uri`
            for (var i = 0; i < routerUriStorage[pack.uri].length; i++) {
              var curPack = routerUriStorage[pack.uri][i]
              send(curPack.client, clonedPack, function (tick) {})
            }
            done(makeOk('ok', 'wamp_publish_ok'))
            // send(routerUriStorage[pack.uri].client, clonedPack, function (tick) {
            //   // send the tick back the origin client
            //   done(tick)
            // })
          }
          break

        // register procedure
        case 'register':
          // uri already registred
          if (typeof routerUriStorage[pack.uri] !== 'undefined') {
            done(makeError('Procedure already registered', 'wamp_error_register'))
          } else {
            pack.client = client
            // save pack into client URI storage
            client.routerUriStorage.push(pack)
            routerUriStorage[pack.uri] = pack
            done(makeOk('Procedure registered', 'wamp_register_ok'))
          }
          // debug
          log.debug(util.format('PACK `%s` for uri `%s` from `%s` to `%s`'
            , log.colors.cyan(pack.type)
            , log.colors.green(pack.uri)
            , log.colors.grey(pack.caller)
            , log.colors.grey(client.id)))
          break

        // unregister procedure
        case 'unregister':
          // uri already registred
          if (typeof routerUriStorage[pack.uri] === 'undefined') {
            done(makeError('Procedure not registered', 'wamp_error_not_registered'))
          } else {
            pack.client = client
            delete routerUriStorage[pack.uri]
            var foundPack = _.find(client.routerUriStorage, function (o) { return o.uri === pack.uri })
            client.routerUriStorage.slice(client.routerUriStorage.indexOf(foundPack), 1)
            done(makeOk('Procedure unregistered', 'wamp_unregister_ok'))
          }
          // debug
          log.debug(util.format('PACK `%s` for uri `%s` from `%s` to `%s`'
            , log.colors.cyan(pack.type)
            , log.colors.green(pack.uri)
            , log.colors.grey(pack.caller)
            , log.colors.grey(client.id)))
          break

        // call a procuedure
        case 'call':
          // uri already registred
          if (typeof routerUriStorage[pack.uri] === 'undefined') {
            done(makeError('Procedure not registered', 'wamp_error_unregistred'))
          } else {
            // make a copy of the current pack (representation of the origin caller pack)
            // {
            //   type: 'call',
            //   uri: procedure,
            //   args: args,
            //   kwargs: kwargs,
            //   options: options
            // }
            var clonedPack = _.clone(pack, true)
            // change the pack type (will be used on remote client)
            clonedPack.type = 'remote_call'
            // set the current client like caller
            clonedPack.caller = client.id

            // debug
            log.debug(util.format('PACK `%s` for uri `%s` from `%s` to `%s`'
              , log.colors.cyan(pack.type)
              , log.colors.green(pack.uri)
              , log.colors.grey(pack.caller)
              , log.colors.grey(routerUriStorage[pack.uri].client.id)))

            send(routerUriStorage[pack.uri].client, clonedPack, function (tick) {
              // send the tick back the origin client
              done(tick)
            })
          }
          break

        default:
          done(makeOk('ok', 'wamp_ok'))
      }
    }
  }

  function send (client, pack, done) {
    log.debug('client.emit', client.handshake ? client.id : null)
    // transform caller id to caller socket
    // if (client.handshake) {
    //   client.caller = io.sockets.adapter.nsp.connected[pack.caller] || pack.caller
    // }
    client.emit('wamp_pack_client', pack, done)
  }

  function unregisterClient (client) {
    for (var i = 0; i < client.routerUriStorage.length; i++) {
      var pack = client.routerUriStorage[i]
      // search on global storage for the uri and remove it
      if (_.isObject(routerUriStorage[pack.uri])) {
        delete routerUriStorage[pack.uri]
      }
    }
  }

  /**
   * Easy create WAMP response object
   * @param  {String} data
   * @param  {String} code
   * @return {Object}
   */
  function makeOk (data, code) {
    return {
      code: code,
      data: data
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
    err.message = msg
    err.code = code
    if (typeof details !== 'undefined') {
      err.details = details
    }
    return err
  }

  done()
}
