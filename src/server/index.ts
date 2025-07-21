import express, { type Request, type Response } from 'express'
import morgan from 'morgan'
import cors from 'cors'
import helmet from 'helmet'
import compression from 'compression'
import * as trpcExpress from '@trpc/server/adapters/express'
import { appRouter } from '@/trpc'
import { dbServer } from '@/db'
import { sql } from 'kysely'

const app = express()
const PORT = process.env.PORT || 3005

app.use(helmet())
app.use(cors())
app.use(compression())
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

app.use(
  morgan('combined', {
    stream: {
      write: (message: string) => {
        console.log(message.trim())
      },
    },
  })
)

const createContext = async ({ req, res }: { req: Request; res: Response }) => {
  const db = await dbServer()
  return { db, req, res }
}

app.use(
  '/trpc',
  trpcExpress.createExpressMiddleware({
    router: appRouter,
    createContext,
  })
)

app.get('/ping', async (_req: Request, res: Response) => {
  const db = await dbServer()
  const q = await db
    .selectFrom(sql`(select 1)`.as('subquery'))
    .selectAll()
    .execute()

  res.json({
    message: 'pong',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  })
})
app.use((_req: Request, res: Response) => {
  res.status(404).json({ error: 'Route not found' })
})

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`)
})

export default app
