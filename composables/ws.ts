import { watchThrottled } from '@vueuse/core'

interface Option {
  x: Ref<number>
  y: Ref<number>
}
export default function useWs(option: Option) {
  const id = `${Math.floor(Math.random() * 69420 % 512)}`

  const ws = ref<WebSocket>()
  const isReady = ref(false)

  const sessions = reactive<Record<string, Session>>({})
  const squares = reactive<Record<number, SquareData>>({})

  function messageHandler(msg: string) {
    if (typeof msg !== 'string') return
    const parsedMsg: WsMessage = JSON.parse(msg)
    switch (parsedMsg.type) {
      case 'get-cursors-response':
        parsedMsg.sessions.forEach((session) => {
          sessions[session.id] = session
        })
        break
      case 'get-squares-response':
        parsedMsg.squares.forEach((square) => {
          squares[square.id] = square
        })
        break
      case 'quit':
        delete sessions[parsedMsg.id]
        break
      case 'move':
        sessions[parsedMsg.id] = parsedMsg
        break
      case 'join':
        sessions[parsedMsg.id] = { id: parsedMsg.id, x: -1, y: -1 }
        break
      case 'add-square':
        squares[parsedMsg.squareId!] = parsedMsg.square
        break
      case 'delete-square':
        delete squares[parsedMsg.squareId]
        break
    }
    
  }

  watchThrottled([option.x, option.y], ([x, y]) => {
    if (!isReady.value) return
    console.log('send')
    const msg: WsMessage = {
      type: 'move',
      id,
      x,
      y
    }
    ws.value!.send(JSON.stringify(msg))
  }, { throttle: 10 })

  async function getWs() {
    ws.value = new WebSocket(`ws://localhost:8787/ws?id=${id}`)
    ws.value.onopen = () => {
      console.log('connected')
      isReady.value = true
      ws.value!.send(JSON.stringify({
        type: 'get-cursors'
      }))
      ws.value!.send(JSON.stringify({
        type: 'get-squares'
      }))
    }

    ws.value.onmessage = (ev) => {
      messageHandler(ev.data)
    }
  }

  function addSquare(square: SquareData) {
    if (!isReady.value) return

    const msg: WsMessage = {
      type: 'add-square',
      id,
      square,
    }
    ws.value!.send(JSON.stringify(msg))
  }
  function deleteSquare(squareId: number) {
    ws.value!.send(JSON.stringify({
      type: 'delete-square',
      id,
      squareId,
    }))
  }

  return {
    sessions,
    squares,
    getWs,
    isReady,
    addSquare,
    deleteSquare,
  }
}
