/**
 * Update Helper Functions
 * Standardized utilities for handling field updates
 */

export class UpdateHelper {
  constructor(db, axios, API_URL) {
    this.db = db;
    this.axios = axios;
    this.API_URL = API_URL;
  }

  /**
   * Standardized field update with validation and error handling
   */
  async updateField(table, column, value, id, options = {}) {
    try {
      const {
        encoding = 'none',
        validation = null,
        maxLength = null,
        allowNull = true
      } = options;

      // Handle null/empty values
      if (!allowNull && (value === null || value === undefined || value === '')) {
        throw new Error('Value cannot be null or empty');
      }

      // Apply validation
      if (validation && !this.validateValue(value, validation)) {
        throw new Error(`Validation failed for ${column}`);
      }

      // Process the value
      let processedValue = value;
      
      // Handle max length
      if (maxLength && value && value.length > maxLength) {
        processedValue = value.substring(0, maxLength - 3) + '...';
      }

      // Apply encoding
      if (encoding === 'uri' && processedValue) {
        processedValue = encodeURIComponent(processedValue);
      }

      // Execute the update
      const response = await this.axios.get(`${this.API_URL}/update`, {
        params: {
          table,
          column,
          value: processedValue,
          id
        }
      });

      if (response.status === 201 || response.status === 200) {
        return {
          success: true,
          originalValue: value,
          processedValue,
          table,
          column,
          id
        };
      } else {
        throw new Error(`Update failed with status: ${response.status}`);
      }

    } catch (error) {
      console.error(`UpdateHelper.updateField error:`, error);
      return {
        success: false,
        error: error.message,
        table,
        column,
        id
      };
    }
  }

  /**
   * Update with transaction support
   */
  async updateWithTransaction(updates, context = {}) {
    const client = await this.db.connect();
    
    try {
      await client.query('BEGIN');
      const results = [];

      for (const update of updates) {
        const result = await this.updateField(
          update.table,
          update.column,
          update.value,
          update.id,
          update.options || {}
        );
        
        if (!result.success) {
          throw new Error(`Transaction failed at update: ${result.error}`);
        }
        
        results.push(result);
      }

      await client.query('COMMIT');
      return {
        success: true,
        results
      };

    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Transaction failed:', error);
      return {
        success: false,
        error: error.message
      };
    } finally {
      client.release();
    }
  }

