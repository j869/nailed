// Add route for rule-analysis page
app.get('/admin/rule-analysis', (req, res) => {
    // Check if user is logged in and has sysadmin role
    if (!req.session.user || !req.session.user.roles || !req.session.user.roles.includes('sysadmin')) {
        return res.redirect('/login');
    }
    res.render('admin/rule-analysis-report');
});
