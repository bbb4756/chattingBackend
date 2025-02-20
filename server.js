const express = require("express");
const app = express();
// const http = require("http");
const { Server } = require("socket.io");
// const server = http.createServer(app);
const https = require("https");
const fs = require("fs");

const options = {
    key: fs.readFileSync("./private.pem"),
    cert: fs.readFileSync("./public.pem"),
};

// HTTPS 서버 생성
const httpsServer = https.createServer(options, app);
// cors 설정을 하지 않으면 오류가 생기게 됩니다. 설정해 줍니다.
const io = new Server(httpsServer, {
    cors: {
        origin: "https://localhost:3000",
        methods: ["GET", "POST"],
        allowedHeaders: ["my-custom-header"],
        credentials: true,
    },
});

const PORT = process.env.PORT || 8080;

// 어떤 방에 어떤 유저가 들어있는지
let users = {};
// socket.id기준으로 어떤 방에 들어있는지
let socketRoom = {};

// 방의 최대 인원수
const MAXIMUM = 2;

io.on("connection", (socket) => {
    console.log(socket.id, "connection");
    socket.on("join_room", (data) => {
        // 방이 기존에 생성되어 있다면
        console.log("방이 생성?", data);

        if (users[data.room]) {
            console.log(users);
            // 현재 입장하려는 방에 있는 인원수
            const currentRoomLength = users[data.room].length;
            if (currentRoomLength === MAXIMUM) {
                // 인원수가 꽉 찼다면 돌아갑니다.
                console.log("자리없다", currentRoomLength);
                socket.to(socket.id).emit("room_full");
                return;
            }

            // 여분의 자리가 있다면 해당 방 배열에 추가해줍니다.

            users[data.room] = [...users[data.room], { id: socket.id }];
            console.log(users[data.room]);
        } else {
            // 방이 존재하지 않다면 값을 생성하고 추가해줍시다.
            users[data.room] = [{ id: socket.id }];
            console.log(users, "생성완료");
        }
        socketRoom[socket.id] = data.room;

        // 입장
        socket.join(data.room);

        // 입장하기 전 해당 방의 다른 유저들이 있는지 확인하고
        // 다른 유저가 있었다면 offer-answer을 위해 알려줍니다.

        const others = users[data.room].filter((user) => {
            return user.id !== socket.id;
            // console.log(user.id, socket.id);
        });
        if (others.length) {
            io.sockets.to(socket.id).emit("all_users", others);
        }
    });

    socket.on("offer", (sdp, roomName) => {
        // offer를 전달받고 다른 유저들에게 전달해 줍니다.
        socket.to(roomName).emit("getOffer", sdp);
    });

    socket.on("answer", (sdp, roomName) => {
        // answer를 전달받고 방의 다른 유저들에게 전달해 줍니다.
        socket.to(roomName).emit("getAnswer", sdp);
    });

    socket.on("candidate", (candidate, roomName) => {
        // candidate를 전달받고 방의 다른 유저들에게 전달해 줍니다.
        socket.to(roomName).emit("getCandidate", candidate);
    });

    socket.on("disconnect", () => {
        // 방을 나가게 된다면 socketRoom과 users의 정보에서 해당 유저를 지워줍니다.
        const roomID = socketRoom[socket.id];

        if (users[roomID]) {
            users[roomID] = users[roomID].filter((user) => user.id !== socket.id);
            if (users[roomID].length === 0) {
                delete users[roomID];
                return;
            }
        }
        delete socketRoom[socket.id];
        socket.broadcast.to(users[roomID]).emit("user_exit", { id: socket.id });
    });
});

app.get("/", function (req, res) {
    res.send("Hello World");
});

// HTTPS 서버 실행
httpsServer.listen(PORT, () => {
    console.log(`HTTPS server running on https://localhost:${PORT}`);
});
