const express = require('express')

const {
    allUsers,
    updateUser, 
    deleteUser, 
    showUser, 
    updateAvatar,
    getUsers,
    follow,
    getUserProfile,
    getFriends,
    removeFriendship,
    blockUser,
    unblockUser,
    updateEmail,
    updatePassword,
    storeUser,
    updateUserDash,
    showUserDash,
    toggleUserStatus,
    clearUserReports,
    reportUser,
    banUser,
    unbanUser,
    updateRandomVisibility,
    deleteAccount,
    updateAgeVisibility,
    profileVisited
} = require('../app/controllers/UserController')

const { requireSignin, isAuth, withAuthUser, isAdmin, isSuperAdmin } = require('../app/middlewares/auth')
const form = require('../app/middlewares/form')
const { userById, isNotBlocked } = require('../app/middlewares/user')
const { userUpdateValidator, updateEmailValidator, updatePasswordValidator, userStoreValidator, userDashUpdateValidator } = require('../app/middlewares/validators/userValidator')
const router = express.Router()


router.get('/all', [requireSignin, isAdmin], allUsers)
router.post('/', [form, requireSignin, isSuperAdmin, userStoreValidator], storeUser)
router.get('/dash/:userId', [requireSignin, isAdmin], showUserDash)
router.put('/dash/:userId', [form, requireSignin, isSuperAdmin, userDashUpdateValidator], updateUserDash)

router.post('/follow/:userId', [requireSignin, isNotBlocked, withAuthUser], follow)

router.get('/friends', [requireSignin], getFriends)
router.post('/friends/remove/:userId', [requireSignin, withAuthUser], removeFriendship)

router.get('/users', [requireSignin, withAuthUser], getUsers)
router.get('/profile/:userId', [requireSignin, isNotBlocked], getUserProfile)
router.put('/', [requireSignin, withAuthUser, userUpdateValidator], updateUser)
router.put('/avatar', [form, requireSignin, withAuthUser], updateAvatar)
router.put('/email', [requireSignin, updateEmailValidator, withAuthUser], updateEmail)
router.put('/password', [requireSignin, updatePasswordValidator, withAuthUser], updatePassword)
router.post('/status/:userId',[requireSignin, isAdmin], toggleUserStatus)
router.put('/randomVisibility',[requireSignin], updateRandomVisibility)
router.put('/ageVisibility',[requireSignin], updateAgeVisibility)
router.get('/profile-visited', [requireSignin, withAuthUser], profileVisited)

router.post('/:userId/block', [requireSignin, withAuthUser], blockUser)
router.post('/:userId/unblock', [requireSignin], unblockUser)

router.delete('/',[requireSignin, withAuthUser], deleteAccount)
router.delete('/:userId',[requireSignin, isSuperAdmin], deleteUser)
router.post('/:userId/clearReports', [requireSignin, isAdmin], clearUserReports)
router.get('/:userId', [requireSignin, isAuth], showUser)
router.post('/:userId/report', [requireSignin], reportUser)
router.post('/:userId/ban', [requireSignin, isAdmin], banUser)
router.post('/:userId/unban', [requireSignin, isAdmin], unbanUser)


router.param('userId', userById)
module.exports = router