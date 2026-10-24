import { Client } from 'ssh2';

const conn = new Client();

const checkDanversEnv = `
echo "=== /root/danvers .env.production / .env.local KEYS ONLY ==="
if [ -f /root/danvers/.env ]; then
  cat /root/danvers/.env | grep -v '^#' | awk -F'=' '{print $1}'
fi
if [ -f /root/danvers/.env.local ]; then
  cat /root/danvers/.env.local | grep -v '^#' | awk -F'=' '{print $1}'
fi
if [ -f /root/danvers/.env.production ]; then
  cat /root/danvers/.env.production | grep -v '^#' | awk -F'=' '{print $1}'
fi
echo "=== PM2 DANVERS ENV KEYS ==="
pm2 env 2 2>/dev/null | grep -E "PORT|NODE_ENV" || true
`;

conn.on('ready', () => {
  conn.exec(checkDanversEnv, (err, stream) => {
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
