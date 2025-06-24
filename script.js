// --- Telegram WebApp init ---
const tg = window.Telegram.WebApp;
let userId = null;
let balance = 0;
let vcBalance = 0;
let inventory = [];
let coinsInterval = null;
let lastActiveTime = Date.now();
let tgUser = null;
let caseItemsPreview = null;

// --- Для подарков ---
let giftModalFriendId = null;

// --- Флаг для истории подарков ---
let giftsHistoryOpen = false;

// --- Для синхронизации очков ---
let lastSyncedBalance = 0;

// === Глобальный Loader ===
function showLoader() {
    let loader = document.getElementById('global-loader');
    if (loader) loader.classList.add('active');
}
function hideLoader() {
    let loader = document.getElementById('global-loader');
    if (loader) loader.classList.remove('active');
}

// === Tooltip ===
function showTooltip(target, text) {
    let tooltip = document.createElement('div');
    tooltip.className = 'tooltip';
    tooltip.innerText = text;
    document.body.appendChild(tooltip);
    let rect = target.getBoundingClientRect();
    tooltip.style.left = rect.left + "px";
    tooltip.style.top = (rect.bottom + 5) + "px";
    tooltip.classList.add('visible');
    setTimeout(() => tooltip.remove(), 2000);
}

// === Глобальный обработчик ошибок ===
window.onerror = function (msg, url, lineNo, columnNo, error) {
    fetch('https://Dante696swag.pythonanywhere.com/log_error', {
        method: 'POST',
        body: JSON.stringify({msg, url, lineNo, columnNo, error: error?.toString()}),
        headers: {'Content-Type': 'application/json'}
    });
};

