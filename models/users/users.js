'use strict'

// grab the things we need
var mongoose = require('mongoose')
var bcrypt = require('bcrypt-nodejs')
var Schema = mongoose.Schema

module.exports = function setup (imports, done) {
  imports.models.User = User
  done()
}

// create a schema
var userSchema = new Schema({
  name: {
    type: String
  },
  avatar: {
    type: String
  },
  username: {
    type: String,
    required: true,
    unique: true
  },
  password: {
    type: String,
    required: true
  },
  forgotPasswordToken: String,
  forgotPasswordTokenExpires: String,
  email: {
    type: String,
    required: true,
    unique: true
  },
  role: {
    type: String,
    default: 'user'
  },
  rules: {
    type: Array,
    default: ['home']
  },
  facebook: {},
  google: {}
})

userSchema
  .virtual('changePassword')
  .set(function (newPassword) {
    this.set('password', bcrypt.hashSync(newPassword, bcrypt.genSaltSync(8), null))
  })

// methods ======================
// generating a hash
userSchema.methods.generateHash = function (password) {
  return bcrypt.hashSync(this.password, bcrypt.genSaltSync(8), null)
}

// checking if password is valid
userSchema.methods.validPassword = function (password) {
  return bcrypt.compareSync(password, this.password)
}

userSchema.methods.profile = function () {
  return {
    id: this._id,
    username: this.username,
    name: this.name,
    email: this.email,
    avatar: this.avatar,
    role: this.role,
    rules: this.rules
  }
}

// Validate username is not taken
userSchema
  .path('username')
  .validate(function (value, respond) {
    var newUser = this

    newUser.constructor.findOne({
      username: value
    }, function (err, user) {
      if (err) throw err
      if (user) {
        if (newUser.id === user.id) return respond(true)
        return respond(false)
      }
      respond(true)
    })
  }, 'Username taken')

userSchema
  .path('email')
  .validate(function (value, respond) {
    var newUser = this

    newUser.constructor.findOne({
      email: value
    }, function (err, user) {
      if (err) throw err
      if (user) {
        if (newUser.id === user.id) return respond(true)
        return respond(false)
      }
      respond(true)
    })
  }, 'Email taken')

var validatePresenceOf = function (value) {
  return value && value.length
}

userSchema.pre('save', function (next) {
  if (!this.isModified('password')) return next()

  this.password = bcrypt.hashSync(this.password, bcrypt.genSaltSync(8), null)
  next()
})

var User = mongoose.model('users', userSchema)
