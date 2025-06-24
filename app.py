from flask import Flask, request, jsonify, g
from flask_cors import CORS
import random
import time
import sqlite3
import os
import json

app = Flask(__name__)
CORS(app)

DATABASE = 'users.db'
SQL_DUMP_FILE = 'users_dump.sql'

# ----------- Предметы для кейса -----------
cup_skins = [
    {"name": f"{emoji} Кружка #{i+1}", "image": "", "description": desc, "priceVC": 8+(i%5)}
    for i, (emoji, desc) in enumerate([
        ("☕", "Классическая кофейная кружка"),
        ("🍵", "Чайная кружка с японским стилем"),
        ("🥤", "Легкая пластиковая кружка"),
        ("🧃", "Кружка для сока с трубочкой"),
        ("🥛", "Молочная кружка"),
        ("🥃", "Стильная стеклянная кружка"),
        ("🧉", "Матэ-кружка для ценителей"),
        ("🍶", "Керамическая кружка для саке"),
        ("🫖", "Миниатюрная чайная кружка"),
        ("🍺", "Пивная кружка для веселья"),
        ("🍻", "Двойная кружка для друзей"),
        ("🥂", "Кружка для праздничных тостов"),
        ("🍷", "Винная кружка для ценителей"),
        ("🥄", "Кружка-ложка для гурманов"),
        ("🧋", "Кружка с боба-чаем"),
        ("🧊", "Кружка-холодильник"),
        ("🍸", "Кружка-коктейль"),
        ("🍹", "Фруктовый взрыв в кружке"),
        ("🧁", "Десертная кружка"),
        ("🍩", "Кружка с пончиком внутри"),
        ("🧀", "Кружка-сырница"),
        ("🍯", "Кружка с медовым дном"),
        ("🍬", "Кружка для сладкоежек"),
        ("🍫", "Шоколадная кружка"),
        ("🍪", "Кружка с печеньем"),
        ("🍰", "Кружка-тортик"),
        ("🫚", "Имбирная кружка"),
        ("🍦", "Кружка-мороженое"),
        ("🍨", "Кружка с пломбиром"),
        ("🫛", "Гороховая кружка"),
    ])
]
plate_skins = [
    {"name": f"{emoji} Тарелка #{i+1}", "image": "", "description": desc, "priceVC": 9+(i%6)}
    for i, (emoji, desc) in enumerate([
        ("🍽️", "Классическая обеденная тарелка"),
        ("🥣", "Глубокая тарелка для супа"),
        ("🥗", "Тарелка для салата"),
        ("🍲", "Тарелка для горячего"),
        ("🍛", "Тарелка с рисом"),
        ("🍜", "Тарелка для лапши"),
        ("🍝", "Пастовая тарелка"),
        ("🥘", "Паэлья-тарелка"),
        ("🍿", "Тарелка для попкорна"),
        ("🥮", "Тарелка для печенья"),
        ("🍤", "Тарелка с креветками"),
        ("🍥", "Тарелка с суши"),
        ("🍙", "Тарелка с онигири"),
        ("🍚", "Тарелка для каши"),
        ("🍛", "Тарелка с карри"),
        ("🥟", "Тарелка с пельменями"),
        ("🧆", "Тарелка с фалафелем"),
        ("🥞", "Тарелка с блинами"),
        ("🍧", "Десертная тарелка"),
        ("🥠", "Тарелка с печеньем удачи"),
        ("🍰", "Тарелка с тортом"),
        ("🍨", "Тарелка с мороженым"),
        ("🍦", "Тарелка с рожком"),
        ("🍩", "Тарелка с пончиком"),
        ("🍪", "Тарелка с печеньем"),
        ("🧁", "Тарелка с кексами"),
        ("🍫", "Тарелка с шоколадом"),
        ("🍮", "Тарелка с пудингом"),
        ("🍯", "Тарелка с медом"),
        ("🍲", "Горячая тарелка"),
    ])
]
car_skins = [
    {"name": f"{emoji} Машина #{i+1}", "image": "", "description": desc, "priceVC": 15+(i%15)}
    for i, (emoji, desc) in enumerate([
        ("🚗", "Красная гоночная машина"),
        ("🚕", "Желтое такси"),
        ("🚙", "Семейный внедорожник"),
        ("🛻", "Пикап для приключений"),
        ("🚓", "Полицейская машина"),
        ("🚑", "Скорая помощь"),
        ("🚒", "Пожарная машина"),
        ("🚚", "Грузовик-дальнобойщик"),
        ("🚛", "Большой трейлер"),
        ("🚜", "Сельский трактор"),
        ("🏎️", "Формула-1"),
        ("🚐", "Минивэн для путешествий"),
        ("🚍", "Городской автобус"),
        ("🚎", "Троллейбус"),
        ("🚘", "Автомобиль мечты"),
        ("🚖", "Лондонское такси"),
        ("🚔", "Американский копкар"),
        ("🚡", "Канатная дорога"),
        ("🚠", "Горная кабина"),
        ("🚟", "Монорельс"),
        ("🚲", "Велосипед-спортсмен"),
        ("🛵", "Скутер"),
        ("🏍️", "Мотоцикл"),
        ("🛺", "Тук-тук из Азии"),
        ("🚤", "Скоростная лодка"),
        ("⛵", "Яхта мечты"),
        ("🛶", "Каяк для сплава"),
        ("🚁", "Городской вертолёт"),
        ("🛸", "Летающая тарелка"),
        ("🚀", "Космический корабль"),
    ])
]
boot_skins = [
    {"name": f"{emoji} Ботинок #{i+1}", "image": "", "description": desc, "priceVC": 12+(i%10)}
    for i, (emoji, desc) in enumerate([
        ("👟", "Кроссовок для бега"),
        ("🥾", "Туристический ботинок"),
        ("🥿", "Балетка для танцев"),
        ("👠", "Туфля на каблуке"),
        ("👡", "Летняя сандалия"),
        ("👢", "Зимний сапог"),
        ("🩰", "Пуанты балерины"),
        ("🦶", "Босоножка для отпуска"),
        ("🦵", "Нога-ботинок"),
        ("👞", "Деловой ботинок"),
        ("🧦", "Тёплый носок"),
        ("🩴", "Шлёпка для пляжа"),
        ("👣", "След ботинка"),
        ("👒", "Шляпа (опция ботинка)"),
        ("🎩", "Цилиндр к ботинку"),
        ("🧢", "Кепка к стилю"),
        ("⛑️", "Каска для защиты"),
        ("👑", "Корона для короля шагов"),
        ("👚", "Спортивная форма"),
        ("🧥", "Пальто для стиля"),
        ("👔", "Галстук для ботинка"),
        ("👗", "Платье для танцев"),
        ("👘", "Кимоно к тапочкам"),
        ("👖", "Джинсы к кроссам"),
        ("🩳", "Шорты к сланцам"),
        ("🩱", "Купальник для пляжа"),
        ("🩲", "Плавки для моря"),
        ("👙", "Бикини для отдыха"),
        ("🧤", "Перчатки к обуви"),
        ("🧣", "Шарф-гетры"),
    ])
]
lightning_skins = [
    {"name": f"{emoji} Молния #{i+1}", "image": "", "description": desc, "priceVC": 20+(i%20)}
    for i, (emoji, desc) in enumerate([
        ("⚡", "Энергия быстрого удара"),
        ("🌩️", "Грозовая мощь"),
        ("🌩", "Буря в ладони"),
        ("🌪️", "Стихия вихря"),
        ("🔥", "Молния-огонь"),
        ("💥", "Взрывная молния"),
        ("💫", "Молния-мираж"),
        ("✨", "Сияющая молния"),
        ("🌟", "Звёздная молния"),
        ("🌈", "Радужная молния"),
        ("☄️", "Кометная молния"),
        ("🌬️", "Ветреная молния"),
        ("🌞", "Солнечная молния"),
        ("☀️", "Светлая молния"),
        ("🌚", "Темная молния"),
        ("🌝", "Светлая буря"),
        ("🌛", "Лунная молния"),
        ("🌜", "Молния-луна"),
        ("🌕", "Полная гроза"),
        ("🌙", "Ночная молния"),
        ("⭐", "Молния-звезда"),
        ("🪐", "Космическая молния"),
        ("🛸", "Инопланетная молния"),
        ("🚀", "Реактивная молния"),
        ("🛰️", "Спутниковая молния"),
        ("🌌", "Галактическая молния"),
        ("🌠", "Падающая молния"),
        ("💡", "Умная молния"),
        ("🔋", "Заряженная молния"),
        ("🔌", "Электрическая молния"),
    ])
]
case_items = {
    "common": cup_skins,
    "rare": plate_skins,
    "epic": boot_skins,
    "legendary": car_skins + lightning_skins
}

