import { Client } from 'ssh2';

const conn = new Client();

const checkDockerGroup = `
id jarvis-worker
su -s /bin/bash jarvis-worker -c "echo 'testing socket access' > /var/run/docker.sock" 2>&1 || echo "Docker socket write access denied"
`;

conn.on('ready', () => {
  conn.exec(checkDockerGroup, (err, stream) => {
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
