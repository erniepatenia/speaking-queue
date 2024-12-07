let speakingQueue = [];

Hooks.on("ready", () => {
    // Add socket listener for module actions
    game.socket.on("module.speaking-queue", (data) => {
        if (data.action === "updateQueue") {
            updateQueueUI(data.queue);
        }
    });

    // Register the new sidebar tab
    SidebarTabs.registeredTabs.push({
        id: "speaking-queue-sidebar",
        title: "Speaking Queue",
        icon: "fas fa-comments", // Icon for the sidebar
        cls: SpeakingQueueSidebar,
    });

    // Create floating UI controls if not using the sidebar
    if (!game.user.isGM && !ui.sidebar.visible) {
        createPlayerControlUI();
    } else if (game.user.isGM) {
        createGMControlUI();
    }
});

/**
 * Floating Player Controls
 */
function createPlayerControlUI() {
    const controls = document.createElement("div");
    controls.id = "player-speaking-queue-controls";
    controls.innerHTML = `
        <button id="join-queue">Join Queue</button>
        <button id="leave-queue">Leave Queue</button>
        <button id="remove-current-speaker">Remove Current Speaker</button>
    `;
    document.body.appendChild(controls);

    // Join Queue
    document.getElementById("join-queue").addEventListener("click", () => {
        game.socket.emit("module.speaking-queue", { action: "addPlayer", userId: game.user.id });
    });

    // Leave Queue
    document.getElementById("leave-queue").addEventListener("click", () => {
        game.socket.emit("module.speaking-queue", { action: "removePlayer", userId: game.user.id });
    });

    // Remove Current Speaker
    document.getElementById("remove-current-speaker").addEventListener("click", () => {
        game.socket.emit("module.speaking-queue", { action: "removeCurrent" });
    });
}

/**
 * Floating GM Controls
 */
function createGMControlUI() {
    const controls = document.createElement("div");
    controls.id = "gm-speaking-queue-controls";
    controls.innerHTML = `
        <button id="clear-queue">Clear Queue</button>
        <button id="remove-current-speaker">Remove Current Speaker</button>
    `;
    document.body.appendChild(controls);

    // Clear Queue
    document.getElementById("clear-queue").addEventListener("click", () => {
        game.socket.emit("module.speaking-queue", { action: "clearQueue" });
    });

    // Remove Current Speaker
    document.getElementById("remove-current-speaker").addEventListener("click", () => {
        game.socket.emit("module.speaking-queue", { action: "removeCurrent" });
    });
}

/**
 * Sidebar Implementation
 */
class SpeakingQueueSidebar extends SidebarTab {
    static get defaultOptions() {
        return mergeObject(super.defaultOptions, {
            id: "speaking-queue-sidebar",
            template: "modules/speaking-queue/templates/speaking-queue.html", // Sidebar template
            title: "Speaking Queue",
            icon: "fas fa-comments",
        });
    }

    activateListeners(html) {
        super.activateListeners(html);

        // Join Queue
        html.find("#join-queue").on("click", () => {
            game.socket.emit("module.speaking-queue", { action: "addPlayer", userId: game.user.id });
        });

        // Leave Queue
        html.find("#leave-queue").on("click", () => {
            game.socket.emit("module.speaking-queue", { action: "removePlayer", userId: game.user.id });
        });

        // Remove Current Speaker
        html.find("#remove-current-speaker").on("click", () => {
            game.socket.emit("module.speaking-queue", { action: "removeCurrent" });
        });

        if (game.user.isGM) {
            // Clear Queue
            html.find("#clear-queue").on("click", () => {
                game.socket.emit("module.speaking-queue", { action: "clearQueue" });
            });
        }
    }
}

/**
 * Update Queue UI
 */
function updateQueueUI(queue) {
    speakingQueue = queue;
    const queueHTML = queue.map((playerId, index) => {
        const playerName = game.users.get(playerId)?.name || "Unknown Player";
        return `<li>${index === 0 ? `<strong>${playerName} (Speaking)</strong>` : playerName}</li>`;
    }).join("");

    // Floating UI update
    const listElement = document.getElementById("speaking-queue-list");
    if (listElement) listElement.innerHTML = `<ul>${queueHTML}</ul>`;

    // Sidebar UI update
    const sidebar = ui.windows.find((app) => app instanceof SpeakingQueueSidebar);
    if (sidebar) {
        const list = sidebar.element.find("#speaking-queue-list");
        list.html(queueHTML);
    }
}

/**
 * Socket Action Handlers
 */
Hooks.once("setup", () => {
    game.socket.on("module.speaking-queue", (data) => {
        switch (data.action) {
            case "addPlayer":
                if (!speakingQueue.includes(data.userId)) speakingQueue.push(data.userId);
                broadcastQueueUpdate();
                break;
            case "removePlayer":
                speakingQueue = speakingQueue.filter((id) => id !== data.userId);
                broadcastQueueUpdate();
                break;
            case "removeCurrent":
                if (speakingQueue.length > 0) speakingQueue.shift(); // Remove the first player
                broadcastQueueUpdate();
                break;
            case "clearQueue":
                speakingQueue = [];
                broadcastQueueUpdate();
                break;
        }
    });
});

// Broadcast updated queue to all clients
function broadcastQueueUpdate() {
    game.socket.emit("module.speaking-queue", { action: "updateQueue", queue: speakingQueue });
}