def get_db():
    db = getattr(g, '_database', None)
    if db is None:
        db = g._database = sqlite3.connect(DATABASE)
        db.row_factory = sqlite3.Row
    return db

@app.teardown_appcontext
def close_connection(exception):
    db = getattr(g, '_database', None)
    if db is not None:
        db.close()

def init_db():
    db = get_db()
    db.execute('''
        CREATE TABLE IF NOT EXISTS users (
            user_id TEXT PRIMARY KEY,
            balance INTEGER,
            vc_balance INTEGER DEFAULT 0,
            last_active INTEGER,
            username TEXT,
            first_name TEXT,
            last_name TEXT,
            photo_url TEXT
        )
    ''')
    db.execute('''
        CREATE TABLE IF NOT EXISTS inventory (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id TEXT,
            item TEXT, -- JSON
            sold INTEGER DEFAULT 0,
            sold_time INTEGER DEFAULT NULL,
            FOREIGN KEY(user_id) REFERENCES users(user_id)
        )
    ''')
    db.execute('''
        CREATE TABLE IF NOT EXISTS friends (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id TEXT,
            friend_id TEXT,
            status TEXT DEFAULT 'pending',
            created_at INTEGER
        )
    ''')
    db.execute('''
        CREATE TABLE IF NOT EXISTS gifts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            from_user TEXT,
            to_user TEXT,
            item TEXT,
            amount INTEGER,
            created_at INTEGER,
            type TEXT
        )
    ''')
    # --- Для маркетплейса ---
    db.execute('''
        CREATE TABLE IF NOT EXISTS market (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            seller_id TEXT,
            seller_name TEXT,
            item TEXT,
            price INTEGER,
            created_at INTEGER
        )
    ''')
    db.commit()

