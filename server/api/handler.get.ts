export default defineEventHandler(async () => {
  const res = await fetch('http://localhost:8787', {
    method: "GET"
  })
  console.log(await res.json())
  return {
    data: await res.text()
  }
})

