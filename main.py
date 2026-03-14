import telebot
from telebot import types
import random
from datetime import datetime, timedelta

# Твои данные
TOKEN = '8605593524:AAEtFfCMQavG7VFWVslTKre64WL0dTWBV0c'
ADMIN_ID = 7070204958

bot = telebot.TeleBot(TOKEN)

# Базы данных в памяти
user_stats = {}      # {(chat_id, user_id): {'size': 0, 'last_time': datetime.min, 'name': 'Имя'}}
known_groups = {}    # {chat_id: "Название"}

# База для перехватов: {ID_перехвата: {'chat_id': id, 'username': 'имя', 'modifier': 5}}
admin_modifiers = {} 
override_counter = 0 # Уникальный счетчик для отмены перехватов

# Создаем меню команд
bot.set_my_commands([
    types.BotCommand("zopka", "Изменить глубину (раз в 24 часа)"),
    types.BotCommand("top", "Рейтинг дырявых этого чата")
])

# ==========================================
# ПРИВЕТСТВИЕ ПРИ ДОБАВЛЕНИИ В ГРУППУ
# ==========================================
@bot.message_handler(content_types=['new_chat_members'])
def welcome_bot(message):
    for member in message.new_chat_members:
        if member.id == bot.get_me().id:
            bot.send_message(
                message.chat.id,
                "Всем привет! Я залетел в этот чат 🍑\n"
                "Обязательно выдайте мне права администратора, чтобы я работал стабильно!\n\n"
                "Мои команды можно найти в меню (кнопка слева от поля ввода) или написать вручную:\n"
                "👉 /zopka — вырастить или заживить (раз в 24 часа)\n"
                "👉 /top — посмотреть рейтинг участников чата"
            )

# ==========================================
# ИГРОВАЯ ЛОГИКА (Для чатов)
# ==========================================
@bot.message_handler(commands=['zopka'])
def zopka_game(message):
    if message.chat.type == 'private':
        bot.reply_to(message, "Эта команда работает только в общих чатах!")
        return

    chat_id = message.chat.id
    user_id = message.from_user.id
    user_name = message.from_user.first_name
    
    if chat_id not in known_groups:
        known_groups[chat_id] = message.chat.title

    username = message.from_user.username
    username = username.lower() if username else user_name.lower()

    key = (chat_id, user_id)
    now = datetime.now()

    if key not in user_stats:
        user_stats[key] = {'size': 0, 'last_time': datetime.min, 'name': user_name}
    else:
        user_stats[key]['name'] = user_name

    stats = user_stats[key]
    time_passed = now - stats['last_time']
    current_size = stats['size']

    # 1. Проверяем таймер 24 часа до любых действий!
    if time_passed < timedelta(days=1):
        remaining = timedelta(days=1) - time_passed
        hours, remainder = divmod(remaining.seconds, 3600)
        minutes, _ = divmod(remainder, 60)
        bot.reply_to(message, f"Раны еще в процессе! 🩹\nПриходи через {hours} ч. {minutes} мин.")
        return

    # 2. Ищем активный перехват для этого чата и пользователя
    applied_modifier = None
    for oid, data in list(admin_modifiers.items()):
        if data['chat_id'] == chat_id and data['username'] == username:
            applied_modifier = data['modifier']
            del admin_modifiers[oid] # Удаляем перехват, он сработал
            break

    # 3. Применяем логику (либо перехват, либо случайность)
    if applied_modifier is not None:
        direction = 1 if applied_modifier > 0 else -1
        change = abs(applied_modifier)
    else:
        if current_size == 0:
            direction = 1
        else:
            direction = random.choice([1, -1])
        change = random.randint(1, 20)

    # Высчитываем новый размер
    new_size = current_size + (change * direction)
    new_size = max(0, new_size) # В минус уходить нельзя
    
    actual_change = abs(new_size - current_size)
    
    # Обновляем статистику (запускаем кулдаун 24 часа)
    stats['size'] = new_size
    stats['last_time'] = now

    # 4. Выводим СТАНДАРТНЫЙ текст (никто не догадается про перехват)
    if direction == 1:
        text = f"Ого, инструмент вошел поглубже! Увеличилось на {actual_change} см.\nТекущая глубина: {new_size} см. 🍑"
    elif new_size == 0 and current_size > 0:
         text = f"Чудо! Раны полностью зажили (уменьшилось на {actual_change} см).\nТеперь там снова 0 см. 🙏"
    else:
        text = f"Уф, раны немного зажили (уменьшилось на {actual_change} см).\nТекущая глубина: {new_size} см. 🙏"

    bot.reply_to(message, text)

# ==========================================
# РЕЙТИНГ ГРУППЫ
# ==========================================
@bot.message_handler(commands=['top'])
def group_rating(message):
    if message.chat.type == 'private':
        bot.reply_to(message, "Рейтинг доступен только в группах!")
        return

    chat_id = message.chat.id
    
    chat_players = []
    for (cid, uid), data in user_stats.items():
        if cid == chat_id:
            chat_players.append((data['name'], data['size']))
            
    if not chat_players:
        bot.reply_to(message, "В этом чате пока никто не играл! Жмите /zopka")
        return

    chat_players.sort(key=lambda x: x[1], reverse=True)

    text = "🏆 **Рейтинг глубин этого чата:**\n\n"
    for index, (name, size) in enumerate(chat_players, start=1):
        text += f"{index}. {name} — {size} см\n"

    bot.reply_to(message, text, parse_mode="Markdown")

