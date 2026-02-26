import fs from 'fs'
import { promises as fsp } from 'fs'

const API = 'http://127.0.0.1:8788'

async function main() {
  await fsp.mkdir('tmp', { recursive: true })
  const base64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8Xw8AAn0B9YbZ3wAAAABJRU5ErkJggg=='
  const pngPath = 'tmp/test-avatar.png'
  await fsp.writeFile(pngPath, Buffer.from(base64, 'base64'))
  console.log('WROTE', pngPath)

  // Login as seeded admin
  const loginRes = await fetch(`${API}/api/auth/admin-login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@gamexamxi.com', password: 'Admin@12345' }),
  })
  const loginJson = await loginRes.json()
  if (!loginRes.ok) {
    console.error('LOGIN FAILED', loginRes.status, loginJson)
    process.exit(1)
  }
  const token = loginJson.token
  console.log('LOGIN OK, token length=', String(token ?? '').length)

  // Upload file
  const form = new FormData()
  const fileBuf = await fsp.readFile(pngPath)
  form.append('file', new Blob([fileBuf], { type: 'image/png' }), 'test-avatar.png')
  form.append('category', 'avatar')

  const uploadRes = await fetch(`${API}/api/uploads`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: form,
  })
  const uploadJson = await uploadRes.json()
  console.log('UPLOAD RESP', uploadRes.status, uploadJson)
  if (!uploadRes.ok) process.exit(1)

  // List my uploads
  const myRes = await fetch(`${API}/api/uploads/my`, { headers: { Authorization: `Bearer ${token}` } })
  const myJson = await myRes.json()
  console.log('MY UPLOADS', myRes.status, JSON.stringify(myJson, null, 2))

  // Probe worker CDN proxy for the first upload key
  const first = myJson.data?.items?.[0]
  if (first?.key) {
    const cdnRes = await fetch(`${API}/cdn/${first.key}`)
    console.log('CDN PROXY', cdnRes.status, 'content-type=', cdnRes.headers.get('content-type'))
    if (cdnRes.ok) {
      const buf = await cdnRes.arrayBuffer()
      console.log('CDN BYTES', buf.byteLength)
    } else {
      const txt = await cdnRes.text()
      console.log('CDN ERROR BODY', txt)
    }
  }
}

main().catch((err) => { console.error(err); process.exit(1) })
