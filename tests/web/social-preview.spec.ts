import { expect, test } from '@playwright/test'

test('serves social metadata and a matching PNG without running JavaScript', async ({ request }) => {
  const response = await request.get('/')
  expect(response.ok()).toBe(true)
  const html = await response.text()
  const head = html.split('</head>')[0]
  const imageUrl = head.match(/property="og:image" content="([^"]+)"/)?.[1]

  expect(imageUrl).toBe('https://useorbe.vercel.app/orbe-social-v1.png')
  expect(head).toContain('property="og:url" content="https://useorbe.vercel.app/"')
  expect(head).toContain('property="og:image:width" content="1200"')
  expect(head).toContain('property="og:image:height" content="630"')
  expect(head).toContain('property="og:image:alt"')
  expect(head).toContain('name="twitter:card" content="summary_large_image"')
  expect(head).toContain(`name="twitter:image" content="${imageUrl}"`)

  const image = await request.get(new URL(imageUrl!).pathname)
  expect(image.ok()).toBe(true)
  expect(image.headers()['content-type']).toContain('image/png')
  const bytes = await image.body()
  expect(bytes.subarray(0, 8).toString('hex')).toBe('89504e470d0a1a0a')
  expect(bytes.readUInt32BE(16)).toBe(1200)
  expect(bytes.readUInt32BE(20)).toBe(630)
})
