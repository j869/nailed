/**
 * Enhanced Change Processor for the Organise Branch
 * Integrates with the new Rule Engine for standardized field updates
 */

import RuleEngine from './ruleEngine.js';
import UpdateHelper from './updateHelper.js';

export default class ChangeProcessor {
  constructor(db, axios, API_URL) {
    this.db = db;
    this.axios = axios;
    this.API_URL = API_URL;
    this.ruleEngine = new RuleEngine();
    this.updateHelper = new UpdateHelper(db, axios, API_URL);
  }

  /**
   * Process a field update using the new rule engine
   * This is the main entry point that replaces the large switch statement
   */
  async processFieldUpdate(updateRequest, user) {
    const startTime = Date.now();
    
    try {
      console.log(`chgProc1  Processing update for field: ${updateRequest.fieldID}`);
      
      // Create context for the rule engine
      const context = {
        user,
        axios: this.axios,
        API_URL: this.API_URL,
        db: this.db,
        updateHelper: this.updateHelper
      };

      // Use rule engine for known fields
      const ruleResult = await this.ruleEngine.processUpdate(updateRequest, context);
      
      if (ruleResult.success) {
        const executionTime = Date.now() - startTime;
        console.log(`chgProc2  Rule engine processed ${updateRequest.fieldID} in ${executionTime}ms`);
        return ruleResult;
      } else {
        // Fall back to legacy processing for unknown fields
        console.log(`chgProc3  Rule engine failed, falling back to legacy for ${updateRequest.fieldID}`);
        return await this.processLegacyUpdate(updateRequest, user);
      }

    } catch (error) {
      console.error('chgProc4  Error in ChangeProcessor:', error);
      return {
        success: false,
        error: error.message,
        fallbackToLegacy: true
      };
    }
  }

  /**
   * Legacy processing for fields not yet migrated to rule engine
   */
  async processLegacyUpdate(updateRequest, user) {
    const { fieldID, newValue, rowID } = updateRequest;
    
    console.log(`chgProc5  Legacy processing for ${fieldID}`);
    
    // Map legacy field IDs to new standardized updates
    const legacyMappings = {
      'customerFollowUpDate': {
        table: 'customers',
        column: 'follow_up',
        validation: 'date'
      },
      'otherContact': {
        table: 'customers',
        column: 'contact_other',
        encoding: 'none'
      },
      'contactPhone': {
        table: 'customers',
        column: 'primary_phone',
        validation: 'phone'
      },
      'contactEmail': {
        table: 'customers',
        column: 'primary_email',
        validation: 'email'
      },
      'contactAddress': {
        table: 'customers',
        column: 'home_address',
        encoding: 'uri'
      }
    };

    const mapping = legacyMappings[fieldID];
    if (mapping) {
      return await this.updateHelper.updateField(
        mapping.table,
        mapping.column,
        newValue,
        rowID,
        {
          encoding: mapping.encoding || 'none',
          validation: mapping.validation || null
        }
      );
    }

    // If no mapping found, return error
    return {
      success: false,
      error: `Unknown field: ${fieldID}`,
      requiresMigration: true
    };
  }

