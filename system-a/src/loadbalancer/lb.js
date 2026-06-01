// const express = require('express');
// const httpProxy = require('http-proxy');
// const rr = require('./roundRobin');

// const PORT = process.env.LB_PORT || 3000;

// const app = express();
// const proxy = httpProxy.createProxyServer({
//   timeout: 10000,
//   proxyTimeout: 10000
// });

// // GLOBAL PROXY ERROR HANDLER
// proxy.on('error', (err, req, res) => {
//   console.error('[Proxy Error]', err.message);

//   if (!res.headersSent) {
//     res.status(502).json({ error: 'Bad Gateway' });
//   }
// });


// // health endpoint
// app.get('/lb-health', (req, res) => {
//   res.json({
//     status: 'ok',
//     port: PORT,
//     ts: Date.now()
//   });
// });

// // ROUND ROBIN GATEWAY
// app.use((req, res) => {
//   try {
//     const target = rr.next();

//     if (!target || !target.url) {
//       return res.status(500).json({ error: 'No backend target available' });
//     }

//     req.headers['x-instance-id'] = target.id;

//     proxy.web(req, res, {
//       target: target.url,
//       changeOrigin: true
//     });

//   } catch (err) {
//     console.error('[LB Fatal]', err.message);
//     res.status(500).json({ error: 'Load balancer failure' });
//   }
// });


// const server = app.listen(PORT, () => {
//   console.log(`[LB] Running on http://localhost:${PORT}`);
// });

// server.on('error', (err) => {
//   console.error('[LB Listen Error]', err.message);

//   if (err.code === 'EADDRINUSE') {
//     console.error('Port 3000 already in use. Kill the process first.');
//   }
// });