with app.app_context():
    init_db()

def get_user_from_db(user_id):
    db = get_db()
    user = db.execute('SELECT * FROM users WHERE user_id=?', (user_id,)).fetchone()
    if user is None:
        db.execute('INSERT INTO users (user_id, balance, vc_balance, last_active, username, first_name, last_name, photo_url) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
                   (user_id, 0, 0, int(time.time()), "", "", "", ""))
        db.commit()
        inventory = []
        last_active = int(time.time())
        balance = 0
        vc_balance = 0
        username = ""
        first_name = ""
        last_name = ""
        photo_url = ""
    else:
        inventory = [json.loads(row['item']) for row in db.execute(
            'SELECT item FROM inventory WHERE user_id=? AND sold=0', (user_id,))]
        last_active = user['last_active']
        balance = user['balance']
        vc_balance = user['vc_balance']
        username = user['username'] or ""
        first_name = user['first_name'] or ""
        last_name = user['last_name'] or ""
        photo_url = user['photo_url'] or ""
    return {
        "balance": balance,
        "vcBalance": vc_balance,
        "inventory": inventory,
        "last_active": last_active,
        "username": username,
        "first_name": first_name,
        "last_name": last_name,
        "photo_url": photo_url,
        "user_id": user_id  # добавлено для удобства backend
    }

