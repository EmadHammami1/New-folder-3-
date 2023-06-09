const express = require('express')
const { indexMessages, getUsersMessages, sendMessagePermission } = require('../app/controllers/MessageController')
const { requireSignin, withAuthUser } = require('../app/middlewares/auth')
const { isFriend } = require('../app/middlewares/request')
const { userById, isNotBlocked } = require('../app/middlewares/user')
const router = express.Router()


router.get('/permission/:userId', [requireSignin, withAuthUser], sendMessagePermission)
router.get('/users', [requireSignin, withAuthUser], getUsersMessages)
router.get('/:userId', [requireSignin], indexMessages)

router.param('userId', userById)

module.exports = router