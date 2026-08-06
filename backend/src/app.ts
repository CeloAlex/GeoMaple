import express from 'express'
import cors from 'cors'
import authRoutes from './routes/auth'
import userRoutes from './routes/users'
import auditoriaRoutes from './routes/auditoria'
import imovelRoutes from './routes/imoveis'
import geoRoutes from './routes/geo'
import sinterRoutes from './routes/sinter'
import configRoutes from './routes/config'
import quadraRoutes from './routes/quadras'
import provisorioRoutes from './routes/provisorios'
import geonetworkRoutes from './routes/geonetwork'
import logradouroRoutes from './routes/logradouros'
import certidaoRoutes from './routes/certidoes'

const app = express()

app.use(cors({
  origin: process.env.CORS_ORIGIN?.split(',') ?? [],
  credentials: false,
}))
app.use(express.json())

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' })
})

app.use('/api/config', configRoutes)
app.use('/api/auth', authRoutes)
app.use('/api/users', userRoutes)
app.use('/api/auditoria', auditoriaRoutes)
app.use('/api/imoveis', imovelRoutes)
app.use('/api/geo', geoRoutes)
app.use('/api/sinter', sinterRoutes)
app.use('/api/quadras', quadraRoutes)
app.use('/api/provisorios', provisorioRoutes)
app.use('/api/geonetwork', geonetworkRoutes)
app.use('/api/logradouros', logradouroRoutes)
app.use('/api/certidoes', certidaoRoutes)

export default app