// === Профиль-меню: аватарка и выпадающее меню ===
document.addEventListener("DOMContentLoaded", () => {
    // Подставить фото пользователя Telegram
    if (window.Telegram && Telegram.WebApp && Telegram.WebApp.initDataUnsafe && Telegram.WebApp.initDataUnsafe.user) {
        const user = Telegram.WebApp.initDataUnsafe.user;
        const photo = user.photo_url || "https://t.me/i/userpic/320/" + (user.username || "") + ".jpg";
        document.getElementById("profile-avatar-img").src = photo;
    }
    // Открытие меню
    document.getElementById("profile-menu-btn").onclick = () => {
        document.getElementById("profile-menu").classList.add("active");
        document.getElementById("profile-menu-backdrop").classList.add("active");
    };
    document.getElementById("profile-menu-close").onclick = () => {
        document.getElementById("profile-menu").classList.remove("active");
        document.getElementById("profile-menu-backdrop").classList.remove("active");
    };
    document.getElementById("profile-menu-backdrop").onclick = () => {
        document.getElementById("profile-menu").classList.remove("active");
        document.getElementById("profile-menu-backdrop").classList.remove("active");
    };
    // Навигация по меню
    document.querySelectorAll('.profile-menu-item').forEach(btn => {
        btn.onclick = () => {
            const action = btn.dataset.action;
            document.getElementById("veln-tabs").style.display = "block";
            document.querySelectorAll('.tab-content').forEach(tab => tab.classList.add("hidden"));
            if (action === "inventory") {
                document.getElementById("tab-inventory").classList.remove("hidden");
                updateUI();
            } else if (action === "open-case") {
                showCasePreview();
            } else if (action === "top") {
                document.getElementById("tab-top").classList.remove("hidden");
                showTopTab("balance");
            } else if (action === "market") {
                document.getElementById("tab-market").classList.remove("hidden");
                loadMarket();
            }
            document.getElementById("profile-menu").classList.remove("active");
            document.getElementById("profile-menu-backdrop").classList.remove("active");
        };
    });

    // Старые табы (если вдруг что)
    document.querySelectorAll(".top-tab-btn").forEach(btn => {
        btn.addEventListener("click", () => {
            document.querySelectorAll(".top-tab-btn").forEach(b => b.classList.remove("active"));
            btn.classList.add("active");
            if (btn.dataset.topTab === "balance") {
                document.getElementById("top-list-balance").classList.remove("hidden");
                document.getElementById("top-list-vc").classList.add("hidden");
                showTopTab("balance");
            } else {
                document.getElementById("top-list-vc").classList.remove("hidden");
                document.getElementById("top-list-balance").classList.add("hidden");
                showTopTab("vc");
            }
        });
    });

    document.getElementById("open-case-btn")?.addEventListener("click", () => {
        showCasePreview();
    });

    document.getElementById("sheet-backdrop").onclick = hideCasePreview;
    document.getElementById("case-preview-close").onclick = hideCasePreview;

    let startY = null;
    document.getElementById("case-preview-sheet").addEventListener("touchstart", e => {
        startY = e.touches[0].clientY;
    });
    document.getElementById("case-preview-sheet").addEventListener("touchmove", e => {
        if (!startY) return;
        let dy = e.touches[0].clientY - startY;
        if (dy > 50) hideCasePreview();
    });

    document.getElementById("add-friend-btn").onclick = () => {
        document.getElementById("add-friend-modal").classList.add("active");
    };
    document.getElementById("add-friend-close").onclick = () => {
        document.getElementById("add-friend-modal").classList.remove("active");
    };
    document.getElementById("add-friend-confirm").onclick = async () => {
        let input = document.getElementById("friend-username-input").value.trim();
        if (!input) return;
        let payload = { user_id: userId };
        if (/^\d+$/.test(input)) payload.friend_id = input;
        else payload.friend_username = input;
        let msgDiv = document.getElementById("add-friend-message");
        msgDiv.textContent = "⏳ Отправка...";
        try {
            let res = await fetch("https://Dante696swag.pythonanywhere.com/add_friend", {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });
            let data = await res.json();
            msgDiv.textContent = data.success ? "✅ Заявка отправлена!" : ("❌ " + (data.error || "Ошибка"));
            if (data.success) setTimeout(() => document.getElementById("add-friend-modal").classList.remove("active"), 1000);
        } catch {
            msgDiv.textContent = "❌ Ошибка сети";
        }
    };

    document.getElementById("show-gifts-btn").onclick = () => {
        const block = document.getElementById("gifts-history-block");
        if (block.classList.contains("hidden")) {
            loadGiftsHistory();
            block.classList.remove("hidden");
            giftsHistoryOpen = true;
        } else {
            block.classList.add("hidden");
            giftsHistoryOpen = false;
        }
    };
    const closeGiftsHistoryBtn = document.getElementById("close-gifts-history");
    if (closeGiftsHistoryBtn) {
        closeGiftsHistoryBtn.onclick = () => {
            document.getElementById("gifts-history-block").classList.add("hidden");
            giftsHistoryOpen = false;
        };
    }

    document.getElementById("gift-modal-close").onclick = () => {
        document.getElementById("gift-modal").classList.remove("active");
    };
    document.querySelectorAll('.gift-type-btn').forEach(btn => {
        btn.onclick = () => {
            document.querySelectorAll('.gift-type-btn').forEach(b => b.classList.remove("active"));
            btn.classList.add("active");
            if (btn.dataset.type === 'coin') {
                document.getElementById("gift-modal-form-coin").classList.remove("hidden");
                document.getElementById("gift-modal-form-item").classList.add("hidden");
            } else {
                document.getElementById("gift-modal-form-coin").classList.add("hidden");
                document.getElementById("gift-modal-form-item").classList.remove("hidden");
            }
            document.getElementById("gift-modal-message").textContent = "";
        };
    });
    document.getElementById("gift-send-coin").onclick = async () => {
        let amount = Number(document.getElementById("gift-coin-amount").value);
        let msgDiv = document.getElementById("gift-modal-message");
        if (!amount || amount <= 0) {
            msgDiv.textContent = "Введите сумму!";
            return;
        }
        msgDiv.textContent = "⏳ Отправка...";
        try {
            let res = await fetch("https://Dante696swag.pythonanywhere.com/send_gift", {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    from_user: userId, to_user: giftModalFriendId,
                    type: "coin", amount
                })
            });
            let data = await res.json();
            msgDiv.textContent = data.success ? "✅ Монеты отправлены!" : ("❌ " + (data.error || "Ошибка"));
            if (data.success) {
                await loadUserData();
                setTimeout(() => document.getElementById("gift-modal").classList.remove("active"), 1200);
            }
        } catch {
            msgDiv.textContent = "❌ Ошибка сети";
        }
    };
    document.getElementById("gift-send-item").onclick = async () => {
        const select = document.getElementById("gift-item-select");
        let idx = select.value;
        let msgDiv = document.getElementById("gift-modal-message");
        if (!idx || idx === "" || inventory.length === 0) {
            msgDiv.textContent = "Выберите предмет!";
            return;
        }
        msgDiv.textContent = "⏳ Отправка...";
        try {
            let res = await fetch("https://Dante696swag.pythonanywhere.com/send_gift", {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    from_user: userId, to_user: giftModalFriendId,
                    type: "item", item_idx: Number(idx)
                })
            });
            let data = await res.json();
            msgDiv.textContent = data.success ? "✅ Предмет отправлен!" : ("❌ " + (data.error || "Ошибка"));
            if (data.success) {
                await loadUserData();
                setTimeout(() => document.getElementById("gift-modal").classList.remove("active"), 1200);
            }
        } catch {
            msgDiv.textContent = "❌ Ошибка сети";
        }
    };

    document.getElementById("show-sell-modal").onclick = () => {
        const select = document.getElementById("sell-item-select");
        select.innerHTML = "";
        inventory.forEach((item, idx) => {
            let name = typeof item === "object" ? item.name : item;
            select.innerHTML += `<option value="${idx}">${name}</option>`;
        });
        document.getElementById("sell-price-input").value = "";
        document.getElementById("sell-modal-msg").textContent = "";
        document.getElementById("sell-modal").classList.add("active");
    };
    document.getElementById("sell-modal-close").onclick = () => {
        document.getElementById("sell-modal").classList.remove("active");
    };

    document.getElementById("confirm-sell-btn").onclick = async () => {
        let idx = document.getElementById("sell-item-select").value;
        let price = parseInt(document.getElementById("sell-price-input").value, 10);
        let msg = document.getElementById("sell-modal-msg");
        if (!idx || isNaN(price) || price < 1) {
            msg.textContent = "Укажите предмет и цену!";
            return;
        }
        let item = inventory[idx];
        msg.textContent = "⏳ ...";
        try {
            let res = await fetch("https://Dante696swag.pythonanywhere.com/market/sell_item", {
                method: "POST",
                headers: {"Content-Type": "application/json"},
                body: JSON.stringify({
                    user_id: userId,
                    item_idx: Number(idx),
                    price: price
                })
            });
            let data = await res.json();
            if (data.success) {
                msg.textContent = "✅ Выставлено!";
                await loadUserData();
                loadMarket();
                setTimeout(() => document.getElementById("sell-modal").classList.remove("active"), 900);
            } else {
                msg.textContent = "❌ " + (data.error || "Ошибка");
            }
        } catch {
            msg.textContent = "❌ Ошибка сети";
        }
    };

    initApp();
});

