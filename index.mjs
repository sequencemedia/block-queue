import debug from 'debug'

import {
  URL
} from 'url'

import {
  exec
} from 'child_process'

import fetch, { Headers } from 'node-fetch'

import getAccessToken from './access-token.mjs'

import {
  BLOCK_QUEUE,
  getBlockQueue,
  setBlockQueue
} from './block-queue.mjs'

import './queue.mjs'

const {
  env: {
    DEBUG = '@sequencemedia/block-queue,@sequencemedia/block-queue:queue,@sequencemedia/block-queue:block-queue,@sequencemedia/block-queue:access-token',
    BEARER_TOKEN
  } = {}
} = process

debug.enable(DEBUG)

const log = debug('@sequencemedia/block-queue')
const info = debug('@sequencemedia/block-queue:info')

log('`block-queue` is awake')

const INVALID_REQUEST = 'https://api.twitter.com/2/problems/invalid-request'

const API_TWEETS = 'https://api.twitter.com/2/tweets/:id'
const API_LIKING_USERS = 'https://api.twitter.com/2/tweets/:id/liking_users'

const headers = new Headers({
  Authorization: `Bearer ${BEARER_TOKEN}`,
  'Content-Type': 'application/json'
})

const getErrorMessage = ({
  errors: [
    {
      message
    }
  ]
}) => message

async function tweets (id) {
  info('tweets')

  const url = new URL(API_TWEETS.replace(':id', id))

  url.searchParams.set('tweet.fields', 'author_id')

  const response = await fetch(url, { headers })
  const responseData = await response.json()

  if (Reflect.has(responseData, 'data')) {
    const data = Reflect.get(responseData, 'data')

    if (Reflect.has(data, 'author_id')) {
      const authorId = Reflect.get(data, 'author_id')

      const currentQueue = await getBlockQueue()

      const amendedQueue = currentQueue
        .concat(authorId)

      await setBlockQueue(amendedQueue)

      log('User queued')
    }
  } else {
    /**
     *  Errors
     */
    if (Reflect.has(responseData, 'type')) {
      const type = Reflect.get(responseData, 'type')

      if (type === INVALID_REQUEST) log('"INVALID_REQUEST"')

      throw new Error(`Error in \`tweets\`. The message was "${getErrorMessage(responseData)}"`)
    }
  }
}

async function likingUsers (id) {
  info('likingUsers')

  const url = new URL(API_LIKING_USERS.replace(':id', id))

  const response = await fetch(url, { headers })
  const responseData = await response.json()

  if (Reflect.has(responseData, 'data')) {
    const data = Reflect.get(responseData, 'data')

    if (Array.isArray(data)) {
      const currentQueue = await getBlockQueue()

      const amendedQueue = currentQueue
        .concat(data.map(({ id }) => id))

      await setBlockQueue(amendedQueue)

      log(`${data.length} liker(s) queued`)
    }
  } else {
    /**
     *  Errors
     */
    if (Reflect.has(responseData, 'type')) {
      const type = Reflect.get(responseData, 'type')

      if (type === INVALID_REQUEST) log('"INVALID_REQUEST"')

      throw new Error(`Error in \`likingUsers\`. The message was "${getErrorMessage(responseData)}"`)
    }
  }
}

async function app (id = '1464198586669973505') {
  info('app')

  await getAccessToken()

  try {
    await tweets(id)
    await likingUsers(id)
  } catch (e) {
    log(e)
  }
}

export default exec(`touch ${BLOCK_QUEUE}`, async () => await app())
