import { Client } from 'ssh2';

const conn = new Client();

const finishRebase = `
cd /root/danvers
GIT_EDITOR=true git rebase --continue || git rebase --abort || true
git checkout origin/main data/jarvis/audit_log.json 2>/dev/null || true
git log -n 1 --oneline
`;

conn.on('ready', () => {
  conn.exec(finishRebase, (err, stream) => {
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
