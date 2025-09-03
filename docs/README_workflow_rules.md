# Current Workflow System Documentation

### We are migrating our workflow system to a new engine.  This is the documentation for the legacy workflows

## Overview
The OLD workflow system is designed to manage customer processes through structured job templates organized by products. Each workflow consists of interconnected job templates that create a process flow for different business scenarios.

## Core Workflow Trigger Logic

### Initial Workflow (880) → Vic Permits Workflow (5)
**Key Trigger**: When job template ID 880 ("Add permit workflow") in the Initial Enquiry workflow (Product 8) is completed, it automatically triggers the creation of the Vic Permits workflow (Product 5).

**SQL Implementation**:
```sql
update public.job_templates set job_change_array = '[{"antecedent": "complete","product": [{"addWorkflow": "5"}]}]' where id = 880 and product_id = 8 and tier = 501;
```

This means:
- **Antecedent**: When job 880 is marked "complete"
- **Action**: Add Product 5 (Vic Permits) workflow to the same customer

## Product Definitions

| Product ID | Display Text | Purpose |
|------------|--------------|---------|
| 3 | Internal management | User-defined workflows |
| 4 | Shed Construction | Complete shed build process |
| 5 | Vic Permits | Victorian permit application process |
| 6 | Archive - Completed Permits | Completed permit storage |
| 7 | Archive - Initial Enquiry | Archived cold leads |
| 8 | Initial Enquiry | Lead management and quoting |
| 42 | Archive - Shed Construction | Archived shed builds |

## Workflow Structures

### 1. Initial Enquiry Workflow (Product 8)
**Purpose**: Lead management and customer acquisition process

**Process Flow**:
1. **Initial Enquiry** (800) - Starting point
2. **Quote created** (810) - Quote generation
3. **Quote reviewed** (820) - Internal review
4. **Quote sent date** (830) - Customer delivery
5. **3 day follow up** (840) - First follow-up
6. **14 day follow up** (850) - Second follow-up
7. **Delayed follow up** (860) - Hold status with custom target date
8. **Add permit workflow** (880) - **TRIGGER POINT** → Creates Vic Permits workflow
9. **Archive this customer** (870) - Cold lead archival

**Key Features**:
- Standard follow-up schedule (3 days, 14 days)
- Flexible hold option with custom target dates
- Automatic workflow progression trigger
- Archive option for cold leads

### 2. Vic Permits Workflow (Product 5)
**Purpose**: Victorian permit application management
**Triggered by**: Completion of job 880 in Initial Enquiry workflow

**Major Phases**:

#### Phase 1: Deposit (5100-5118)
- Deposit invoice creation and management
- Customer consent forms
- Payment tracking
- Builder assignment

#### Phase 2: Document Preparation (5200-5245)
- Property information gathering
- Title/POS documentation
- Covenants and planning requirements
- Site plan development
- Engineering requirements

#### Phase 3: Site Plan (5300-5348)
- Detailed site planning
- Technical specifications
- Customer approval process

#### Phase 4: Report & Consent/Buildover (5400-5430)
- Permit application submission
- Council liaison
- RFI management
- Permit issuance

#### Phase 5: Planning Permit (5500-5530)
- Planning permit process (if required)
- Similar RFI and approval process

#### Phase 6: Building Permit (5600-5639)
- Building surveyor appointment
- Building permit submission
- Final permit approval

#### Phase 7: Permit Approved (5700-5724)
- Final processing
- Document distribution
- File archival
- **Archive trigger** → Moves to "Archive - Completed Permits"

#### Phase 8: Amendment (5750-5774)
- Permit amendments (if required)
- Secondary consent processes

### 3. Shed Construction Workflow (Product 4)
**Purpose**: Complete shed construction management

**Major Phases**:
- Initial Enquiry through Final Monthly follow-up
- Pre-Deposit and Deposit management
- Pre-Permit and Document Preparation
- Planning and Building Permits
- Kit ordering and Production
- Site Appraisal and Contract Preparation
- Concreting phase with contractor management
- Erecting phase with frame and cladding
- Plumbing and final inspections

