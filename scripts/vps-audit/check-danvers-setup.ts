import { Client } from 'ssh2';

const conn = new Client();

const checkDanvers = `
echo "=== PM2 DANVERS DETAILS ==="
pm2 describe danvers 2>/dev/null || true
echo "=== AVARIODANVERS NGINX CONF ==="
cat /etc/nginx/sites-available/avariodanvers.my.id 2>/dev/null || true
`;

conn.on('ready', () => {
  conn.exec(checkDanvers, (err, stream) => {
    if (err) {
      console.error(err);
      conn.end();
      return;
    }
    stream.on('close', () => conn.end())
      .on('data', (d: Buffer) => process.stdout.write(d.toString()))
      .stderr.on('data', (d: Buffer) => process.stderr.write(d.toString()));
  });
}).connect({
  host: '194.233.85.181',
  port: 22,
  username: 'root',
  password: process.env.VPS_SSH_PASSWORD || 'Avario050306'
});