// --- Sheet/modal по умолчанию скрыт и появляется только по клику ---
function showCasePreview() {
    fetch("https://Dante696swag.pythonanywhere.com/case_items_preview")
        .then(r => r.json()).then(data => {
            if (data.success && data.case_items) {
                caseItemsPreview = data.case_items;
            }
            renderCasePreviewSheet();
        }).catch(() => renderCasePreviewSheet());
}
function renderCasePreviewSheet() {
    const sheet = document.getElementById("case-preview-sheet");
    const tableDiv = document.getElementById("case-preview-table");
    if (!caseItemsPreview) return;
    let html = `<div class="case-sheet-scroll"><table>
      <tr><th>Редкость</th><th>Название</th><th>Шанс</th></tr>`;
    for (const rarity of caseItemsPreview) {
        for (const item of rarity.items) {
            let icon = (item.name.match(/^([\u{1F300}-\u{1F6FF}])/u) || [])[0] || '';
            html += `<tr>
                <td style="color:${rarity.color || "#fff"}">${rarity.rarity}</td>
                <td>${icon} ${item.name.replace(icon, '').trim()}</td>
                <td>${rarity.chance}%</td>
            </tr>`;
        }
    }
    html += "</table></div>";
    tableDiv.innerHTML = html;
    document.getElementById("sheet-backdrop").classList.add("active");
    sheet.classList.add("active");
    document.getElementById("case-preview-open").onclick = function() {
        hideCasePreview();
        openCase();
    };
}
function hideCasePreview() {
    document.getElementById("case-preview-sheet").classList.remove("active");
    document.getElementById("sheet-backdrop").classList.remove("active");
}