## Job Change Array Logic

### Standard Completion Flow
Most job templates use this pattern:
```json
[{"antecedent": "complete","decendant": [{"status": "pending@NEXT_ID"}, {"target": "today_1@NEXT_ID"}]}]
```
- When current job completes, set next job to pending with target date of tomorrow

### Special Timing Rules
**Concrete Curing Delay** (Job 467 → 474):
```json
[{"antecedent": "complete","decendant": [{"status": "pending@474"}, {"target": "today_7@474"}, {"status": "pending@NEXT"}, {"target": "today_1@NEXT"}]}]
```
- Job 474 (erecting start date) is delayed 7 days after concrete pour (467)

### Archive Actions
**Cold Lead Archival** (Job 870):
```json
[{"antecedent": "complete","customer": [{"setCategory": "Archive - Initial Enquiry"}]},{"antecedent": "pending","customer": [{"setCategory": "!workflowName"}]}]
```

**Permit Completion** (Jobs 5724, 5774):
```json
[{"antecedent": "complete","customer": [{"setCategory": "Archive - Completed Permits"}]},{"antecedent": "pending","customer": [{"setCategory": "!workflowName"}]}]
```

### Workflow Creation
**Add Permit Workflow** (Job 880):
```json
[{"antecedent": "complete","product": [{"addWorkflow": "5"}]}]
```
- Automatically adds Vic Permits workflow to customer

## Tier System

- **Tier 500**: Major phase headers/milestones
- **Tier 501**: Individual tasks within phases
- **Tier 502+**: Sub-tasks (if used)

## Antecedent Inheritance Rules

### Critical Workflow Rule: Tier-Based Antecedent Inheritance

The workflow system follows strict inheritance rules for antecedent relationships that are essential for proper workflow sequencing:

#### **Rule 1: Tier 500 (Header) Inheritance**
```
Tier 500 tasks inherit their antecedent from the PREVIOUS tier 500 task
```

**Example from Workflow 51 (Pre Deposit)**:
- `"Deposit" (5110)` - antecedent: `null` (first task)
- `"Document Preparation" (5131)` - antecedent: `5128` (previous tier 500: "Builder")
- `"Site Plan" (5179)` - antecedent: `5131` (previous tier 500: "Document Preparation")

#### **Rule 2: Tier 501 (Regular Task) Inheritance**
```
Tier 501 tasks ALWAYS inherit from their parent tier 500 task
```

**Example from Workflow 51 (Pre Deposit)**:
- All tasks under "Deposit" section → antecedent: `5110` (parent: "Deposit")
- All tasks under "Document Preparation" section → antecedent: `5131` (parent: "Document Preparation")
- All tasks under "Site Plan" section → antecedent: `5179` (parent: "Site Plan")

### **Why This Matters**

This inheritance structure creates a hierarchical dependency system where:

1. **Phase Control**: Tier 500 tasks act as gatekeepers for entire workflow phases
2. **Section Dependencies**: Each section only becomes available when its header (tier 500) is completed
3. **Logical Progression**: Phases follow a sequential order while allowing parallel work within phases
4. **Workflow Integrity**: Prevents tasks from becoming available before their prerequisites are met

### **Implementation Impact**

When creating new workflows or modifying existing ones, always ensure:
- Tier 500 tasks link to the previous tier 500 task (creating phase sequence)
- Tier 501 tasks link to their immediate tier 500 parent (creating section control)
- First tier 500 task in a workflow has `antecedent_array: null`

**Incorrect Pattern** ❌:
```sql
-- Tier 501 task linking to previous tier 501 task
antecedent_array: 5176  -- Previous tier 501 task
```

**Correct Pattern** ✅:
```sql
-- Tier 501 task linking to parent tier 500 task  
antecedent_array: 5179  -- Parent tier 500 task
```

This rule ensures that all tasks within a section become available simultaneously once the section header is completed, rather than creating unnecessary sequential dependencies within workflow phases.

## Sort Order Logic

