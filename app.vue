<template>
  <div class="relative bg-gray-500 h-[2000px] w-[2000px] overflow-hidden">
    <div class="w-full h-40 p-4">
      <div class="text-2xl font-bold"> Live Cursor Testing </div>
      <div class="flex items-center gap-2"> 
        <div
          class="w-4 h-4 rounded-full shadow-[0_0_5px_5px]"
          :class="{
            'bg-green-500 shadow-green-400': isReady,
            'bg-red-500 shadow-red-400': !isReady,
          }"
        >
        </div>
          {{ isReady ? 'Connected' : 'Not connected'}}
      </div>
      <template v-if="isReady">
        <div class="text-xl"> Id: {{ id }} </div>
        <div class="text-lg"> Drag to create rectangle, right click to delete. </div>
      </template>
    </div>
    <template v-for="session in sessions" :key="session.id">
      <div
        v-if="session.id !== id"
        class="w-6 h-6 text-center rounded-full absolute -translate-x-1/2 -translate-y-1/2 cursor-none select-none"
        :style="{
          left: `${session.x}px`,
          top: `${session.y}px`,
          backgroundColor: 'red',
          zIndex: 1000,
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
  import { useMouse, useEventListener } from '@vueuse/core'

  const { x, y }= useMouse({ type: 'page' })
  const { id, sessions, squares, addSquare, deleteSquare, getWs, isReady } = useWs({ x, y })
  onMounted(() => getWs())

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
        deleteSquare(squareId)
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
    const width = Math.abs(x1 - x2)
    const height = Math.abs(y1 - y2)
    if (x1 === x2 || y1 === y2 || width < 10 || height < 10) return
    addSquare({
        x: Math.min(x1, x2),
        y: Math.min(y1, y2),
        width,
        height,
        color: generatedColor(),
    })

    lastPressedPosition.x = -1
    lastPressedPosition.y = -1
  }) 
  
  useEventListener('contextmenu', (e) => e.preventDefault())
</script>
