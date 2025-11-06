import { io } from "socket.io-client";

const API_BASE_URL = "http://localhost:4000"; // adjust to your backend

const socket = io(API_BASE_URL, {
  transports: ["websocket"],
  reconnection: true,
  reconnectionAttempts: Infinity,
  reconnectionDelay: 2000,
});

export default socket;
