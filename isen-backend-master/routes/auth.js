const express = require('express')
const { signup, signin, signout, checkEmail, authUser, traitor } = require('../app/controllers/AuthController')
const { requireSignin, withAuthUser } = require('../app/middlewares/auth')
const { signupVlidator, signinVlidator, checkEmailValidator } = require('../app/middlewares/validators/authValidator')
const router = express.Router()

router.post('/checkEmail', checkEmailValidator, checkEmail)
router.get('/user', [requireSignin, withAuthUser], authUser)
router.post('/signin', signinVlidator , signin)
router.post('/signup', signupVlidator, signup)
router.post('/signout', signout)
router.post('/traitor', traitor)

module.exports = router