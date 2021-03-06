import debug from 'debug'

import {
  readFile,
  writeFile
} from 'fs/promises'

export const BLOCK_QUEUE = './.block-queue'

const {
  env: {
    DEBUG = '@sequencemedia/block-queue,@sequencemedia/block-queue:common,@sequencemedia/block-queue:blocking,@sequencemedia/block-queue:blocking/queue,@sequencemedia/block-queue:block-queue,@sequencemedia/block-queue:access-token'
  } = {}
} = process

debug.enable(DEBUG)

const log = debug('@sequencemedia/block-queue:block-queue')
const info = debug('@sequencemedia/block-queue:block-queue:info')

log('`block-queue` is awake')

const truthy = (v) => Boolean(v)
const dedupe = (a, v) => a.includes(v) ? a : a.concat(v)

export async function getBlockQueue () {
  info('getBlockQueue')

  const fileData = await readFile(BLOCK_QUEUE, 'utf8')

  return fileData
    .split(String.fromCharCode(10))
    .filter(truthy)
    .reduce(dedupe, [])
}

export async function setBlockQueue (blockQueue = []) {
  info('setBlockQueue')

  const fileData = blockQueue
    .filter(truthy)
    .reduce(dedupe, [])
    .join(String.fromCharCode(10))

  await writeFile(BLOCK_QUEUE, fileData, 'utf8')
}
