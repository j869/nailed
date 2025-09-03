/**
 * Workflow Validator - Prototype 1
 * Complete workflow validation system
 * Created: 4 September 2025
 */

import { pool } from '../index.js';

export class WorkflowValidator {
  constructor() {
    this.problemTypes = {
      JSON_ERROR: 'json_error',
      MISSING_STEPS: 'missing_steps', 
      BROKEN_CHAINS: 'broken_chains',
      TEMPLATE_ISSUES: 'template_issues',
      TIER_VIOLATIONS: 'tier_violations'
    };
  }

  /**
   * Validate JSON structure of change_array
   */
  validateJSON(job) {
    const problems = [];
    
    if (!job.change_array) {
      problems.push({
        table_name: 'jobs',
        record_id: job.id,
        problem_type: this.problemTypes.JSON_ERROR,
        problem_description: 'change_array is null or empty',
        severity: 'high',
        job_info: `Job: ${job.display_text} (Customer: ${job.full_name})`
      });
      return problems;
    }

    try {
      const changeArray = JSON.parse(job.change_array);
      
      // Check if it's an array
      if (!Array.isArray(changeArray)) {
        problems.push({
          table_name: 'jobs',
          record_id: job.id,
          problem_type: this.problemTypes.JSON_ERROR,
          problem_description: 'change_array is not a valid array',
          severity: 'high',
          job_info: `Job: ${job.display_text} (Customer: ${job.full_name})`
        });
        return problems;
      }

      // Validate each step in the array
      changeArray.forEach((step, index) => {
        if (!step || typeof step !== 'object') {
          problems.push({
            table_name: 'jobs',
            record_id: job.id,
            problem_type: this.problemTypes.JSON_ERROR,
            problem_description: `Step ${index + 1} is not a valid object`,
            severity: 'medium',
            job_info: `Job: ${job.display_text} (Customer: ${job.full_name})`
          });
        } else {
          // Check for required fields in workflow steps
          if (!step.antecedent && !step.action) {
            problems.push({
              table_name: 'jobs',
              record_id: job.id,
              problem_type: this.problemTypes.JSON_ERROR,
              problem_description: `Step ${index + 1} missing both antecedent and action fields`,
              severity: 'medium',
              job_info: `Job: ${job.display_text} (Customer: ${job.full_name})`
            });
          }
        }
      });

    } catch (error) {
      problems.push({
        table_name: 'jobs',
        record_id: job.id,
        problem_type: this.problemTypes.JSON_ERROR,
        problem_description: `Invalid JSON syntax: ${error.message}`,
        severity: 'high',
        job_info: `Job: ${job.display_text} (Customer: ${job.full_name})`
      });
    }

    return problems;
  }

  /**
   * Validate workflow completeness - check for missing steps
   */
  validateCompleteness(job) {
    const problems = [];

    // Skip if no valid change_array
    if (!job.change_array) {
      return problems;
    }

    try {
      const changeArray = JSON.parse(job.change_array);
      
      if (!Array.isArray(changeArray) || changeArray.length === 0) {
        problems.push({
          table_name: 'jobs',
          record_id: job.id,
          problem_type: this.problemTypes.MISSING_STEPS,
          problem_description: 'Workflow has no steps defined',
          severity: 'high',
          job_info: `Job: ${job.display_text} (Customer: ${job.full_name})`
        });
        return problems;
      }

      // Check for incomplete workflows
      const hasStartStep = changeArray.some(step => 
        step.antecedent && (step.antecedent.includes('start') || step.antecedent.includes('begin'))
      );
      
      const hasEndStep = changeArray.some(step => 
        step.action && (step.action.includes('complete') || step.action.includes('end') || step.action.includes('finish'))
      );

      if (!hasStartStep) {
        problems.push({
          table_name: 'jobs',
          record_id: job.id,
          problem_type: this.problemTypes.MISSING_STEPS,
          problem_description: 'Workflow appears to be missing start step',
          severity: 'medium',
          job_info: `Job: ${job.display_text} (Customer: ${job.full_name})`
        });
      }

      if (!hasEndStep) {
        problems.push({
          table_name: 'jobs',
          record_id: job.id,
          problem_type: this.problemTypes.MISSING_STEPS,
          problem_description: 'Workflow appears to be missing completion step',
          severity: 'medium',
          job_info: `Job: ${job.display_text} (Customer: ${job.full_name})`
        });
      }

    } catch (error) {
      // JSON errors handled in validateJSON
    }

    return problems;
  }

  /**
   * Validate antecedent/descendant chains
   */
  validateChains(job) {
    const problems = [];

    // Skip if no template or no arrays to compare
    if (!job.antecedent_array || !job.decendant_array || !job.change_array) {
      return problems;
    }

    try {
      const changeArray = JSON.parse(job.change_array);
      const antecedentArray = JSON.parse(job.antecedent_array);
      const descendantArray = JSON.parse(job.decendant_array);

      // Check for broken antecedent chains
      changeArray.forEach((step, index) => {
        if (step.antecedent) {
          const expectedAntecedent = antecedentArray[index];
          if (expectedAntecedent && step.antecedent !== expectedAntecedent) {
            problems.push({
              table_name: 'jobs',
              record_id: job.id,
              problem_type: this.problemTypes.BROKEN_CHAINS,
              problem_description: `Step ${index + 1} antecedent mismatch. Expected: "${expectedAntecedent}", Found: "${step.antecedent}"`,
              severity: 'medium',
              job_info: `Job: ${job.display_text} (Customer: ${job.full_name})`
            });
          }
        }
      });

      // Check for broken descendant chains
      changeArray.forEach((step, index) => {
        if (step.descendant) {
          const expectedDescendant = descendantArray[index];
          if (expectedDescendant && step.descendant !== expectedDescendant) {
            problems.push({
              table_name: 'jobs',
              record_id: job.id,
              problem_type: this.problemTypes.BROKEN_CHAINS,
              problem_description: `Step ${index + 1} descendant mismatch. Expected: "${expectedDescendant}", Found: "${step.descendant}"`,
              severity: 'medium',
              job_info: `Job: ${job.display_text} (Customer: ${job.full_name})`
            });
          }
        }
      });

    } catch (error) {
      // JSON errors handled elsewhere
    }

    return problems;
  }

