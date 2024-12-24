declare global {
  type Session = { id: string; x: number; y: number }
  type SquareData = { x: number; y: number; width: number; height: number; color: string }
  type Square = { id: number } & SquareData

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
  type WsMessage = WsSession | WsSquare
}

export {
  Session,
  WsMessage,
  Square,
  SquareData,
}
