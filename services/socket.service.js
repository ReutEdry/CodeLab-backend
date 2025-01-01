import { logger } from './logger.service.js'
import { Server } from 'socket.io'

var gIo = null
var connectedUsers = {}
var mentorId

// The blockValue variable stores the current state of each code block.
// This ensures that when a new user joins a block after content has been written,
// they can immediately receive the complete content without needing multiple HTTP requests.
// Keeping the block data within the socket service ensures real-time consistency and minimizes the need for additional backend interactions.
var blockValue = {}

export function setupSocketAPI(http) {
    gIo = new Server(http, {
        cors: {
            origin: '*',
        }
    })

    gIo.on('connection', socket => {
        logger.info(`New connected socket [id: ${socket.id}]`)

        socket.on('disconnect', () => {
            const block = socket.myBlock

            // When the mentor refreshes the page and disconnects, their socket is removed.Since the mentor is essential for the block, all connected users in the block are notified and disconnected to maintain consistency.
            setMentorLeave(socket, block)

            // When a user refreshes the page, their socket disconnects. To prevent duplicate entries, we ensure that the socket is properly removed from the connectedUsers list for the associated block
            if (block && connectedUsers[block]) {
                connectedUsers[block] = connectedUsers[block].filter(userId => userId !== socket.id)
                console.log('connectedUsers when disconnect', connectedUsers[block]);

                gIo.to(block).emit('connected-users-count', connectedUsers[block].length)

                logger.info(`Socket disconnected [id: ${socket.id}] from block ${block}`)
            }

        })

        socket.on('set-block', block => {

            // If the socket is already connected to a block, remove it from the current block
            // before joining the new block to avoid duplicate connections.
            if (socket.myBlock) {
                const oldBlock = socket.myBlock
                removeUserFromBlock(socket, oldBlock)
            }

            socket.join(block)
            socket.myBlock = block


            // Initialize the connectedUsers array for the block if it doesn't exist,
            // then add the current socket ID to the list of connected users for the block.
            if (!connectedUsers[socket.myBlock]) connectedUsers[socket.myBlock] = []
            connectedUsers[socket.myBlock].push(socket.id)

            // Assign the mentor role to the first user who enters the block (if no mentor exists).
            if (!mentorId) {
                mentorId = socket.id
                socket.emit('is-mentor', true)
            } else {
                socket.emit('is-mentor', false)
            }

            // If the block already contains written code, send it to the newly joined user
            // so they can view the current state of the code block.
            if (blockValue[socket.myBlock]) {
                socket.emit('code-block-add', blockValue[socket.myBlock])
            }

            // Notify all users in the block about the updated count of connected users.
            gIo.to(block).emit('connected-users-count', connectedUsers[socket.myBlock].length)
        })

        socket.on('leave-block', block => {
            if (socket.myBlock === block) {

                // If the user leaving is the mentor, disconnect all users in the block using `setMentorLeave`. 
                // This eliminates the need to first remove the mentor as a regular user and then handle the mentor logic.
                if (mentorId === socket.id) {
                    setMentorLeave(socket, block)
                } else {
                    removeUserFromBlock(socket, block)
                    delete socket.myBlock
                }
            }
        })

        socket.on('code-block-write', value => {
            // Store the user's input (value) in blockValue to update the code block state.
            blockValue[socket.myBlock] = value
            socket.broadcast.to(socket.myBlock).emit('code-block-add', blockValue[socket.myBlock])
            logger.info(`Block updated from socket [id:${socket.id}]`)
        })

        socket.on('write-output', value => {
            socket.broadcast.to(socket.myBlock).emit('add-output', value)
            logger.info(`Block updated from socket [id:${socket.id}]`)
        })

    })
}

function removeUserFromBlock(socket, block) {
    socket.leave(block)
    if (connectedUsers[block]) {
        connectedUsers[block] = connectedUsers[block].filter(userId => userId !== socket.id)
        gIo.to(block).emit('connected-users-count', connectedUsers[block]?.length || 0)
        logger.info(`Socket [id: ${socket.id}] left block ${block}`)
    }
}

function setMentorLeave(socket, block) {
    if (mentorId === socket.id) {
        connectedUsers[block].forEach(userId => {
            gIo.to(userId).emit('mentor-leave', 'Mentor has left the block. You are being redirected.')
        })
        connectedUsers[block] = []
        blockValue[block] = ''
        mentorId = ''
    }
}

export const socketService = {
    // set up the sockets service and define the API
    setupSocketAPI,
}