// --- Эффект выпадения предмета ---
function showDropModal(item) {
    const modal = document.getElementById('drop-modal');
    const content = document.getElementById('drop-content');
    if (!item) return;
    let name = item.name || '';
    let desc = item.description ? `<div class="item-desc">${item.description}</div>` : '';
    const isLegendary = /легендар/i.test(item.name || "");
    content.innerHTML = `
        <div class="drop-pop-anime${isLegendary ? " legendary-drop" : ""}">
            <span class="drop-emoji">🎉</span>
            <div class="item-name">${name}</div>
            ${desc}
        </div>
        <button class="drop-close" onclick="closeDropModal()">OK</button>
    `;
    modal.classList.add('active');
    setTimeout(() => {
        document.querySelector('.drop-close').focus();
    }, 100);
}
window.closeDropModal = function() {
    document.getElementById('drop-modal').classList.remove('active');
};

// === Кэширование в localStorage (баланс, инвентарь) ===
function saveToLocalCache() {
    localStorage.setItem(
        "userData", 
        JSON.stringify({
            balance,
            vcBalance,
            inventory,
            lastActiveTime
        })
    );
}
function loadFromLocalCache() {
    const cache = JSON.parse(localStorage.getItem("userData") || "{}");
    if (typeof cache.balance === "number") balance = cache.balance;
    if (typeof cache.vcBalance === "number") vcBalance = cache.vcBalance;
    if (Array.isArray(cache.inventory)) inventory = cache.inventory;
    if (cache.lastActiveTime) lastActiveTime = cache.lastActiveTime;
}

async function initApp() {
    try {
        tg.ready();
        tg.expand();
        tgUser = tg.initDataUnsafe?.user;
        userId = tgUser?.id;
        if (!userId) {
            tg.showAlert("❌ Ошибка авторизации");
            return;
        }
        loadFromLocalCache();
        updateUI();
        await loadUserData();
        setupEventListeners();
        handleVisibilityChange();
        startCoinTimer();
        startUserDataPolling();
        startBalanceSyncInterval();
    } catch (e) {
        console.error("Ошибка инициализации:", e);
    }
}

// --- Синхронизация баланса с сервером ---
async function loadUserData() {
    try {
        const response = await fetch(`https://Dante696swag.pythonanywhere.com/get_user?user_id=${userId}`);
        const data = await response.json();
        let serverBalance = typeof data.balance === 'number' ? data.balance : 0;
        if (balance > serverBalance) {
            await saveToServer();
            lastSyncedBalance = balance;
        } else {
            balance = serverBalance;
            lastSyncedBalance = balance;
        }
        vcBalance = typeof data.vcBalance === 'number' ? data.vcBalance : vcBalance;
        inventory = Array.isArray(data.inventory) ? data.inventory : inventory;
        lastActiveTime = data.last_active ? data.last_active : Date.now();
        saveToLocalCache();
        updateUI();
    } catch (e) {
        loadFromLocalCache();
        updateUI();
    }
}

