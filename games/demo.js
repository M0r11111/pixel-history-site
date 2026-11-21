/* Демо-игра Pixel History: настоящая история Ербола и его лучшей подруги Асем (дружба, без романтики).
   Формат — игра-история: каждая глава это сцена, где игрок сам проживает события сюжета.
   {
     title, subtitle, from, recipient, card, mood, style,
     heroes: [{ id, name, role, ...внешность из конструктора, walk, emotes }],
     player, partner — id героев,
     levels: [{ title, place, theme, width, patch, props: [{id,type,x}], actors: [{id,x,show,flip,mode}], script: [шаги] }],
     finale: { title, letter, from, patch }
   }
   Шаги сценария описаны в game/engine.js (say, goal, mini, actor, memory, fade, patch, take).
   Мини-игры: chat, choice, quiz, catch, whack, poses, tryon, assemble — проиграть нельзя. */
window.PH_DEMO = {
  version: 2,
  title: 'Не с первого раза',
  subtitle: 'история Ербола и Асем · 9 глав',
  from: 'Ербол',
  recipient: 'Асем',
  card: 'Это история о встрече, которая случилась не с первого раза.',
  mood: 'Ностальгия',
  style: '16-бит',
  camera: 'Сбоку',
  heroes: [
    { id: 'erbol', name: 'Ербол', role: 'Главный герой', skin: '#D9A877', hair: '#1E1A16', style: 'short', eyes: '#3B2B1E', top: '#4A6E9C', topType: 'hoodie', bottom: '#2A2420', bottomType: 'pants', shoes: '#EDE4CF', acc: 'none', walk: 'walk_normal', emotes: ['wave'] },
    { id: 'asem', name: 'Асем', role: 'Лучшая подруга', skin: '#F0CBA8', hair: '#2A1E16', style: 'long', eyes: '#4A3626', top: '#9B8AC4', topType: 'hoodie', bottom: '#3E4A33', bottomType: 'pants', shoes: '#EDE4CF', acc: 'none', walk: 'walk_bouncy', emotes: ['wave', 'joy'] }
  ],
  player: 'erbol',
  partner: 'asem',
  levels: [
    /* 1. Комп-клуб: сесть за компьютер → переписка в Дайвинчике → выйти встречать */
    {
      title: 'Ночная смена', place: 'Актобе, компьютерный клуб', theme: 'club', width: 1280,
      props: [{ id: 'pc', type: 'pcdesk', x: 560 }, { id: 'door', type: 'door', x: 1200 }],
      script: [
        { say: [{ who: 'narrator', text: 'Актобе. Ночь. Ербол на смене в компьютерном клубе. Клиенты разошлись, и ему грустно.' }, { who: 'erbol', text: 'Ещё одна длинная ночь… Сяду за свой комп.' }] },
        { goal: 'Сядь за компьютер', at: 'pc' },
        { say: [{ who: 'erbol', text: 'Открою-ка Дайвинчик. Вдруг повезёт.' }] },
        { mini: 'chat', app: 'Дайвинчик', partner: 'asem', script: [
          { from: 'sys', text: 'Новая анкета: Асем, Актобе' },
          { choose: ['Лайкнуть анкету', 'Написать «Привет!»'] },
          { from: 'them', text: 'Привет! Ты тоже не спишь?' },
          { choose: ['Я на ночной смене в клубе', 'Сижу на работе, скучаю'] },
          { from: 'them', text: 'В компьютерном клубе? Вот это работа :)' },
          { from: 'them', text: 'А в какие игры играешь?' },
          { choose: ['Во всё подряд, если честно', 'Долго рассказывать :)'] },
          { from: 'them', text: 'Ахах, я тоже. Кажется, мы подружимся' },
          { from: 'sys', text: '…переписка до самого утра' }
        ] },
        { memory: 'В Дайвинчике новое знакомство — Асем. Общих тем и шуток столько, что болтали до утра.' },
        { fade: 'Прошло несколько недель…' },
        { mini: 'chat', app: 'Чат с Асем', partner: 'asem', script: [
          { from: 'them', text: 'Слушай, давай уже увидимся вживую?' },
          { choose: ['Давай! Приходи ко мне в клуб', 'Конечно! Я тут каждую ночь'] },
          { from: 'them', text: 'Договорились. Приду к тебе на работу :)' },
          { from: 'sys', text: 'Зима. Тот самый день.' },
          { from: 'them', text: 'Я уже у клуба!' }
        ] },
        { say: [{ who: 'erbol', text: 'Она уже здесь! Выхожу встречать.' }] },
        { goal: 'Выйди на улицу', at: 'door' }
      ]
    },
    /* 2. Зима: подойти к Асем → она убегает → написать ей */
    {
      title: 'Встреча, которой не было', place: 'Актобе, зима', theme: 'winter', width: 1500,
      patch: { erbol: { acc: 'scarf' }, asem: { acc: 'scarf' } },
      actors: [{ id: 'asem', x: 1180, show: true, flip: true }],
      script: [
        { say: [{ who: 'narrator', text: 'Зима. Снег скрипит под ногами. Асем ждёт у ларька.' }, { who: 'erbol', text: 'Вон она! Интересно, какая она вживую?' }] },
        { goal: 'Подойди к Асем', near: 'asem', dist: 260 },
        { say: [{ who: 'erbol', text: 'Асем?..' }] },
        { actor: 'asem', mode: 'run', to: 1800, wait: true },
        { actor: 'asem', show: false },
        { say: [{ who: 'narrator', text: 'Асем переволновалась и убежала, так и не встретившись с Ерболом.' }, { who: 'erbol', text: 'Её уже нет… Напишу ей.' }] },
        { mini: 'chat', app: 'Чат с Асем', partner: 'asem', script: [
          { choose: ['Ты чего убежала? Всё хорошо?', 'Эй, я тебя видел :)'] },
          { from: 'them', text: 'Прости… я так переволновалась' },
          { from: 'them', text: 'Давай как-нибудь потом, ладно?' },
          { choose: ['Конечно. Без обид', 'Ладно, ещё увидимся!'] }
        ] },
        { memory: 'Встреча, которой не было. Но дружба в переписке осталась.' },
        { say: [{ who: 'erbol', text: 'Видимо, ещё не время. А мне пора собирать вещи…' }] },
        { goal: 'Иди домой', toX: 1440 }
      ]
    },
    /* 3. Алматы: растянуть 10 000 ₸ → где ночевать → собеседование */
    {
      title: 'Десять тысяч тенге', place: 'Алматы, первые дни', theme: 'almaty', width: 1600,
      props: [{ id: 'job', type: 'door', x: 1500 }],
      script: [
        { say: [{ who: 'narrator', text: 'Через пару дней Ербол переезжает в Алматы. В кармане — всего 10 000 тенге.' }, { who: 'erbol', text: 'Новый город. Начинаю с нуля.' }] },
        { goal: 'Пройдись по новому городу', toX: 560 },
        { say: [{ who: 'erbol', text: 'Деньги надо растянуть. Каждая монетка на счету.' }] },
        { mini: 'catch', title: 'Растяни 10 000 ₸', hint: 'Лови монеты, мимо счетов', item: 'coin', bad: 'bill', goal: 12, time: 25 },
        { say: [{ who: 'erbol', text: 'Фух. На первое время хватит.' }] },
        { mini: 'choice', title: 'Где ночевать?', rounds: [
          { q: 'Первая ночь в Алматы. Где спать?', options: [
            { text: 'У друга на диване', reply: [{ who: 'erbol', text: 'Спасибо, брат. Диван — почти кровать.' }] },
            { text: 'У другого друга на полу', reply: [{ who: 'erbol', text: 'Пол жёсткий, зато свои люди рядом.' }] }] },
          { q: 'Друзьям неудобно. А теперь?', options: [
            { text: 'Ночую в компьютерном клубе', reply: [{ who: 'erbol', text: 'Клуб — почти родной дом. Всё знакомо.' }] },
            { text: 'Тоже в клубе, но в соседнем', reply: [{ who: 'narrator', text: 'Иногда приходилось ночевать прямо в компьютерных клубах.' }] }] }
        ] },
        { memory: 'Ночёвки у друзей и в клубах. Жайлап-жайлап — шаг за шагом.' },
        { goal: 'Иди на собеседование', at: 'job' },
        { mini: 'quiz', title: 'Собеседование', who: 'narrator', questions: [
          { q: 'Сайт компании не открывается. Что проверить первым делом?', a: ['Переустановить Windows всем', 'Есть ли сеть и жив ли сервер', 'Выключить свет в офисе'], right: 1, ok: 'Логично. Начинают с простого.' },
          { q: 'Сотрудник забыл пароль. Что делаешь?', a: ['Сбрасываю по правилам', 'Пишу пароль на стикер', 'Говорю «вспоминай сам»'], right: 0, ok: 'Верно: безопасно и быстро.' },
          { q: 'Что такое бэкап?', a: ['Новый вид кабеля', 'Перерыв на кофе', 'Резервная копия данных'], right: 2, ok: 'Точно. Без бэкапов сисадмину не спится.' }
        ] },
        { say: [{ who: 'narrator', text: 'Ербола берут! Теперь он системный администратор в хорошей компании.' }, { who: 'erbol', text: 'Йес! Жайлап-жайлап — и получилось!' }] }
      ]
    },
    /* 4. Офис: проверить серверную → починить серверы → 9 месяцев */
    {
      title: 'Сисадмин', place: 'Алматы, хорошая компания', theme: 'office', width: 1300,
      props: [{ id: 'srv', type: 'spot', x: 1080 }, { id: 'door', type: 'door', x: 1250 }],
      script: [
        { say: [{ who: 'narrator', text: 'Ербол встаёт на ноги: своё нормальное жильё и работа сисадмином.' }, { who: 'erbol', text: 'Первый рабочий день. Проверю серверную.' }] },
        { goal: 'Проверь серверную', at: 'srv' },
        { say: [{ who: 'erbol', text: 'Ого, мигает красным! Надо чинить.' }] },
        { mini: 'whack', title: 'Почини серверы', goal: 6 },
        { say: [{ who: 'erbol', text: 'Всё работает. Можно выдохнуть.' }] },
        { memory: 'Серверы гудят — всё по-настоящему. Своё жильё, тепло и спокойно.' },
        { fade: 'Прошло 9 месяцев…' },
        { say: [{ who: 'erbol', text: 'Отпуск! Лечу домой, в Актобе.' }] },
        { goal: 'Иди к выходу', at: 'door' }
      ]
    },
    /* 5. Актобе, август: найти Асем → она идёт рядом */
    {
      title: 'Наконец-то', place: 'Актобе, август', theme: 'autumn', width: 1600,
      actors: [{ id: 'asem', x: 1280, show: true, flip: true, mode: 'emote', emote: 'wave' }],
      script: [
        { say: [{ who: 'narrator', text: 'Август. Ербол прилетел в Актобе. Тот же город — но всё как будто по-новому.' }, { who: 'erbol', text: 'В этот раз мы точно встретимся. Где же она?' }] },
        { goal: 'Найди Асем', at: 'asem' },
        { actor: 'asem', mode: 'idle' },
        { say: [{ who: 'asem', text: 'Привет! В этот раз я не сбегу :)' }, { who: 'erbol', text: 'Наконец-то! Девять месяцев, Асем!' }, { who: 'asem', text: 'Пошли в Керуен Сити?' }] },
        { memory: 'Встреча, которая не случилась зимой, всё-таки случилась.' },
        { actor: 'asem', mode: 'follow' },
        { goal: 'Иди в Керуен Сити', toX: 1560 }
      ]
    },
    /* 6. Керуен Сити: фудкорт → влог на экшен-камеру */
    {
      title: 'Керуен Сити', place: 'ТЦ «Керуен Сити»', theme: 'mall', width: 1500,
      props: [{ id: 'food', type: 'counter', x: 720 }],
      actors: [{ id: 'asem', x: 60, show: true, flip: false, mode: 'follow' }],
      script: [
        { say: [{ who: 'asem', text: 'Сначала — покушать! Хорошая прогулка начинается с фудкорта.' }] },
        { goal: 'Иди на фудкорт', at: 'food' },
        { say: [{ who: 'erbol', text: 'Два обеда, пожалуйста!' }, { who: 'asem', text: 'Наелись? Доставай экшен-камеру — снимаем влог!' }] },
        { mini: 'poses', title: 'Влог на экшен-камеру', rounds: 6 },
        { memory: 'Кривлялись перед камерой и смеялись до слёз.' },
        { say: [{ who: 'asem', text: 'А теперь — в кино?' }, { who: 'erbol', text: 'Погнали!' }] },
        { goal: 'Иди в кино', toX: 1440 }
      ]
    },
    /* 7. Кино: попкорн → места → такси и разговор у подъезда */
    {
      title: 'Кино и подъезд', place: 'Кинотеатр, вечер', theme: 'cinema', width: 1200,
      props: [{ id: 'pop', type: 'popcorn', x: 340 }, { id: 'seat', type: 'spot', x: 900 }],
      actors: [{ id: 'asem', x: 60, show: true, flip: false, mode: 'follow' }],
      script: [
        { say: [{ who: 'narrator', text: 'Вечер. Скоро начнётся фильм.' }, { who: 'asem', text: 'Без попкорна кино не кино!' }] },
        { goal: 'Возьми попкорн', at: 'pop' },
        { mini: 'catch', title: 'Лови попкорн', hint: 'Лови в ведёрко', item: 'popcorn', goal: 15, time: 20 },
        { goal: 'Займите места', at: 'seat' },
        { memory: 'Свет погас. Фильм шёл, а они шёпотом шутили на весь ряд.' },
        { fade: 'После кино Ербол вызвал такси и проводил Асем до дома' },
        { mini: 'choice', title: 'Разговор у подъезда', rounds: [
          { q: 'О чём поговорить?', options: [
            { text: 'Вспомнить, как ты сбежала зимой', reply: [{ who: 'asem', text: 'Ой, не напоминай! Я так волновалась…' }, { who: 'erbol', text: 'Зато теперь есть что вспомнить :)' }] },
            { text: 'Рассказать про Алматы', reply: [{ who: 'erbol', text: 'Приехал с 10 000 тенге, жил у друзей и в клубах…' }, { who: 'asem', text: 'Ты молодец. Правда.' }] }] },
          { q: 'Уже поздно…', options: [
            { text: 'Договориться на завтра', reply: [{ who: 'asem', text: 'Завтра идём выбирать тебе очки!' }] },
            { text: 'Поболтать ещё чуть-чуть', reply: [{ who: 'narrator', text: 'Болтали ещё долго.' }, { who: 'asem', text: 'Всё, до завтра! Идём выбирать тебе очки.' }] }] }
        ] },
        { memory: 'У подъезда болтали долго — как будто и не было этих девяти месяцев.' }
      ]
    },
    /* 8. Оптика: зеркало → примерка (Асем соглашается не сразу) */
    {
      title: 'Новые очки', place: 'Оптика', theme: 'optics', width: 1200,
      props: [{ id: 'mirror', type: 'mirror', x: 700 }, { id: 'door', type: 'door', x: 1140 }],
      actors: [{ id: 'asem', x: 300, show: true, flip: true }],
      script: [
        { say: [{ who: 'narrator', text: 'На следующий день Ербол решил купить очки для зрения. Асем пошла с ним.' }, { who: 'asem', text: 'Я выберу тебе лучшие очки. Иди к зеркалу!' }] },
        { actor: 'asem', mode: 'follow' },
        { goal: 'Подойди к зеркалу', at: 'mirror' },
        { mini: 'tryon', title: 'Примерка оправ', adviser: 'asem', acceptAfter: 3, options: [
          { name: 'Чёрные', patch: { acc: 'glasses', glassesColor: '#2A2420' } },
          { name: 'Коричневые', patch: { acc: 'glasses', glassesColor: '#8A5A2E' } },
          { name: 'Синие', patch: { acc: 'glasses', glassesColor: '#3E5F8A' } },
          { name: 'Красные', patch: { acc: 'glasses', glassesColor: '#B8403A' } },
          { name: 'Серебристые', patch: { acc: 'glasses', glassesColor: '#9AA3AE' } }],
          no: ['Нет, эти не те. Примерь другие.', 'Хм… Слишком строгие. Дальше!'], yes: 'Вот! Эти. Тебе очень идут!' },
        { say: [{ who: 'erbol', text: 'Тогда беру!' }] },
        { memory: 'Асем выбирала оправу строже, чем он сам. И нашла те самые.' },
        { say: [{ who: 'asem', text: 'Отметим донером?' }, { who: 'erbol', text: 'Ещё бы!' }] },
        { goal: 'Иди к выходу', at: 'door' }
      ]
    },
    /* 9. Донерная: собрать донер → прощание */
    {
      title: 'Донер по пути домой', place: 'Донерная', theme: 'food', width: 1200,
      patch: { erbol: { acc: 'glasses' } },
      props: [{ id: 'cnt', type: 'spot', x: 820 }],
      actors: [{ id: 'asem', x: 60, show: true, flip: false, mode: 'follow' }],
      script: [
        { say: [{ who: 'narrator', text: 'По дороге домой они заехали в донерную.' }] },
        { goal: 'Подойди к кассе', at: 'cnt' },
        { say: [{ who: 'erbol', text: 'Два донера! А можно я сам соберу?' }, { who: 'narrator', text: 'Повар засмеялся и пустил за стойку.' }] },
        { mini: 'assemble', title: 'Собери донер', steps: ['Лаваш', 'Мясо', 'Овощи', 'Соус', 'Завернуть'] },
        { say: [{ who: 'asem', text: 'Ммм! Донер после оптики — лучший донер.' }] },
        { memory: 'Говорили обо всём на свете — как лучшие друзья.' },
        { actor: 'asem', mode: 'emote', emote: 'wave' },
        { say: [{ who: 'erbol', text: 'Мне скоро обратно в Алмату…' }, { who: 'asem', text: 'Прилетай ещё!' }, { who: 'erbol', text: 'Обязательно!' }] }
      ]
    }
  ],
  finale: {
    title: 'КОНЕЦ',
    letter: 'После ещё нескольких прогулок по Актобе Ербол улетел обратно в Алмату. Встреча, которая не случилась зимой, всё-таки случилась — пусть и через девять месяцев. А знакомая из Дайвинчика стала лучшей подругой.',
    from: '',
    patch: { erbol: { acc: 'glasses' } }
  }
};
