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
    console.log("re1      Starting rule engine processing", { fieldID: updateRequest.fieldID, rowID: updateRequest.rowID });
    try {
      const { fieldID, newValue, rowID, table } = updateRequest;
      
      // Get field configuration
      console.log("re201    Getting field configuration", { fieldID });
      const fieldConfig = await this.getFieldConfiguration(fieldID);
      if (!fieldConfig) {
        console.log("re308    Unknown field configuration", { fieldID });
        throw new Error(`Unknown field: ${fieldID}`);
      }

      // Validate the input
      console.log("re202    Validating input", { fieldID, newValue });
      const validationResult = await this.validateInput(newValue, fieldConfig.validations || []);
      if (!validationResult.isValid) {
        console.log("re308    Validation failed", { fieldID, errors: validationResult.errors });
        return {
          success: false,
          error: `Validation failed: ${validationResult.errors.join(', ')}`
        };
      }

      // Execute pre-update actions
      console.log("re203    Executing pre-update actions", { actionsCount: fieldConfig.preActions?.length || 0 });
      await this.executeActions(fieldConfig.preActions || [], { ...context, fieldID, newValue, rowID });

      // Perform the main update
      console.log("re204    Performing main update", { fieldID, table: fieldConfig.table, column: fieldConfig.column });
      const updateResult = await this.executeMainUpdate(fieldConfig, newValue, rowID, context);
      
      if (!updateResult.success) {
        console.log("re308    Main update failed", { fieldID, error: updateResult.error });
        return updateResult;
      }

      // Execute post-update actions
      console.log("re205    Executing post-update actions", { actionsCount: fieldConfig.postActions?.length || 0 });
      await this.executeActions(fieldConfig.postActions || [], { ...context, fieldID, newValue, rowID });

      console.log("re9      Rule engine processing completed successfully", { fieldID, rowID });
      return {
        success: true,
        message: 'Update completed successfully',
        data: updateResult.data
      };

    } catch (error) {
      console.error("re8      Rule engine processing error", { error: error.message });
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
    console.log("ea1      Starting action execution", { actionsCount: actions.length });
    for (const action of actions) {
      if (this.shouldExecuteAction(action, context)) {
        console.log("ea201    Executing action", { actionType: action.type });
        const handler = this.actionHandlers.get(action.type);
        if (handler) {
          await handler(action.params, context);
        } else {
          console.log("ea308    Unknown action type", { actionType: action.type });
        }
      } else {
        console.log("ea202    Skipping action due to condition", { actionType: action.type });
      }
    }
    console.log("ea9      Action execution completed");
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
    console.log("fu1      Starting field update", { table: params.table, column: params.column });
    const { table, column, value } = params;
    const { axios, API_URL, rowID } = context;
    
    let actualValue = value;
    if (value === 'current_user') {
      actualValue = context.user?.id || null;
      console.log("fu201    Using current user ID", { userId: actualValue });
    }

    try {
      await axios.get(`${API_URL}/update`, {
        params: { table, column, value: actualValue, id: rowID }
      });
      console.log("fu9      Field update completed", { table, column, value: actualValue });
    } catch (error) {
      console.error("fu8      Field update failed", { table, column, error: error.message });
    }
  }

  async handleStatusUpdate(params, context) {
    // Similar to handleFieldUpdate but with status-specific logic
    await this.handleFieldUpdate(params, context);
  }

  async handleDateUpdate(params, context) {
    console.log("du1      Starting date update", { table: params.table, column: params.column });
    const { table, column, value } = params;
    const { axios, API_URL, rowID } = context;
    
    let dateValue = value;
    if (value === 'now') {
      const dateObj = new Date();
      dateValue = `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}-${String(dateObj.getDate()).padStart(2, '0')}`;
      console.log("du201    Generated current date", { dateValue });
    }

    try {
      await axios.get(`${API_URL}/update`, {
        params: { table, column, value: dateValue, id: rowID }
      });
      console.log("du9      Date update completed", { table, column, value: dateValue });
    } catch (error) {
      console.error("du8      Date update failed", { table, column, error: error.message });
    }
  }

  async handleRelatedUpdate(params, context) {
    // Handle updates to related tables/records
    console.log("ru1      Related update triggered", { params });
  }

  async handleNotification(params, context) {
    console.log("no1      Notification triggered", { message: params.message });
    // In production, this would send actual notifications
  }

  async handleCreateWorksheet(params, context) {
    console.log("cw1      Create worksheet triggered", { params });
    // Implementation for creating worksheets
  }

  async handleExecuteWorkflow(params, context) {
    console.log("ew1      Starting workflow execution", { triggerField: params.triggerField });
    const { triggerField } = params;
    const { db, rowID } = context;
    
    try {
      const result = await db.query(`SELECT ${triggerField} FROM jobs WHERE id = $1`, [rowID]);
      if (result.rows.length > 0 && result.rows[0][triggerField]) {
        const workflowData = result.rows[0][triggerField];
        console.log("ew9      Workflow execution completed", { jobId: rowID, hasWorkflowData: !!workflowData });
        // Execute workflow logic here
      } else {
        console.log("ew201    No workflow data found", { jobId: rowID });
      }
    } catch (error) {
      console.error("ew8      Workflow execution failed", { jobId: rowID, error: error.message });
    }
  }
}

export default RuleEngine;
