// ========================================
// LOGIN
// ========================================

const loginForm =
    document.getElementById(
        "loginForm"
    );

if (loginForm) {

    loginForm.addEventListener(
        "submit",
        async function (event) {

            event.preventDefault();

            // ----------------------------
            // GET INPUT
            // ----------------------------

            const name =
                document
                    .getElementById(
                        "userName"
                    )
                    .value
                    .trim();

            const id =
                document
                    .getElementById(
                        "userId"
                    )
                    .value
                    .trim();

            const password =
                document
                    .getElementById(
                        "password"
                    )
                    .value;

            const error =
                document.getElementById(
                    "loginError"
                );

            const button =
                document.getElementById(
                    "loginButton"
                );

            error.textContent = "";

            // ----------------------------
            // CHECK NAME
            // ----------------------------

            if (!name) {

                error.textContent =
                    "Please enter your name.";

                return;
            }

            // ----------------------------
            // CHECK ID
            // ----------------------------

            if (
                !/^\d{4,8}$/.test(id)
            ) {

                error.textContent =
                    "ID must be 4–8 digits.";

                return;
            }

            // ----------------------------
            // CHECK PASSWORD
            // ----------------------------

            if (!password) {

                error.textContent =
                    "Please enter a password.";

                return;
            }

            button.disabled = true;

            button.textContent =
                "Entering...";

            try {

                // ------------------------
                // LOGIN REQUEST
                // ------------------------

                const response =
                    await fetch(
                        "/api/login",
                        {

                            method:
                                "POST",

                            headers: {
                                "Content-Type":
                                    "application/json"
                            },

                            body:
                                JSON.stringify({
                                    id:
                                        id,

                                    password:
                                        password,

                                    name:
                                        name
                                })
                        }
                    );

                const data =
                    await response.json();

                // ------------------------
                // LOGIN ERROR
                // ------------------------

                if (
                    !data.success
                ) {

                    error.textContent =
                        data.message;

                    return;
                }

                // ------------------------
                // SAVE LOGIN
                // ------------------------

                sessionStorage.setItem(
                    "userId",
                    data.id
                );

                sessionStorage.setItem(
                    "userName",
                    data.name
                );

                // ------------------------
                // GO TO CHAT
                // ------------------------

                window.location.href =
                    "/chat.html";

            } catch (err) {

                console.error(err);

                error.textContent =
                    "Cannot connect to server.";

            } finally {

                button.disabled =
                    false;

                button.textContent =
                    "Enter Chat";
            }
        }
    );
}

// ========================================
// CHAT PAGE
// ========================================

const messages =
    document.getElementById(
        "messages"
    );

if (messages) {

    const userId =
        sessionStorage.getItem(
            "userId"
        );

    const userName =
        sessionStorage.getItem(
            "userName"
        );

    if (
        !userId ||
        !userName
    ) {

        window.location.href =
            "/";

    } else {

        startChat(
            userId,
            userName
        );
    }
}

// ========================================
// START CHAT
// ========================================

function startChat(
    userId,
    userName
) {

    // Create socket
    // for THIS browser/device

    const socket = io();

    // ====================================
    // JOIN ROOM
    // ====================================

    socket.emit(
        "join-room",
        {
            userId:
                userId,

            name:
                userName
        }
    );

    // ====================================
    // DEVICE COUNT
    // ====================================

    socket.on(
        "device-count",
        function (count) {

            const status =
                document.getElementById(
                    "deviceStatus"
                );

            status.textContent =
                `🟢 ${count} device(s) online`;
        }
    );

    // ====================================
    // SEND TEXT
    // ====================================

    const messageForm =
        document.getElementById(
            "messageForm"
        );

    messageForm.addEventListener(
        "submit",
        function (event) {

            event.preventDefault();

            const input =
                document.getElementById(
                    "messageInput"
                );

            const text =
                input.value.trim();

            if (!text) {
                return;
            }

            socket.emit(
                "send-message",
                text
            );

            input.value = "";

            input.focus();
        }
    );

    // ====================================
    // RECEIVE TEXT
    // ====================================

    socket.on(
        "receive-message",
        function (message) {

            addTextMessage(
                message,

                // VERY IMPORTANT
                // Send THIS browser's
                // socket ID

                socket.id
            );
        }
    );

    // ====================================
    // FILE BUTTON
    // ====================================

    document
        .getElementById(
            "fileButton"
        )
        .addEventListener(
            "click",
            function () {

                document
                    .getElementById(
                        "fileInput"
                    )
                    .click();
            }
        );

    // ====================================
    // FILE SELECT
    // ====================================

    document
        .getElementById(
            "fileInput"
        )
        .addEventListener(
            "change",
            function () {

                uploadFile(
                    this,
                    socket
                );
            }
        );

    // ====================================
    // RECEIVE FILE
    // ====================================

    socket.on(
        "receive-file",
        function (file) {

            addFileMessage(
                file,

                // THIS browser's socket

                socket.id
            );
        }
    );

    // ====================================
    // LOGOUT
    // ====================================

    document
        .getElementById(
            "logoutButton"
        )
        .addEventListener(
            "click",
            function () {

                sessionStorage.removeItem(
                    "userId"
                );

                sessionStorage.removeItem(
                    "userName"
                );

                socket.disconnect();

                window.location.href =
                    "/";
            }
        );
}