function startBalanceSyncInterval() {
    setInterval(syncBalanceWithServerIfNeeded, 15000);
}
async function syncBalanceWithServerIfNeeded() {
    if (balance !== lastSyncedBalance) {
        await saveToServer();
        lastSyncedBalance = balance;
    }
}

function startCoinTimer() {
    if (coinsInterval) clearInterval(coinsInterval);
    coinsInterval = setInterval(() => {
        if (!document.hidden) {
            balance += 1;
            lastActiveTime = Date.now();
            updateUI();
            saveToLocalCache();
        }
    }, 1000);
}
function stopCoinTimerAndSave() {
    if (coinsInterval) clearInterval(coinsInterval);
    lastActiveTime = Date.now();
    saveToServer();
    saveToLocalCache();
    syncBalanceWithServerIfNeeded();
}
async function openCase() {
    loadFromLocalCache();
    updateUI();

    if (balance < 100) {
        tg.showAlert("❌ Нужно 100 очков!");
        return;
    }
    showLoader();
    try {
        const response = await fetch("https://Dante696swag.pythonanywhere.com/open_case", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ user_id: userId })
        });
        const result = await response.json();
        if (result.success) {
            balance -= 100;
            inventory.push(result.item);
            await saveToServer();
            saveToLocalCache();
            updateUI(result.item);
            lastSyncedBalance = balance;
            showDropModal(result.item);
        } else {
            tg.showAlert(`⚠️ Ошибка: ${result.error || "Неизвестная ошибка"}`);
        }
    } catch (e) {
        tg.showAlert("⚠️ Ошибка соединения с сервером");
    } finally {
        hideLoader();
    }
}
async function showTopTab(tab = "balance") {
    try {
        const response = await fetch("https://Dante696swag.pythonanywhere.com/top_users");
        const data = await response.json();
        let html = '';
        if (tab === "vc") {
            let sorted = [...data].sort((a, b) => (b.vc_balance || 0) - (a.vc_balance || 0));
            html = sorted.slice(0, 10).map((user, idx) => `
              <li>
                <span class="top-rank">${idx+1}</span>
                <img class="top-ava" src="${user.photo_url || 'https://t.me/i/userpic/320/' + (user.username || '') + '.jpg'}" alt="ava" onerror="this.style.display='none'">
                <span class="top-name">@${user.username || user.user_id}</span>
                <span class="top-vc">${user.vc_balance || 0} VC</span>
              </li>`).join('');
            document.getElementById("top-list-vc").innerHTML = html;
        } else {
            let sorted = [...data].sort((a, b) => (b.balance || 0) - (a.balance || 0));
            html = sorted.slice(0, 10).map((user, idx) => `
              <li>
                <span class="top-rank">${idx+1}</span>
                <img class="top-ava" src="${user.photo_url || 'https://t.me/i/userpic/320/' + (user.username || '') + '.jpg'}" alt="ava" onerror="this.style.display='none'">
                <span class="top-name">@${user.username || user.user_id}</span>
                <span class="top-score">${user.balance || 0}</span>
              </li>`).join('');
            document.getElementById("top-list-balance").innerHTML = html;
        }
    } catch (e) {
        tg.showAlert("⚠️ Не удалось получить топ игроков");
        console.error("Ошибка загрузки топа:", e);
    }
}
async function saveToServer() {
    try {
        await fetch("https://Dante696swag.pythonanywhere.com/save_data", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                user_id: userId,
                balance: balance,
                inventory: inventory,
                last_active: lastActiveTime,
                vcBalance: vcBalance,
                username: tgUser?.username || "",
                first_name: tgUser?.first_name || "",
                last_name: tgUser?.last_name || "",
                photo_url: tgUser?.photo_url || ""
            })
        });
    } catch (e) {
        console.error("Ошибка сохранения:", e);
    }
}
function setupEventListeners() {
    document.addEventListener('visibilitychange', handleVisibilityChange);
    tg.onEvent('viewportChanged', (event) => {
        if (!event.isStateStable) {
            stopCoinTimerAndSave();
        }
    });
    window.addEventListener('beforeunload', () => {
        stopCoinTimerAndSave();
        syncBalanceWithServerIfNeeded();
    });
}
function handleVisibilityChange() {
    if (document.visibilityState === "visible") {
        lastActiveTime = Date.now();
        startCoinTimer();
    } else {
        stopCoinTimerAndSave();
    }
}
window.sellItem = function(index) {
    if (typeof index !== "number" || index < 0 || index >= inventory.length) return;
    let item = inventory[index];
    let price = (typeof item === "object" && item.priceVC) ? item.priceVC : 10;
    inventory.splice(index, 1);
    vcBalance += price;
    saveToServer();
    saveToLocalCache();
    updateUI();
};
function updateUI(newDrop = null) {
    document.getElementById("balance").textContent = balance;
    // document.getElementById("vc-balance").textContent = vcBalance; // VC убран из дизайна
    document.getElementById("current-balance")?.textContent = balance;
    const inventoryDiv = document.getElementById("inventory");
    if (!inventoryDiv) return;
    inventoryDiv.className = "inventory-list" + (inventory.length === 0 ? " empty" : "");
    if (inventory.length === 0) {
        inventoryDiv.innerHTML = `<div class="inventory-empty">Ваш инвентарь пуст</div>`;
    } else {
        let itemsHtml = inventory.map((item, i) => {
            let nameHtml = "", descHtml = "";
            if (typeof item === "object") {
                nameHtml = `<span class="item-name">${item.name ? item.name : ''}</span>`;
                descHtml = item.description ? `<div class="item-desc">${item.description}</div>` : "";
            } else {
                nameHtml = `<span class="item-name">${item}</span>`;
            }
            return `<div class="item" data-index="${i}">
                ${nameHtml}${descHtml}
                <button class="sell-btn" onclick="sellItem(${i})">Продать за ${item.priceVC || 10} VC</button>
            </div>`;
        }).join("");
        inventoryDiv.innerHTML = itemsHtml;
    }
}

