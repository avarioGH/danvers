import { Client } from 'ssh2';

const conn = new Client();
conn.on('ready', () => {
  conn.exec(`node -e '
    const fs = require("fs");
    const tasks = JSON.parse(fs.readFileSync("/root/danvers/data/jarvis/tasks.json", "utf-8"));
    const active = tasks.filter(t => ["running", "assigned", "queued"].includes(t.status));
    console.log(JSON.stringify(active.map(t => ({
      id: t.id,
      title: t.title,
      status: t.status,
      workerId: t.workerId,
      createdAt: t.createdAt,
      updatedAt: t.updatedAt,
      attempts: t.attempts,
      currentStep: t.currentStep,
      logsCount: (t.logs || []).length,
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
