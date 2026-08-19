require('dotenv').config();
const http = require('http');
const express = require('express');
const cors = require('cors');
const { Server } = require('socket.io');

const connectDB = require('./config/db');
const { initPush } = require('./utils/push');
const authRoutes = require('./routes/auth.routes');
const callRoutes = require('./routes/call.routes');
const scheduleRoutes = require('./routes/schedule.routes');
const reportRoutes = require('./routes/report.routes');
const initSockets = require('./sockets');

const app = express();
app.use(cors());
app.use(express.json());

app.get('/', (req, res) => res.json({ ok: true, service: 'friendly-call-backend' }));
app.use('/api/auth', authRoutes);
app.use('/api/calls', callRoutes);
app.use('/api/schedule', scheduleRoutes);
app.use('/api/report', reportRoutes);

const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });
app.set('io', io);
initSockets(io);

const PORT = process.env.PORT || 5000;
initPush();
connectDB().then(() => {
  server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
});
