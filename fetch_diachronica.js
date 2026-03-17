import https from 'https';
import fs from 'fs';

https.get('https://chridd.nfshost.com/diachronica/all', (res) => {
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });
  res.on('end', () => {
    fs.writeFileSync('diachronica.html', data);
    console.log('Downloaded diachronica.html');
  });
}).on('error', (err) => {
  console.error(err);
});
