const debug = require('debug')

const {
  env: {
    DEBUG = '@sequencemedia/block-queue'
  } = {}
} = process

debug.enable(DEBUG)

const log = debug('@sequencemedia/block-queue')

const {
  env: {
    NODE_ENV = 'development'
  }
} = process

log('`block-queue` is awake')

function env () {
  log({ NODE_ENV })

  return (
    NODE_ENV === 'production'
  )
}

const presets = [
  [
    '@babel/env', {
      useBuiltIns: 'usage',
      targets: {
        node: 'current'
      },
      corejs: 3
    }
  ]
]

const plugins = []

module.exports = (api) => {
  if (api) api.cache.using(env)

  return {
    compact: true,
    comments: false,
    presets,
    plugins
  }
}