  /**
   * Process workflow actions based on job status changes
   */
  async processWorkflowActions(jobId, newStatus, user) {
    try {
      console.log(`chgProc6  Processing workflow for job ${jobId}, status: ${newStatus}`);
      
      // Get workflow configuration for this job
      const workflowQuery = await this.db.query(
        "SELECT change_array FROM jobs WHERE id = $1",
        [jobId]
      );

      if (workflowQuery.rows.length === 0) {
        return { success: true, message: 'No job found' };
      }

      const changeArray = workflowQuery.rows[0].change_array;
      if (!changeArray) {
        return { success: true, message: 'No workflow configured' };
      }

      // Parse and execute workflow rules
      const workflowRules = JSON.parse(changeArray);
      const results = [];

      for (const rule of workflowRules) {
        if (this.shouldExecuteWorkflowRule(rule, newStatus)) {
          const result = await this.executeWorkflowRule(rule, jobId, user);
          results.push(result);
        }
      }

      return {
        success: true,
        workflowResults: results
      };

    } catch (error) {
      console.error('chgProc7  Workflow processing error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Check if a workflow rule should execute based on the trigger condition
   */
  shouldExecuteWorkflowRule(rule, newStatus) {
    if (!rule.trigger) return false;
    
    const { trigger } = rule;
    
    // Handle different trigger types
    if (trigger.type === 'statusChange') {
      return trigger.value === newStatus || trigger.value === 'any';
    }
    
    if (trigger.type === 'fieldChange') {
      // More complex field change logic would go here
      return true;
    }
    
    return false;
  }

  /**
   * Execute a specific workflow rule
   */
  async executeWorkflowRule(rule, jobId, user) {
    try {
      const { actions } = rule;
      const results = [];

      for (const action of actions) {
        let result;
        
        switch (action.type) {
          case 'updateStatus':
            result = await this.executeStatusUpdate(action, jobId, user);
            break;
          case 'createTask':
            result = await this.executeCreateTask(action, jobId, user);
            break;
          case 'sendNotification':
            result = await this.executeSendNotification(action, jobId, user);
            break;
          case 'updateDate':
            result = await this.executeUpdateDate(action, jobId, user);
            break;
          default:
            result = { success: false, error: `Unknown action type: ${action.type}` };
        }
        
        results.push(result);
      }

      return {
        success: true,
        rule: rule.name || 'unnamed',
        actionResults: results
      };

    } catch (error) {
      console.error('chgProc8  Workflow rule execution error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Execute status update action
   */
  async executeStatusUpdate(action, jobId, user) {
    const { targetTable, targetId, newStatus } = action;
    
    return await this.updateHelper.updateField(
      targetTable || 'jobs',
      'current_status',
      newStatus,
      targetId || jobId
    );
  }

  /**
   * Execute create task action
   */
  async executeCreateTask(action, jobId, user) {
    const { title, description, assignedTo } = action;
    
    try {
      const insertQuery = `
        INSERT INTO tasks (display_text, free_text, job_id, owned_by, current_status, created_date)
        VALUES ($1, $2, $3, $4, $5, CURRENT_DATE)
        RETURNING id
      `;
      
      const result = await this.db.query(insertQuery, [
        title,
        description || '',
        jobId,
        assignedTo || user.id,
        'pending'
      ]);

      return {
        success: true,
        taskId: result.rows[0].id,
        action: 'createTask'
      };

    } catch (error) {
      console.error('chgProc9  Create task error:', error);
      return {
        success: false,
        error: error.message,
        action: 'createTask'
      };
    }
  }

  /**
   * Execute send notification action
   */
  async executeSendNotification(action, jobId, user) {
    const { recipient, message, type } = action;
    
    console.log(`chgProc10 Sending ${type || 'info'} notification to ${recipient}: ${message}`);
    
    // In a real implementation, this would integrate with your notification system
    return {
      success: true,
      action: 'sendNotification',
      message: 'Notification sent (demo mode)'
    };
  }

  /**
   * Execute update date action
   */
  async executeUpdateDate(action, jobId, user) {
    const { targetTable, targetColumn, dateValue } = action;
    
    let actualDate = dateValue;
    if (dateValue === 'now') {
      actualDate = new Date().toISOString().split('T')[0];
    }
    
    return await this.updateHelper.updateField(
      targetTable || 'jobs',
      targetColumn,
      actualDate,
      jobId
    );
  }

  /**
   * Get processing statistics
   */
  getProcessingStats() {
    return {
      ruleEngineVersion: this.ruleEngine.getVersion?.() || '1.0.0',
      updateHelperVersion: this.updateHelper.getUpdateStats?.().version || '1.0.0',
      processingMode: 'hybrid', // Rule engine + legacy fallback
      featuresEnabled: [
        'Rule-based processing',
        'Legacy fallback',
        'Workflow automation',
        'Transaction support',
        'Validation engine'
      ]
    };
  }
}

// Legacy export for compatibility
export { ChangeProcessor as JobProcessFlow };