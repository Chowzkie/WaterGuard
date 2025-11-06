import { io } from "socket.io-client";


const socket = io(process.env.VITE_SOCKET_URL, {
  transports: ["websocket"],
  reconnection: true,
  reconnectionAttempts: Infinity,
  reconnectionDelay: 2000,
});

export default socket;
