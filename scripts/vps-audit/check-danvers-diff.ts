import { Client } from 'ssh2';

const conn = new Client();

const checkDanversDiff = `
echo "=== /root/danvers GIT DIFF STAT ==="
cd /root/danvers && git diff --stat
echo "=== /root/danvers RECENT COMMITS ==="
cd /root/danvers && git log -n 3 --oneline
`;

conn.on('ready', () => {
  conn.exec(checkDanversDiff, (err, stream) => {
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
