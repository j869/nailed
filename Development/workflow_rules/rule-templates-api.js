// API Routes for Rule Templates and Analysis
app.get('/admin/rule-analysis', (req, res) => {
    if (!req.session.user || !req.session.user.roles || !req.session.user.roles.includes('sysadmin')) {
        return res.redirect('/login');
    }
    res.render('admin/rule-analysis-report');
});

app.get('/admin/manage-rule-templates', (req, res) => {
    if (!req.session.user || !req.session.user.roles || !req.session.user.roles.includes('sysadmin')) {
        return res.redirect('/login');
    }
    res.render('admin/manage-rule-templates');
});

// API Endpoints for Rule Templates
app.get('/api/rule-templates', async (req, res) => {
    try {
        // Get all rule templates
        const result = await pool.query(`
            SELECT t.*, COUNT(j.id) as usage_count 
            FROM rule_templates t
            LEFT JOIN jobs j ON j.rule_template_id = t.id
            GROUP BY t.id
            ORDER BY t.name ASC
        `);
        
        res.json({ 
            success: true, 
            templates: result.rows 
        });
    } catch (error) {
        console.error('Error fetching rule templates:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to fetch rule templates' 
        });
    }
});

app.get('/api/rule-templates/:id', async (req, res) => {
    try {
        const { id } = req.params;
        
        // Get specific template by ID
        const result = await pool.query(`
            SELECT t.*, COUNT(j.id) as usage_count 
            FROM rule_templates t
            LEFT JOIN jobs j ON j.rule_template_id = t.id
            WHERE t.id = $1
            GROUP BY t.id
        `, [id]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ 
                success: false, 
                message: 'Template not found' 
            });
        }
        
        res.json({ 
            success: true, 
            template: result.rows[0] 
        });
    } catch (error) {
        console.error(`Error fetching template ${req.params.id}:`, error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to fetch template' 
        });
    }
});

app.post('/api/rule-templates', async (req, res) => {
    try {
        const { name, category, description, rule_template, is_active } = req.body;
        
        // Validate input
        if (!name || !category || !rule_template) {
            return res.status(400).json({ 
                success: false, 
                message: 'Missing required fields' 
            });
        }
        
        // Create new template
        const result = await pool.query(`
            INSERT INTO rule_templates (name, category, description, rule_template, is_active)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING id
        `, [name, category, description || '', rule_template, is_active === undefined ? true : is_active]);
        
        res.json({ 
            success: true, 
            message: 'Template created successfully',
            id: result.rows[0].id
        });
    } catch (error) {
        console.error('Error creating rule template:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to create template' 
        });
    }
});

app.put('/api/rule-templates/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { name, category, description, rule_template, is_active } = req.body;
        
        // Validate input
        if (!name || !category || !rule_template) {
            return res.status(400).json({ 
                success: false, 
                message: 'Missing required fields' 
            });
        }
        
        // Update template
        const result = await pool.query(`
            UPDATE rule_templates
            SET name = $1, category = $2, description = $3, 
                rule_template = $4, is_active = $5, updated_at = NOW()
            WHERE id = $6
            RETURNING id
        `, [name, category, description || '', rule_template, is_active === undefined ? true : is_active, id]);
        
        if (result.rowCount === 0) {
            return res.status(404).json({ 
                success: false, 
                message: 'Template not found' 
            });
        }
        
        res.json({ 
            success: true, 
            message: 'Template updated successfully' 
        });
    } catch (error) {
        console.error(`Error updating template ${req.params.id}:`, error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to update template' 
        });
    }
});

app.delete('/api/rule-templates/:id', async (req, res) => {
    try {
        const { id } = req.params;
        
        // Check if template is in use
        const usageCheck = await pool.query(`
            SELECT COUNT(*) as count FROM jobs
            WHERE rule_template_id = $1
        `, [id]);
        
        if (usageCheck.rows[0].count > 0) {
            return res.status(400).json({ 
                success: false, 
                message: 'Cannot delete template that is in use by jobs' 
            });
        }
        
        // Delete template
        const result = await pool.query(`
            DELETE FROM rule_templates
            WHERE id = $1
            RETURNING id
        `, [id]);
        
        if (result.rowCount === 0) {
            return res.status(404).json({ 
                success: false, 
                message: 'Template not found' 
            });
        }
        
        res.json({ 
            success: true, 
            message: 'Template deleted successfully' 
        });
    } catch (error) {
        console.error(`Error deleting template ${req.params.id}:`, error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to delete template' 
        });
    }
});

// API Endpoints for Analysis
app.get('/api/analysis/jobs-change-arrays', async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT j.id, j.name, j.rule_template_id, j.rules, j.last_updated_at
            FROM jobs j
            WHERE j.rules IS NOT NULL AND j.rules != '{}'
            ORDER BY j.last_updated_at DESC
            LIMIT 100
        `);
        
        res.json({
            success: true,
            jobs: result.rows
        });
    } catch (error) {
        console.error('Error fetching jobs change arrays:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch jobs change arrays'
        });
    }
});

app.get('/api/analysis/templates-change-arrays', async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT id, name, category, rule_template, updated_at
            FROM rule_templates
            WHERE rule_template IS NOT NULL AND rule_template != '{}'
            ORDER BY updated_at DESC
        `);
        
        res.json({
            success: true,
            templates: result.rows
        });
    } catch (error) {
        console.error('Error fetching templates change arrays:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch templates change arrays'
        });
    }
});