def save_user_to_db(user_id, balance, inventory, last_active, vc_balance, username="", first_name="", last_name="", photo_url=""):
    db = get_db()
    user = db.execute('SELECT * FROM users WHERE user_id=?', (user_id,)).fetchone()
    if user is None:
        db.execute('INSERT INTO users (user_id, balance, vc_balance, last_active, username, first_name, last_name, photo_url) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
                   (user_id, balance, vc_balance, last_active, username, first_name, last_name, photo_url))
    else:
        db.execute('UPDATE users SET balance=?, vc_balance=?, last_active=?, username=?, first_name=?, last_name=?, photo_url=? WHERE user_id=?',
                   (balance, vc_balance, last_active, username, first_name, last_name, photo_url, user_id))
    db.execute('DELETE FROM inventory WHERE user_id=? AND sold=0', (user_id,))
    for item in inventory:
        db.execute('INSERT INTO inventory (user_id, item, sold) VALUES (?, ?, 0)', (user_id, json.dumps(item)))
    db.commit()

@app.route('/get_user', methods=['GET'])
def get_user():
    user_id = request.args.get('user_id')
    user_data = get_user_from_db(user_id)
    return jsonify(user_data)

@app.route('/save_data', methods=['POST'])
def save_data():
    data = request.json
    user_id = data['user_id']
    balance = data['balance']
    inventory = data.get('inventory', [])
    last_active = data['last_active']
    vc_balance = data.get('vcBalance', 0)
    username = data.get('username', "")
    first_name = data.get('first_name', "")
    last_name = data.get('last_name', "")
    photo_url = data.get('photo_url', "")
    save_user_to_db(user_id, balance, inventory, last_active, vc_balance, username, first_name, last_name, photo_url)
    return jsonify({"success": True})

@app.route('/open_case', methods=['POST'])
def open_case():
    data = request.json
    user_id = data['user_id']
    user_data = get_user_from_db(user_id)
    if user_data["balance"] < 100:
        return jsonify({
            "success": False,
            "error": "Недостаточно очков"
        })
    rarity = random.choices(
        ["common", "rare", "epic", "legendary"],
        weights=[65, 20, 10, 5]
    )[0]
    item = random.choice(case_items[rarity])
    user_data["balance"] -= 100
    user_data["inventory"].append(item)
    user_data["last_active"] = int(time.time())
    save_user_to_db(
        user_id,
        user_data["balance"],
        user_data["inventory"],
        user_data["last_active"],
        user_data["vcBalance"],
        user_data["username"],
        user_data["first_name"],
        user_data["last_name"],
        user_data["photo_url"]
    )
    return jsonify({
        "success": True,
        "item": item,
        "rarity": rarity
    })

@app.route('/case_items_preview', methods=['GET'])
def case_items_preview():
    def preview_block(skins, rarity, chance, color):
        return {
            "rarity": rarity,
            "items": [{"name": s["name"]} for s in skins],
            "chance": chance,
            "color": color
        }
    case_data = [
        preview_block(cup_skins, "Обычный", 65, "#b3cfff"),
        preview_block(plate_skins, "Редкий", 20, "#60d4b7"),
        preview_block(boot_skins, "Эпик", 10, "#bc78ff"),
        preview_block(car_skins + lightning_skins, "Легендарный", 5, "#ffd700")
    ]
    return jsonify({"success": True, "case_items": case_data})

@app.route('/sell_item', methods=['POST'])
def sell_item():
    data = request.json
    user_id = data['user_id']
    item_idx = data['item_idx']
    user_data = get_user_from_db(user_id)
    try:
        item = user_data["inventory"][item_idx]
    except IndexError:
        return jsonify({"success": False, "error": "Нет такого предмета"})
    price = item.get("priceVC", 1)
    db = get_db()
    sold_item_row = db.execute(
        "SELECT id FROM inventory WHERE user_id=? AND item=? AND sold=0 LIMIT 1",
        (user_id, json.dumps(item))
    ).fetchone()
    if sold_item_row:
        db.execute(
            "UPDATE inventory SET sold=1, sold_time=? WHERE id=?",
            (int(time.time()), sold_item_row["id"])
        )
        db.commit()
        user_data["vcBalance"] += price
        del user_data["inventory"][item_idx]
        save_user_to_db(
            user_id, user_data["balance"],
            user_data["inventory"],
            int(time.time()),
            user_data["vcBalance"],
            user_data["username"],
            user_data["first_name"],
            user_data["last_name"],
            user_data["photo_url"]
        )
        return jsonify({"success": True, "vc_earned": price, "vcBalance": user_data["vcBalance"]})
    else:
        return jsonify({"success": False, "error": "Не удалось найти предмет в базе"})

