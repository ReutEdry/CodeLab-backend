import express from 'express'

import { log } from '../../middlewares/logger.middleware.js'

import { getBlocks, getBlockById } from './block.controller.js'

const router = express.Router()

// We can add a middleware for the entire router:
// router.use(requireAuth)

router.get('/', getBlocks)
router.get('/:id', log, getBlockById)

export const blockRoutes = router