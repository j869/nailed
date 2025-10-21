
app.get("/email/:cust_id/:user_id", async (req, res) => {
    // development for email fetching
  console.log("ge1    fetching emails for CustID(" + ")", req.params);
  const customerID = parseInt(req.params.cust_id);
  const userID = parseInt(req.params.user_id);
  let lock;
  let client;
  let countInserted = 0;

  try {
    // Look up the customerID in the database
    const result = await pool.query("SELECT primary_email FROM customers WHERE id = $1", [customerID]);
    if (result.rows.length === 0) {
      console.error("ge18  No email found for customerID:", customerID);
      return res.status(404).json({ success: false, message: "Email not found" });
    }
    const email = result.rows[0].primary_email;
    // console.log("ge2    Looking up user:", userID);
    const userResult = await pool.query("SELECT id, smtp_host, email, smtp_password FROM users WHERE id = $1", [userID]);
    // console.log("ge2a   ", userResult.rows[0].smtp_password, process.env.SMTP_ENCRYPTION_KEY);
    let smtpPassword = decrypt(userResult.rows[0].smtp_password, process.env.SMTP_ENCRYPTION_KEY);
    let smtpEmail = userResult.rows[0].email;
    let smtpHost = userResult.rows[0].smtp_host;
    console.log("ge3    SMTP connection details: ", smtpHost, smtpEmail, smtpPassword);
    const imapConfig = {
      host: smtpHost,       //"mail.privateemail.com",     //smtpHost,
      port: 993,
      secure: true,
      auth: {
        user: smtpEmail,
        pass: smtpPassword
      },
      logger: false  //  Only logs in development    process.env.NODE_ENV === 'development' ? console : false  
    };
    countInserted = 0;
    client = new ImapFlow(imapConfig);
    console.log("ge4    Connecting to IMAP server...");
    await client.connect();
    console.log("ge4a   Connected to IMAP server.");
    //check if connection is ok
    if (!client.authenticated) {
      console.error("ge83    Failed to connect to IMAP server.");
      return res.status(500).json({ success: false, message: "Failed to connect to IMAP server" });
    }
    lock = await client.getMailboxLock('INBOX');
    console.log("ge4b   Lock acquired for mailbox INBOX.");
    if (!lock) {
      console.error("ge84    Failed to lock mailbox.");
      return res.status(500).json({ success: false, message: "Failed to lock mailbox" });
    }
    console.log("ge5    Fetching latest emails from INBOX for " + email);

    // Limit to latest 10 messages for speed
    const searchCriteria = [
      ["OR", ["FROM", email], ["TO", email]]
    ];
    // Get UIDs of latest 10 messages matching criteria
    let uids = await client.search(searchCriteria, { limit: 10, sort: ["ARRIVAL"], order: "desc" });
    if (!uids || uids.length === 0) {
      console.log("ge6    No matching emails found.");
      lock.release();
      await client.logout();
      let build = await pool.query("SELECT id FROM builds WHERE customer_id = $1", [customerID]);
      return res.json({ success: true, message: "No emails found.", build_id: build.rows[0]?.id });
    }

    // replace all conversations for this customerID
    await pool.query("DELETE FROM conversations where person_id = $1", [customerID]);
    for await (const message of client.fetch(uids, { envelope: true, source: true })) {
      let display_name = message.envelope.from[0].name;
      if (display_name.length > 15) { display_name = display_name.substring(0, 12) + "..."; }
      let msgDate = message.envelope.date || new Date();
      let msgSubject = message.envelope.subject || 'unknown';
      let msgBody = '';
      if (message.source) {
        // Extract plain text body from raw source
        const bodyMatch = message.source.toString().match(/\r?\n\r?\n([\s\S]*)/);
        msgBody = bodyMatch ? bodyMatch[1].trim() : '';
      }
      await pool.query(`
          INSERT INTO public.conversations (
            display_name, person_id, message_text, 
            has_attachment, visibility, job_id, post_date
          ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          display_name,
          customerID,
          msgBody || msgSubject,
          null,
          'public',
          null,
          msgDate
        ]
      );
      countInserted++;
    }
  } catch (err) {
    console.error("ge8    Error processing emails:", err);
    return res.status(500).json({ success: false, message: "Error processing emails: " + err.response });
  } finally {
    lock.release();
    await client.logout();
    console.log("ge9    finished inserting (" + countInserted + ") emails to database");
    let build = await pool.query("SELECT id FROM builds WHERE customer_id = $1", [customerID]);
    return res.json({ success: true, message: "Email processed successfully!", build_id: build.rows[0].id });
  }

});



async function searchMailFolders(imapClient, email) {
  const results = [];
  //usage   : const allResults = await searchMailFolders(imapClient, 'customer@example.com');
  console.log(`le1      Searching all folders for emails related to: ${email}`);
  // Get all folders
  const boxes = await imapClient.getBoxes();
  
  async function searchFolder(folderPath) {
    try {
      await imapClient.switchFolder(folderPath);
      
      const searchCriteria = [
        ['FROM', email],
        ['TO', email],
        ['CC', email], 
        ['BCC', email]
      ];
      
      const messageIds = await imapClient.search(searchCriteria);
      
      if (messageIds.length > 0) {
        results.push({
          folder: folderPath,
          messageIds: messageIds
        });
      }
    } catch (error) {
      console.log(`Could not search folder ${folderPath}:`, error.message);
    }
  }
  
  // Recursive function to traverse all folders
  async function traverseFolders(boxes, prefix = '') {
    for (const [name, box] of Object.entries(boxes)) {
      const folderPath = prefix ? `${prefix}/${name}` : name;
      
      // Skip special folders that might cause issues
      if (box.attribs && box.attribs.includes('\\Noselect')) {
        continue;
      }
      
      // Search this folder
      await searchFolder(folderPath);
      
      // Recursively search subfolders
      if (box.children) {
        await traverseFolders(box.children, folderPath);
      }
    }
  }
  
  await traverseFolders(boxes);
  return results;
}


