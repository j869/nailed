// Inbox module for sidebar v3
import Quill from 'quill';

export async function renderInboxMenu(containerId, userId) {
  const container = document.getElementById(containerId);
  if (!container) return;

  // Fetch SMTP connection details for the user
  let smtpResult;
  try {
    const res = await fetch(`/api/user-smtp?id=${userId}`);
    smtpResult = await res.json();
  } catch (err) {
    smtpResult = { email: 'unknown', smtp_host: '', smtp_password: '' };
  }

  // Render inbox and email composer
  container.innerHTML = `
    <div id="emailMenuHeader" style="font-weight: bold; margin-bottom: 8px;">Inbox: ${smtpResult.email || ''}</div>
    <div id="emailList" style="margin-bottom: 12px; font-size: 0.95em; max-height: 120px; overflow-y: auto;">
      <div style="padding: 4px 0; border-bottom: 1px solid #eee;"><b>From:</b> alice@company.com<br><span style="color:#555;">Project update meeting at 2pm.</span></div>
      <div style="padding: 4px 0; border-bottom: 1px solid #eee;"><b>From:</b> bob@buildingbb.com.au<br><span style="color:#555;">Invoice attached for review.</span></div>
      <div style="padding: 4px 0; border-bottom: 1px solid #eee;"><b>From:</b> john@buildingbb.com.au<br><span style="color:#555;">Re: Site inspection photos.</span></div>
    </div>
    <div id="emailEditor" style="background: #fff; border-radius: 6px; border: 1px solid #ccc;">
      <div id="quillEditor" style="height: 80px;"></div>
      <button id="sendEmailBtn" style="margin-top: 8px; width: 100%; background: #236423; color: #fff; border: none; border-radius: 4px; padding: 6px 0; font-size: 1em; cursor: pointer;">Send</button>
    </div>
  `;

  // Initialize Quill editor
  if (window.Quill) {
    new Quill('#quillEditor', {
      theme: 'snow',
      modules: { toolbar: false },
      placeholder: 'Type your email...'
    });
  }

  // Send email handler (minimalist, for demo)
  const sendBtn = document.getElementById('sendEmailBtn');
  if (sendBtn) {
    sendBtn.onclick = async () => {
      const quill = window.Quill ? Quill.find(document.getElementById('quillEditor')) : null;
      const message = quill ? quill.root.innerHTML : '';
      await fetch('/api/emails', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: smtpResult.email, message })
      });
      sendBtn.innerText = 'Sent!';
      setTimeout(() => { sendBtn.innerText = 'Send'; }, 2000);
    };
  }
}
