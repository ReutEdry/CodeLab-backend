import { ObjectId } from 'mongodb'
import { logger } from '../../services/logger.service.js'
import { dbService } from '../../services/db.service.js'


export const blockService = {
    query,
    getById,
}

async function query() {
    try {
        const collection = await dbService.getCollection('codeBlock')
        const codeBlocks = collection.toArray()
        return codeBlocks
    } catch (err) {
        logger.error('cannot find code blocks', err)
        throw err
    }
}

async function getById(blockId) {
    try {
        const criteria = { _id: ObjectId.createFromHexString(blockId) }
        const collection = await dbService.getCollection('codeBlock')
        const block = await collection.findOne(criteria)
        console.log('block:', block)
        return block
    } catch (err) {
        logger.error(`while finding code block ${blockId}`, err)
        throw err
    }
}