const express = require('express');
const path = require('path');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

const PORT = process.env.PORT || 3001;

// Store active streams
const activeStreams = new Map();

// API routes
app.get('/', (req, res) => {
  res.json({
    status: 'OK',
    message: 'Exam Monitoring Server API',
    timestamp: new Date().toISOString(),
    activeStreams: activeStreams.size,
    endpoints: [
      'GET /api/health - Health check',
      'GET /api - Server status',
      'WebSocket - Socket.IO for video streaming'
    ]
  });
});

app.get('/api', (req, res) => {
  res.json({
    status: 'OK',
    message: 'Exam Monitoring Server Running',
    timestamp: new Date().toISOString(),
    activeStreams: activeStreams.size
  });
});

// Health check route
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    connections: io.engine.clientsCount
  });
});

io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  // Handle joining a room
  socket.on('join_room', (data) => {
    const { roomId, type } = data;
    socket.join(roomId);
    console.log(`${type} joined room: ${roomId}`);
  });

  // Handle student frame
  socket.on('student_frame', (data) => {
    const { studentId, frameData, timestamp } = data;
    const roomId = `student_${studentId}`;
    
    // Broadcast frame to all viewers in the room
    socket.to(roomId).emit('student_frame', {
      studentId,
      frameData,
      timestamp
    });
    
    console.log(`Frame received from student ${studentId}: ${frameData.length} bytes`);
  });

  // Handle leaving a room
  socket.on('leave_room', (data) => {
    const { roomId } = data;
    socket.leave(roomId);
    console.log(`Client left room: ${roomId}`);
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

http.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
}); 