const {
  env: {
    NODE_ENV = 'development'
  }
} = process

const env = () => NODE_ENV === 'production'

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

module.exports = (api) => {
  if (api) api.cache.using(env)

  return {
    presets
  }
}
