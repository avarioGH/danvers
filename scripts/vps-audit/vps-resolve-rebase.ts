import { Client } from 'ssh2';

const conn = new Client();

const resolveRebase = `
cd /root/danvers
git checkout --theirs data/jarvis/audit_log.json
git add data/jarvis/audit_log.json
git rebase --continue
git log -n 3 --oneline
`;

conn.on('ready', () => {
  conn.exec(resolveRebase, (err, stream) => {
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