Sort orders follow a hierarchical numbering system:
- **XX.00**: Phase headers (tier 500)
- **XX.01-XX.99**: Sequential tasks within phase (tier 501)

Examples:
- `01.00` - Initial Enquiry phase
- `01.01` - Quote created
- `01.02` - Quote reviewed
- `02.00` - Next major phase

## Key Integration Points

1. **Initial Enquiry → Vic Permits**: Job 880 completion triggers Product 5 workflow
2. **Permit Completion → Archive**: Final permit jobs move customer to archive status
3. **Construction Dependencies**: Concrete curing delays affect erecting schedules
4. **Archive Categories**: Different archive types for different completion reasons

## Modular Workflow System (Products 51-55)

### New Branching Permit Workflows
The original monolithic Product 5 (Vic Permits) has been redesigned into 5 modular workflows with branching logic:

| Product ID | Display Text | Purpose |
|------------|--------------|---------|
| 51 | Pre Deposit | Initial setup and site planning (Steps 1.00-3.99) |
| 52 | Report & Consent | R&C permit processing (Step 4.00) |
| 53 | Planning Permit | Planning permit processing (Step 5.00) |
| 54 | Building Permit | Building permit processing (Step 6.00) |
| 55 | Active Permit | Final permit processing and amendments (Steps 7.00-8.99) |

### Branching Logic Flow

#### **From Workflow 51 (Pre Deposit)**:
Three possible paths based on permit requirements:
- **Standard Path**: → Workflow 52 (Report & Consent)
- **Skip R&C**: → Workflow 53 (Planning Permit) 
- **Skip R&C & PP**: → Workflow 54 (Building Permit)

#### **From Workflow 52 (Report & Consent)**:
Two possible paths:
- **Standard Path**: → Workflow 53 (Planning Permit)
- **Skip PP**: → Workflow 54 (Building Permit)

#### **Sequential Flow**:
- Workflow 53 → Workflow 54 (Building Permit)
- Workflow 54 → Workflow 55 (Active Permit)
- Workflow 55 → Archive customer

### Branching Implementation

**Workflow 51 Branching Tasks**:
```sql
-- ID 5233: Standard path to R&C
job_change_array = '[{"antecedent": "complete","product": [{"addWorkflow": "52"}]}]'

-- ID 5234: Skip R&C, go to Planning Permit  
job_change_array = '[{"antecedent": "complete","product": [{"addWorkflow": "53"}]}]'

-- ID 5235: Skip R&C & PP, go to Building Permit
job_change_array = '[{"antecedent": "complete","product": [{"addWorkflow": "54"}]}]'
```

**Workflow 52 Branching Tasks**:
```sql
-- ID 5273: Standard path to Planning Permit
job_change_array = '[{"antecedent": "complete","product": [{"addWorkflow": "53"}]}]'

-- ID 5274: Skip PP, go to Building Permit
job_change_array = '[{"antecedent": "complete","product": [{"addWorkflow": "54"}]}]'
```

### Benefits of Modular Design

1. **Flexibility**: Choose appropriate permit path based on project requirements
2. **Efficiency**: Skip unnecessary permit phases when not required
3. **Tracking**: Better visibility into specific permit phase progress
4. **Maintenance**: Easier to modify individual permit processes
5. **Reporting**: Granular analytics on permit phase completion times

### ID Range Allocation

To prevent conflicts, each modular workflow uses dedicated ID ranges:
- **Workflow 51**: 5110-5235 (126 IDs reserved)
- **Workflow 52**: 5240-5274 (35 IDs reserved)  
- **Workflow 53**: 5280-5313 (34 IDs reserved)
- **Workflow 54**: 5320-5365 (46 IDs reserved)
- **Workflow 55**: 5370-5424 (55 IDs reserved)

## Implementation Notes

- Antecedent/Descendant arrays define the workflow sequence
- job_change_array contains the automation logic
- Reminder IDs link to follow-up schedules
- Product IDs group related workflows
- Customer categories track workflow status and completion

This system provides a comprehensive project management framework that automatically progresses customers through complex multi-phase processes while maintaining flexibility for custom timing and branching logic.