async function loadMarket() {
    let div = document.getElementById("market-list");
    div.innerHTML = "⏳ Загрузка...";
    try {
        let res = await fetch("https://Dante696swag.pythonanywhere.com/market/list");
        let data = await res.json();
        if (!data.success) { div.innerHTML = "Ошибка"; return; }
        if (!data.items || !data.items.length) {
            div.innerHTML = "<div style='color:#b4bac8'>Пока нет объявлений</div>";
            return;
        }
        div.innerHTML = data.items.map(lot => `
            <div class="market-lot card${lot.seller_id == userId ? " market-lot-self" : ""}">
                <div class="market-lot-name">${lot.item.name || 'Безымянный предмет'}</div>
                <div class="market-lot-desc">${lot.item.description || ""}</div>
                <div class="market-lot-seller">Продавец: <span>@${lot.seller_name || lot.seller_id}</span></div>
                <div class="market-lot-price">Цена: <span>${lot.price}</span> <span style="font-size:1.1em;">VC</span></div>
                ${lot.seller_id == userId
                    ? `<span style="color:#7aaeff;font-size:.97em;margin-top:4px;">Ваш лот</span>`
                    : `<button class="market-buy-btn" onclick="buyMarketItem(${lot.id})">Купить</button>`
                }
            </div>
        `).join('');
    } catch {
        div.innerHTML = "Ошибка сети";
    }
}

