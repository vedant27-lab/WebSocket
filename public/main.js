document.addEventListener('DOMContentLoaded', () => {
    // Get references to the HTML elements
    const statusDiv = document.getElementById('status');
    const messageLogDiv = document.getElementById('messageLog');
    const pendingDevicesDiv = document.getElementById('pendingDevices');

    // Determine the WebSocket protocol and host dynamically for deployment
    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsHost = window.location.host;
    const socket = new WebSocket(`${wsProtocol}//${wsHost}`);

    /**
     * Sends a JSON message to the WebSocket server.
     * @param {object} data The data object to send.
     */
    function sendToServer(data) {
        socket.send(JSON.stringify(data));
    }

    /**
     * Adds a formatted message to the data log.
     * @param {string} message The message content.
     * @param {string} from The sender (e.g., a device ID).
     */
    function logMessage(message, from) {
        const p = document.createElement('p');
        p.innerHTML = `<strong>${from}:</strong> ${message}`;
        messageLogDiv.appendChild(p);
        // Auto-scroll to the latest message
        messageLogDiv.scrollTop = messageLogDiv.scrollHeight;
    }

    // --- WebSocket Event Listeners ---

    // Fired when the connection is opened successfully
    socket.onopen = () => {
        statusDiv.innerText = '✅ Connected';
        statusDiv.style.backgroundColor = '#d4edda';
        // Identify this client as a frontend to the server
        sendToServer({ type: 'frontend_connect' });
    };

    // Fired when a message is received from the server
    socket.onmessage = (event) => {
        const data = JSON.parse(event.data);

        // Handle different message types from the server
        switch (data.type) {
            case 'device_pending': {
                const deviceId = data.deviceId;
                const requestDiv = document.createElement('div');
                requestDiv.id = `pending-${deviceId}`;
                requestDiv.innerHTML = `
                    <span>Device <strong>${deviceId}</strong> wants to connect.</span>
                    <div>
                        <button data-device-id="${deviceId}" data-action="accept">Accept</button>
                        <button data-device-id="${deviceId}" data-action="reject">Reject</button>
                    </div>
                `;
                pendingDevicesDiv.appendChild(requestDiv);
                break;
            }
            case 'device_approved': {
                const approvedDeviceId = data.deviceId;
                const pendingDiv = document.getElementById(`pending-${approvedDeviceId}`);
                if (pendingDiv) {
                    pendingDiv.innerHTML = `<span>Device <strong>${approvedDeviceId}</strong> is now connected.</span>`;
                }
                break;
            }
            case 'sensor_data':
                logMessage(JSON.stringify(data.payload), `Data from ${data.deviceId}`);
                break;

            case 'device_disconnected':
                logMessage(`Device has disconnected.`, `${data.deviceId}`);
                const reqDiv = document.getElementById(`pending-${data.deviceId}`);
                if (reqDiv) reqDiv.remove();
                break;
        }
    };

    // Fired when the connection is closed
    socket.onclose = () => {
        statusDiv.innerText = '❌ Disconnected';
        statusDiv.style.backgroundColor = '#f8d7da';
    };

    // Fired when a connection error occurs
    socket.onerror = (error) => {
        console.error('WebSocket Error:', error);
        statusDiv.innerText = '❌ Error';
        statusDiv.style.backgroundColor = '#f8d7da';
    };

    // --- Event Listener for Accept/Reject Buttons ---

    // Use event delegation on the body to handle clicks on dynamically added buttons
    document.body.addEventListener('click', (event) => {
        const target = event.target;
        // Check if the clicked element is a button with a device-id
        if (target.tagName === 'BUTTON' && target.dataset.deviceId) {
            const deviceId = target.dataset.deviceId;
            const action = target.dataset.action;

            // Send the approval/rejection message to the server
            sendToServer({
                type: 'device_approval',
                deviceId: deviceId,
                action: action
            });

            // Visually update the UI immediately
            const parent = target.parentElement.parentElement;
            parent.innerHTML = `<span>Processing '${action}' for <strong>${deviceId}</strong>...</span>`;
        }
    });
});