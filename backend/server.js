const express = require('express');
const cors = require('cors');
const path =require('path')

const app = express();
const PORT = 8080;

// Настройка CORS
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: false
}));

app.use(express.json());

// Добавляем заголовки безопасности
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
  } else {
    next();
  }
});

// Простое хранилище в памяти - теперь с историей пульса
let users = {};

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../front/index.html'));
});

// Получить всех пользователей
app.get('/api/users', (req, res) => {
  console.log('GET /api/users - запрос получен');
  res.json(users);
});

// Сохранить пульс пользователя
app.post('/api/heart-rate', (req, res) => {
  const { name, heartRate } = req.body;
  
  console.log('POST /api/heart-rate - данные:', { name, heartRate });
  
  if (!name || !heartRate) {
    return res.status(400).json({ error: 'Имя и пульс обязательны' });
  }

  const timestamp = new Date().toISOString();
  
  // Инициализируем пользователя если его нет
  if (!users[name]) {
    users[name] = {
      name,
      heartRateHistory: [],
      lastHeartRate: null,
      lastUpdate: null
    };
  }

  // Добавляем новое измерение в историю
  users[name].heartRateHistory.push({
    heartRate,
    timestamp
  });

  // Обновляем последние данные
  users[name].lastHeartRate = heartRate;
  users[name].lastUpdate = timestamp;

  // Ограничиваем историю последними 100 измерениями для экономии памяти
  if (users[name].heartRateHistory.length > 100) {
    users[name].heartRateHistory = users[name].heartRateHistory.slice(-100);
  }

  res.json({ 
    success: true, 
    user: {
      name: users[name].name,
      heartRate: users[name].lastHeartRate,
      timestamp: users[name].lastUpdate
    }
  });
});

// Получить пульс конкретного пользователя
app.get('/api/users/:name', (req, res) => {
  const { name } = req.params;
  const user = users[name];
  
  if (!user) {
    return res.status(404).json({ error: 'Пользователь не найден' });
  }
  
  res.json({
    name: user.name,
    heartRate: user.lastHeartRate,
    timestamp: user.lastUpdate
  });
});

// Получить историю пульса пользователя для графиков
app.get('/api/users/:name/history', (req, res) => {
  const { name } = req.params;
  const { limit = 50 } = req.query; // По умолчанию последние 50 измерений
  
  const user = users[name];
  
  if (!user) {
    return res.status(404).json({ error: 'Пользователь не найден' });
  }
  
  const history = user.heartRateHistory.slice(-parseInt(limit));
  
  res.json({
    name: user.name,
    history: history,
    count: history.length
  });
});

// Проверка состояния сервера
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});


// Запуск HTTP сервера
app.listen(PORT, '0.0.0.0', async () => {
  console.log(`🚀 HTTP сервер запущен на порту ${PORT}`);
  console.log(`🏠 Локальный доступ: http://localhost:${PORT}`);
  console.log(`🌍 Сетевой доступ: http://192.168.1.66:${PORT}`);
  
});

// Обработка завершения процесса
process.on('SIGINT', async () => {
  console.log('\n🛑 Завершение работы сервера...');
  process.exit(0);
});