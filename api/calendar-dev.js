import http from 'node:http'

const { default: handler } = await import(new URL('./calendar.js', import.meta.url).href)

function createResponse(res) {
  return {
    statusCode: 200,
    setHeader(name, value) {
      res.setHeader(name, value)
    },
    end(body) {
      res.statusCode = this.statusCode
      res.end(body)
    },
  }
}

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://localhost:3000')
    const query = Object.fromEntries(url.searchParams.entries())
    await handler(
      {
        method: req.method,
        headers: req.headers,
        query,
      },
      createResponse(res)
    )
  } catch (error) {
    res.statusCode = 500
    res.setHeader('Content-Type', 'application/json; charset=utf-8')
    res.end(JSON.stringify({ error: String(error?.message || error) }))
  }
})

server.listen(3000, '0.0.0.0', () => {
  console.log('calendar dev server listening on http://localhost:3000')
})
