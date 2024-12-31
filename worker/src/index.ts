import { DurableObject } from "cloudflare:workers"

export type Session = { id: string; x: number; y: number }
export type SquareData = { x: number; y: number; width: number; height: number; color: string }
export type Square = { id: number } & SquareData

type WsSquare =
	| { type: 'add-square', id: string, square: SquareData, squareId?: number }
	| { type: 'delete-square', id: string, squareId: number }
	| { type: 'get-squares'}
  | { type: 'get-squares-response'; squares: Square[] }
type WsSession =
  | { type: 'message'; data: string }
  | { type: 'quit'; id: string }
  | { type: 'join'; id: string }
  | { type: 'move'; id: string; x: number; y: number }
  | { type: 'get-cursors' }
  | { type: 'get-cursors-response'; sessions: Session[] }

export type WsMessage = WsSession | WsSquare


export class CollabSessions extends DurableObject {
	sessions: Map<WebSocket, Session>
	nextSquareId: number = 0

	constructor(ctx: DurableObjectState, env: Env) {
		super(ctx, env);
		this.sessions = new Map()
		this.ctx.getWebSockets().forEach((ws) => {
      const meta = ws.deserializeAttachment()
      this.sessions.set(ws, { ...meta })
    })
	}

	broadcast(message: WsMessage, self?: string) {
		const stringifiedMessage = JSON.stringify(message)
		this.ctx.getWebSockets().forEach((ws) => {
			const { id } = ws.deserializeAttachment()
			if (id === self) return
			ws.send(stringifiedMessage)
		})
	}

	async webSocketMessage(ws: WebSocket, message: string) {
		if (typeof message !== 'string') return
		const parsedMessage: WsMessage = JSON.parse(message)
		const session = this.sessions.get(ws)
		if (!session) return
		const squares = (await this.ctx.storage.get<Map<number, Square>>('squares')) || (new Map<number, Square>())

		switch (parsedMessage.type) {
			case 'message':
        this.broadcast(parsedMessage)
        break
			case 'move':
				session.x = parsedMessage.x
				session.y = parsedMessage.y
				ws.serializeAttachment(session)
				this.broadcast(parsedMessage)
				break
			case 'get-cursors':
				const sessions: Session[] = []
				this.sessions.forEach((session) => {
					sessions.push(session)
				})
				const res: WsMessage = { type: 'get-cursors-response', sessions }
				ws.send(JSON.stringify(res))
				break
			case 'add-square':
				const squareData = parsedMessage.square
				const square = { id: this.nextSquareId, ...squareData }
				squares.set(this.nextSquareId, square)
				this.nextSquareId = this.nextSquareId + 1
				const broadcastMsg: WsMessage = { type: 'add-square', id: session.id, square, squareId: square.id }
				this.broadcast(broadcastMsg)
				this.ctx.storage.put('squares', squares)
				break
			case 'delete-square':
				const id = parsedMessage.squareId
				squares.delete(id)
				this.broadcast(parsedMessage)
				this.ctx.storage.put('squares', squares)
				break
			case 'get-squares':
				const squaresArr: Square[] = []
				squares.forEach((square) => {
					squaresArr.push(square)
				})
				const squareRes : WsMessage = { type: 'get-squares-response', squares: squaresArr }
				ws.send(JSON.stringify(squareRes))
				break
		}
	}
  async webSocketClose(ws: WebSocket, code: number) {
		const id = this.sessions.get(ws)?.id
    id && this.broadcast({ type: 'quit', id })
    this.sessions.delete(ws)
		ws.close()
	}

  closeSessions() {
		this.ctx.getWebSockets().forEach((ws) => ws.close())
	}
  async fetch(request: Request) {
		const url = new URL(request.url)
		const id = url.searchParams.get('id')
		if (!id) {
			return new Response('Missing ID', { status: 400 })
		}
		const [client, server] = Object.values(new WebSocketPair())
		this.ctx.acceptWebSocket(server)
		const sessionInitialData: Session = { id, x: -1, y: -1 }
    server.serializeAttachment(sessionInitialData)
    this.sessions.set(server, sessionInitialData)
    this.broadcast({ type: 'join', id }, id)

		return new Response(null, {
      status: 101,
      webSocket: client,
    })
  }

}

export default {
	/**
	 * This is the standard fetch handler for a Cloudflare Worker
	 *
	 * @param request - The request submitted to the Worker from the client
	 * @param env - The interface to reference bindings declared in wrangler.toml
	 * @param ctx - The execution context of the Worker
	 * @returns The response to be sent back to the client
	 */
	async fetch(request, env, ctx): Promise<Response> {
		if (request.url.match('/ws')) {
			// We will create a `DurableObjectId` using the pathname from the Worker request
			// This id refers to a unique instance of our 'MyDurableObject' class above
			const id: DurableObjectId = env.COLLAB_SESSIONS.idFromName('OnlyRoom')

			// This stub creates a communication channel with the Durable Object instance
			// The Durable Object constructor will be invoked upon the first call for a given id
			const stub = env.COLLAB_SESSIONS.get(id)
			return stub.fetch(request)
		}

		return new Response(null, {
			status: 400,
      statusText: 'Bad Request',
      headers: {
        'Content-Type': 'text/plain',
      }
		})
	},
} satisfies ExportedHandler<Env>
