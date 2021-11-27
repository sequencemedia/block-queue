import debug from 'debug'

import querystring from 'querystring'
import readline from 'readline'

import {
  readFile,
  writeFile
} from 'fs/promises'

import {
  getAuthorization
} from '#block-queue/common'

import fetch, { Headers } from 'node-fetch'

const {
  env: {
    DEBUG = '@sequencemedia/block-queue,@sequencemedia/block-queue:common,@sequencemedia/block-queue:blocking,@sequencemedia/block-queue:blocking/queue,@sequencemedia/block-queue:block-queue,@sequencemedia/block-queue:access-token'
  } = {}
} = process

debug.enable(DEBUG)

const log = debug('@sequencemedia/block-queue:access-token')
const info = debug('@sequencemedia/block-queue:access-token:info')

log('`block-queue` is awake')

const ACCESS_TOKEN = './.access-token'

const API_REQUEST_TOKEN = 'https://api.twitter.com/oauth/request_token'
const API_ACCESS_TOKEN = 'https://api.twitter.com/oauth/access_token'
const API_AUTHORIZE = 'https://api.twitter.com/oauth/authorize'

const READLINE = readline
  .createInterface({
    input: process.stdin,
    output: process.stdout
  })

function setAuthorizationUrlToIO (url = new URL()) {
  READLINE.write(`Get an authorization PIN at the URL: ${url.toString()}\n`)
}

function getAuthorizationPINFromIO () {
  return (
    new Promise((resolve) => {
      READLINE.question('Enter the authorization PIN: ', resolve)
    })
  )
}

function getRequestTokenHeaders (url, method = 'POST') {
  return new Headers({
    Authorization: getAuthorization(url, method)
  })
}

export async function getRequestToken () {
  info('getRequestToken')

  const url = new URL(API_REQUEST_TOKEN)

  url.searchParams.set('auth_callback', 'oob')

  const response = await fetch(url, { headers: getRequestTokenHeaders(url, 'POST'), method: 'POST' })
  const responseData = await response.text()

  return querystring.parse(responseData)
}

function getAccessTokenHeaders (url, method = 'POST') {
  return new Headers({
    Authorization: getAuthorization(url, method)
  })
}

export async function getAccessToken (oauthToken, oauthVerifier) {
  info('getAccessToken')

  const url = new URL(API_ACCESS_TOKEN)

  url.searchParams.set('oauth_token', oauthToken)
  url.searchParams.set('oauth_verifier', oauthVerifier)

  const response = await fetch(url, { headers: getAccessTokenHeaders(url, 'POST'), method: 'POST' })
  const responseData = await response.text()

  return querystring.parse(responseData)
}

export async function getAccessTokenFromFS () {
  info('getAccessTokenFromFS')

  const fileData = await readFile(ACCESS_TOKEN, 'utf8')
  const accessToken = JSON.parse(fileData)

  return accessToken
}

export async function getAccessTokenFromIO () {
  info('getAccessTokenFromIO')

  const requestToken = await getRequestToken()

  const {
    oauth_token: oauthToken
  } = requestToken

  const url = new URL(API_AUTHORIZE)

  url.searchParams.set('oauth_token', oauthToken)

  setAuthorizationUrlToIO(url)

  const oauthVerifier = await getAuthorizationPINFromIO()

  const accessToken = await getAccessToken(oauthToken, oauthVerifier.trim())

  const fileData = JSON.stringify(accessToken) // , null, 2)
  await writeFile(ACCESS_TOKEN, fileData, 'utf8')

  return accessToken
}

export default async function execute () {
  info('execute')

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

  return accessToken
}
