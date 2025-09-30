import { ImapFlow } from 'imapflow';

async function testEmailRetrieval() {
  const config = {
    host: 'mail.privateemail.com',
    port: 993,
    secure: true,
    auth: {
      user: 'permits@vicpa.com.au',
      pass: 'thoreau2'
    },
    logger: false
  };

  const client = new ImapFlow(config);

  try {
    console.log('Connecting to IMAP server...');
    await client.connect();
    console.log('Connected to IMAP server.');

    const lock = await client.getMailboxLock('INBOX');
    console.log('Lock acquired for mailbox INBOX.');

    let count = 0;
    for await (const message of client.fetch(
      { seen: false },
      {
        envelope: true,
        bodyParts: true,
        bodyStructure: true
      }
    )) {
      if (count >= 5) break; // Limit to 5 emails for testing

      let display_name = message.envelope.from[0].name || 'Unknown';
      if (display_name.length > 15) {
        display_name = display_name.substring(0, 12) + "...";
      }
      let msgDate = message.envelope.date || new Date();
      let msgSubject = message.envelope.subject || 'No subject';
      let msgBody = '';
      let msgTo = message.envelope.to ? message.envelope.to.map(addr => addr.address).join(', ') : 'Unknown';

      console.log(`\n--- Email ${count + 1} ---`);
      console.log('From:', display_name);
      console.log('To:', msgTo);
      console.log('Subject:', msgSubject);
      console.log('Date:', msgDate);

      // Extract HTML body if available, otherwise plain text
      if (message.bodyParts && message.bodyParts.html) {
        msgBody = message.bodyParts.html.toString('utf-8');
        console.log('Body source: bodyParts.html');
      } else if (message.bodyParts && message.bodyParts.text) {
        msgBody = message.bodyParts.text.toString('utf-8');
        console.log('Body source: bodyParts.text');
      } else if (message.bodyStructure) {
        // Fallback: traverse body structure to find text/html or text/plain part
        const findBodyPart = (parts) => {
          for (const part of parts) {
            console.log('Checking part:', part.type, 'part:', part.part);
            if (part.type === 'text/html') {
              console.log('Found HTML part');
              return part;
            } else if (part.type === 'text/plain') {
              console.log('Found plain text part');
              return part;
            } else if (part.parts || part.childNodes) {
              const found = findBodyPart(part.parts || part.childNodes);
              if (found) return found;
            }
          }
          return null;
        };
        const bodyPart = findBodyPart([message.bodyStructure]);
        console.log('Found bodyPart:', bodyPart ? bodyPart.part : 'None');
        if (bodyPart && bodyPart.part) {
          try {
            const timeout = new Promise((_, reject) => setTimeout(() => reject(new Error('Fetch timeout')), 10000));
            const partData = await Promise.race([client.fetchOne(message.uid, { bodyParts: true }), timeout]);
            if (partData && partData.bodyParts && partData.bodyParts[bodyPart.part]) {
              msgBody = partData.bodyParts[bodyPart.part].toString('utf-8');
              console.log('Body source: Fetched from bodyStructure');
            } else {
              console.log('Failed to fetch body part: part not found in response');
            }
          } catch (error) {
            console.log('Failed to fetch body part:', error.message);
          }
        }
      }

      console.log('Body:');
      console.log(msgBody);

      count++;
    }

    lock.release();
    console.log(`\nProcessed ${count} emails.`);
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.logout();
    console.log('Disconnected from IMAP server.');
  }
}

testEmailRetrieval();
