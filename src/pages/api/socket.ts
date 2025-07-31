import { NextApiRequest, NextApiResponse } from 'next'
import { Server as HTTPServer } from 'http'
import { Server as SocketIOServer } from 'socket.io'
import { initializeSocket } from '@/lib/socket/server'

export default function handler(req: NextApiRequest, res: any) {
  if (!res.socket.server.io) {
    console.log('Initializing Socket.io server...')
    const io = new SocketIOServer(res.socket.server, {
      path: '/api/socket',
      cors: {
        origin: process.env.NODE_ENV === 'production' ? false : ['http://localhost:3000'],
        methods: ['GET', 'POST']
      }
    })
    
    res.socket.server.io = io
    initializeSocket(io)
  }
  
  res.status(200).json({ message: 'Socket.io initialized' })
}
