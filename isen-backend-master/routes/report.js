const express = require('express')
const { allReports, showReport } = require('../app/controllers/ReportController')
const { isAdmin, requireSignin } = require('../app/middlewares/auth')
const { reportById } = require('../app/middlewares/report')
const router = express.Router()

router.get('/all', [requireSignin, isAdmin], allReports)
router.get('/:reportId', [requireSignin, isAdmin], showReport)

router.param('reportId', reportById)
module.exports = router