const express = require('express');
const http = require('http');
const WebSocket = require('ws');

const app = express();
const port = 8800;

const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

app.get('/', (req, res) => {
  res.send('WebSocket server is running. Connect on ws://...');
});

wss.on('connection', (ws) => {
  console.log(`🔌 New device connected.`);
  console.log(`Total connected devices: ${wss.clients.size}`);

  ws.on('message', (message) => {
    console.log(`\nReceived message: ${message}`);

    const messageString = message.toString();
    let response;

    try {
      const data = JSON.parse(messageString);
      console.log(`  Decoded JSON:`, data);
      
      if (data.sensor === 'temperature') {
        const temp = data.value;
        console.log(`  Processing temperature: ${temp}°C`);
      }

      response = { status: 'received', data: data };
    } catch (error) {
      console.log('  Message is not valid JSON. Treating as plain text.');
      response = { status: 'received_text', original_message: messageString };
    }
    
    ws.send(JSON.stringify(response));
    console.log(`  Sent response: ${JSON.stringify(response)}`);
  });

  ws.on('close', () => {
    console.log('Device disconnected.');
    console.log(`Total connected devices: ${wss.clients.size}`);
  });

  ws.on('error', (error) => {
    console.error('WebSocket error:', error);
  });
});

server.listen(port, () => {
  console.log(`✅ WebSocket server started on ws://localhost:${port}`);
});