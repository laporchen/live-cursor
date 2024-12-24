<template>
  <div class="relative bg-gray-500 w-screen h-[2000px]">
    <div class="w-full h-40 p-4">
      <h1 class="text-2xl font-bold"> Your Id </h1>
      <div>
        {{ id }}
      </div>
      <h1 class="text-2xl font-bold"> All cursor locations </h1>
    </div>
    <template v-for="session in sessions" :key="session.id">
      <div
        class="w-4 h-4 rounded-full absolute -translate-x-1/2 -translate-y-1/2 cursor-none"
        :style="{
          left: `${session.x}px`,
          top: `${session.y}px`,
          backgroundColor: session.id === id ? 'red': 'green',
          zIndex: session.id === id ? 1000 : 1
        }">
          {{ session.id }}
        </div>
    </template>
    <template v-for="(square, id) in squares" :key="id">
      <div
        class="absolute"
        :style="{
          left: `${square.x}px`,
          top: `${square.y}px`,
          width: `${square.width}px`,
          height: `${square.height}px`,
          backgroundColor: square.color
        }" />
    </template>
  </div>
</template>

<script setup lang="ts">
  import { useMouse, watchThrottled, useEventListener } from '@vueuse/core'

  const ws = ref<WebSocket>()
  const isReady = ref(false)
  const id = `${Math.floor(Math.random() * 69420 % 512)}`

  const sessions = reactive<Record<string, Session>>({})
  const squares = reactive<Record<number, SquareData>>({})

  function messageHandler(msg: string) {
    if (typeof msg !== 'string') return
    const parsedMsg: WsMessage = JSON.parse(msg)
    // console.log(parsedMsg.type)
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
        console.log(squares)
        delete squares[parsedMsg.squareId]
        break
    }
    
  }
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
  onMounted(async () => {
    await getWs()
  })

  const { x, y }= useMouse({ type: 'page' })
  watchThrottled([x, y], ([x, y]) => {
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

  function generatedColor() {
    return `#${Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0')}`;
  }
  function getLastSquareClicked(x: number, y: number) {
    const id = Object.entries(squares).findLast(([_, square]) => {
      return square.x <= x && square.x + square.width >= x && square.y <= y && square.y + square.height >= y
    })?.[0]
    return typeof id === 'string' ? Number.parseInt(id) : -1
  }
  const lastPressedPosition = reactive({ x: -1, y: -1 })
  useEventListener('mousedown', (evt) => {
    if (evt.button === 2) {
      evt.preventDefault()
      const squareId = getLastSquareClicked(evt.pageX, evt.pageY)
      if (squareId !== -1) {
        ws.value!.send(JSON.stringify({
          type: 'delete-square',
          id,
          squareId,
        }))
      }
      return
    }
    lastPressedPosition.x = evt.pageX
    lastPressedPosition.y = evt.pageY
  })
  useEventListener('mouseup', (evt) => {
    const { x: x1, y: y1 } = lastPressedPosition
    if (x1 < 0 || y1 < 0) return

    const x2 = evt.pageX
    const y2 = evt.pageY
    if (x1 === x2 || y1 === y2) return
    const width = Math.abs(x1 - x2)
    const height = Math.abs(y1 - y2)
    const msg: WsMessage = {
      type: 'add-square',
      id,
      square: {
        x: Math.min(x1, x2),
        y: Math.min(y1, y2),
        width,
        height,
        color: generatedColor(),
      }
    }
    ws.value!.send(JSON.stringify(msg))
    lastPressedPosition.x = -1
    lastPressedPosition.y = -1
  }) 
  
  useEventListener('contextmenu', (e) => e.preventDefault())
</script>
