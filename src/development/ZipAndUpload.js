import AdmZip from 'adm-zip';
import {NodeSSH} from 'node-ssh';
import { exit } from 'process';
import  chalk  from 'chalk'
import { promises, rmSync } from 'fs';

const ssh = new NodeSSH()
const time = performance.now();

const d = new Date();
let hour = "" + d.getHours();
while(hour.length  < 2) hour = "0" + hour;

let minute = "" + d.getMinutes();
while(minute.length < 2) minute = "0" + minute;

let seconds = "" + d.getSeconds();
while(seconds.length < 2) seconds = "0" + seconds;

const date = d.getDate() + "." + d.getMonth() + "." + d.getFullYear() + ",_" + hour + "_" + minute + "_" + seconds;

const zipDirectory = async (sourceDir, outputFilePath) => {
    const zip = new AdmZip();
    zip.addLocalFolder(sourceDir);
    await zip.writeZipPromise(outputFilePath);
    console.log(`Zip file created: ${outputFilePath}`);
};

console.log(chalk.blue('Zipping the dist directory...'));
await promises.mkdir('intern/tmp', { recursive: true });
await zipDirectory('dist', 'intern/tmp/dist.zip');

await ssh.connect({
  host: 'online-ide.de',
  username: 'root',
  privateKeyPath: 'intern/keys/ssh_private_key.ppk'
})


console.log(chalk.blue('Uploading the zip file to the server...'));
await ssh.mkdir('/var/www/sql-ide/htdocs-new')
await ssh.putFile('intern/tmp/dist.zip', '/var/www/sql-ide/htdocs-new/dist.zip');

console.log(chalk.blue('Unzipping the file on the server...'));
await ssh.execCommand('unzip ./dist.zip', {cwd: '/var/www/sql-ide/htdocs-new'});

console.log(chalk.blue('tidying up...'));
await ssh.execCommand('rm dist.zip', {cwd: '/var/www/sql-ide/htdocs-new'});
await ssh.execCommand('mv htdocs /home/martin/backup/program_files/sql-ide/htdocs-old_' + date, {cwd: '/var/www/sql-ide'});
await ssh.execCommand('mv ./htdocs-new htdocs', {cwd: '/var/www/sql-ide'});

ssh.dispose();

rmSync('intern/tmp', { recursive: true, force: true });

console.log(chalk.green('Done deploying to www.sql-ide.de!'));


/* Embedded-Version */

console.log(chalk.blue('Zipping the dist-embedded/assets directory...'));
await promises.mkdir('intern/tmp', { recursive: true });
await zipDirectory('dist-embedded/assets', 'intern/tmp/assets.zip');


await ssh.connect({
  host: 'mathe-pabst.de',
  username: 'root',
  privateKeyPath: 'intern/keys/ssh_private_key.ppk'
})


console.log(chalk.blue('Uploading files to the server...'));
await ssh.putFile('dist-embedded/sql-ide-embedded.css', '/var/www/learn-sql.de/htdocs/sql-ide/sql-ide-embedded.css');
await ssh.putFile('dist-embedded/sql-ide-embedded.js', '/var/www/learn-sql.de/htdocs/sql-ide/sql-ide-embedded.js');
await ssh.putFile('dist-embedded/sql-ide-embedded.js.map', '/var/www/learn-sql.de/htdocs/sql-ide/sql-ide-embedded.js.map');
await ssh.putFile('dist-embedded/includeIDE.js', '/var/www/learn-sql.de/htdocs/sql-ide/includeIDE.js');

await ssh.mkdir('/var/www/learn-sql.de/htdocs/sql-ide/assets-new');
await ssh.putFile('intern/tmp/assets.zip', '/var/www/learn-sql.de/htdocs/sql-ide/assets-new/assets.zip');

console.log(chalk.blue('Unzipping the file on the server...'));
await ssh.execCommand('unzip ./assets.zip', {cwd: '/var/www/learn-sql.de/htdocs/sql-ide/assets-new'});

console.log(chalk.blue('tidying up...'));
await ssh.execCommand('rm assets.zip', {cwd: '/var/www/learn-sql.de/htdocs/sql-ide/assets-new'});

await ssh.execCommand('rm -r ./assets', {cwd: '/var/www/learn-sql.de/htdocs/sql-ide'});
await ssh.execCommand('mv assets-new assets', {cwd: '/var/www/learn-sql.de/htdocs/sql-ide'});

await ssh.execCommand('/var/www/embed.learn-sql.de/makeArchive.sh', {cwd: '/var/www/learn-sql.de/htdocs/sql-ide'});

console.log(chalk.green('Done deploying to www.learn-sql.de in ' + Math.round(performance.now() - time) + ' ms!'));

rmSync('intern/tmp', { recursive: true, force: true });

exit();
