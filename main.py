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
admin_modifiers = {} # {'username': 5}
known_groups = {}    # {chat_id: "Название"}

# Создаем меню команд (появится слева от поля ввода текста в телеграме)
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
        # Если добавленный участник — это сам бот
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

    # Сохраняем не только размер, но и имя для рейтинга
    if key not in user_stats:
        user_stats[key] = {'size': 0, 'last_time': datetime.min, 'name': user_name}
    else:
        # Обновляем имя, если юзер его поменял
        user_stats[key]['name'] = user_name

    stats = user_stats[key]
    time_passed = now - stats['last_time']
    current_size = stats['size']

    # 1. Проверка на админское вмешательство
    if username in admin_modifiers:
        modifier = admin_modifiers.pop(username)
        new_size = current_size + modifier
        new_size = max(0, new_size) # В минус уходить нельзя
        
        actual_change = abs(new_size - current_size)
        stats['size'] = new_size
        stats['last_time'] = now
        
        if modifier > 0:
            bot.reply_to(message, f"✨ Внезапное мистическое вмешательство! ✨\nИнструмент вошел глубже на {actual_change} см.\nТекущая глубина: {new_size} см.")
        else:
            bot.reply_to(message, f"✨ Внезапное мистическое вмешательство! ✨\nРаны резко зажили на {actual_change} см.\nТекущая глубина: {new_size} см.")
        return

    # 2. Стандартная игра раз в 24 часа
    if time_passed < timedelta(days=1):
        remaining = timedelta(days=1) - time_passed
        hours, remainder = divmod(remaining.seconds, 3600)
        minutes, _ = divmod(remainder, 60)
        bot.reply_to(message, f"Раны еще в процессе! 🩹\nПриходи через {hours} ч. {minutes} мин.")
        return

    # Логика: если 0 см — только рост, иначе рандом (рост или заживление)
    if current_size == 0:
        direction = 1
    else:
        direction = random.choice([1, -1])

    # Изменение до 20 см за один раз
    change = random.randint(1, 20)
    new_size = current_size + (change * direction)
    new_size = max(0, new_size) # Защита от ухода в минус
    
    actual_change = abs(new_size - current_size)
    stats['size'] = new_size
    stats['last_time'] = now

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
    
    # Собираем всех игроков текущего чата
    chat_players = []
    for (cid, uid), data in user_stats.items():
        if cid == chat_id:
            chat_players.append((data['name'], data['size']))
            
    if not chat_players:
        bot.reply_to(message, "В этом чате пока никто не играл! Жмите /zopka")
        return

    # Сортируем по убыванию размера
    chat_players.sort(key=lambda x: x[1], reverse=True)

    text = "🏆 **Рейтинг глубин этого чата:**\n\n"
    for index, (name, size) in enumerate(chat_players, start=1):
        text += f"{index}. {name} — {size} см\n"

    bot.reply_to(message, text, parse_mode="Markdown")

# ==========================================
# АДМИН ПАНЕЛЬ (Только для ЛС с ботом)
# ==========================================
@bot.message_handler(commands=['start', 'admin'], func=lambda m: m.chat.type == 'private' and m.from_user.id == ADMIN_ID)
def admin_panel(message):
    markup = types.ReplyKeyboardMarkup(resize_keyboard=True)
    markup.add(types.KeyboardButton("🔧 Изменить см"), types.KeyboardButton("✅ Проверка статуса"), types.KeyboardButton("📋 Список групп"))
    bot.send_message(message.chat.id, "Добро пожаловать в панель управления! Выбери действие:", reply_markup=markup)

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
    elif message.text == "🔧 Изменить см":
        msg = bot.reply_to(message, "Введите юзернейм (например, durov):", reply_markup=types.ReplyKeyboardRemove())
        bot.register_next_step_handler(msg, process_username_step)

def process_username_step(message):
    username = message.text.replace('@', '').lower()
    msg = bot.reply_to(message, f"@{username}\nСколько см добавить или отнять? (Например: 15 или -5):")
    bot.register_next_step_handler(msg, process_modifier_step, username)

def process_modifier_step(message, username):
    try:
        modifier = int(message.text)
        admin_modifiers[username] = modifier
        
        markup = types.ReplyKeyboardMarkup(resize_keyboard=True)
        markup.add(types.KeyboardButton("🔧 Изменить см"), types.KeyboardButton("✅ Проверка статуса"), types.KeyboardButton("📋 Список групп"))
        
        action = "вырастет на" if modifier > 0 else "уменьшится на"
        bot.reply_to(message, f"✅ Сохранено! При следующем нажатии /zopka глубина @{username} {action} {abs(modifier)} см.", reply_markup=markup)
    except ValueError:
        bot.reply_to(message, "Ошибка! Нужно было ввести число. Нажми /start для перезапуска.")

print("Бот запущен!")
bot.infinity_polling()