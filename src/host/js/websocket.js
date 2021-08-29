export class SocketConnection {

	/**
	 * @param {string} url - The URL to connect to.
	*/
	constructor(socket_url) {
		this.is_in_call = true;
		this.socket_url = socket_url;
		this.websocket = null;
	}

	/**
	 * @return {Promise<WebSocket>} - Returns the websocket.
	*/
	initialize() {
		return new Promise((resolve, reject) => {
			this.websocket = new WebSocket(this.socket_url);
			this.websocket.onopen = () => {
				console.log('WebSocket connection for ' + this.socket_url + ' opened.');
				this.is_in_call = false;
				resolve(this.websocket);
			}

			this.websocket.onclose = () => {
				console.log('WebSocket connection for ' + this.socket_url + ' closed.');
				this.is_in_call = true;
				throw new Error('WebSocket connection for ' + this.socket_url + ' closed.');
			}
		});
	}

	/**
	 * @param {string} endpoint - The route to use.
	 * @param {object} data - The data to send.
	 * @return {Promise<object>} - Returns the response.
	*/
	socket_call(endpoint, data) {
		return new Promise((resolve, reject) => {
			if (this.is_in_call) {
				reject('Socket is in use.');
			}

			if (Boolean(this.websocket)) {
				this.is_in_call = true;

				this.websocket.onmessage = (event) => {
					this.is_in_call = false;
					console.log("Websocket did receive: " + event.data);
					resolve(JSON.parse(event.data));
				}

				this.websocket.send(JSON.stringify({
					...{
						route: endpoint
					},
					...data
				}));
			} else {
				reject('Websocket is not initialized.');
			}
		});
	}

	/**
	 * @return {Promise<object>} - Returns the response.
	*/

	wait_for_message() {
		return new Promise((resolve, reject) => {
			if (this.is_in_call) {
				reject('Socket is in use.');
			}

			if (Boolean(this.websocket)) {
				this.is_in_call = true;

				this.websocket.onmessage = (event) => {
					this.is_in_call = false;
					console.log("Websocket did receive: " + event.data);
					resolve(JSON.parse(event.data));
				}
			} else {
				reject('Websocket is not initialized.');
			}
		});
	}
}