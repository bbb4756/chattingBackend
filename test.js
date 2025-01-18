var express = require("express");
var http = require("http");
var socketIo = require("socket.io");
var app = express();
var server = http.createServer(app);
var io = socketIo(server, {
    cors: {
        origin: true, // 보안을 위해 실제로는 cors를 구체적으로 정의하는게 좋음
    },
});
io.on("connection", function (socket) {
    console.log("Client connected. socket: ".concat(socket.id));
    socket.on("disconnect", function () {
        console.log("Client disconnected");
    });
});
server.listen(8080, function () {
    // 원하는 포트 번호로 변경 가능
    console.log("Listening on port 8080");
});
io.on("connection", function (socket) {
    console.log("Client connected. socket: ".concat(socket.id));
    socket.on("join", function (data) {
        console.log("Join room ".concat(data.room, ". Socket ").concat(socket.id));
    });
    socket.on("offer", function (data) {
        socket.to(data.room).emit("offer", { sdp: data.sdp, sender: socket.id });
    });
    socket.on("answer", function (data) {
        socket.to(data.room).emit("answer", { sdp: data.sdp, sender: socket.id });
    });
    socket.on("candidate", function (data) {
        socket.to(data.room).emit("candidate", { candidate: data.candidate, sender: socket.id });
    });
    socket.on("disconnect", function () {
        console.log("Client disconnected");
    });
});
var totalRooms = {};
io.on("connection", function (socket) {
    console.log("Client connected. socket: ".concat(socket.id));
    socket.on("join", function (data) {
        if (!(data === null || data === void 0 ? void 0 : data.room))
            return;
        socket.join(data.room);
        // 방이 없으면 새로운 방을 만듦
        if (!totalRooms[data.room]) {
            totalRooms[data.room] = { users: [] };
        }
        // 방에 사용자를 추가
        totalRooms[data.room].users.push(socket.id);
        socket.room = data.room;
        console.log("Join room ".concat(data.room, ". Socket ").concat(socket.id));
    });
    socket.on("disconnect", function () {
        // 연결이 끊어지면 방에서 사용자를 제거
        if (socket.room && totalRooms[socket.room]) {
            totalRooms[socket.room].users = totalRooms[socket.room].users.filter(function (id) { return id !== socket.id; });
            // 사용자가 한명도 없으면 방을 없앰
            if (totalRooms[socket.room].users.length === 0) {
                delete totalRooms[socket.room];
            }
        }
        console.log("Client disconnected");
    });
});