# ----------- MARKETPLACE API -----------

@app.route('/market/sell_item', methods=['POST'])
def market_sell_item():
    data = request.json
    user_id = data.get("user_id")
    item_idx = data.get("item_idx")
    price = data.get("price")
    db = get_db()
    user_data = get_user_from_db(user_id)
    if not user_data or item_idx is None or price is None:
        return jsonify({"success": False, "error": "Недостаточно данных"})
    if item_idx >= len(user_data["inventory"]):
        return jsonify({"success": False, "error": "Нет такого предмета"})
    item = user_data["inventory"].pop(item_idx)
    # Удаляем предмет из инвентаря пользователя
    save_user_to_db(
        user_id, user_data["balance"], user_data["inventory"], int(time.time()),
        user_data["vcBalance"], user_data["username"], user_data["first_name"],
        user_data["last_name"], user_data["photo_url"]
    )
    db.execute('INSERT INTO market (seller_id, seller_name, item, price, created_at) VALUES (?, ?, ?, ?, ?)',
               (user_id, user_data["username"], json.dumps(item), price, int(time.time())))
    db.commit()
    return jsonify({"success": True})

@app.route('/market/list')
def market_list():
    db = get_db()
    cur = db.execute('SELECT id, seller_id, seller_name, item, price FROM market ORDER BY created_at DESC')
    items = []
    for row in cur.fetchall():
        items.append({
            "id": row["id"],
            "seller_id": row["seller_id"],
            "seller_name": row["seller_name"],
            "item": json.loads(row["item"]),
            "price": row["price"]
        })
    return jsonify({"success": True, "items": items})

@app.route('/market/buy_item', methods=['POST'])
def market_buy_item():
    data = request.json
    user_id = data.get("user_id")
    lot_id = data.get("lot_id")
    db = get_db()
    user_data = get_user_from_db(user_id)
    if not user_data:
        return jsonify({"success": False, "error": "Пользователь не найден"})
    row = db.execute('SELECT id, seller_id, seller_name, item, price FROM market WHERE id=?', (lot_id,)).fetchone()
    if not row:
        return jsonify({"success": False, "error": "Лот не найден"})
    lot = {
        "id": row["id"],
        "seller_id": row["seller_id"],
        "seller_name": row["seller_name"],
        "item": row["item"],
        "price": row["price"]
    }
    if user_data["vcBalance"] < lot["price"]:
        return jsonify({"success": False, "error": "Недостаточно VC"})
    # Снять VC у покупателя, отдать предмет
    user_data["vcBalance"] -= lot["price"]
    inventory = user_data["inventory"]
    inventory.append(json.loads(lot["item"]))
    save_user_to_db(
        user_id, user_data["balance"], inventory, int(time.time()),
        user_data["vcBalance"], user_data["username"], user_data["first_name"],
        user_data["last_name"], user_data["photo_url"]
    )
    # Дать VC продавцу (ИСПРАВЛЕНИЕ: используем user_id продавца!)
    seller_data = get_user_from_db(lot["seller_id"])
    if seller_data:
        seller_data["vcBalance"] += lot["price"]
        save_user_to_db(
            seller_data["user_id"], seller_data["balance"], seller_data["inventory"], int(time.time()),
            seller_data["vcBalance"], seller_data["username"], seller_data["first_name"],
            seller_data["last_name"], seller_data["photo_url"]
        )
    db.execute('DELETE FROM market WHERE id=?', (lot_id,))
    db.commit()
    return jsonify({"success": True})

# ----------- END MARKETPLACE API -----------

@app.route('/top_users', methods=['GET'])
def top_users():
    db = get_db()
    cur = db.execute("SELECT user_id, balance, vc_balance, username, first_name, last_name, photo_url FROM users")
    top = [dict(row) for row in cur.fetchall()]
    return jsonify(top)