# ==========================================
# АДМИН ПАНЕЛЬ (Только для ЛС с ботом)
# ==========================================
def get_admin_markup():
    markup = types.ReplyKeyboardMarkup(resize_keyboard=True)
    markup.add(types.KeyboardButton("🔧 Изменить см"), types.KeyboardButton("🛑 Активные перехваты"))
    markup.add(types.KeyboardButton("✅ Проверка статуса"), types.KeyboardButton("📋 Список групп"))
    return markup

@bot.message_handler(commands=['start', 'admin'], func=lambda m: m.chat.type == 'private' and m.from_user.id == ADMIN_ID)
def admin_panel(message):
    bot.send_message(message.chat.id, "Добро пожаловать в панель управления! Выбери действие:", reply_markup=get_admin_markup())

@bot.message_handler(content_types=['text'], func=lambda m: m.chat.type == 'private' and m.from_user.id == ADMIN_ID)
def handle_admin_buttons(message):
    if message.text == "✅ Проверка статуса":
        bot.reply_to(message, "Бот работает стабильно! Все системы в норме. 🚀")
        
    elif message.text == "📋 Список групп":
        if not known_groups:
            bot.reply_to(message, "Бот пока не видел активности ни в одной группе.")
        else:
            text = "Бот работает в группах:\n" + "".join([f"- {title}\n" for cid, title in known_groups.items()])
            bot.reply_to(message, text)
            
    elif message.text == "🛑 Активные перехваты":
        if not admin_modifiers:
            bot.reply_to(message, "Активных перехватов сейчас нет.")
            return
            
        for oid, data in list(admin_modifiers.items()):
            markup = types.InlineKeyboardMarkup()
            markup.add(types.InlineKeyboardButton("❌ Отменить", callback_data=f"del_ovr_{oid}"))
            
            grp_name = known_groups.get(data['chat_id'], "Неизвестная группа")
            text = f"Группа: {grp_name}\nЮзер: @{data['username']}\nИзменение: {data['modifier']} см"
            bot.send_message(message.chat.id, text, reply_markup=markup)
            
    elif message.text == "🔧 Изменить см":
        if not known_groups:
            bot.reply_to(message, "Бот пока не состоит ни в одной группе! Добавьте его в чат и напишите там /zopka.")
            return
            
        markup = types.InlineKeyboardMarkup()
        for cid, title in known_groups.items():
            markup.add(types.InlineKeyboardButton(title, callback_data=f"sel_grp_{cid}"))
            
        bot.send_message(message.chat.id, "Выберите группу для перехвата:", reply_markup=markup)

# --- Обработка инлайн-кнопок админа ---
@bot.callback_query_handler(func=lambda call: call.data.startswith('del_ovr_'))
def cancel_override(call):
    oid = int(call.data.replace('del_ovr_', ''))
    if oid in admin_modifiers:
        del admin_modifiers[oid]
        bot.edit_message_text("✅ Перехват отменен.", call.message.chat.id, call.message.message_id)
    else:
        bot.answer_callback_query(call.id, "Уже сработал или отменен.")

@bot.callback_query_handler(func=lambda call: call.data.startswith('sel_grp_'))
def select_group(call):
    chat_id = int(call.data.replace('sel_grp_', ''))
    bot.answer_callback_query(call.id) # Закрываем ожидание загрузки кнопки
    
    msg = bot.send_message(call.message.chat.id, f"Выбрана группа: {known_groups[chat_id]}\n\nВведите юзернейм (например, durov):")
    bot.register_next_step_handler(msg, process_username_step, chat_id)

def process_username_step(message, chat_id):
    username = message.text.replace('@', '').lower()
    msg = bot.reply_to(message, f"@{username}\nСколько см добавить или отнять? (Например: 15 или -5):")
    bot.register_next_step_handler(msg, process_modifier_step, chat_id, username)

def process_modifier_step(message, chat_id, username):
    global override_counter
    try:
        modifier = int(message.text)
        if modifier == 0:
            bot.reply_to(message, "Изменение не может быть равно 0! Начните заново из меню.")
            return
            
        override_counter += 1
        admin_modifiers[override_counter] = {'chat_id': chat_id, 'username': username, 'modifier': modifier}
        
        action = "вырастет на" if modifier > 0 else "уменьшится на"
        bot.reply_to(message, f"✅ Сохранено в активные перехваты!\nКогда @{username} нажмет /zopka в выбранной группе (и если у него прошел кулдаун), его глубина {action} {abs(modifier)} см.", reply_markup=get_admin_markup())
    except ValueError:
        bot.reply_to(message, "Ошибка! Нужно было ввести число. Начните заново из меню.")

# ==========================================
# ОТВЕТ ОБЫЧНЫМ ПОЛЬЗОВАТЕЛЯМ В ЛС
# ==========================================
@bot.message_handler(func=lambda m: m.chat.type == 'private' and m.from_user.id != ADMIN_ID)
def non_admin_private(message):
    markup = types.InlineKeyboardMarkup()
    add_url = f"https://t.me/{bot.get_me().username}?startgroup=true"
    btn = types.InlineKeyboardButton(text="➕ Добавить в группу", url=add_url)
    markup.add(btn)

    bot.send_message(
        message.chat.id,
        "Привет! 🍑\nЯ командный игрок и работаю только в общих чатах.\n\n"
        "Жми кнопку ниже, чтобы добавить меня в свою группу. Не забудь выдать мне права администратора после добавления!",
        reply_markup=markup
    )

print("Бот запущен!")
bot.infinity_polling()