window.buyMarketItem = async function(lotId) {
    if (!confirm("Купить этот предмет?")) return;
    showLoader();
    try {
        let res = await fetch("https://Dante696swag.pythonanywhere.com/market/buy_item", {
            method: "POST",
            headers: {"Content-Type": "application/json"},
            body: JSON.stringify({
                user_id: userId,
                lot_id: lotId
            })
        });
        let data = await res.json();
        hideLoader();
        if (data.success) {
            alert("✅ Покупка успешна!");
            await loadUserData();
            loadMarket();
        } else {
            alert("❌ " + (data.error || "Ошибка"));
        }
    } catch {
        hideLoader();
        alert("Ошибка соединения");
    }
};

async function loadFriendsTab() {
    await loadFriendRequests();
    await loadFriendsList();
}

async function loadFriendRequests() {
    const block = document.getElementById("friends-requests-block");
    block.innerHTML = "";
    try {
        const res = await fetch(`https://Dante696swag.pythonanywhere.com/friend_requests?user_id=${userId}`);
        const data = await res.json();
        if (!data.success) return;
        let html = "";

        if (data.incoming.length > 0) {
            html += `<div style="margin-bottom:6px;color:#7aaeff;font-weight:600;">Входящие заявки:</div>`;
            data.incoming.forEach(req => {
                html += `<div class="friends-request-item">
                    <img class="friends-request-ava" src="${req.photo_url || 'https://t.me/i/userpic/320/' + (req.username || '') + '.jpg'}" alt="ava">
                    <span class="friends-request-name">@${req.username || req.user_id}</span>
                    <button class="friends-request-btn" onclick="acceptFriend('${req.user_id}')">Принять</button>
                </div>`;
            });
        }
        if (data.outgoing.length > 0) {
            html += `<div style="margin-bottom:6px;color:#b4bac8;font-size:1em;">Исходящие заявки:</div>`;
            data.outgoing.forEach(req => {
                html += `<div class="friends-request-item">
                    <img class="friends-request-ava" src="${req.photo_url || 'https://t.me/i/userpic/320/' + (req.username || '') + '.jpg'}" alt="ava">
                    <span class="friends-request-name">@${req.username || req.user_id}</span>
                    <span style="margin-left:auto;color:#b4bac8;">Ожидает принятия</span>
                </div>`;
            });
        }
        block.innerHTML = html;
    } catch {
        block.innerHTML = "";
    }
}

window.acceptFriend = async function(friend_id) {
    try {
        let res = await fetch("https://Dante696swag.pythonanywhere.com/accept_friend", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ user_id: userId, friend_id })
        });
        let data = await res.json();
        if (data.success) {
            await loadFriendsTab();
        } else {
            alert(data.error || "Ошибка");
        }
    } catch {
        alert("Ошибка сети");
    }
};

async function loadFriendsList() {
    let ul = document.getElementById("friends-list");
    ul.innerHTML = "⏳ Загрузка...";
    try {
        let res = await fetch(`https://Dante696swag.pythonanywhere.com/friends_list?user_id=${userId}`);
        let data = await res.json();
        if (!data.success) { ul.innerHTML = "Ошибка"; return; }
        if (data.friends.length === 0) { ul.innerHTML = "<li>У вас пока нет друзей</li>"; return; }
        ul.innerHTML = data.friends.map(f =>
            `<li>
                <img class="friend-ava" src="${f.photo_url || 'https://t.me/i/userpic/320/' + (f.username || '') + '.jpg'}" alt="ava">
                <span class="friend-name">@${f.username || f.user_id}</span>
                <button class="gift-btn" onclick="showGiftModal('${f.user_id}', '${f.username || ''}')">Подарить</button>
            </li>`
        ).join("");
    } catch {
        ul.innerHTML = "Ошибка сети";
    }
}

