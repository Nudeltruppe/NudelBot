import { SocketConnection } from "./websocket.js";

var ws = new SocketConnection((window.location.origin.startsWith("https://") ? "wss://" : "ws://") + location.host);
ws.initialize().then(async function (socket) {
	if (localStorage.getItem("token") != undefined) {
		var i = await ws.socket_call("auth/info", {
			token: localStorage.getItem("token")
		});

		try {
			document.getElementById("login_text").innerText = "Logged in as " + i.result.username + " (" + i.result.user + ").";
			document.getElementById("login_text").onclick = _ => {
				location.href = location.origin + "/shell.html";
			};
			document.getElementById("login_button").style = "display: none;";
		} catch (__) {

		}

		ws.websocket.onclose = _ => {
			console.log("Connection closed.");
		};
		ws.websocket.close();
	}
});