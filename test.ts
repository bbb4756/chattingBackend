const express = require("express");
const http = require("http");
const socketIo = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
    cors: {
        origin: true, // 보안을 위해 실제로는 cors를 구체적으로 정의하는게 좋음
    },
});

io.on("connection", (socket: any) => {
    console.log(`Client connected. socket: ${socket.id}`);

    socket.on("disconnect", () => {
        console.log("Client disconnected");
    });
});

server.listen(8080, () => {
    // 원하는 포트 번호로 변경 가능
    console.log("Listening on port 8080");
});

io.on("connection", (socket: any) => {
    console.log(`Client connected. socket: ${socket.id}`);

    socket.on("join", (data: { room: string }) => {
        console.log(`Join room ${data.room}. Socket ${socket.id}`);
    });

    socket.on("offer", (data: { sdp: string; room: string }) => {
        socket.to(data.room).emit("offer", { sdp: data.sdp, sender: socket.id });
    });

    socket.on("answer", (data: { sdp: string; room: string }) => {
        socket.to(data.room).emit("answer", { sdp: data.sdp, sender: socket.id });
    });

    socket.on("candidate", (data: { candidate: string; room: string }) => {
        socket.to(data.room).emit("candidate", { candidate: data.candidate, sender: socket.id });
    });

    socket.on("disconnect", () => {
        console.log("Client disconnected");
    });
});
const totalRooms = {} as { [key: string]: { users: string[] } };

io.on("connection", (socket: any) => {
    console.log(`Client connected. socket: ${socket.id}`);

    socket.on("join", (data: { room: string }) => {
        if (!data?.room) return;

        socket.join(data.room);

        // 방이 없으면 새로운 방을 만듦
        if (!totalRooms[data.room]) {
            totalRooms[data.room] = { users: [] };
        }
        // 방에 사용자를 추가
        totalRooms[data.room].users.push(socket.id);
        socket.room = data.room;

        console.log(`Join room ${data.room}. Socket ${socket.id}`);
    });

    socket.on("disconnect", () => {
        // 연결이 끊어지면 방에서 사용자를 제거
        if (socket.room && totalRooms[socket.room]) {
            totalRooms[socket.room].users = totalRooms[socket.room].users.filter((id) => id !== socket.id);
            // 사용자가 한명도 없으면 방을 없앰
            if (totalRooms[socket.room].users.length === 0) {
                delete totalRooms[socket.room];
            }
        }

        console.log("Client disconnected");
    });
});
