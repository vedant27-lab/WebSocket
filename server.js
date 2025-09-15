const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const path = require('path');
const { v4: uuidv4 } = require('uuid'); 
const app = express();
const port = process.env.PORT || 8765;

app.use(express.static(path.join(__dirname, 'public')));

const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

const clients = new Map();

function broadcastToFrontends(message) {
    clients.forEach((client, connection) => {
        if (client.type === 'frontend' && connection.readyState === WebSocket.OPEN) {
            connection.send(JSON.stringify(message));
        }
    });
}

wss.on('connection', (ws) => {
    const clientId = uuidv4();
    clients.set(ws, { id: clientId });
    console.log(`🔌 New client connected with ID: ${clientId}`);

    ws.on('message', (message) => {
        const messageString = message.toString();
        const data = JSON.parse(messageString);

        const clientInfo = clients.get(ws);

        switch (data.type) {
            case 'hardware_connect':
                clientInfo.type = 'hardware';
                clientInfo.deviceId = data.deviceId;
                clientInfo.status = 'pending_approval';
                console.log(`Hardware device '${data.deviceId}' registered, awaiting approval.`);
                
                broadcastToFrontends({
                    type: 'device_pending',
                    deviceId: data.deviceId
                });
                break;
            
            case 'device_approval':
                const deviceIdToUpdate = data.deviceId;
                let hardwareSocket = null;

                clients.forEach((client, connection) => {
                    if (client.deviceId === deviceIdToUpdate) {
                        hardwareSocket = connection;
                    }
                });

                if (hardwareSocket && data.action === 'accept') {
                    const hardwareClientInfo = clients.get(hardwareSocket);
                    hardwareClientInfo.status = 'approved';
                    
                    hardwareSocket.send(JSON.stringify({ type: 'command', command: 'start_sending_data' }));
                    console.log(`Device '${deviceIdToUpdate}' approved. Sent start command.`);
                    
                    broadcastToFrontends({ type: 'device_approved', deviceId: deviceIdToUpdate });
                } else {
                    console.log(`Approval for '${deviceIdToUpdate}' processed as '${data.action}'.`);
                }
                break;

            case 'sensor_data':
                if (clientInfo.status === 'approved') {
                    console.log(`Received sensor data from '${clientInfo.deviceId}':`, data.payload);
                    broadcastToFrontends({
                        type: 'sensor_data',
                        deviceId: clientInfo.deviceId,
                        payload: data.payload
                    });
                }
                break;
            
            case 'frontend_connect':
                clientInfo.type = 'frontend';
                console.log(`Frontend client '${clientId}' connected.`);
                break;
        }
    });

    ws.on('close', () => {
        const clientInfo = clients.get(ws);
        if (clientInfo && clientInfo.type === 'hardware') {
            console.log(`Hardware '${clientInfo.deviceId}' disconnected.`);
            broadcastToFrontends({ type: 'device_disconnected', deviceId: clientInfo.deviceId });
        } else {
            console.log(`Client '${clientId}' disconnected.`);
        }
        clients.delete(ws);
    });
});

server.listen(port, '0.0.0.0', () => {
    console.log(`✅ Server is running on http://localhost:${port}`);
});