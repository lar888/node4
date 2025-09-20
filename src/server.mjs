// server.mjs
import http from 'http'
import url from 'url'
import querystring from 'querystring'

// Config
const PORT = process.env.PORT || 3000
const MAX_BODY_SIZE = 1 * 1024 * 1024 // 1 MB

// Utility: generate HTML template
const createPage = (title, description) => `
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>${title}</title>
</head>
<body>
	<h1>${title}</h1>
	<p>${description}</p>
</body>
</html>
`

// Utility: sanitize user input (to prevent XSS)
const sanitize = (str) => str.replace(/</g, '&lt;').replace(/>/g, '&gt;')

// Utility: send response with headers
const sendResponse = (res, statusCode, body) => {
	const buffer = Buffer.from(body, 'utf-8')
	res.writeHead(statusCode, {
		'Content-Type': 'text/html; charset=utf-8',
		'Content-Length': buffer.length,
		'X-Content-Type-Options': 'nosniff'
	})
	res.end(buffer)
}

// Server
const server = http.createServer((req, res) => {
	try {
		const parsedUrl = url.parse(req.url, true)
		const { pathname } = parsedUrl

		// Handle GET requests
		if (req.method === 'GET') {
			if (pathname === '/') {
				return sendResponse(res, 200, createPage('Home', 'Welcome to the Home Page'))
			}
			if (pathname === '/about') {
				return sendResponse(res, 200, createPage('About', 'Learn more about us'))
			}
			if (pathname === '/contact') {
				return sendResponse(res, 200, createPage('Contact', 'Get in touch'))
			}
			if (pathname === '/submit') {
				const formPage = `
					<!DOCTYPE html>
					<html lang="en">
					<head><meta charset="UTF-8"><title>Submit Form</title></head>
					<body>
							<h1>Submit Form</h1>
							<form action="/submit" method="POST">
									<label>Name: <input type="text" name="name" /></label><br>
									<label>Email: <input type="email" name="email" /></label><br>
									<button type="submit">Submit</button>
							</form>
					</body>
					</html>
					`
				return sendResponse(res, 200, formPage)
			}
			return sendResponse(res, 404, createPage('404', 'Page Not Found'))
		}

		// Handle POST requests
		if (req.method === 'POST' && pathname === '/submit') {
			let body = ''
			let bodySize = 0

			req.on('data', (chunk) => {
				bodySize += chunk.length
				if (bodySize > MAX_BODY_SIZE) {
					res.writeHead(413, { 'Content-Type': 'text/html; charset=utf-8' })
					res.end('<h1>413 Payload Too Large</h1>')
					req.destroy()
				} else {
					body += chunk.toString()
				}
			})

			req.on('end', () => {
				try {
					const parsedData = querystring.parse(body)
					const name = sanitize(parsedData.name || '')
					const email = sanitize(parsedData.email || '')

					if (!name || !email) {
						return sendResponse(res, 400, '<h1>400 Bad Request</h1><p>Invalid form data</p>')
					}

					const responseHTML = `
            <!DOCTYPE html>
            <html lang="en">
            <head><meta charset="UTF-8"><title>Form Submitted</title></head>
            <body>
              <h1>Form Submitted</h1>
              <p>Name: ${name}</p>
              <p>Email: ${email}</p>
            </body>
            </html>
          `
					return sendResponse(res, 200, responseHTML)
				} catch (err) {
					return sendResponse(res, 500, '<h1>Error 500</h1><p>Internal Server Error</p>')
				}
			})
			return
		}

		// Unsupported POST route
		if (req.method === 'POST') {
			return sendResponse(res, 404, createPage('404', 'Page Not Found'))
		}

		// Other HTTP methods → 405 Method Not Allowed
		if (req.method !== 'GET' && req.method !== 'POST') {
			return sendResponse(res, 405, '<h1>405 Method Not Allowed</h1>')
		}
	} catch (err) {
		return sendResponse(res, 500, '<h1>Error 500</h1><p>Internal Server Error</p>')
	}
})

// Start server
server.listen(PORT, () => {
	console.log(`Server is running on http://localhost:${PORT}`)
})

export { server };
