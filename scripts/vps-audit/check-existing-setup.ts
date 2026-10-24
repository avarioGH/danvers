import { Client } from 'ssh2';

const conn = new Client();

const checkCmd = `
echo "=== NGINX SITES ==="
ls -la /etc/nginx/sites-enabled/ /etc/nginx/conf.d/ 2>/dev/null
echo "=== DOCKER COMPOSE FILES ==="
find /root -maxdepth 3 -name "docker-compose*.yml" -o -name "compose.yml" 2>/dev/null
echo "=== SYSTEMD USER SERVICES / PM2 ==="
pm2 list 2>/dev/null || true
`;

conn.on('ready', () => {
  conn.exec(checkCmd, (err, stream) => {
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