@app.route('/add_friend', methods=['POST'])
def add_friend():
    data = request.json
    user_id = data['user_id']
    friend_username = data.get('friend_username')
    friend_id = data.get('friend_id')
    db = get_db()
    if friend_id:
        friend = db.execute('SELECT user_id FROM users WHERE user_id=?', (friend_id,)).fetchone()
    elif friend_username:
        friend = db.execute('SELECT user_id FROM users WHERE username=?', (friend_username,)).fetchone()
    else:
        return jsonify({"success": False, "error": "Не указан друг"})
    if not friend:
        return jsonify({"success": False, "error": "Пользователь не найден"})
    friend_id = friend['user_id']
    if friend_id == user_id:
        return jsonify({"success": False, "error": "Нельзя добавить себя"})
    existing = db.execute('SELECT * FROM friends WHERE user_id=? AND friend_id=?', (user_id, friend_id)).fetchone()
    if existing:
        return jsonify({"success": False, "error": "Уже в друзьях или заявка отправлена"})
    db.execute('INSERT INTO friends (user_id, friend_id, status, created_at) VALUES (?, ?, ?, ?)',
               (user_id, friend_id, 'pending', int(time.time())))
    db.commit()
    return jsonify({"success": True, "message": "Заявка отправлена"})

@app.route('/accept_friend', methods=['POST'])
def accept_friend():
    data = request.json
    user_id = data['user_id']
    friend_id = data['friend_id']
    db = get_db()
    req = db.execute('SELECT * FROM friends WHERE user_id=? AND friend_id=? AND status="pending"', (friend_id, user_id)).fetchone()
    if not req:
        return jsonify({"success": False, "error": "Нет заявки"})
    db.execute('UPDATE friends SET status="accepted" WHERE id=?', (req['id'],))
    db.execute('INSERT INTO friends (user_id, friend_id, status, created_at) VALUES (?, ?, ?, ?)', (user_id, friend_id, 'accepted', int(time.time())))
    db.commit()
    return jsonify({"success": True, "message": "Друг добавлен"})

@app.route('/friends_list', methods=['GET'])
def friends_list():
    user_id = request.args.get('user_id')
    db = get_db()
    rows = db.execute('SELECT friend_id FROM friends WHERE user_id=? AND status="accepted"', (user_id,)).fetchall()
    friends = []
    for row in rows:
        user = db.execute('SELECT user_id, username, first_name, last_name, photo_url FROM users WHERE user_id=?', (row['friend_id'],)).fetchone()
        if user:
            friends.append(dict(user))
    return jsonify({"success": True, "friends": friends})

@app.route('/friend_requests', methods=['GET'])
def friend_requests():
    user_id = request.args.get('user_id')
    db = get_db()
    incoming = db.execute(
        'SELECT f.id, u.user_id, u.username, u.first_name, u.last_name, u.photo_url FROM friends f JOIN users u ON f.user_id=u.user_id WHERE f.friend_id=? AND f.status="pending"',
        (user_id,)
    ).fetchall()
    outgoing = db.execute(
        'SELECT f.id, u.user_id, u.username, u.first_name, u.last_name, u.photo_url FROM friends f JOIN users u ON f.friend_id=u.user_id WHERE f.user_id=? AND f.status="pending"',
        (user_id,)
    ).fetchall()
    return jsonify({
        "success": True,
        "incoming": [dict(r) for r in incoming],
        "outgoing": [dict(r) for r in outgoing]
    })

