import debug from 'debug'

import OAuth from 'oauth-1.0a'
import crypto from 'crypto'
import querystring from 'querystring'
import readline from 'readline'

import {
  readFile,
  writeFile
} from 'fs/promises'

import fetch, { Headers } from 'node-fetch'

const {
  env: {
    DEBUG = '@sequencemedia/block-queue,@sequencemedia/block-queue:queue,@sequencemedia/block-queue:block-queue,@sequencemedia/block-queue:access-token'
  } = {}
} = process

debug.enable(DEBUG)

const log = debug('@sequencemedia/block-queue:access-token')
const info = debug('@sequencemedia/block-queue:access-token:info')

log('`block-queue` is awake')

const {
  env: {
    CONSUMER_KEY,
    CONSUMER_SECRET
  } = {}
} = process

const ACCESS_TOKEN = './.access-token'

const API_REQUEST_TOKEN = 'https://api.twitter.com/oauth/request_token'
const API_ACCESS_TOKEN = 'https://api.twitter.com/oauth/access_token'
const API_AUTHORIZE = 'https://api.twitter.com/oauth/authorize'

export const oauth = OAuth({
  consumer: {
    key: CONSUMER_KEY,
    secret: CONSUMER_SECRET
  },
  signature_method: 'HMAC-SHA1',
  hash_function: (baseString, key) => (
    crypto
      .createHmac('sha1', key)
      .update(baseString)
      .digest('base64')
  )
})

const READLINE = readline
  .createInterface({
    input: process.stdin,
    output: process.stdout
  })

function setAuthorizationURLToIO (url = new URL()) {
  READLINE.write(`Get an authorization PIN at the URL: ${url.toString()}\n`)
}

function getAuthorizationPINFromIO () {
  return (
    new Promise((resolve) => {
      READLINE.question('Enter the authorization PIN: ', resolve)
    })
  )
}

export async function getRequestToken () {
  info('getRequestToken')

  const url = new URL(API_REQUEST_TOKEN)

  url.searchParams.set('auth_callback', 'oob')

  const {
    Authorization
  } = oauth.toHeader(oauth.authorize({
    url: url.toString(),
    method: 'POST'
  }))

  const headers = new Headers({
    Authorization
  })

  const response = await fetch(url, { headers, method: 'POST' })
  const responseData = await response.text()

  return querystring.parse(responseData)
}

export async function getAccessToken (oauthToken, oauthVerifier) {
  info('getAccessToken')

  const url = new URL(API_ACCESS_TOKEN)

  const {
    Authorization
  } = oauth.toHeader(oauth.authorize({
    url: url.toString(),
    method: 'POST'
  }))

  url.searchParams.set('oauth_token', oauthToken)
  url.searchParams.set('oauth_verifier', oauthVerifier)

  const headers = new Headers({
    Authorization
  })

  const response = await fetch(url, { headers, method: 'POST' })
  const responseData = await response.text()

  return querystring.parse(responseData)
}

export async function getAccessTokenFromFS () {
  info('getAccessTokenFromFS')

  const fileData = await readFile(ACCESS_TOKEN, 'utf8')
  return JSON.parse(fileData)
}

export async function getAccessTokenFromIO () {
  info('getAccessTokenFromIO')

  const requestToken = await getRequestToken()

  const {
    oauth_token: oauthToken
  } = requestToken

  const url = new URL(API_AUTHORIZE)

  url.searchParams.set('oauth_token', oauthToken)

  setAuthorizationURLToIO(url)

  const oauthVerifier = await getAuthorizationPINFromIO()

  const accessToken = await getAccessToken(oauthToken, oauthVerifier.trim())

  const fileData = JSON.stringify(accessToken)
  await writeFile(ACCESS_TOKEN, fileData, 'utf8')

  return accessToken
}
