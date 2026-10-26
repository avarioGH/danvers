import { Client } from 'ssh2';

const conn = new Client();
conn.on('ready', () => {
  conn.exec(`node -e '
    const fs = require("fs");
    const tasks = JSON.parse(fs.readFileSync("/root/danvers/data/jarvis/tasks.json", "utf-8"));
    const running = tasks.filter(t => t.status === "running");
    console.log("Count running:", running.length);
    console.log(JSON.stringify(running.map(t => ({
      id: t.id,
      title: t.title,
      workerId: t.workerId,
      status: t.status,
      createdAt: t.createdAt,
      updatedAt: t.updatedAt,
      lastLog: (t.logs || []).slice(-1)[0]
    })), null, 2));
  '`, (err, stream) => {
    if (err) throw err;
    stream.on('data', d => process.stdout.write(d.toString()));
    stream.stderr.on('data', d => process.stderr.write(d.toString()));
    stream.on('close', () => {
      conn.end();
      process.exit(0);
    });
  });
}).connect({
  host: '194.233.85.181',
  port: 22,
  username: 'root',
  password: process.env.VPS_SSH_PASSWORD || 'Avario050306'
});
