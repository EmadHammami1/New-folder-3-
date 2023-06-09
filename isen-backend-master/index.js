// // import modules
const express = require('express')
const mongoose = require('mongoose')
const helmet = require('helmet')
const morgan = require('morgan')
const cookieParser = require('cookie-parser')
const cors = require('cors')
const Agenda = require("agenda");

// import routes
const authRoutes = require('./routes/auth')
const userRoutes = require('./routes/user')
const productRoutes = require('./routes/product')
const jobRoutes = require('./routes/job')
const serviceRoutes = require('./routes/service')
const requestRoutes = require('./routes/request')
const messageRoutes = require('./routes/message')
const channelRoutes = require('./routes/channel')
const postRoutes = require('./routes/post')
const commentRoutes = require('./routes/comment')
const subscriptionRoutes = require('./routes/subscription')
const reportRoutes = require('./routes/report')

// import my middlewares
const { notFoundError, invalidTokenError } = require('./app/middlewares/errors')
const { setUrlInfo, updateUserInfo, allowAccess, checkVersion } = require('./app/middlewares/others')
const Subscription = require('./app/models/Subscription')
// const Channel = require('./app/models/Channel')
// const User = require('./app/models/User')
// const Subscription = require('./app/models/Subscription')

// App configuration
require('dotenv').config()
const app = express();
app.use(cors())
app.use(allowAccess)

const http = require('http').Server(app);
const io = require('socket.io')(http, {
    cors: {
        origins: "*"
    }
});
const { ExpressPeerServer } = require('peer');
const Product = require('./app/models/Product')
const Report = require('./app/models/Report')
const User = require('./app/models/User')
const Follow = require('./app/models/Follow')
const Channel = require('./app/models/Channel')
const Service = require('./app/models/Service')
const Job = require('./app/models/Job')
const { sendNotification } = require('./app/helpers')
const Message = require('./app/models/Message')
const Post = require('./app/models/Post')
const { deleteUser } = require('./app/controllers/UserController')
const peerServer = ExpressPeerServer(http, {
    debug: true
})

// start the server
const port = process.env.PORT || 3000
http.listen(3300, () => console.log("server connected at 127.0.0.1:" + port + " ..."));

// express middlewares
app.use(express.urlencoded({ extended: true }))
app.use(express.json())
app.use(express.static('public'))

// ext middlewares
app.use(helmet()) // security middleware
app.use(morgan('tiny')) // headers info middleware
app.use(cookieParser())

app.use('/peerjs', peerServer)

// connect to mongodb databese
mongoose.connect(process.env.MONGODB_URL, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    useCreateIndex: true,
    tlsInsecure: true
})
.then(() => console.log("Database connected successfully ..."))
.catch((err) => console.log('could not connected to database ...', err))

const agenda = new Agenda({ db: { address: process.env.MONGODB_URL } });
require('./app/jobs')(agenda)

//rotes perfixe
const routePrefix = '/api/v1'

app.use(checkVersion)
app.use(setUrlInfo)
app.use(updateUserInfo)

// routes
app.get(`${ routePrefix }/`, (req,res) => res.send('api is working'))
app.use(`${ routePrefix }/auth`, authRoutes)
app.use(`${ routePrefix }/user`, userRoutes)
app.use(`${ routePrefix }/request`, requestRoutes)
app.use(`${ routePrefix }/product`, productRoutes)
app.use(`${ routePrefix }/job`, jobRoutes)
app.use(`${ routePrefix }/service`, serviceRoutes)
app.use(`${ routePrefix }/message`, messageRoutes)
app.use(`${ routePrefix }/channel`, channelRoutes)
app.use(`${ routePrefix }/channel`, postRoutes)
app.use(`${ routePrefix }/channel`, commentRoutes)
app.use(`${ routePrefix }/subscription`, subscriptionRoutes)
app.use(`${ routePrefix }/report`, reportRoutes)

// expressJwt customized error
app.use(invalidTokenError);
app.use(notFoundError)
// sockets
io.sockets.on('connection', (socket) => {
    console.log('connection');
    require('./app/sockets/chat')(io, socket),
    require('./app/sockets/video')(io, socket)
});

(async() => {
    const subscription = new Subscription();
    subscription.offers = [];
    subscription.dayPrice = 0.5;
    subscription.weekPrice = 6;
    subscription.monthPrice = 20;
    subscription.yearPrice = 120;
    subscription.currency = 'usd';
    await subscription.save();
    console.log('done')
})();