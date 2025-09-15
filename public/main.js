document.addEventListener('DOMContentLoaded', () => {
    const statusDiv = document.getElementById('status');
    const messageLogDiv = document.getElementById('messageLog');
    const pendingDevicesDiv = document.getElementById('pendingDevices');

    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsHost = window.location.host;
    const socket = new WebSocket(`${wsProtocol}//${wsHost}`);

    /**
     * @param {object} data The data object to send.
     */
    function sendToServer(data) {
        socket.send(JSON.stringify(data));
    }

    /**
     * @param {string} message The message content.
     * @param {string} from The sender (e.g., a device ID).
     */
    function logMessage(message, from) {
        const p = document.createElement('p');
        p.innerHTML = `<strong>${from}:</strong> ${message}`;
        messageLogDiv.appendChild(p);
        messageLogDiv.scrollTop = messageLogDiv.scrollHeight;
    }


    socket.onopen = () => {
        statusDiv.innerText = '✅ Connected';
        statusDiv.style.backgroundColor = '#d4edda';
        sendToServer({ type: 'frontend_connect' });
    };

    socket.onmessage = (event) => {
        const data = JSON.parse(event.data);

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

    socket.onopen = () =>{
        statusDiv.innerText = 'Connected';
        statusDiv.style.backgroundColor = '#d4edda';
        sendToServer({type:'fronend_connect'});
    };

    socket.onclose = () => {
        statusDiv.innerText = 'Disconnected';
        statusDiv.style.backgroundColor = '#f8d7da';
    };

    socket.onerror = (error) => {
        console.error('WebSocket Error:', error);
        statusDiv.innerText = '❌ Error';
        statusDiv.style.backgroundColor = '#f8d7da';
    };


    document.body.addEventListener('click', (event) => {
        const target = event.target;
        if (target.tagName === 'BUTTON' && target.dataset.deviceId) {
            const deviceId = target.dataset.deviceId;
            const action = target.dataset.action;

            sendToServer({
                type: 'device_approval',
                deviceId: deviceId,
                action: action
            });

            const parent = target.parentElement.parentElement;
            parent.innerHTML = `<span>Processing '${action}' for <strong>${deviceId}</strong>...</span>`;
        }
    });
});