import Imap from 'imap';
import { simpleParser } from 'mailparser';

const imap = new Imap({
  user: 'permits@vicpa.com.au',
  password: 'thoreau2',
  host: 'mail.privateemail.com',
  port: 993,
  tls: true
});

function openInbox(cb) {
  imap.openBox('INBOX', true, cb);
}

imap.once('ready', function() {
  openInbox(function(err, box) {
    if (err) throw err;
    console.log('Connected to INBOX');

    imap.search(['UNSEEN'], function(err, results) {
      if (err) throw err;
      if (results.length === 0) {
        console.log('No unseen emails');
        imap.end();
        return;
      }

      const fetch = imap.fetch(results.slice(0, 5), { bodies: '', struct: true, envelope: true }); // Fetch first 5

      fetch.on('message', function(msg, seqno) {
        console.log(`\n--- Email ${seqno} ---`);

        msg.on('body', function(stream, info) {
          let buffer = '';
          stream.on('data', function(chunk) {
            buffer += chunk.toString('utf8');
          });
          stream.once('end', async function() {
            try {
              const parsed = await simpleParser(buffer);
              console.log('Body:');
              console.log(parsed.text || parsed.html || 'No text content');
            } catch (parseErr) {
              console.log('Error parsing body:', parseErr.message);
            }
          });
        });

        msg.once('attributes', function(attrs) {
          const envelope = attrs.envelope;
          if (envelope) {
            console.log('From:', envelope.from ? envelope.from[0].name : 'Unknown');
            console.log('To:', envelope.to ? envelope.to.map(addr => addr.address).join(', ') : 'Unknown');
            console.log('Subject:', envelope.subject || 'No subject');
            console.log('Date:', envelope.date || 'Unknown');
          } else {
            console.log('Envelope not available');
          }
        });

        msg.once('end', function() {
          console.log('Finished processing message');
        });
      });

      fetch.once('error', function(err) {
        console.log('Fetch error: ' + err);
      });

      fetch.once('end', function() {
        console.log('Done fetching all messages');
        imap.end();
      });
    });
  });
});

imap.once('error', function(err) {
  console.log(err);
});

imap.once('end', function() {
  console.log('Connection ended');
});

imap.connect();
