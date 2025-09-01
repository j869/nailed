/**
 * Rule Engine for handling field updates and workflow automation
 * This is a demo implementation for the organise branch
 */

export class RuleEngine {
  constructor() {
    this.actionHandlers = new Map();
    this.validationRules = new Map();
    this.initializeHandlers();
  }

  /**
   * Initialize default action handlers
   */
  initializeHandlers() {
    // Field update handlers
    this.actionHandlers.set('updateField', this.handleFieldUpdate.bind(this));
    this.actionHandlers.set('updateStatus', this.handleStatusUpdate.bind(this));
    this.actionHandlers.set('updateDate', this.handleDateUpdate.bind(this));
    this.actionHandlers.set('updateRelated', this.handleRelatedUpdate.bind(this));
    this.actionHandlers.set('notify', this.handleNotification.bind(this));
    this.actionHandlers.set('createWorksheet', this.handleCreateWorksheet.bind(this));
    this.actionHandlers.set('executeWorkflow', this.handleExecuteWorkflow.bind(this));

    // Validation rules
    this.validationRules.set('required', (value) => value !== null && value !== undefined && value !== '');
    this.validationRules.set('email', (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value));
    this.validationRules.set('date', (value) => !isNaN(Date.parse(value)));
    this.validationRules.set('maxLength', (value, maxLen) => value.length <= maxLen);
  }

