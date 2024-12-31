import { logger } from '../../services/logger.service.js'
import { blockService } from './block.service.js'

export async function getBlocks(req, res) {
	try {
		const codeBlocks = await blockService.query()
		res.json(codeBlocks)
	} catch (err) {
		logger.error('Failed to get code blocks', err)
		res.status(400).send({ err: 'Failed to get code blocks' })
	}
}

export async function getBlockById(req, res) {
	try {
		const blockId = req.params.id
		const block = await blockService.getById(blockId)
		res.json(block)
	} catch (err) {
		logger.error('Failed to get code block', err)
		res.status(400).send({ err: 'Failed to get code block' })
	}
}


