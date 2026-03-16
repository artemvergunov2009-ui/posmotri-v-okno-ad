import asyncio
import logging
import random
import sqlite3
from datetime import datetime, date
from aiogram import Bot, Dispatcher, types, F
from aiogram.filters import Command
from aiogram.types import FSInputFile, InlineKeyboardMarkup, InlineKeyboardButton, CallbackQuery

# --- КОНФИГУРАЦИЯ ---
BOT_TOKEN = "8754387287:AAGDnpfDp6XTfMJM_BIpe2UqTJBgqOTZxy0"
ADMIN_ID = 6240554546  # ID админа (твой), чтобы открывать панель
DB_FILE = "analitik.db"

# Настройка логирования
logging.basicConfig(level=logging.INFO)

# Инициализация бота
bot = Bot(token=BOT_TOKEN)
dp = Dispatcher()

# --- РАБОТА С БАЗОЙ ДАННЫХ (SQL) ---

def init_db():
    """Создает таблицу, если её нет"""
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS users (
            user_id INTEGER PRIMARY KEY,
            username TEXT,
            full_name TEXT,
            depth INTEGER DEFAULT 0,
            last_played DATE,
            last_chat_id INTEGER,
            is_cheater INTEGER DEFAULT 0
        )
    ''')
    
    # Создаем таблицу групп, чтобы админ мог выбирать чат
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS groups (
            chat_id INTEGER PRIMARY KEY,
            title TEXT
        )
    ''')

    # Пытаемся добавить колонку last_chat_id в таблицу users, если её нет (для старых баз)
    try:
        cursor.execute("ALTER TABLE users ADD COLUMN last_chat_id INTEGER")
    except sqlite3.OperationalError:
        pass # Колонка уже есть

    # Добавляем колонку is_cheater для тех, кто обновляется
    try:
        cursor.execute("ALTER TABLE users ADD COLUMN is_cheater INTEGER DEFAULT 0")
    except sqlite3.OperationalError:
        pass 

    conn.commit()
    conn.close()

def get_user(user_id):
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM users WHERE user_id = ?", (user_id,))
    user = cursor.fetchone()
    conn.close()
    return user

def register_or_update_user(user: types.User, chat: types.Chat = None):
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    
    last_chat_id = None
    
    # Если передана группа, обновляем инфу о группе
    if chat and chat.type in ["group", "supergroup"]:
        last_chat_id = chat.id
        
        # Сохраняем группу в админ-список ТОЛЬКО если с ней взаимодействует админ
        if user.id == ADMIN_ID:
            cursor.execute("""
                INSERT INTO groups (chat_id, title) VALUES (?, ?)
                ON CONFLICT(chat_id) DO UPDATE SET title = excluded.title
            """, (chat.id, chat.title))

    # Пытаемся обновить инфу о юзере, если он есть, или создать нового
    cursor.execute("""
        INSERT INTO users (user_id, username, full_name, depth, last_played, last_chat_id)
        VALUES (?, ?, ?, 0, NULL, ?)
        ON CONFLICT(user_id) DO UPDATE SET
        username = excluded.username,
        full_name = excluded.full_name,
        last_chat_id = COALESCE(?, last_chat_id)
    """, (user.id, user.username, user.full_name, last_chat_id, last_chat_id))
    conn.commit()
    conn.close()

def update_depth(user_id, change):
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    today = date.today()
    
    # Получаем текущую глубину
    cursor.execute("SELECT depth FROM users WHERE user_id = ?", (user_id,))
    current_depth = cursor.fetchone()[0]
    
    new_depth = current_depth + change
    if new_depth < 0: new_depth = 0 # Не может быть меньше 0
    
    cursor.execute("""
        UPDATE users 
        SET depth = ?, last_played = ? 
        WHERE user_id = ?
    """, (new_depth, today, user_id))
    conn.commit()
    conn.close()
    return new_depth

def admin_reset_limit(user_id):
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    # Сбрасываем дату последней игры на NULL
    cursor.execute("UPDATE users SET last_played = NULL WHERE user_id = ?", (user_id,))
    conn.commit()
    conn.close()

def reset_group_stats(chat_id):
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    # Сбрасываем глубину и дату игры для всех, кто привязан к этой группе
    cursor.execute("UPDATE users SET depth = 0, last_played = NULL WHERE last_chat_id = ?", (chat_id,))
    conn.commit()
    conn.close()

def get_group_users(chat_id):
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    cursor.execute("SELECT user_id, full_name, depth FROM users WHERE last_chat_id = ? ORDER BY depth DESC LIMIT 10", (chat_id,))
    rows = cursor.fetchall()
    conn.close()
    return rows