window.showGiftModal = function(friend_id, username) {
    giftModalFriendId = friend_id;
    document.getElementById("gift-modal-friend").innerHTML =
        `<b>Кому:</b> <span style="color:var(--accent);">@${username || friend_id}</span>`;
    document.getElementById("gift-modal-message").textContent = "";
    document.getElementById("gift-coin-amount").value = "";
    const select = document.getElementById("gift-item-select");
    select.innerHTML = "";
    if (Array.isArray(inventory) && inventory.length > 0) {
        inventory.forEach((item, idx) => {
            let name = typeof item === "object" ? item.name : item;
            select.innerHTML += `<option value="${idx}">${name}</option>`;
        });
    } else {
        select.innerHTML = `<option disabled>Нет предметов</option>`;
    }
    document.querySelectorAll('.gift-type-btn').forEach(btn => btn.classList.remove("active"));
    document.querySelector('.gift-type-btn[data-type="coin"]').classList.add("active");
    document.getElementById("gift-modal-form-coin").classList.remove("hidden");
    document.getElementById("gift-modal-form-item").classList.add("hidden");
    document.getElementById("gift-modal").classList.add("active");
};

async function loadGiftsHistory() {
    const block = document.getElementById("gifts-history-block");
    block.innerHTML = "⏳ Загрузка...";
    try {
        const res = await fetch(`https://Dante696swag.pythonanywhere.com/gifts_history?user_id=${userId}`);
        const data = await res.json();
        if (!data.success) { block.innerHTML = "Ошибка"; return; }
        if (!data.history || data.history.length === 0) {
            block.innerHTML = "<div style='color:#b4bac8'>Нет подарков</div>";
            return;
        }
        let lastGiftId = Number(localStorage.getItem('lastViewedGiftId') || 0);
        let html = `<ul class="gifts-history-list">`;
        for (const gift of data.history) {
            let dir = (gift.to_user == userId) ? "in" : "out";
            let user = dir === "in" ? gift.from_user : gift.to_user;
            let userLabel = dir === "in" ? "от" : "кому";
            let dirClass = dir === "in" ? "gift-dir-in" : "gift-dir-out";
            let typeIcon = "";
            let typeText = "";
            if (gift.type === "coin") {
                typeIcon = "🪙";
                typeText = `монеты <b>${gift.amount}</b>`;
            } else if (gift.item?.name) {
                const isLegendary = /легендар/i.test(gift.item.name);
                typeIcon = isLegendary ? "🌟" : "🎁";
                typeText = `предмет <b>${gift.item.name}</b>`;
            } else {
                typeIcon = "🎁";
                typeText = "предмет";
            }
            let date = new Date(gift.created_at * 1000);
            let dateStr = date.toLocaleDateString("ru-RU", { day: '2-digit', month: '2-digit', year: '2-digit' }) +
                " " + date.toLocaleTimeString("ru-RU", { hour: '2-digit', minute: '2-digit' });
            let isNew = gift.id > lastGiftId;
            html += `<li class="gift-history-item${isNew ? ' new-gift-anime' : ''}">
                <span class="gift-type-icon">${typeIcon}</span>
                <span class="gift-user">${userLabel} <span class="${dirClass}">${user}</span></span>
                <span class="gift-type">${typeText}</span>
                <span class="gift-timestamp">${dateStr}</span>
            </li>`;
        }
        html += `</ul>`;
        block.innerHTML = html;
        if (data.history.length > 0) {
            localStorage.setItem('lastViewedGiftId', data.history[0].id);
        }
    } catch {
        block.innerHTML = "Ошибка сети";
    }
}

function startUserDataPolling() {
    let lastUserDataSync = 0;
    setInterval(() => {
        if (document.visibilityState === "visible") {
            let now = Date.now();
            if (now - lastUserDataSync > 8000) {
                lastUserDataSync = now;
                loadUserData();
            }
        }
    }, 3000);
}