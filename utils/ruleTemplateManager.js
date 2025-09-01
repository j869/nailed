/**
 * Rule Templates Database Manager
 * Stage 2 Implementation: Database Integration for Rule Engine Demo
 * 
 * Provides CRUD operations for rule templates and basic rule analysis
 * using real database data while preserving existing application logic.
 */

export class RuleTemplateManager {
  constructor(db) {
    this.db = db;
  }

  /**
   * Get system status and rule analysis from real database data
   */
  async getSystemStatus() {
    try {
      const [
        jobStats,
        templateStats,
        customerStats,
        taskStats,
        ruleTemplateStats
      ] = await Promise.all([
        this.getJobStatistics(),
        this.getJobTemplateStatistics(),
        this.getCustomerStatistics(),
        this.getTaskStatistics(),
        this.getRuleTemplateStatistics()
      ]);

      return {
        success: true,
        data: {
          jobs: jobStats,
          templates: templateStats,
          customers: customerStats,
          tasks: taskStats,
          ruleTemplates: ruleTemplateStats,
          analysis: await this.getBasicRuleAnalysis()
        }
      };
    } catch (error) {
      console.error('Error getting system status:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get job statistics from the database
   */
  async getJobStatistics() {
    const query = `
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN status = 'active' THEN 1 END) as active,
        COUNT(CASE WHEN status = 'complete' THEN 1 END) as completed,
        COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending,
        COUNT(CASE WHEN next_job_id IS NOT NULL THEN 1 END) as with_next_job
      FROM jobs
    `;
    
    const result = await this.db.query(query);
    return result.rows[0];
  }

  /**
   * Get job template statistics
   */
  async getJobTemplateStatistics() {
    const query = `
      SELECT 
        COUNT(*) as total,
        COUNT(DISTINCT category) as categories,
        COUNT(CASE WHEN status = 'active' THEN 1 END) as active_templates
      FROM job_templates
    `;
    
    const result = await this.db.query(query);
    return result.rows[0];
  }

  /**
   * Get customer statistics
   */
  async getCustomerStatistics() {
    const query = `
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN status = 'active' THEN 1 END) as active,
        COUNT(CASE WHEN email IS NOT NULL AND email != '' THEN 1 END) as with_email
      FROM customers
    `;
    
    const result = await this.db.query(query);
    return result.rows[0];
  }

  /**
   * Get task statistics
   */
  async getTaskStatistics() {
    const query = `
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN status = 'complete' THEN 1 END) as completed,
        COUNT(CASE WHEN target_date < CURRENT_DATE AND status != 'complete' THEN 1 END) as overdue
      FROM tasks
    `;
    
    const result = await this.db.query(query);
    return result.rows[0];
  }

  /**
   * Get rule template statistics
   */
  async getRuleTemplateStatistics() {
    const query = `
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN is_active = true THEN 1 END) as active,
        COUNT(DISTINCT category) as categories,
        AVG(usage_count) as avg_usage
      FROM rule_templates
    `;
    
    const result = await this.db.query(query);
    return result.rows[0];
  }

  /**
   * Perform basic rule analysis on existing data patterns
   */
  async getBasicRuleAnalysis() {
    try {
      const [
        statusChangePatterns,
        workflowPatterns,
        commonFieldUpdates
      ] = await Promise.all([
        this.analyzeStatusChangePatterns(),
        this.analyzeWorkflowPatterns(),
        this.analyzeCommonFieldUpdates()
      ]);

      return {
        statusChangePatterns,
        workflowPatterns,
        commonFieldUpdates,
        recommendations: this.generateRecommendations(statusChangePatterns, workflowPatterns)
      };
    } catch (error) {
      console.error('Error in rule analysis:', error);
      return {
        statusChangePatterns: [],
        workflowPatterns: [],
        commonFieldUpdates: [],
        recommendations: []
      };
    }
  }

  /**
   * Analyze status change patterns in jobs
   */
  async analyzeStatusChangePatterns() {
    const query = `
      SELECT 
        status,
        COUNT(*) as count,
        COUNT(CASE WHEN next_job_id IS NOT NULL THEN 1 END) as with_next_job
      FROM jobs 
      GROUP BY status
      ORDER BY count DESC
    `;
    
    const result = await this.db.query(query);
    return result.rows;
  }

  /**
   * Analyze workflow patterns
   */
  async analyzeWorkflowPatterns() {
    const query = `
      SELECT 
        jt.category,
        COUNT(j.id) as job_count,
        AVG(CASE WHEN j.status = 'complete' THEN 1.0 ELSE 0.0 END) as completion_rate
      FROM job_templates jt
      LEFT JOIN jobs j ON j.template_id = jt.id
      GROUP BY jt.category
      ORDER BY job_count DESC
    `;
    
    const result = await this.db.query(query);
    return result.rows;
  }

  /**
   * Analyze common field update patterns (simplified for Stage 2)
   */
  async analyzeCommonFieldUpdates() {
    // For Stage 2, return basic field analysis
    return [
      { field: 'job.status', update_frequency: 'high', common_values: ['active', 'complete', 'pending'] },
      { field: 'job.target_date', update_frequency: 'medium', common_values: ['date_extensions'] },
      { field: 'customer.status', update_frequency: 'low', common_values: ['active', 'inactive'] },
      { field: 'task.status', update_frequency: 'high', common_values: ['complete', 'pending'] }
    ];
  }

  /**
   * Generate basic recommendations based on patterns
   */
  generateRecommendations(statusPatterns, workflowPatterns) {
    const recommendations = [];

    // Analyze status patterns for automation opportunities
    statusPatterns.forEach(pattern => {
      if (pattern.status === 'complete' && pattern.with_next_job > 0) {
        recommendations.push({
          type: 'automation',
          priority: 'high',
          title: 'Job Completion Workflow',
          description: `${pattern.with_next_job} completed jobs have next jobs - consider automating next job activation`,
          suggestedRule: 'status_change_next_job_activation'
        });
      }
    });

    // Analyze workflow patterns
    workflowPatterns.forEach(pattern => {
      if (pattern.completion_rate < 0.5 && pattern.job_count > 5) {
        recommendations.push({
          type: 'improvement',
          priority: 'medium',
          title: `${pattern.category} Workflow Optimization`,
          description: `Low completion rate (${Math.round(pattern.completion_rate * 100)}%) suggests need for workflow rules`,
          suggestedRule: 'workflow_monitoring'
        });
      }
    });

    return recommendations;
  }

  /**
   * CRUD Operations for Rule Templates
   */

  /**
   * Get all rule templates
   */
  async getAllRuleTemplates() {
    try {
      const query = `
        SELECT rt.*, u.display_name as created_by_name
        FROM rule_templates rt
        LEFT JOIN users u ON rt.created_by = u.id
        ORDER BY rt.created_at DESC
      `;
      
      const result = await this.db.query(query);
      return {
        success: true,
        data: result.rows
      };
    } catch (error) {
      console.error('Error getting rule templates:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get rule template by ID
   */
  async getRuleTemplateById(id) {
    try {
      const query = `
        SELECT rt.*, u.display_name as created_by_name
        FROM rule_templates rt
        LEFT JOIN users u ON rt.created_by = u.id
        WHERE rt.id = $1
      `;
      
      const result = await this.db.query(query, [id]);
      
      if (result.rows.length === 0) {
        return {
          success: false,
          error: 'Rule template not found'
        };
      }
      
      return {
        success: true,
        data: result.rows[0]
      };
    } catch (error) {
      console.error('Error getting rule template:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Create new rule template
   */
  async createRuleTemplate(templateData, userId) {
    try {
      const { name, description, category, template_json, tags = [] } = templateData;
      
      const query = `
        INSERT INTO rule_templates (name, description, category, template_json, created_by, tags)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *
      `;
      
      const result = await this.db.query(query, [
        name,
        description,
        category,
        JSON.stringify(template_json),
        userId,
        tags
      ]);
      
      return {
        success: true,
        data: result.rows[0]
      };
    } catch (error) {
      console.error('Error creating rule template:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Update rule template
   */
  async updateRuleTemplate(id, templateData, userId) {
    try {
      const { name, description, category, template_json, tags, is_active } = templateData;
      
      const query = `
        UPDATE rule_templates 
        SET name = $1, description = $2, category = $3, template_json = $4, 
            tags = $5, is_active = $6, updated_at = CURRENT_TIMESTAMP
        WHERE id = $7 AND (created_by = $8 OR $8 IN (SELECT id FROM users WHERE system_access_type = 'admin'))
        RETURNING *
      `;
      
      const result = await this.db.query(query, [
        name,
        description,
        category,
        JSON.stringify(template_json),
        tags,
        is_active,
        id,
        userId
      ]);
      
      if (result.rows.length === 0) {
        return {
          success: false,
          error: 'Rule template not found or permission denied'
        };
      }
      
      return {
        success: true,
        data: result.rows[0]
      };
    } catch (error) {
      console.error('Error updating rule template:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Delete rule template
   */
  async deleteRuleTemplate(id, userId) {
    try {
      const query = `
        DELETE FROM rule_templates 
        WHERE id = $1 AND (created_by = $2 OR $2 IN (SELECT id FROM users WHERE system_access_type = 'admin'))
        RETURNING *
      `;
      
      const result = await this.db.query(query, [id, userId]);
      
      if (result.rows.length === 0) {
        return {
          success: false,
          error: 'Rule template not found or permission denied'
        };
      }
      
      return {
        success: true,
        data: result.rows[0]
      };
    } catch (error) {
      console.error('Error deleting rule template:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Increment usage count for a rule template
   */
  async incrementUsageCount(id) {
    try {
      const query = `
        UPDATE rule_templates 
        SET usage_count = usage_count + 1, updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
        RETURNING usage_count
      `;
      
      const result = await this.db.query(query, [id]);
      return result.rows[0]?.usage_count || 0;
    } catch (error) {
      console.error('Error incrementing usage count:', error);
      return 0;
    }
  }

  /**
   * Search rule templates
   */
  async searchRuleTemplates(searchTerm, category = null) {
    try {
      let query = `
        SELECT rt.*, u.display_name as created_by_name
        FROM rule_templates rt
        LEFT JOIN users u ON rt.created_by = u.id
        WHERE (rt.name ILIKE $1 OR rt.description ILIKE $1 OR $1 = ANY(rt.tags))
      `;
      
      const params = [`%${searchTerm}%`];
      
      if (category) {
        query += ` AND rt.category = $2`;
        params.push(category);
      }
      
      query += ` ORDER BY rt.usage_count DESC, rt.created_at DESC`;
      
      const result = await this.db.query(query, params);
      
      return {
        success: true,
        data: result.rows
      };
    } catch (error) {
      console.error('Error searching rule templates:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
}
