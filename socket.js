// Connect to the websocket server
const socket = new WebSocket('ws://localhost:3000')

socket.onopen = () => {
    alert('Connected to the websocket server')
}

socket.onclose = (event) => {
  if (event.wasClean) {
    alert('Connection closed cleanly')
  } else {
    alert('Connection died')
  }
}

socket.onerror = (error) => {
  alert(`Error: ${error.message}`)
}

// socket.binaryType = "arraybuffer"

window.setupHandler = (func) => {
  socket.onmessage = (event) => {
    func(event)
  }
}


window.socket = socket;