def get_top_users(limit=10):
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    cursor.execute("SELECT full_name, depth FROM users ORDER BY depth DESC LIMIT ?", (limit,))
    rows = cursor.fetchall()
    conn.close()
    return rows

# --- ХЕНДЛЕРЫ (ОБРАБОТЧИКИ КОМАНД) ---

@dp.message(Command("start"))
async def cmd_start(message: types.Message):
    register_or_update_user(message.from_user, message.chat)
    await message.answer(
        "👋 Добро пожаловать в <b>Analitik</b>!\n"
        "⚠️ <b>Этот бот предназначен для игры в группах!</b> Добавь его в общий чат.\n\n"
        "Узнай, насколько глубока твоя кроличья нора.\n"
        "Команды:\n"
        "👇 /dig — Копать глубже (раз в сутки)\n"
        "🏆 /top — Список самых глубоких скважин",
        parse_mode="HTML"
    )

@dp.message(Command("dig"))
async def cmd_dig(message: types.Message):
    if message.chat.type == "private":
        await message.answer("🛑 <b>Копать можно только в группах!</b>\nДобавь меня в чат с друзьями, чтобы начать игру.", parse_mode="HTML")
        return

    user = message.from_user
    register_or_update_user(user, message.chat)
    
    user_data = get_user(user.id)
    last_played_str = user_data[4] # Индекс 4 это last_played
    is_cheater = user_data[6] # Индекс 6 это is_cheater
    
    # Проверка даты (можно играть только раз в день)
    if last_played_str == str(date.today()):
        await message.answer("🛑 Ты уже разрабатывал шахту сегодня! Отдохни, приходи завтра.")
        return

    # Новая логика рандома в зависимости от статуса
    if is_cheater:
        # Читеру везет гораздо чаще (85% шанс на успех), и текст не отличается от обычного
        if random.random() > 0.15:
            change = random.randint(7, 13)
            text_action = "разработал"
            emoji = "⛏️"
        else:
            change = random.randint(-10, -1)
            text_action = "заживил"
            emoji = "🩹"
    else:
        # Обычные игроки: шанс 75% на рост, 25% на сужение
        if random.random() > 0.25:
            change = random.randint(2, 16)
            text_action = "разработал"
            emoji = "⛏️"
        else:
            # Штраф стал менее разрушительным
            change = random.randint(-8, -1)
            text_action = "заживил"
            emoji = "🩹"

    new_depth = update_depth(user.id, change)
    
    # Формируем смешной ответ
    if change > 0:
        msg = f"{emoji} <b>{user.full_name}</b> {text_action} очко!\n" \
              f"Глубина увеличилась на <b>{change} см</b>.\n" \
              f"Текущий результат: <b>{new_depth} см</b>."
    else:
        msg = f"{emoji} <b>{user.full_name}</b> {text_action} раны.\n" \
              f"Глубина уменьшилась на <b>{abs(change)} см</b>.\n" \
              f"Текущий результат: <b>{new_depth} см</b>."

    await message.answer(msg, parse_mode="HTML")

@dp.message(Command("top"))
async def cmd_top(message: types.Message):
    top_list = get_top_users(15) # Топ 15
    
    if not top_list:
        await message.answer("Список пуст! Никто еще не копал.")
        return

    text = "🏆 <b>ТОП-15 ГЛУБОКИХ ШАХТ:</b>\n\n"
    
    medals = {0: "🥇", 1: "🥈", 2: "🥉"}
    
    for i, (name, depth) in enumerate(top_list):
        medal = medals.get(i, f"{i+1}.")
        text += f"{medal} <b>{name}</b> — {depth} см\n"
        
    await message.answer(text, parse_mode="HTML")

@dp.message(Command("admin"))
async def cmd_admin(message: types.Message):
    # Проверка на админа
    if message.from_user.id != ADMIN_ID:
        return 

    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    cursor.execute("SELECT chat_id, title FROM groups")
    groups = cursor.fetchall()
    conn.close()

    if not groups:
        await message.answer("📭 <b>Список групп пуст.</b>\n\nБот запоминает группы, когда в них кто-то пишет команды.\nЕсли ты уже добавил бота, просто напиши <b>/start</b> или <b>/dig</b> в этом чате, и он появится здесь.", parse_mode="HTML")
        return

    # Строим клавиатуру с группами
    builder = []
    for chat_id, title in groups:
        builder.append([InlineKeyboardButton(text=f"📂 {title}", callback_data=f"adm_gr_{chat_id}")])
    
    keyboard = InlineKeyboardMarkup(inline_keyboard=builder)
    await message.answer("👑 <b>Админ-панель:</b>\nВыбери группу для управления:", reply_markup=keyboard, parse_mode="HTML")

