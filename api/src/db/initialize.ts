import redis from 'redis'

export const db = process.env.GL_DB
  ? redis.createClient(process.env.GL_DB)
  : redis.createClient()

export const initialize = (): void => {
  db.on('connect', () => {
    console.log('Connected to db!')

    db.hset('hash-test', 'first', '100', () => {
      db.hkeys('hash-test', (err, reply) => {
        console.log(reply)
      })
      // db.hgetall('hash-test', (err, reply) => {
      //   console.log(reply)
      // })
    })
  })
}
