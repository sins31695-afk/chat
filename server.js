require("dotenv").config();

const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const bcrypt = require("bcryptjs");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = process.env.PORT || 3000;

// ========================================
// BASIC SETUP
// ========================================

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(express.static("public"));

// ========================================
// UPLOAD FOLDER
// ========================================

const uploadDir =
    path.join(__dirname, "uploads");

if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir);
}

app.use(
    "/uploads",
    express.static(uploadDir)
);

// ========================================
// MULTER
// ========================================

const storage =
    multer.diskStorage({

        destination:
            function (req, file, cb) {

                cb(
                    null,
                    uploadDir
                );
            },

        filename:
            function (req, file, cb) {

                const extension =
                    path.extname(
                        file.originalname
                    );

                const filename =
                    Date.now() +
                    "-" +
                    Math.random()
                        .toString(36)
                        .substring(2, 10) +
                    extension;

                cb(
                    null,
                    filename
                );
            }
    });

const upload =
    multer({

        storage: storage,

        limits: {
            fileSize:
                100 * 1024 * 1024
        }
    });

// ========================================
// USERS
// ========================================

const users = new Map();

// ========================================
// LOGIN
// ========================================

app.post(
    "/api/login",
    async (req, res) => {

        try {

            const {
                id,
                password,
                name
            } = req.body;

            // ----------------------------
            // CHECK INPUT
            // ----------------------------

            if (
                !id ||
                !password ||
                !name
            ) {

                return res.status(400).json({
                    success: false,
                    message:
                        "ID, password and name are required."
                });
            }

            // ----------------------------
            // ID FORMAT
            // ----------------------------

            if (
                !/^\d{4,8}$/.test(id)
            ) {

                return res.status(400).json({
                    success: false,
                    message:
                        "ID must contain 4-8 digits."
                });
            }

            // ----------------------------
            // NAME
            // ----------------------------

            if (
                name.trim().length < 1
            ) {

                return res.status(400).json({
                    success: false,
                    message:
                        "Please enter your name."
                });
            }

            // ----------------------------
            // CREATE NEW ACCOUNT
            // ----------------------------

            if (!users.has(id)) {

                const hashedPassword =
                    await bcrypt.hash(
                        password,
                        10
                    );

                users.set(
                    id,
                    {
                        id: id,
                        password:
                            hashedPassword
                    }
                );

                console.log(
                    "New chat account created:",
                    id
                );
            }

            // ----------------------------
            // CHECK PASSWORD
            // ----------------------------

            const user =
                users.get(id);

            const passwordCorrect =
                await bcrypt.compare(
                    password,
                    user.password
                );

            if (!passwordCorrect) {

                return res.status(401).json({
                    success: false,
                    message:
                        "Wrong password for this ID."
                });
            }

            // ----------------------------
            // LOGIN SUCCESS
            // ----------------------------

            return res.json({

                success: true,

                id: id,

                name:
                    name.trim()
            });

        } catch (error) {

            console.error(error);

            return res.status(500).json({

                success: false,

                message:
                    "Server error."
            });
        }
    }
);

// ========================================
// FILE UPLOAD
// ========================================

app.post(
    "/api/upload",

    upload.single("file"),

    (req, res) => {

        if (!req.file) {

            return res.status(400).json({

                success: false,

                message:
                    "No file selected."
            });
        }

        return res.json({

            success: true,

            url:
                "/uploads/" +
                req.file.filename,

            name:
                req.file.originalname,

            type:
                req.file.mimetype,

            size:
                req.file.size
        });
    }
);

// ========================================
// CONNECTED DEVICES
// ========================================

const connectedDevices =
    new Map();

// ========================================
// SOCKET.IO
// ========================================

io.on(
    "connection",
    (socket) => {

        console.log(
            "New device connected:",
            socket.id
        );

        // ====================================
        // JOIN ROOM
        // ====================================

        socket.on(
            "join-room",
            ({ userId, name }) => {

                if (
                    !userId ||
                    !name
                ) {
                    return;
                }

                // Store information
                // on THIS socket

                socket.userId =
                    userId;

                socket.userName =
                    name;

                // Join same ID room

                socket.join(
                    userId
                );

                // Create device list

                if (
                    !connectedDevices.has(
                        userId
                    )
                ) {

                    connectedDevices.set(
                        userId,
                        new Set()
                    );
                }

                connectedDevices
                    .get(userId)
                    .add(socket.id);

                const count =
                    connectedDevices
                        .get(userId)
                        .size;

                // Send device count

                io.to(userId).emit(
                    "device-count",
                    count
                );

                console.log(
                    `User ${userId} connected on ${count} device(s)`
                );
            }
        );

        // ====================================
        // SEND TEXT MESSAGE
        // ====================================

        socket.on(
            "send-message",
            (text) => {

                if (
                    !socket.userId
                ) {
                    return;
                }

                if (
                    typeof text !==
                    "string"
                ) {
                    return;
                }

                if (
                    !text.trim()
                ) {
                    return;
                }

                const message = {

                    // VERY IMPORTANT
                    // This identifies
                    // the exact browser/device

                    senderSocketId:
                        socket.id,

                    senderId:
                        socket.userId,

                    senderName:
                        socket.userName,

                    text:
                        text.trim(),

                    time:
                        new Date()
                            .toISOString()
                };

                // Send to every device
                // in same room

                io.to(
                    socket.userId
                ).emit(
                    "receive-message",
                    message
                );
            }
        );

        // ====================================
        // SEND FILE
        // ====================================

        socket.on(
            "send-file",
            (file) => {

                if (
                    !socket.userId
                ) {
                    return;
                }

                const message = {

                    // Exact browser/device

                    senderSocketId:
                        socket.id,

                    senderId:
                        socket.userId,

                    senderName:
                        socket.userName,

                    url:
                        file.url,

                    name:
                        file.name,

                    type:
                        file.type,

                    size:
                        file.size,

                    time:
                        new Date()
                            .toISOString()
                };

                io.to(
                    socket.userId
                ).emit(
                    "receive-file",
                    message
                );
            }
        );

        // ====================================
        // DISCONNECT
        // ====================================

        socket.on(
            "disconnect",
            () => {

                if (
                    !socket.userId
                ) {
                    return;
                }

                const devices =
                    connectedDevices.get(
                        socket.userId
                    );

                if (!devices) {
                    return;
                }

                devices.delete(
                    socket.id
                );

                const count =
                    devices.size;

                if (
                    count === 0
                ) {

                    connectedDevices.delete(
                        socket.userId
                    );

                } else {

                    io.to(
                        socket.userId
                    ).emit(
                        "device-count",
                        count
                    );
                }

                console.log(
                    "Device disconnected:",
                    socket.id
                );
            }
        );
    }
);

// ========================================
// START SERVER
// ========================================

server.listen(
    PORT,
    () => {

        console.log(
            `Chat server running at http://localhost:${PORT}`
        );
    }
);