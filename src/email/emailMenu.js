// Minimalist email menu logic for expandable sidebar
// This module will handle basic rendering and route setup for email UI

// Import a minimalist rich text editor (Quill.js is lightweight and easy to style)
// You must add Quill to your project: <script src="https://cdn.quilljs.com/1.3.6/quill.js"></script>
// And its CSS: <link href="https://cdn.quilljs.com/1.3.6/quill.snow.css" rel="stylesheet">

export function renderEmailMenu(containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;

  // Minimalist email UI
    container.innerHTML = `
      <div id="emailMenuHeader" style="font-weight: bold; margin-bottom: 8px;">Inbox: john@buildingbb.com.au</div>
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
      modules: { toolbar: false }, // minimalist, no toolbar
      placeholder: 'Type your email...'
    });
  }
}

// Example route handler (for integration)
export function setupEmailMenuRoutes(app) {
  // GET /api/emails - list emails
  app.get('/api/emails', (req, res) => {
    res.json([]); // Minimalist: empty list
  });

  // POST /api/emails - send email
  app.post('/api/emails', (req, res) => {
    res.json({ status: 'sent' });
  });
}
