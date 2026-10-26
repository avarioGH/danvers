import { Client } from 'ssh2';

const conn = new Client();
conn.on('ready', () => {
  conn.exec('cat /root/danvers/data/jarvis/workers.json', (err, stream) => {
    if (err) throw err;
    let out = '';
    stream.on('data', (d: Buffer) => out += d.toString());
    stream.on('close', () => {
      try {
        const workers = JSON.parse(out);
        console.log(`Found ${workers.length} workers registered on VPS:`);
        workers.forEach((w: any) => {
          console.log(`- ID: ${w.id} | Name: ${w.name} | Status: ${w.status} | LastHeartbeat: ${w.lastHeartbeat}`);
        });
      } catch (e) {
        console.log('Raw output:', out);
      }
      conn.end();
    });
  });
}).connect({
  host: '194.233.85.181',
  port: 22,
  username: 'root',
  password: process.env.VPS_SSH_PASSWORD || 'Avario050306'
});
