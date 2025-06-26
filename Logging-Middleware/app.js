const express = require('express');
const logger = require('morgan');
const axios = require('axios');

const app = express();
app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

const ACCESS_TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJNYXBDbGFpbXMiOnsiYXVkIjoiaHR0cDovLzIwLjI0NC41Ni4xNDQvZXZhbHVhdGlvbi1zZXJ2aWNlIiwiZW1haWwiOiIyMmE5MWEwNWU3QGFlYy5lZHUuaW4iLCJleHAiOjE3NTA5MTc3MTMsImlhdCI6MTc1MDkxNjgxMywiaXNzIjoiQWZmb3JkIE1lZGljYWwgVGVjaG5vbG9naWVzIFByaXZhdGUgTGltaXRlZCIsImp0aSI6ImIwMzA5ODk2LTA0YzAtNGViNC1iYTQzLTc2OWJkNGY4N2RmNyIsImxvY2FsZSI6ImVuLUlOIiwibmFtZSI6Im5lZHVyaSByYWplc3dhciB5YWRhdiIsInN1YiI6ImE5MzMyYjUzLTI4NjQtNDA5ZC05ZDllLWI0Zjg2ZjcyZDI2OSJ9LCJlbWFpbCI6IjIyYTkxYTA1ZTdAYWVjLmVkdS5pbiIsIm5hbWUiOiJuZWR1cmkgcmFqZXN3YXIgeWFkYXYiLCJyb2xsTm8iOiIyMmE5MWEwNWU3IiwiYWNjZXNzQ29kZSI6Ik5Gd2dSVCIsImNsaWVudElEIjoiYTkzMzJiNTMtMjg2NC00MDlkLTlkOWUtYjRmODZmNzJkMjY5IiwiY2xpZW50U2VjcmV0IjoiaFFhRHphQVRiclhmTkVDVCJ9._7gsmFVp7ypEaPyTakW9hRKrShZT36PYQnvg16cyQjE";

async function log(stack, level, packageName, message) {
  try {
    const payload = {
      stack: stack.toLowerCase(),
      level: level.toLowerCase(),
      package: packageName.toLowerCase(),
      message,
    };

    const res = await axios.post('http://20.244.56.144/evaluation-service/logs', payload, {
      headers: {
        Authorization: `Bearer ${ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
      },
    });

    console.log('Log sent:', res.data);
  } catch (error) {
    console.error('Failed to send log:', error?.response?.data || error.message);
  }
}
app.use(async (req, res, next) => {
  await log("backend", "info", "middleware", `${req.method} ${req.originalUrl} called`);
  next();
});

app.get('/', async (req, res) => {
  await log("backend", "info", "handler", "Home route hit");
  res.json({ message: "Welcome to the Express API!" });
});

app.get('/error', async (req, res) => {
  const input = "not_bool";
  if (typeof input !== 'boolean') {
    await log("backend", "error", "handler", "received string, expected bool");
    return res.status(400).json({ error: "Invalid data type" });
  }
  res.json({ message: "All good!" });
});

app.use(async (err, req, res, next) => {
  await log("backend", "error", "handler", err.message || "Unknown error");
  res.status(500).json({ error: "Internal server error" });
});

module.exports = app;
