import { Client } from 'ssh2';

const conn = new Client();

const pullAndCommit = `
cd /root/danvers
git config user.name "Avario Danvers"
git config user.email "seanbillion1@gmail.com"
git add data/jarvis/
git commit -m "chore(jarvis): persist runtime worker registration state on vps" || true
git pull origin main --rebase
git log -n 2 --oneline
`;

conn.on('ready', () => {
  conn.exec(pullAndCommit, (err, stream) => {
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
