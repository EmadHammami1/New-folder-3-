const Message = require("../models/Message");
const path = require('path')
const fs = require('fs')
let { connectedUsers, sendNotification, userSocketId } = require('./../helpers');
const mongoose = require("mongoose");
const User = require("../models/User");

module.exports = (io, socket) => {
    socket.on('disconnect', function(){
        socket.disconnect()
        console.log('disconnect')
        console.log('---------------------')
        console.log(connectedUsers(io.sockets))
        console.log(`user disconnected (${ Object.keys(connectedUsers(io.sockets)).length } connected)`);
    });

    
    socket.on('disconnect-user', function(){
        socket.disconnect()
        console.log('---------------------')
        console.log(connectedUsers(io.sockets))
        console.log(`user disconnected (${ Object.keys(connectedUsers(io.sockets)).length } connected)`);
    });

    socket.on('connect-user', (user_id) => {
        socket.username = user_id
        console.log('---------------------')
        console.log(connectedUsers(io.sockets))
        console.log(`user connected (${ Object.keys(connectedUsers(io.sockets)).length } connected)`);
    })

    socket.on('send-message', (msg, image, ind) => {
        try{
            socket.username = msg.from
            if(!msg.text && !image) return;

            let photo = undefined
            if(image){
                const photoName = `${ msg.from }_${ msg.to }_${ new Date().getTime() }.png`
                const photoPath = path.join(__dirname, `./../../public/chats/${ photoName }`)
                fs.writeFileSync(photoPath, image)
                photo = {
                    path: `/chats/${ photoName }`,
                    type: 'png'
                }
            }

            const message = new Message({
                text: msg.text,
                from: mongoose.Types.ObjectId(msg.from), 
                to: mongoose.Types.ObjectId(msg.to),
                image: photo,
                state: 'sent' 
            })

            message.save((err, message) => {
                const fromSocketId = userSocketId(io.sockets, msg.from)
                const toSocketId = userSocketId(io.sockets, msg.to)

                console.log(fromSocketId)
                console.log(toSocketId)

                console.log('---------------------')
                console.log(connectedUsers(io.sockets))

                if(message && !err){
                    if(message.image && message.image.path) message.image.path = process.env.BASEURL + message.image.path

                    
                    if(fromSocketId){
                        io.to(fromSocketId).emit('message-sent', message, ind)
                    }

                    
                    if(toSocketId){
                        io.to(toSocketId).emit('new-message', message)
                    }

                    User.findOne({_id: msg.from}, async(err, user) => {
                        sendNotification({en: user.firstName + ' ' + user.lastName}, {en: msg.text}, {
                            type: 'message',
                            link: '/messages/chat/' + msg.from
                        }, [], [msg.to])
                        
                        if(!user.messagedUsers.includes(msg.to)){
                            user.messagedUsers.push(msg.to)
                        }
                        user.messages.push(message._id)
                        await user.save()
                    })
                    
                    User.findOne({_id: msg.to}, async(err, user) => {
                        
                        if(!user.messagedUsers.includes(msg.from)){
                            user.messagedUsers.push(msg.from)
                        }
                        user.messages.push(message._id)
                        await user.save()
                    })

                }else{
                    if(fromSocketId)
                        io.to(fromSocketId).emit('message-not-sent', ind)
                }
            })
        }catch(err){
            console.log(err);
        }
    })
}
