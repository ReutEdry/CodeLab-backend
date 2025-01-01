import { logger } from './logger.service.js'
import { Server } from 'socket.io'

var gIo = null
var connectedUsers = {}
var mentorId

export function setupSocketAPI(http) {
    gIo = new Server(http, {
        cors: {
            origin: '*',
        }
    })

    ////////// REUT

    gIo.on('connection', socket => {

        logger.info(`New connected socket [id: ${socket.id}]`)

        socket.on('disconnect', () => {
            // when the page refresh it is diconnecting and this code removes the socket so it wont double added
            const block = socket.myBlock
            if (block && connectedUsers[block]) {
                connectedUsers[block] = connectedUsers[block].filter(userId => userId !== socket.id)
                console.log('connectedUsers when disconnect', connectedUsers[block]);

                gIo.to(block).emit('connected-users-count', connectedUsers[block].length)

                logger.info(`Socket disconnected [id: ${socket.id}] from block ${block}`)
            }

            // if (mentorId === socket.id) {
            //     console.log('mentorId', mentorId)
            //     socket.emit('is-mentor', true)

            // }
        })

        socket.on('set-block', block => {
            console.log('set-block')

            if (socket.myBlock === block) return

            // if the socket has block so i want to disconnect it and then join it
            if (socket.myBlock) {
                const oldBlock = socket.myBlock
                removeUserFromBlock(socket, oldBlock)
            }

            socket.join(block)
            socket.myBlock = block

            if (!connectedUsers[socket.myBlock]) connectedUsers[socket.myBlock] = []
            connectedUsers[socket.myBlock].push(socket.id)

            // the first person comes into the room
            if (connectedUsers[socket.myBlock].length === 1) {
                mentorId = socket.id
            } else {
                socket.emit('is-mentor', false)
            }
            // else if (mentorId === socket.id) { // if the socket thats connect is the mentor
            //     socket.emit('is-mentor', true)
            // checking how many users are connected
            gIo.to(block).emit('connected-users-count', connectedUsers[socket.myBlock].length)
        })

        socket.on('leave-block', block => {
            if (socket.myBlock === block) {
                removeUserFromBlock(socket, block)
                delete socket.myBlock
            }

            if (mentorId === socket.id) {
                connectedUsers[block].forEach(userId => {
                    gIo.to(userId).emit('mentor-leave', 'Mentor has left the block. You are being redirected.')
                })
                connectedUsers[block] = []
                mentorId = ''
            }

        })


        //////////// 




        socket.on('chat-send-msg', msg => {
            logger.info(`New chat msg from socket [id: ${socket.id}], emitting to topic ${socket.myTopic}`)
            // emits to all sockets:
            // gIo.emit('chat addMsg', msg)
            // emits only to sockets in the same room
            gIo.to(socket.myTopic).emit('chat-add-msg', msg)
        })

        socket.on('user-watch', userId => {
            logger.info(`user-watch from socket [id: ${socket.id}], on user ${userId}`)
            socket.join('watching:' + userId)
        })
        socket.on('set-user-socket', userId => {
            logger.info(`Setting socket.userId = ${userId} for socket [id: ${socket.id}]`)
            socket.userId = userId
        })
        socket.on('unset-user-socket', () => {
            logger.info(`Removing socket.userId for socket [id: ${socket.id}]`)
            delete socket.userId
        })

    })
}

//////// REUT
function removeUserFromBlock(socket, block) {
    socket.leave(block)
    if (connectedUsers[block]) {
        connectedUsers[block] = connectedUsers[block].filter(userId => userId !== socket.id)
        gIo.to(block).emit('connected-users-count', connectedUsers[block]?.length || 0)
        logger.info(`Socket [id: ${socket.id}] left block ${block}`)
    }
}

////////

function emitTo({ type, data, label }) {
    if (label) gIo.to('watching:' + label.toString()).emit(type, data)
    else gIo.emit(type, data)
}

async function emitToUser({ type, data, userId }) {
    userId = userId.toString()
    const socket = await _getUserSocket(userId)

    if (socket) {
        logger.info(`Emiting event: ${type} to user: ${userId} socket [id: ${socket.id}]`)
        socket.emit(type, data)
    } else {
        logger.info(`No active socket for user: ${userId}`)
        // _printSockets()
    }
}

// If possible, send to all sockets BUT not the current socket 
// Optionally, broadcast to a room / to all
async function broadcast({ type, data, room = null, userId }) {
    userId = userId.toString()

    logger.info(`Broadcasting event: ${type}`)
    const excludedSocket = await _getUserSocket(userId)
    if (room && excludedSocket) {
        logger.info(`Broadcast to room ${room} excluding user: ${userId}`)
        excludedSocket.broadcast.to(room).emit(type, data)
    } else if (excludedSocket) {
        logger.info(`Broadcast to all excluding user: ${userId}`)
        excludedSocket.broadcast.emit(type, data)
    } else if (room) {
        logger.info(`Emit to room: ${room}`)
        gIo.to(room).emit(type, data)
    } else {
        logger.info(`Emit to all`)
        gIo.emit(type, data)
    }
}

async function _getUserSocket(userId) {
    const sockets = await _getAllSockets()
    const socket = sockets.find(s => s.userId === userId)
    return socket
}

async function _getAllSockets() {
    // return all Socket instances
    const sockets = await gIo.fetchSockets()
    return sockets
}

async function _printSockets() {
    const sockets = await _getAllSockets()
    console.log(`Sockets: (count: ${sockets.length}):`)
    sockets.forEach(_printSocket)
}
function _printSocket(socket) {
    console.log(`Socket - socketId: ${socket.id} userId: ${socket.userId}`)
}

export const socketService = {
    // set up the sockets service and define the API
    setupSocketAPI,
    // emit to everyone / everyone in a specific room (label)
    emitTo,
    // emit to a specific user (if currently active in system)
    emitToUser,
    // Send to all sockets BUT not the current socket - if found
    // (otherwise broadcast to a room / to all)
    broadcast,
}