  /**
   * Process a field update with rules
   * @param {Object} updateRequest - The update request object
   * @param {Object} context - Additional context (user, db, etc.)
   * @returns {Object} Result object
   */
  async processUpdate(updateRequest, context) {
    try {
      const { fieldID, newValue, rowID, table } = updateRequest;
      
      // Get field configuration
      const fieldConfig = await this.getFieldConfiguration(fieldID);
      if (!fieldConfig) {
        throw new Error(`Unknown field: ${fieldID}`);
      }

      // Validate the input
      const validationResult = await this.validateInput(newValue, fieldConfig.validations || []);
      if (!validationResult.isValid) {
        return {
          success: false,
          error: `Validation failed: ${validationResult.errors.join(', ')}`
        };
      }

      // Execute pre-update actions
      await this.executeActions(fieldConfig.preActions || [], { ...context, fieldID, newValue, rowID });

      // Perform the main update
      const updateResult = await this.executeMainUpdate(fieldConfig, newValue, rowID, context);
      
      if (!updateResult.success) {
        return updateResult;
      }

      // Execute post-update actions
      await this.executeActions(fieldConfig.postActions || [], { ...context, fieldID, newValue, rowID });

      return {
        success: true,
        message: 'Update completed successfully',
        data: updateResult.data
      };

    } catch (error) {
      console.error('RuleEngine error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get field configuration from database or cache
   */
  async getFieldConfiguration(fieldID) {
    // In demo mode, return hardcoded configurations
    // In production, this would query a database table
    const fieldConfigs = {
      'jobTitle': {
        table: 'jobs',
        column: 'display_text',
        validations: [
          { type: 'required' },
          { type: 'maxLength', value: 126 }
        ],
        encoding: 'uri',
        preActions: [],
        postActions: [
          {
            type: 'notify',
            condition: 'always',
            params: { message: 'Job title updated' }
          }
        ]
      },
      'jobStatus': {
        table: 'jobs',
        column: 'current_status',
        validations: [
          { type: 'required' }
        ],
        preActions: [],
        postActions: [
          {
            type: 'updateDate',
            condition: { field: 'current_status', value: 'complete' },
            params: { table: 'jobs', column: 'completed_date', value: 'now' }
          },
          {
            type: 'updateField',
            condition: { field: 'current_status', value: 'complete' },
            params: { table: 'jobs', column: 'user_id', value: 'current_user' }
          },
          {
            type: 'executeWorkflow',
            condition: 'always',
            params: { triggerField: 'change_array' }
          }
        ]
      },
      'taskTitle': {
        table: 'tasks',
        column: 'display_text',
        validations: [
          { type: 'required' },
          { type: 'maxLength', value: 126 }
        ],
        encoding: 'uri',
        preActions: [],
        postActions: []
      }
    };

    return fieldConfigs[fieldID] || null;
  }

  /**
   * Validate input against rules
   */
  async validateInput(value, validations) {
    const errors = [];
    
    for (const validation of validations) {
      const validator = this.validationRules.get(validation.type);
      if (validator) {
        const isValid = validation.value 
          ? validator(value, validation.value)
          : validator(value);
        
        if (!isValid) {
          errors.push(`${validation.type} validation failed`);
        }
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Execute the main database update
   */
  async executeMainUpdate(fieldConfig, newValue, rowID, context) {
    try {
      const { axios, API_URL } = context;
      
      let processedValue = newValue;
      
      // Apply encoding if specified
      if (fieldConfig.encoding === 'uri') {
        processedValue = encodeURIComponent(newValue);
      }

      // Truncate if max length specified
      const maxLengthValidation = fieldConfig.validations?.find(v => v.type === 'maxLength');
      if (maxLengthValidation && newValue.length > maxLengthValidation.value) {
        processedValue = newValue.substring(0, maxLengthValidation.value - 3) + '...';
        if (fieldConfig.encoding === 'uri') {
          processedValue = encodeURIComponent(processedValue);
        }
      }

      const response = await axios.get(`${API_URL}/update`, {
        params: {
          table: fieldConfig.table,
          column: fieldConfig.column,
          value: processedValue,
          id: rowID
        }
      });

      if (response.status === 201 || response.status === 200) {
        return {
          success: true,
          data: { table: fieldConfig.table, column: fieldConfig.column, value: processedValue }
        };
      } else {
        return {
          success: false,
          error: `Database update failed with status: ${response.status}`
        };
      }

    } catch (error) {
      return {
        success: false,
        error: `Database update error: ${error.message}`
      };
    }
  }

  /**
   * Execute a list of actions
   */
  async executeActions(actions, context) {
    for (const action of actions) {
      if (this.shouldExecuteAction(action, context)) {
        const handler = this.actionHandlers.get(action.type);
        if (handler) {
          await handler(action.params, context);
        } else {
          console.warn(`Unknown action type: ${action.type}`);
        }
      }
    }
  }

  /**
   * Check if an action should be executed based on conditions
   */
  shouldExecuteAction(action, context) {
    if (!action.condition || action.condition === 'always') {
      return true;
    }

    if (typeof action.condition === 'object') {
      const { field, value } = action.condition;
      return context[field] === value || context.newValue === value;
    }

    return false;
  }

  // Action Handlers
  async handleFieldUpdate(params, context) {
    const { table, column, value } = params;
    const { axios, API_URL, rowID } = context;
    
    let actualValue = value;
    if (value === 'current_user') {
      actualValue = context.user?.id || null;
    }

    try {
      await axios.get(`${API_URL}/update`, {
        params: { table, column, value: actualValue, id: rowID }
      });
      console.log(`Field update: ${table}.${column} = ${actualValue}`);
    } catch (error) {
      console.error(`Field update failed: ${error.message}`);
    }
  }

  async handleStatusUpdate(params, context) {
    // Similar to handleFieldUpdate but with status-specific logic
    await this.handleFieldUpdate(params, context);
  }

  async handleDateUpdate(params, context) {
    const { table, column, value } = params;
    const { axios, API_URL, rowID } = context;
    
    let dateValue = value;
    if (value === 'now') {
      const dateObj = new Date();
      dateValue = `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}-${String(dateObj.getDate()).padStart(2, '0')}`;
    }

    try {
      await axios.get(`${API_URL}/update`, {
        params: { table, column, value: dateValue, id: rowID }
      });
      console.log(`Date update: ${table}.${column} = ${dateValue}`);
    } catch (error) {
      console.error(`Date update failed: ${error.message}`);
    }
  }

  async handleRelatedUpdate(params, context) {
    // Handle updates to related tables/records
    console.log('Related update:', params);
  }

  async handleNotification(params, context) {
    console.log(`Notification: ${params.message}`);
    // In production, this would send actual notifications
  }

  async handleCreateWorksheet(params, context) {
    console.log('Create worksheet:', params);
    // Implementation for creating worksheets
  }

  async handleExecuteWorkflow(params, context) {
    const { triggerField } = params;
    const { db, rowID } = context;
    
    try {
      const result = await db.query(`SELECT ${triggerField} FROM jobs WHERE id = $1`, [rowID]);
      if (result.rows.length > 0 && result.rows[0][triggerField]) {
        const workflowData = result.rows[0][triggerField];
        console.log(`Executing workflow for job ${rowID}:`, workflowData);
        // Execute workflow logic here
      }
    } catch (error) {
      console.error(`Workflow execution failed: ${error.message}`);
    }
  }
}

export default RuleEngine;