  /**
   * Validate template linkages
   */
  validateTemplateLinks(job) {
    const problems = [];

    // Job claims to be linked to template but template data is missing
    if (job.job_template_id && (!job.antecedent_array || !job.decendant_array)) {
      problems.push({
        table_name: 'jobs',
        record_id: job.id,
        problem_type: this.problemTypes.TEMPLATE_ISSUES,
        problem_description: `Job linked to template ${job.job_template_id} but template data is missing`,
        severity: 'high',
        job_info: `Job: ${job.display_text} (Customer: ${job.full_name})`
      });
    }

    // Job has template data but no template link
    if (!job.job_template_id && (job.antecedent_array || job.decendant_array)) {
      problems.push({
        table_name: 'jobs',
        record_id: job.id,
        problem_type: this.problemTypes.TEMPLATE_ISSUES,
        problem_description: 'Job has template data but no template link (job_template_id is null)',
        severity: 'low',
        job_info: `Job: ${job.display_text} (Customer: ${job.full_name})`
      });
    }

    // Template exists but appears inactive or broken
    if (job.job_template_id && job.tier === null) {
      problems.push({
        table_name: 'jobs',
        record_id: job.id,
        problem_type: this.problemTypes.TEMPLATE_ISSUES,
        problem_description: `Linked template ${job.job_template_id} has no tier assigned`,
        severity: 'medium',
        job_info: `Job: ${job.display_text} (Customer: ${job.full_name})`
      });
    }

    return problems;
  }

  /**
   * Validate tier inheritance rules
   */
  validateTierInheritance(job) {
    const problems = [];

    // Product has no tier information
    if (!job.product_id) {
      problems.push({
        table_name: 'jobs',
        record_id: job.id,
        problem_type: this.problemTypes.TIER_VIOLATIONS,
        problem_description: 'Job has no product assigned',
        severity: 'high',
        job_info: `Job: ${job.display_text} (Customer: ${job.full_name})`
      });
      return problems;
    }

    // Validate tier value
    if (job.job_template_id && job.tier) {
      if (job.tier < 1 || job.tier >= 999 || isNaN(job.tier)) {
        problems.push({
          table_name: 'jobs',
          record_id: job.id,
          problem_type: this.problemTypes.TIER_VIOLATIONS,
          problem_description: `Invalid tier value: ${job.tier} (must be a number between 1 and 999)`,
          severity: 'medium',
          job_info: `Job: ${job.display_text} (Customer: ${job.full_name})`
        });
      }
    } else if (!job.tier) {
      // Assign default tier if not provided
      job.tier = 500;
    }

    return problems;
  }

  /**
   * Store all problems in the data_problems table
   */
  async storeProblems(allProblems) {
    try {
      // Clear existing workflow problems for this validation run
      await pool.query("DELETE FROM data_problems WHERE problem_type LIKE '%workflow%' OR problem_type IN ('json_error', 'missing_steps', 'broken_chains', 'template_issues', 'tier_violations')");

      // Flatten all problems into a single array
      const flatProblems = [
        ...allProblems.jsonErrors,
        ...allProblems.missingSteps,
        ...allProblems.brokenChains,
        ...allProblems.templateIssues,
        ...allProblems.tierViolations
      ];

      // Insert all problems
      for (const problem of flatProblems) {
        await pool.query(`
          INSERT INTO data_problems (table_name, record_id, problem_type, problem_description, severity)
          VALUES ($1, $2, $3, $4, $5)
          ON CONFLICT (table_name, record_id, problem_type) DO UPDATE SET
            problem_description = EXCLUDED.problem_description,
            severity = EXCLUDED.severity,
            detected_date = NOW()
        `, [
          problem.table_name,
          problem.record_id,
          problem.problem_type,
          problem.problem_description,
          problem.severity
        ]);
      }

      console.log(`Stored ${flatProblems.length} workflow problems in data_problems table`);
      return flatProblems.length;
    } catch (error) {
      console.error('Error storing problems:', error);
      throw error;
    }
  }

  /**
   * Generate summary statistics
   */
  generateSummary(allProblems) {
    const summary = {
      totalProblems: 0,
      byType: {},
      bySeverity: { high: 0, medium: 0, low: 0 },
      uniqueJobs: new Set(),
      uniqueCustomers: new Set()
    };

    // Count problems by type and severity
    Object.keys(allProblems).forEach(type => {
      const problems = allProblems[type];
      summary.byType[type] = problems.length;
      summary.totalProblems += problems.length;

      problems.forEach(problem => {
        summary.bySeverity[problem.severity] = (summary.bySeverity[problem.severity] || 0) + 1;
        summary.uniqueJobs.add(problem.record_id);
        if (problem.job_info) {
          const customerMatch = problem.job_info.match(/Customer: ([^)]+)/);
          if (customerMatch) {
            summary.uniqueCustomers.add(customerMatch[1]);
          }
        }
      });
    });

    // Convert sets to counts
    summary.affectedJobs = summary.uniqueJobs.size;
    summary.affectedCustomers = summary.uniqueCustomers.size;
    delete summary.uniqueJobs;
    delete summary.uniqueCustomers;

    return summary;
  }
}
