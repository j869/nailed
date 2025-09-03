# Workflow Rules Management Tools

**Goal:** Build tools to review existing workflows, find corrupted workflow rules, and migrate build workflows to the new JSON-based rule engine.

**Context:** Phase 2 of the `organise` branch - building practical workflow management tools.

**Status:** In Progress  
**Date Started:** 3 September 2025  
**Branch:** organise

---

## Prerequisites ✅

- [x] Phase 1: Rule engine demo completed (`/admin/rule-engine-demo`)
- [x] WF Rule Report duplicate template ID issues resolved
- [x] MVP Rule Templates Editor created (`/rule-templates-editor`) 
- [x] Basic CRUD operations for rule templates working

---

## What We're Trying to Achieve

**Current Problem:**
- Workflow rules are scattered and inconsistent across the database
- Can't easily find and fix broken workflows
- No way to tell if a job follows "standard" rules or has been customized
- Need tools to bulk-update common workflow patterns

**What We Need:**
- Find all existing workflow patterns and catalog them
- Identify broken or corrupted workflow rules
- Distinguish between "stock standard" workflows vs custom ones
- Bulk update standard workflows when business rules change
- Validate that workflows are complete and make sense

---

## Tool Gaps We Need to Fill

### ✅ Tools We Already Have
- **Rule Engine Demo** - Create and test new workflow rules
- **WF Rule Report** - Update workflow rules in jobs table
- **Rule Templates Editor** - Manage rule templates

### ❌ Missing Tools We Need to Build

LOWEST PRIORITY **Tool Gap 1: Job Templates Rule Updater**
- **What:** Update workflow rules in job_templates table (not just jobs)
- **Why:** When we change standard business rules, update all templates at once
- **Example:** "All quote creation templates now need email generation"

MAIN JOB **Tool Gap 2: Workflow Validator** 
- **What:** Check that workflows are complete and make sense
- **Why:** Find and fix broken workflows before they cause problems
- **Example:** Find jobs with missing steps or circular dependencies

PREREQUISITE **Tool Gap 3: Stock Standard Rules Manager**
-we want our schema solit before finalisinc logic on the rule generator
- **What:** Track which workflows are "standard" vs "customized"
- **Why:** When users modify workflows, they should no longer be marked as standard
- **Example:** Job starts as standard template, user customizes it, system marks it as custom

---

## Phase 2: Build the Missing Tools

### Tool 1: Workflow Pattern Scanner
- we need a  (system) column to the jobs table to help here - a single 'system_comments' column would suffice to record assumed patterns, debug problems with the engine, and list problems for our fix-it form. having said that a dedicated table to record workflow problems would be better - I believe both schema changes are best 
- [ ] **Scan all existing workflows** - What patterns are actually being used?
- [ ] **Find broken workflows** - Which jobs have incomplete or corrupted rules?
- [ ] **Catalog workflow types** - What standard patterns exist?
- [ ] **Identify custom workflows** - Which jobs have been modified from templates?

### Tool 2: Job Templates Rule Updater  
- get the job validator working on the jobs table first, then we can repurpose it for use on the teplates table. no point developing it twice
- [ ] **Bulk update job templates** - Change multiple templates at once
- [ ] **Preview template changes** - Show what will be affected before updating
- [ ] **Template validation** - Ensure template changes make sense
- [ ] **Change tracking** - Log what was changed and when

### Tool 3: Stock Standard Rules Manager
this will most likely be a modification to the existing forms. we will action this in phase 3
- [ ] **Auto-unlink custom workflows** - When users modify workflows, mark them as custom
- [ ] **Find stock standard workflows** - Which jobs still match their templates?
- [ ] **Bulk update standard rules** - Change all standard workflows at once
- [ ] **Template compliance checker** - Verify jobs still match their templates

### Tool 4: Workflow Validator
-currently my focus.  we need to build this ASAP
- [ ] **Check workflow completeness** - Do jobs have all required steps?
- [ ] **Find workflow conflicts** - Are there contradictory rules?
- [ ] **Validate workflow logic** - Do the sequences make sense?
- [ ] **Generate validation reports** - Show all workflow problems found

---

## Success Criteria

**When we're done, we should be able to:**
- Find and fix any broken workflows in the system
- Easily update all "standard" workflows when business rules change
- Know which jobs follow standard templates vs custom workflows
- Validate that all workflows are complete and logical
- Bulk update common workflow patterns across templates and jobs

---

## Next Action
I LIKE IT - Start building Tool 1: Workflow pattern scanner to understand what we're working with.
