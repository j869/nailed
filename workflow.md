# Workflow System Documentation

## Overview
The workflow system is designed to manage customer processes through structured job templates organized by products. Each workflow consists of interconnected job templates that create a process flow for different business scenarios.

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

## Implementation Notes

- Antecedent/Descendant arrays define the workflow sequence
- job_change_array contains the automation logic
- Reminder IDs link to follow-up schedules
- Product IDs group related workflows
- Customer categories track workflow status and completion

This system provides a comprehensive project management framework that automatically progresses customers through complex multi-phase processes while maintaining flexibility for custom timing and branching logic.
