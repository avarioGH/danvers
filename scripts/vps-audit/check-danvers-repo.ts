import { Client } from 'ssh2';

const conn = new Client();

const checkDanversApp = `
echo "=== /root/danvers PACKAGE.JSON ==="
cat /root/danvers/package.json 2>/dev/null | grep -E "name|version" || true
echo "=== /root/danvers GIT STATUS ==="
cd /root/danvers && git status 2>/dev/null | head -n 5 || true
echo "=== /root/danvers PORT CHECK ==="
grep -rn "3010" /root/danvers/package.json /root/danvers/next.config.* /root/danvers/server.js 2>/dev/null || true
`;

conn.on('ready', () => {
  conn.exec(checkDanversApp, (err, stream) => {
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
