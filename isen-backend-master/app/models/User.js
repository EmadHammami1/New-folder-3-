const mongoose = require('mongoose')
const uuid = require('uuid')
const crypto = require('crypto');
const _ = require('lodash')

const userSchema = new mongoose.Schema({
    firstName: {
        type: String,
        required: true,
    },
    lastName: {
        type: String,
        required: true,
    },
    enabled: {
        type: Boolean,
        default: true
    },
    email: {
        type: String,
        required: true,
        unique: true
    },
    hashed_paassword: String,
    salt: String,
    gender: {
        type: String,
        enum : ['male','female'],
        required: true,
    },
    reports: [{
        type: mongoose.Types.ObjectId,
        ref: 'Report'
    }],
    phone: {
        type: String
    },
    country: {
        type: String,
        default: ''
    },
    city: {
        type: String,
        default: ''
    },
    role: {
        enum : ['USER','ADMIN', 'SUPER ADMIN'],
        type: String,
        default: 'USER'
    },
    birthDate: {
        type: String,
        default: ''
    },
    avatar: {
        path: {
            type: String,
        },
        type: {
            type: String
        },
    },
    school: {
        type: String,
        default: ''
    },
    education: {
        type: String,
        default: ''
    },
    profession: {
        type: String,
        default: ''
    },
    interests: {
        type: [String],
        default: []
    },
    location: {
        type: [Number],
        index: '2d'
    },
    banned: {
        type: Boolean,
        default: false
    },
    bannedReason: {
        type: String,
        default: ''
    },
    requests: [{
        type: mongoose.Types.ObjectId,
        ref: 'Request'
    }],
    followers: [{
        type: mongoose.Types.ObjectId,
        ref: 'User'
    }],
    following: [{
        type: mongoose.Types.ObjectId,
        ref: 'User'
    }],
    friends: [{
        type: mongoose.Types.ObjectId,
        ref: 'User'
    }],
    blockedUsers: [{
        type: mongoose.Types.ObjectId,
        ref: 'User'
    }],
    privacy: {
        all: [String],
        friends: [String],
        nobody: [String]
    },
    followedChannels: [{
        type: mongoose.Types.ObjectId,
        ref: 'Channel'
    }],
    messagedUsers: [{
        type: mongoose.Types.ObjectId,
        ref: 'User'
    }],
    messages: [{
        type: mongoose.Types.ObjectId,
        ref: 'Message'
    }],
    subscription: {
        _id: {
            type: mongoose.Types.ObjectId,
            ref: 'Subscription'
        },
        expireDate: Date
    },
    randomVisible: {
        type: Boolean,
        default: true
    },
    ageVisible: {
        type: Boolean,
        default: true
    },
    loggedIn: {
        type: Boolean,
        default: false
    },
    visitProfile: {
        type: Boolean,
        default: false
    },
    deletedAt: {
        type: Date,
        default: null
    }
}, {timestamps: true})

userSchema.methods = {
    cryptPassword: function(password){
        if(!password) return ''
        try{
            return crypto.createHmac('sha256', this.salt)
            .update(password)
            .digest('hex');
        }catch(err){
            return '';
        }
    },
    comparePassword: function(password){
        return this.cryptPassword(password) === this.hashed_paassword
    },
    publicInfo: function(){
        const user = _.pick(this, [
            '_id',
            'firstName',
            'birthDate',
            'lastName',
            'avatar',
            'gender',
            'country',
            'city',
            'role',
            'email',
            'profession',
            'school',
            'education',
            'interests',
            'createdAt',
            'updatedAt',
            'subscription',
            'randomVisible',
            'ageVisible',
            'loggedIn',
            'visitProfile'
        ]);
        user.avatar = user.avatar.path;
        
        return user;
    }
}


userSchema.virtual('password')
.set(function(password){
    this._password = password
    this.salt = uuid.v1()
    this.hashed_paassword = this.cryptPassword(password)
})
.get(function(){
    return this._password;
})

module.exports = mongoose.model('User', userSchema)