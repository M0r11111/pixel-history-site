/* Демо-игра Pixel History: настоящая история Ербола и его лучшей подруги Асем (дружба, без романтики).
   Формат игры:
   {
     title, subtitle, from, recipient, card, mood, style,
     heroes: [{ id, name, role, ...внешность из конструктора, walk, emotes }],
     player, partner — id героев,
     levels: [{ title, place, theme, goal, patch, runLine, intro: [{who, text}], memories: [{text}], outro: [{who, text}] }],
     finale: { title, letter, from, patch }
   }
   theme: club | winter | almaty | office | autumn | mall | cinema | optics | food | forest | mountains | city | lake | beach | night | snow | home
   goal:  partner (в конце ждёт второй герой) | exit (дверь) | runaway (второй герой убегает)
   patch: { idГероя: { acc: 'glasses', ... } } — что надето на этом уровне
   who:   id героя | 'memory' | 'narrator' (рассказчик) */
window.PH_DEMO = {
  version: 1,
  title: 'Не с первого раза',
  subtitle: 'история Ербола и Асем · 9 уровней',
  from: 'Ербол',
  recipient: 'Асем',
  card: 'Это история о встрече, которая случилась не с первого раза.',
  mood: 'Ностальгия',
  style: '16-бит',
  camera: 'Сбоку',
  heroes: [
    { id: 'erbol', name: 'Ербол', role: 'Главный герой', skin: '#D9A877', hair: '#1E1A16', style: 'short', eyes: '#3B2B1E', top: '#4A6E9C', topType: 'hoodie', bottom: '#2A2420', bottomType: 'pants', shoes: '#EDE4CF', acc: 'none', walk: 'walk_normal', emotes: ['wave'] },
    { id: 'asem', name: 'Асем', role: 'Кого ищем', skin: '#F0CBA8', hair: '#2A1E16', style: 'long', eyes: '#4A3626', top: '#9B8AC4', topType: 'hoodie', bottom: '#3E4A33', bottomType: 'pants', shoes: '#EDE4CF', acc: 'none', walk: 'walk_bouncy', emotes: ['wave', 'joy'] }
  ],
  player: 'erbol',
  partner: 'asem',
  levels: [
    {
      title: 'Ночная смена', place: 'Актобе, компьютерный клуб', theme: 'club', goal: 'exit',
      intro: [
        { who: 'narrator', text: 'Актобе. Ночь. Ербол сидит на смене в компьютерном клубе, и ему грустно.' },
        { who: 'erbol', text: 'Ещё одна длинная ночь… Открою-ка Дайвинчик.' }
      ],
      memories: [
        { text: 'В Дайвинчике новое знакомство. Её зовут Асем.' },
        { text: 'Оказалось, у них куча общих тем и шуток.' },
        { text: 'Они быстро подружились — переписка до самого утра.' },
        { text: 'Общались долго-долго. И однажды решили встретиться вживую.' }
      ],
      outro: [
        { who: 'asem', text: 'Я приду к тебе на работу, в клуб.' },
        { who: 'erbol', text: 'Договорились! Буду ждать.' }
      ]
    },
    {
      title: 'Встреча, которой не было', place: 'Актобе, зима', theme: 'winter', goal: 'runaway',
      patch: { erbol: { acc: 'scarf' }, asem: { acc: 'scarf' } },
      runLine: 'Асем?..',
      intro: [
        { who: 'narrator', text: 'Зима. Асем пришла к Ерболу на работу.' },
        { who: 'erbol', text: 'Она уже здесь! Выхожу встречать.' }
      ],
      memories: [
        { text: 'Снег скрипит под ногами. Интересно, какая она вживую?' },
        { text: 'Друзья из переписки — и вот-вот увидятся по-настоящему.' },
        { text: 'А вдруг вживую не найдём, о чём говорить?' }
      ],
      outro: [
        { who: 'narrator', text: 'Асем переволновалась и убежала, так и не встретившись с Ерболом.' },
        { who: 'erbol', text: 'Её уже нет… Видимо, ещё не время.' }
      ]
    },
    {
      title: 'Десять тысяч тенге', place: 'Алматы, первые дни', theme: 'almaty', goal: 'exit',
      intro: [
        { who: 'narrator', text: 'Через пару дней Ербол переезжает в Алматы. В кармане — всего 10 000 тенге.' },
        { who: 'erbol', text: 'Новый город. Начинаю с нуля.' }
      ],
      memories: [
        { text: 'Ночёвки у друзей — то на диване, то на полу.' },
        { text: 'Иногда приходилось ночевать прямо в компьютерных клубах.' },
        { text: 'Каждый день — поиски работы и собеседования.' },
        { text: 'Жайлап-жайлап. Шаг за шагом.' }
      ],
      outro: [{ who: 'erbol', text: 'Я справлюсь. Обязательно справлюсь.' }]
    },
    {
      title: 'Сисадмин', place: 'Алматы, хорошая компания', theme: 'office', goal: 'exit',
      intro: [{ who: 'narrator', text: 'Ербол встаёт на ноги: он системный администратор в хорошей компании.' }],
      memories: [
        { text: 'Первый рабочий день. Серверы гудят — всё по-настоящему.' },
        { text: 'Своё нормальное жильё. Тепло и спокойно.' },
        { text: 'Девять месяцев пролетели незаметно.' }
      ],
      outro: [{ who: 'erbol', text: 'Отпуск! Лечу домой, в Актобе.' }]
    },
    {
      title: 'Наконец-то', place: 'Актобе, август', theme: 'autumn', goal: 'partner',
      intro: [
        { who: 'narrator', text: 'Прошло девять месяцев. Ербол прилетел в Актобе.' },
        { who: 'erbol', text: 'В этот раз мы точно встретимся. Подруга ждёт!' }
      ],
      memories: [
        { text: 'Тот же город, но всё как будто по-новому.' },
        { text: 'Начало осени: тепло, первые жёлтые листья.' },
        { text: 'Вон она! Стоит и машет рукой.' }
      ],
      outro: [
        { who: 'asem', text: 'Привет! В этот раз я не сбегу :)' },
        { who: 'erbol', text: 'Наконец-то! Пойдём гулять?' }
      ]
    },
    {
      title: 'Керуен Сити', place: 'ТЦ «Керуен Сити»', theme: 'mall', goal: 'partner',
      intro: [{ who: 'asem', text: 'Пошли в Керуен Сити!' }],
      memories: [
        { text: 'Сначала — покушать. Хорошая прогулка начинается с фудкорта.' },
        { text: 'Снимали влог на экшен-камеру.' },
        { text: 'Кривлялись перед камерой и смеялись до слёз.' }
      ],
      outro: [
        { who: 'asem', text: 'А теперь — в кино?' },
        { who: 'erbol', text: 'Погнали!' }
      ]
    },
    {
      title: 'Кино и подъезд', place: 'Кинотеатр, вечер', theme: 'cinema', goal: 'partner',
      intro: [{ who: 'narrator', text: 'Вечер. Свет гаснет, начинается фильм.' }],
      memories: [
        { text: 'Фильм шёл, а они шёпотом шутили на весь ряд.' },
        { text: 'После кино Ербол вызвал такси и проводил Асем до дома.' },
        { text: 'У подъезда ещё долго болтали — как будто и не было этих девяти месяцев.' }
      ],
      outro: [
        { who: 'asem', text: 'Ну всё, до завтра?' },
        { who: 'erbol', text: 'До завтра!' }
      ]
    },
    {
      title: 'Новые очки', place: 'Оптика', theme: 'optics', goal: 'partner',
      patch: { erbol: { acc: 'glasses' } },
      intro: [{ who: 'narrator', text: 'На следующий день Ербол решил купить очки для зрения. Асем пошла с ним.' }],
      memories: [
        { text: 'Асем выбирала оправу строже, чем он сам.' },
        { text: '«Нет, эти не те. Примерь вот эти».' },
        { text: 'Болтали, выбирали — и нашли те самые.' }
      ],
      outro: [
        { who: 'asem', text: 'Вот! Тебе очень идут.' },
        { who: 'erbol', text: 'Тогда беру!' }
      ]
    },
    {
      title: 'Донер по пути домой', place: 'Фаст-фуд', theme: 'food', goal: 'partner',
      patch: { erbol: { acc: 'glasses' } },
      intro: [{ who: 'narrator', text: 'По дороге домой они заехали в фаст-фуд.' }],
      memories: [
        { text: 'Донер после оптики — лучший донер.' },
        { text: 'Говорили обо всём на свете — как лучшие друзья.' },
        { text: 'А потом были ещё прогулки по городу.' }
      ],
      outro: [
        { who: 'erbol', text: 'Мне пора возвращаться в Алмату…' },
        { who: 'asem', text: 'Прилетай ещё!' }
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
