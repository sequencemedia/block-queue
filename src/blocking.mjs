import debug from 'debug'

import fetch, { Headers } from 'node-fetch'

import {
  getAuthorizationWithToken
} from '#block-queue/common'

import getAccessToken from '#block-queue/access-token'

const {
  env: {
    DEBUG = '@sequencemedia/block-queue,@sequencemedia/block-queue:common,@sequencemedia/block-queue:blocking,@sequencemedia/block-queue:blocking/queue,@sequencemedia/block-queue:block-queue,@sequencemedia/block-queue:access-token'
  } = {}
} = process

debug.enable(DEBUG)

const log = debug('@sequencemedia/block-queue:blocking')
const info = debug('@sequencemedia/block-queue:blocking:info')

log('`block-queue` is awake')

const {
  env: {
    ID
  } = {}
} = process

const API_USERS_BLOCKING = 'https://api.twitter.com/2/users/:id/blocking'

const RATE = (((1000 * 60) * 60) / 4) / 15 /* Fifteen every fifteen minutes */

function getUsersBlockingHeaders (accessToken, url, method = 'GET') {
  info('getUsersBlockingHeaders')

  return new Headers({
    Authorization: getAuthorizationWithToken(accessToken, url, method),
    'Content-Type': 'application/json'
  })
}

async function getUsersBlocking (nextToken = null, milliseconds = 0) {
  info('getUsersBlocking')

  return (
    new Promise((resolve) => {
      setTimeout(async function handleTimeout () {
        info('handleTimeout')

        const accessToken = await getAccessToken()
        const url = new URL(API_USERS_BLOCKING.replace(':id', ID))

        if (nextToken) url.searchParams.set('pagination_token', nextToken)

        const response = await fetch(url, { headers: getUsersBlockingHeaders(accessToken, url, 'GET') })
        const responseData = await response.json()

        let data = []

        if (Reflect.has(responseData, 'data')) {
          data = Reflect.get(responseData, 'data')
        }

        if (Reflect.has(responseData, 'meta')) {
          const {
            next_token: nextToken = null
          } = Reflect.get(responseData, 'meta')

          if (nextToken) data = data.concat(await getUsersBlocking(nextToken, RATE))
        }

        resolve(data)
      }, milliseconds)
    })
  )
}

export default async function execute () {
  info('execute')

  try {
    await getUsersBlocking()
  } catch (e) {
    log(e)
  }
}