@app.route('/send_gift', methods=['POST'])
def send_gift():
    data = request.json
    from_user = data['from_user']
    to_user = data['to_user']
    gift_type = data['type']
    amount = int(data.get('amount', 0))
    item_idx = int(data.get('item_idx', -1))
    created_at = int(time.time())
    db = get_db()
    friend = db.execute('SELECT * FROM friends WHERE user_id=? AND friend_id=? AND status="accepted"', (from_user, to_user)).fetchone()
    if not friend:
        return jsonify({"success": False, "error": "Пользователь не в друзьях"})
    if gift_type == "coin":
        user_from = get_user_from_db(from_user)
        user_to = get_user_from_db(to_user)
        if user_from["vcBalance"] < amount or amount <= 0:
            return jsonify({"success": False, "error": "Недостаточно монет"})
        user_from["vcBalance"] -= amount
        user_to["vcBalance"] += amount
        save_user_to_db(
            from_user, user_from["balance"], user_from["inventory"], int(time.time()),
            user_from["vcBalance"], user_from["username"], user_from["first_name"],
            user_from["last_name"], user_from["photo_url"]
        )
        save_user_to_db(
            to_user, user_to["balance"], user_to["inventory"], int(time.time()),
            user_to["vcBalance"], user_to["username"], user_to["first_name"],
            user_to["last_name"], user_to["photo_url"]
        )
        db.execute('INSERT INTO gifts (from_user, to_user, item, amount, created_at, type) VALUES (?, ?, ?, ?, ?, ?)',
                   (from_user, to_user, 'coins', amount, created_at, 'coin'))
        db.commit()
        return jsonify({"success": True, "message": "Монеты отправлены"})
    elif gift_type == "item":
        user_from = get_user_from_db(from_user)
        user_to = get_user_from_db(to_user)
        if item_idx < 0 or item_idx >= len(user_from["inventory"]):
            return jsonify({"success": False, "error": "Нет такого предмета"})
        item_obj = user_from["inventory"].pop(item_idx)
        user_to["inventory"].append(item_obj)
        save_user_to_db(
            from_user, user_from["balance"], user_from["inventory"], int(time.time()),
            user_from["vcBalance"], user_from["username"], user_from["first_name"],
            user_from["last_name"], user_from["photo_url"]
        )
        save_user_to_db(
            to_user, user_to["balance"], user_to["inventory"], int(time.time()),
            user_to["vcBalance"], user_to["username"], user_to["first_name"],
            user_to["last_name"], user_to["photo_url"]
        )
        db.execute('INSERT INTO gifts (from_user, to_user, item, amount, created_at, type) VALUES (?, ?, ?, ?, ?, ?)',
                   (from_user, to_user, json.dumps(item_obj), 1, created_at, 'item'))
        db.commit()
        return jsonify({"success": True, "message": "Подарок отправлен"})
    else:
        return jsonify({"success": False, "error": "Неизвестный тип подарка"})

@app.route('/gifts_history', methods=['GET'])
def gifts_history():
    user_id = request.args.get('user_id')
    db = get_db()
    gifts = db.execute('''
        SELECT * FROM gifts
        WHERE from_user=? OR to_user=?
        ORDER BY created_at DESC
        LIMIT 100
    ''', (user_id, user_id)).fetchall()
    result = []
    for g in gifts:
        item = None
        if g['type'] == 'item' and g['item'] not in (None, '', 'coins'):
            try:
                item = json.loads(g['item'])
            except Exception:
                item = g['item']
        result.append({
            "id": g["id"],
            "from_user": g["from_user"],
            "to_user": g["to_user"],
            "item": item,
            "amount": g["amount"],
            "type": g["type"],
            "created_at": g["created_at"],
        })
    return jsonify({"success": True, "history": result})

@app.route('/save_db', methods=['GET'])
def save_db():
    try:
        db = get_db()
        with open(SQL_DUMP_FILE, 'w', encoding='utf-8') as f:
            for line in db.iterdump():
                f.write('%s\n' % line)
        return jsonify({"success": True, "message": "Database saved to users_dump.sql"})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)})

@app.route('/restore_db', methods=['POST'])
def restore_db():
    try:
        if not os.path.exists(SQL_DUMP_FILE):
            return jsonify({"success": False, "error": "SQL dump file not found"})
        db = get_db()
        db.close()
        os.remove(DATABASE)
        db = sqlite3.connect(DATABASE)
        with open(SQL_DUMP_FILE, 'r', encoding='utf-8') as f:
            sql_script = f.read()
        db.executescript(sql_script)
        db.commit()
        db.close()
        return jsonify({"success": True, "message": "Database restored from users_dump.sql"})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)})

if __name__ == '__main__':
    app.run(debug=True)