@dp.callback_query(F.data.startswith("adm_"))
async def process_admin_callback(callback: CallbackQuery):
    if callback.from_user.id != ADMIN_ID:
        await callback.answer("Не для тебя кнопка!", show_alert=True)
        return

    data = callback.data
    
    # 1. Выбор группы -> Показываем юзеров
    if data.startswith("adm_gr_"):
        chat_id = int(data.split("_")[2])
        users = get_group_users(chat_id)
        
        if not users:
            await callback.answer("В этой группе пусто", show_alert=True)
            return

        builder = []
        for user_id, name, depth in users:
            builder.append([InlineKeyboardButton(text=f"{name} ({depth} см)", callback_data=f"adm_usr_{chat_id}_{user_id}")])
        
        builder.append([InlineKeyboardButton(text="🗑 Очистить ТОП группы", callback_data=f"adm_clear_top_{chat_id}")])
        builder.append([InlineKeyboardButton(text="🔙 Назад", callback_data="adm_back_groups")])
        keyboard = InlineKeyboardMarkup(inline_keyboard=builder)
        
        await callback.message.edit_text(f"👥 <b>Игроки в чате:</b>", reply_markup=keyboard, parse_mode="HTML")

    # 2. Выбор юзера -> Показываем действия
    elif data.startswith("adm_usr_"):
        parts = data.split("_")
        chat_id = int(parts[2])
        user_id = int(parts[3])
        user = get_user(user_id)
        
        # Проверяем, читер ли он сейчас
        conn = sqlite3.connect(DB_FILE)
        cur = conn.cursor()
        cur.execute("SELECT is_cheater FROM users WHERE user_id = ?", (user_id,))
        is_cheater = cur.fetchone()[0]
        conn.close()

        cheat_btn_text = "❌ Убрать читера" if is_cheater else "👑 Сделать читером"
        cheat_action = "unmake_cheat" if is_cheater else "make_cheat"
        
        builder = [
            [InlineKeyboardButton(text="♻️ Сбросить КД (Дать шанс)", callback_data=f"adm_act_{chat_id}_reset_{user_id}")],
            [InlineKeyboardButton(text=cheat_btn_text, callback_data=f"adm_act_{chat_id}_{cheat_action}_{user_id}")],
            [InlineKeyboardButton(text="➕ Добавить 5 см", callback_data=f"adm_act_{chat_id}_add5_{user_id}")],
            [InlineKeyboardButton(text="➕ Добавить 15 см", callback_data=f"adm_act_{chat_id}_add15_{user_id}")],
            [InlineKeyboardButton(text="✂️ Урезать 10 см", callback_data=f"adm_act_{chat_id}_cut10_{user_id}")],
            [InlineKeyboardButton(text="🔙 Назад к списку игроков", callback_data=f"adm_gr_{chat_id}")]
        ]
        keyboard = InlineKeyboardMarkup(inline_keyboard=builder)
        await callback.message.edit_text(f"👤 <b>{user[2]}</b>\nГлубина: {user[3]} см", reply_markup=keyboard, parse_mode="HTML")

    # 3. Действия
    elif data.startswith("adm_act_"):
        parts = data.split("_")
        chat_id = int(parts[2])
        user_id = int(parts[-1]) # ID пользователя всегда последний элемент
        action = "_".join(parts[3:-1]) # Действие может состоять из частей, например 'make_cheat'
        
        msg_text = ""
        
        if action == "reset":
            admin_reset_limit(user_id)
            await callback.answer("✅ Лимит сброшен! Он может копать снова.")
            return # Выходим, так как меню перерисовывать не нужно
        
        elif action == "make_cheat":
            conn = sqlite3.connect(DB_FILE)
            conn.execute("UPDATE users SET is_cheater = 1 WHERE user_id = ?", (user_id,))
            conn.commit()
            conn.close()
            msg_text = "👑 Теперь он ЧИТЕР (всегда Топ-1)"

        elif action == "unmake_cheat":
            conn = sqlite3.connect(DB_FILE)
            conn.execute("UPDATE users SET is_cheater = 0 WHERE user_id = ?", (user_id,))
            conn.commit()
            conn.close()
            msg_text = "❌ Читы отключены"

        elif action == "add5":
            update_depth(user_id, 5)
            msg_text = "✅ Добавили 5 см"
        elif action == "add15":
            update_depth(user_id, 15)
            msg_text = "✅ Добавили 15 см"
        elif action == "cut10":
            update_depth(user_id, -10)
            msg_text = "✅ Урезали 10 см"
        
        await callback.answer(msg_text)

        # После любого действия перерисовываем меню пользователя с актуальными данными
        user = get_user(user_id)
        conn = sqlite3.connect(DB_FILE)
        cur = conn.cursor()
        cur.execute("SELECT is_cheater FROM users WHERE user_id = ?", (user_id,))
        is_cheater = cur.fetchone()[0]
        conn.close()

        cheat_btn_text = "❌ Убрать читера" if is_cheater else "👑 Сделать читером"
        cheat_action = "unmake_cheat" if is_cheater else "make_cheat"
        
        builder = [
            [InlineKeyboardButton(text="♻️ Сбросить КД (Дать шанс)", callback_data=f"adm_act_{chat_id}_reset_{user_id}")],
            [InlineKeyboardButton(text=cheat_btn_text, callback_data=f"adm_act_{chat_id}_{cheat_action}_{user_id}")],
            [InlineKeyboardButton(text="➕ Добавить 5 см", callback_data=f"adm_act_{chat_id}_add5_{user_id}")],
            [InlineKeyboardButton(text="➕ Добавить 15 см", callback_data=f"adm_act_{chat_id}_add15_{user_id}")],
            [InlineKeyboardButton(text="✂️ Урезать 10 см", callback_data=f"adm_act_{chat_id}_cut10_{user_id}")],
            [InlineKeyboardButton(text="🔙 Назад к списку игроков", callback_data=f"adm_gr_{chat_id}")]
        ]
        keyboard = InlineKeyboardMarkup(inline_keyboard=builder)
        await callback.message.edit_text(f"👤 <b>{user[2]}</b>\nГлубина: {user[3]} см", reply_markup=keyboard, parse_mode="HTML")

    # 5. Очистка топа группы
    elif data.startswith("adm_clear_top_"):
        chat_id = int(data.split("_")[3])
        reset_group_stats(chat_id)
        await callback.answer("🗑 Статистика группы полностью сброшена!", show_alert=True)
        # Возвращаемся к списку групп
        conn = sqlite3.connect(DB_FILE)
        cursor = conn.cursor()
        cursor.execute("SELECT chat_id, title FROM groups")
        groups = cursor.fetchall()
        conn.close()
        builder = []
        for c_id, title in groups:
            builder.append([InlineKeyboardButton(text=f"📂 {title}", callback_data=f"adm_gr_{c_id}")])
        keyboard = InlineKeyboardMarkup(inline_keyboard=builder)
        await callback.message.edit_text("👑 <b>Админ-панель:</b>\nВыбери группу для управления:", reply_markup=keyboard, parse_mode="HTML")

    # 4. Кнопка Назад
    elif data == "adm_back_groups":
        conn = sqlite3.connect(DB_FILE)
        cursor = conn.cursor()
        cursor.execute("SELECT chat_id, title FROM groups")
        groups = cursor.fetchall()
        conn.close()

        if not groups:
            await callback.message.edit_text("📭 <b>Список групп пуст.</b>\n\nБот запоминает группы, когда в них кто-то пишет команды.\nЕсли ты уже добавил бота, просто напиши <b>/start</b> или <b>/dig</b> в этом чате, и он появится здесь.", parse_mode="HTML")
            return

        builder = []
        for chat_id, title in groups:
            builder.append([InlineKeyboardButton(text=f"📂 {title}", callback_data=f"adm_gr_{chat_id}")])
        
        keyboard = InlineKeyboardMarkup(inline_keyboard=builder)
        await callback.message.edit_text("👑 <b>Админ-панель:</b>\nВыбери группу для управления:", reply_markup=keyboard, parse_mode="HTML")

@dp.message(F.new_chat_members)
async def on_new_member(message: types.Message):
    """Срабатывает, когда бота (или кого-то еще) добавляют в группу"""
    bot_user = await bot.get_me()
    
    for member in message.new_chat_members:
        # Проверяем, что добавили именно нашего бота
        if member.id == bot_user.id:
            # Сразу регистрируем группу в базе данных, чтобы она появилась в админке
            register_or_update_user(message.from_user, message.chat)
            
            await message.answer(
                "👋 <b>Всем ку! Я Analitik.</b>\n"
                "Я буду измерять глубину ваших скважин.\n\n"
                "Команды:\n"
                "⛏ /dig — Копать (раз в сутки)\n"
                "🏆 /top — Топ шахтеров",
                parse_mode="HTML"
            )

# --- ЗАПУСК ---

async def main():
    init_db()
    # Устанавливаем подсказки команд (кнопка Menu)
    await bot.set_my_commands([
        types.BotCommand(command="dig", description="⛏ Копать"),
        types.BotCommand(command="top", description="🏆 Топ игроков"),
        types.BotCommand(command="start", description="ℹ️ Инфо"),
    ])
    print("Бот запущен!")
    await dp.start_polling(bot)

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("Бот выключен")
