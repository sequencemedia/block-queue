import debug from 'debug'

import {
  exec
} from 'child_process'

import /* fetch, */ { Headers } from 'node-fetch'

import chokidar from 'chokidar'

import {
  oauth,
  getAccessTokenFromFS,
  getAccessTokenFromIO
} from './access-token.mjs'

import {
  BLOCK_QUEUE,
  getBlockQueue,
  setBlockQueue
} from './block-queue.mjs'

const log = debug('@sequencemedia/block-queue:queue')
const info = debug('@sequencemedia/block-queue:queue:info')

log('`block-queue` is awake')

const {
  env: {
    ID
  } = {}
} = process

const API_USERS_BLOCKING = 'https://api.twitter.com/2/users/:id/blocking'

const RATE = 900000 / 50

function getUsersBlockingHeaders ({ oauth_token: oauthToken, oauth_token_secret: oauthTokenSecret }, url) {
  info('getUsersBlockingHeaders')

  const token = {
    key: oauthToken,
    secret: oauthTokenSecret
  }

  const {
    Authorization
  } = oauth.toHeader(oauth.authorize({
    url: url.toString(),
    method: 'POST'
  }, token))

  return new Headers({
    Authorization,
    'Content-Type': 'application/json'
  })
}

function getUsersBlockingPayload (targetUserId) {
  info('getUsersBlockingPayload')

  return JSON.stringify({ target_user_id: String(targetUserId) })
}

export default exec(`touch ${BLOCK_QUEUE}`, () => {
  let TIMEOUT = null

  chokidar.watch(BLOCK_QUEUE)
    .on('change', async function handleChange (filePath) {
      info('change')

      let accessToken
      try {
        accessToken = await getAccessTokenFromFS()
      } catch (e) {
        const {
          code
        } = e

        if (code === 'ENOENT') {
          accessToken = await getAccessTokenFromIO()
        } else {
          throw e
        }
      }

      if (TIMEOUT) {
        clearTimeout(TIMEOUT)
        TIMEOUT = null
      }

      log(`The file "${filePath}" has been changed.`)

      TIMEOUT = setTimeout(async function handleTimeout () {
        info('handleTimeout')

        const blockQueue = await getBlockQueue()

        if (blockQueue.length) {
          const url = new URL(API_USERS_BLOCKING.replace(':id', ID))
          const id = blockQueue.pop()

          /**
           *  Currently just for logging because the app is in Twitter jail
           */
          getUsersBlockingHeaders(accessToken, url) && getUsersBlockingPayload(id)

          /*
           *  const response = await fetch(url, { headers: getUsersBlockingHeaders(accessToken, url), body: getUsersBlockingPayload(id), method: 'POST' })
           *  const responseData = await response.json()
           *  log(responseData)
           */
          await setBlockQueue(blockQueue)
        }
      }, RATE)
    })
    .on('unlink', async function handleUnlink (filePath) {
      info('unlink')

      if (TIMEOUT) {
        clearTimeout(TIMEOUT)
        TIMEOUT = null
      }

      log(`The file "${filePath}" has been unlinked.`)
    })
    .on('error', function handleError ({ message }) {
      info('error')

      if (TIMEOUT) {
        clearTimeout(TIMEOUT)
        TIMEOUT = null
      }

      log(`Error in watcher. The message was "${message}"`)
    })
})
