import debug from 'debug'

import {
  exec
} from 'child_process'

import fetch, { Headers } from 'node-fetch'

import chokidar from 'chokidar'

import {
  getAuthorizationWithToken
} from '#block-queue/common'

import getAccessToken from '#block-queue/access-token'

import {
  BLOCK_QUEUE,
  getBlockQueue,
  setBlockQueue
} from '#block-queue/block-queue'

const {
  env: {
    DEBUG = '@sequencemedia/block-queue,@sequencemedia/block-queue:common,@sequencemedia/block-queue:blocking,@sequencemedia/block-queue:blocking/queue,@sequencemedia/block-queue:block-queue,@sequencemedia/block-queue:access-token'
  } = {}
} = process

debug.enable(DEBUG)

const log = debug('@sequencemedia/block-queue:blocking/queue')
const info = debug('@sequencemedia/block-queue:blocking/queue:info')

log('`block-queue` is awake')

const {
  env: {
    ID
  } = {}
} = process

const API_USERS_BLOCKING = 'https://api.twitter.com/2/users/:id/blocking'

const RATE = (((1000 * 60) * 60) / 4) / 50 /* Fifty every fifteen minutes */

function getUsersBlockingHeaders (accessToken, url, method = 'POST') {
  info('getUsersBlockingHeaders')

  return new Headers({
    Authorization: getAuthorizationWithToken(accessToken, url, method),
    'Content-Type': 'application/json'
  })
}

function getUsersBlockingPayload (targetUserId) {
  info('getUsersBlockingPayload')

  return JSON.stringify({ target_user_id: String(targetUserId) })
}

export default function execute () {
  info('execute')

  let TIMEOUT = null

  async function handleTimeout () {
    info('handleTimeout')

    const blockQueue = await getBlockQueue()

    if (blockQueue.length) {
      const accessToken = await getAccessToken()
      const url = new URL(API_USERS_BLOCKING.replace(':id', ID))
      const id = blockQueue.shift()

      log(`Blocking user "${id}" ...`)

      try {
        const response = await fetch(url, { headers: getUsersBlockingHeaders(accessToken, url, 'POST'), body: getUsersBlockingPayload(id), method: 'POST' })
        const {
          data: {
            blocking = false
          } = {}
        } = await response.json()

        if (blocking) log(`Blocking user "${id}" succeeded.`)
        else {
          log(`Blocking user "${id}" failed.`)
        }
      } catch ({ message }) {
        log(`Blocking user "${id}" failed with message "${message}".`)
      }
    }

    await setBlockQueue(blockQueue)

    TIMEOUT = null
  }

  function handleChange (filePath) {
    info('change')

    if (TIMEOUT) {
      clearTimeout(TIMEOUT)
      TIMEOUT = null
    }

    TIMEOUT = setTimeout(handleTimeout, RATE)
  }

  function handleUnlink (filePath) {
    info('unlink')

    if (TIMEOUT) {
      clearTimeout(TIMEOUT)
      TIMEOUT = null
    }

    log(`The file "${filePath}" has been unlinked.`)
  }

  function handleError ({ message }) {
    info('error')

    if (TIMEOUT) {
      clearTimeout(TIMEOUT)
      TIMEOUT = null
    }

    log(`Error in watcher. The message was "${message}"`)
  }

  return (
    new Promise((resolve) => {
      exec(`touch ${BLOCK_QUEUE}`, function watch () {
        const watcher = chokidar.watch(BLOCK_QUEUE)
          .on('change', handleChange)
          .on('unlink', handleUnlink)
          .on('error', handleError)

        resolve(watcher)
      })
    })
  )
}