// ========================================
// ADD TEXT MESSAGE
// ========================================

function addTextMessage(
    message,
    currentSocketId
) {

    const container =
        document.getElementById(
            "messages"
        );

    const div =
        document.createElement(
            "div"
        );

    // ====================================
    // IMPORTANT
    // ====================================
    //
    // SAME BROWSER
    //     = RIGHT
    //
    // OTHER BROWSER
    //     = LEFT
    //
    // ====================================

    if (
        message.senderSocketId ===
        currentSocketId
    ) {

        div.className =
            "message mine";

    } else {

        div.className =
            "message";
    }

    // ====================================
    // NAME
    // ====================================

    const sender =
        document.createElement(
            "strong"
        );

    sender.textContent =
        message.senderName;

    // ====================================
    // TEXT
    // ====================================

    const text =
        document.createElement(
            "div"
        );

    text.textContent =
        message.text;

    // ====================================
    // TIME
    // ====================================

    const time =
        document.createElement(
            "span"
        );

    time.className =
        "message-time";

    time.textContent =
        formatTime(
            message.time
        );

    // ====================================
    // ADD
    // ====================================

    div.appendChild(
        sender
    );

    div.appendChild(
        text
    );

    div.appendChild(
        time
    );

    container.appendChild(
        div
    );

    scrollMessages();
}

// ========================================
// UPLOAD FILE
// ========================================

async function uploadFile(
    input,
    socket
) {

    const file =
        input.files[0];

    if (!file) {
        return;
    }

    // ====================================
    // FILE SIZE
    // ====================================

    if (
        file.size >
        100 * 1024 * 1024
    ) {

        alert(
            "Maximum file size is 100 MB."
        );

        input.value = "";

        return;
    }

    const formData =
        new FormData();

    formData.append(
        "file",
        file
    );

    try {

        const response =
            await fetch(
                "/api/upload",
                {
                    method:
                        "POST",

                    body:
                        formData
                }
            );

        const data =
            await response.json();

        if (
            !data.success
        ) {

            alert(
                data.message
            );

            return;
        }

        // =================================
        // SEND FILE TO ROOM
        // =================================

        socket.emit(
            "send-file",
            {

                url:
                    data.url,

                name:
                    data.name,

                type:
                    data.type,

                size:
                    data.size
            }
        );

    } catch (error) {

        console.error(
            error
        );

        alert(
            "File upload failed."
        );

    } finally {

        input.value = "";
    }
}

// ========================================
// ADD FILE MESSAGE
// ========================================

function addFileMessage(
    file,
    currentSocketId
) {

    const container =
        document.getElementById(
            "messages"
        );

    const div =
        document.createElement(
            "div"
        );

    // ====================================
    // SAME BROWSER = RIGHT
    // OTHER BROWSER = LEFT
    // ====================================

    if (
        file.senderSocketId ===
        currentSocketId
    ) {

        div.className =
            "message mine";

    } else {

        div.className =
            "message";
    }

    // ====================================
    // NAME
    // ====================================

    const sender =
        document.createElement(
            "strong"
        );

    sender.textContent =
        file.senderName;

    div.appendChild(
        sender
    );

    // ====================================
    // IMAGE
    // ====================================

    if (
        file.type &&
        file.type.startsWith(
            "image/"
        )
    ) {

        const image =
            document.createElement(
                "img"
            );

        image.src =
            file.url;

        image.alt =
            file.name;

        div.appendChild(
            image
        );

    }

    // ====================================
    // VIDEO
    // ====================================

    else if (
        file.type &&
        file.type.startsWith(
            "video/"
        )
    ) {

        const video =
            document.createElement(
                "video"
            );

        video.src =
            file.url;

        video.controls =
            true;

        div.appendChild(
            video
        );

    }

    // ====================================
    // OTHER FILE
    // ====================================

    else {

        const link =
            document.createElement(
                "a"
            );

        link.href =
            file.url;

        link.target =
            "_blank";

        link.textContent =
            "📎 " +
            file.name;

        div.appendChild(
            link
        );
    }

    // ====================================
    // TIME
    // ====================================

    const time =
        document.createElement(
            "span"
        );

    time.className =
        "message-time";

    time.textContent =
        formatTime(
            file.time
        );

    div.appendChild(
        time
    );

    container.appendChild(
        div
    );

    scrollMessages();
}

// ========================================
// TIME
// ========================================

function formatTime(
    time
) {

    return new Date(
        time
    ).toLocaleTimeString(
        [],
        {
            hour:
                "2-digit",

            minute:
                "2-digit"
        }
    );
}

// ========================================
// SCROLL
// ========================================

function scrollMessages() {

    const container =
        document.getElementById(
            "messages"
        );

    container.scrollTop =
        container.scrollHeight;
}
