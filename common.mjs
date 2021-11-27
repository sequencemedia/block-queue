import debug from 'debug'

import OAuth from 'oauth-1.0a'
import crypto from 'crypto'

const {
  env: {
    CONSUMER_KEY,
    CONSUMER_SECRET
  } = {}
} = process

const {
  env: {
    DEBUG = '@sequencemedia/block-queue,@sequencemedia/block-queue:common,@sequencemedia/block-queue:blocking,@sequencemedia/block-queue:blocking/queue,@sequencemedia/block-queue:block-queue,@sequencemedia/block-queue:access-token'
  } = {}
} = process

debug.enable(DEBUG)

const log = debug('@sequencemedia/block-queue:common')
const info = debug('@sequencemedia/block-queue:common:info')

log('`block-queue` is awake')

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

export function getAuthorization ({ oauth_token: oauthToken, oauth_token_secret: oauthTokenSecret }, url, method) {
  info('getAuthorization')

  const {
    Authorization: authorization
  } = oauth.toHeader(oauth.authorize({
    url: url.toString(),
    method
  }))

  return authorization
}

export function getAuthorizationWithToken ({ oauth_token: oauthToken, oauth_token_secret: oauthTokenSecret }, url, method) {
  info('getAuthorizationWithToken')

  const token = {
    key: oauthToken,
    secret: oauthTokenSecret
  }

  const {
    Authorization: authorization
  } = oauth.toHeader(oauth.authorize({
    url: url.toString(),
    method
  }, token))

  return authorization
}
