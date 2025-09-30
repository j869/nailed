// JS for Expandable Sidebar v3 with Inbox functionality
const menu = document.getElementById('expandableMenu');
const btn = document.getElementById('expandMenuBtn');
const icon = document.getElementById('expandIcon');
const menuContent = menu.querySelector('.menu-content');
const wideBtn = document.getElementById('expandWideBtn');
const wideIcon = document.getElementById('expandWideIcon');
const inboxMenuBtn = document.getElementById('inboxMenuBtn');
const inboxMenuContainer = document.getElementById('inboxMenuContainer');

btn.addEventListener('click', function() {
  if (menu.classList.contains('open')) {
    menu.classList.remove('open');
    menu.classList.remove('super-expanded');
    menuContent.style.display = 'none';
    icon.innerHTML = '&gt;';
    btn.title = 'Expand menu';
    wideBtn.style.display = 'none';
    wideBtn.title = 'Expand to wide menu';
    wideIcon.innerHTML = '\u21F2';
    inboxMenuContainer.innerHTML = '';
  } else {
    menu.classList.add('open');
    menuContent.style.display = 'block';
    icon.innerHTML = '&lt;';
    btn.title = 'Collapse menu';
    wideBtn.style.display = 'inline-block';
    wideBtn.title = 'Expand to wide menu';
    wideIcon.innerHTML = '\u21F2';
    loadInboxMenu();
  }
});

wideBtn.addEventListener('click', function() {
  if (!menu.classList.contains('super-expanded')) {
    menu.classList.add('super-expanded');
    wideBtn.title = 'Contract to normal menu';
    wideIcon.innerHTML = '\u21F1';
  } else {
    menu.classList.remove('super-expanded');
    wideBtn.title = 'Expand to wide menu';
    wideIcon.innerHTML = '\u21F2';
  }
});

inboxMenuBtn.addEventListener('click', function(e) {
  e.preventDefault();
  if (!menu.classList.contains('open')) {
    menu.classList.add('open');
    menuContent.style.display = 'block';
    icon.innerHTML = '&lt;';
    btn.title = 'Collapse menu';
    wideBtn.style.display = 'inline-block';
    wideBtn.title = 'Expand to wide menu';
    wideIcon.innerHTML = '\u21F2';
  }
  loadInboxMenu();
});

function loadInboxMenu() {
  // Simulate inbox fetch (replace with real API call)
  inboxMenuContainer.innerHTML = '<div class="inbox-list"><strong>Inbox</strong><ul><li>Message 1: Welcome!</li><li>Message 2: System update</li><li>Message 3: New job assigned</li></ul></div>';
}