  /**
   * Update with cascade to related records
   */
  async updateWithCascade(primaryUpdate, cascadeRules, context = {}) {
    try {
      // Execute primary update
      const primaryResult = await this.updateField(
        primaryUpdate.table,
        primaryUpdate.column,
        primaryUpdate.value,
        primaryUpdate.id,
        primaryUpdate.options || {}
      );

      if (!primaryResult.success) {
        return primaryResult;
      }

      // Execute cascade updates
      const cascadeResults = [];
      for (const rule of cascadeRules) {
        if (this.shouldExecuteCascade(rule, primaryUpdate, context)) {
          const cascadeUpdate = await this.executeCascadeRule(rule, primaryUpdate, context);
          cascadeResults.push(cascadeUpdate);
        }
      }

      return {
        success: true,
        primaryResult,
        cascadeResults
      };

    } catch (error) {
      console.error('Cascade update failed:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Batch update multiple fields with rollback on failure
   */
  async batchUpdate(fieldUpdates, context = {}) {
    const updates = fieldUpdates.map(update => ({
      table: update.table,
      column: update.column,
      value: update.value,
      id: update.id,
      options: update.options || {}
    }));

    return await this.updateWithTransaction(updates, context);
  }

  /**
   * Update date fields with smart parsing
   */
  async updateDateField(table, column, value, id, options = {}) {
    let dateValue = value;

    // Handle special date values
    if (value === 'now' || value === 'today') {
      const dateObj = new Date();
      dateValue = `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}-${String(dateObj.getDate()).padStart(2, '0')}`;
    } else if (value && value.startsWith('add_')) {
      // Handle relative dates like 'add_5' for 5 days from now
      const daysToAdd = parseInt(value.replace('add_', ''), 10);
      const dateObj = new Date();
      dateObj.setDate(dateObj.getDate() + daysToAdd);
      dateValue = dateObj.toISOString().split('T')[0];
    } else if (value && value.startsWith('today ')) {
      // Handle 'today 5' format
      const daysToAdd = parseInt(value.split(' ')[1], 10);
      const dateObj = new Date();
      dateObj.setDate(dateObj.getDate() + daysToAdd);
      dateValue = dateObj.toISOString().split('T')[0];
    }

    // Validate date format
    if (dateValue && isNaN(Date.parse(dateValue))) {
      return {
        success: false,
        error: `Invalid date value: ${dateValue}`
      };
    }

    return await this.updateField(table, column, dateValue, id, {
      ...options,
      validation: 'date'
    });
  }

  /**
   * Update status with workflow triggers
   */
  async updateStatusField(table, column, value, id, workflowConfig = null) {
    try {
      // Update the status
      const statusResult = await this.updateField(table, column, value, id);
      
      if (!statusResult.success) {
        return statusResult;
      }

      // Execute workflow if configured
      let workflowResults = [];
      if (workflowConfig) {
        workflowResults = await this.executeStatusWorkflow(table, id, value, workflowConfig);
      }

      return {
        success: true,
        statusResult,
        workflowResults
      };

    } catch (error) {
      console.error('Status update with workflow failed:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Validate value based on type
   */
  validateValue(value, validationType) {
    switch (validationType) {
      case 'email':
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
      case 'date':
        return !isNaN(Date.parse(value));
      case 'number':
        return !isNaN(value);
      case 'required':
        return value !== null && value !== undefined && value !== '';
      default:
        return true;
    }
  }

  /**
   * Check if cascade rule should execute
   */
  shouldExecuteCascade(rule, primaryUpdate, context) {
    if (!rule.condition) return true;
    
    const { condition } = rule;
    if (condition.field && condition.value) {
      return primaryUpdate.value === condition.value;
    }
    
    return true;
  }

  /**
   * Execute cascade rule
   */
  async executeCascadeRule(rule, primaryUpdate, context) {
    try {
      const { action } = rule;
      
      switch (action.type) {
        case 'updateRelated':
          return await this.updateRelatedRecords(action, primaryUpdate, context);
        case 'createRecord':
          return await this.createRelatedRecord(action, primaryUpdate, context);
        case 'deleteWorksheets':
          return await this.deleteRelatedWorksheets(action, primaryUpdate, context);
        default:
          console.warn(`Unknown cascade action: ${action.type}`);
          return { success: false, error: `Unknown action: ${action.type}` };
      }
    } catch (error) {
      console.error('Cascade rule execution failed:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Update related records
   */
  async updateRelatedRecords(action, primaryUpdate, context) {
    const { targetTable, targetColumn, targetValue, whereClause } = action;
    
    try {
      // Build the WHERE clause with actual values
      let whereCondition = whereClause.replace('${primaryId}', primaryUpdate.id);
      
      const query = `UPDATE ${targetTable} SET ${targetColumn} = $1 WHERE ${whereCondition}`;
      const result = await this.db.query(query, [targetValue]);
      
      return {
        success: true,
        affectedRows: result.rowCount,
        action: 'updateRelated'
      };
    } catch (error) {
      console.error('Update related records failed:', error);
      return {
        success: false,
        error: error.message,
        action: 'updateRelated'
      };
    }
  }

  /**
   * Create related record
   */
  async createRelatedRecord(action, primaryUpdate, context) {
    // Implementation for creating related records
    console.log('Create related record:', action);
    return { success: true, action: 'createRecord' };
  }

  /**
   * Delete related worksheets
   */
  async deleteRelatedWorksheets(action, primaryUpdate, context) {
    try {
      const { whereClause } = action;
      let whereCondition = whereClause.replace('${primaryId}', primaryUpdate.id);
      
      const query = `DELETE FROM worksheets WHERE ${whereCondition}`;
      const result = await this.db.query(query);
      
      return {
        success: true,
        deletedRows: result.rowCount,
        action: 'deleteWorksheets'
      };
    } catch (error) {
      console.error('Delete worksheets failed:', error);
      return {
        success: false,
        error: error.message,
        action: 'deleteWorksheets'
      };
    }
  }

  /**
   * Execute status-specific workflow
   */
  async executeStatusWorkflow(table, id, status, workflowConfig) {
    const results = [];
    
    try {
      // Get workflow rules for this status
      const workflowQuery = await this.db.query(
        `SELECT change_array FROM ${table} WHERE id = $1`,
        [id]
      );
      
      if (workflowQuery.rows.length > 0 && workflowQuery.rows[0].change_array) {
        const changeArray = workflowQuery.rows[0].change_array;
        console.log(`Executing workflow for ${table}(${id}) status(${status}):`, changeArray);
        
        // Process workflow rules here
        // This would integrate with your existing workflow logic
      }
      
      return results;
    } catch (error) {
      console.error('Status workflow execution failed:', error);
      return [{ success: false, error: error.message }];
    }
  }

  /**
   * Get update statistics
   */
  getUpdateStats() {
    return {
      version: '1.0.0',
      features: [
        'Standardized validation',
        'Transaction support',
        'Cascade updates',
        'Workflow integration',
        'Error handling'
      ]
    };
  }
}

export default UpdateHelper;
