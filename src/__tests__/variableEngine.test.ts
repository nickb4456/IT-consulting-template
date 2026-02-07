/**
 * DraftBridge Gold - Variable Engine Tests
 * 
 * @copyright 2026 DraftBridge
 * @license Proprietary
 */

import { 
  createVariableEngine, 
  VariableEngine 
} from '../services/variableEngine';

import {
  deriveContactFields,
  derivePartyFields,
  deriveAttorneyFields
} from '../services/contactHandler';

import {
  TemplateDefinition,
  Contact,
  Party,
  Attorney
} from '../types/variables';

// ============================================================================
// TEST DATA
// ============================================================================

const mockTemplate: TemplateDefinition = {
  id: 'test-template',
  name: 'Test Template',
  category: 'test',
  version: '1.0.0',
  components: [],
  variables: [
    {
      id: 'clientName',
      name: 'Client Name',
      type: 'text',
      required: true
    },
    {
      id: 'includeSignature',
      name: 'Include Signature',
      type: 'checkbox',
      required: false,
      defaultValue: false
    },
    {
      id: 'signerName',
      name: 'Signer Name',
      type: 'text',
      required: false,
      conditional: {
        dependsOn: 'includeSignature',
        condition: 'equals',
        value: true
      }
    },
    {
      id: 'recipient',
      name: 'Recipient',
      type: 'contact',
      required: true
    }
  ],
  body: 'Dear {{recipient.$salutation}}, ...',
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
  createdBy: 'test'
};

const mockContact: Contact = {
  id: 'contact-1',
  prefix: 'Mr.',
  firstName: 'John',
  middleName: 'Michael',
  lastName: 'Smith',
  suffix: 'Jr.',
  title: 'CEO',
  company: 'Acme Corporation',
  address: {
    street1: '123 Main Street',
    street2: 'Suite 400',
    city: 'Boston',
    state: 'MA',
    zip: '02101'
  },
  email: 'john.smith@acme.com',
  phone: '(617) 555-1234'
};

const mockParty: Party = {
  ...mockContact,
  role: 'plaintiff',
  isEntity: false,
  represented: true
};

const mockAttorney: Attorney = {
  id: 'attorney-1',
  firstName: 'Jane',
  lastName: 'Doe',
  suffix: 'Esq.',
  barNumber: '123456',
  barState: 'MA',
  firmName: 'Doe & Associates LLP',
  firmAddress: {
    street1: '456 Legal Way',
    city: 'Boston',
    state: 'MA',
    zip: '02102'
  },
  email: 'jane.doe@doelaw.com',
  phone: '(617) 555-5678'
};

// ============================================================================
// CONTACT HANDLER TESTS
// ============================================================================

describe('Contact Handler', () => {
  describe('deriveContactFields', () => {
    it('should generate full name', () => {
      const derived = deriveContactFields(mockContact);
      expect(derived.fullName).toBe('John Michael Smith');
    });

    it('should generate full name with prefix', () => {
      const derived = deriveContactFields(mockContact);
      expect(derived.fullNameWithPrefix).toBe('Mr. John Michael Smith');
    });

    it('should generate full name with suffix', () => {
      const derived = deriveContactFields(mockContact);
      expect(derived.fullNameWithSuffix).toBe('John Michael Smith, Jr.');
    });

    it('should generate formal salutation', () => {
      const derived = deriveContactFields(mockContact);
      expect(derived.salutation).toBe('Dear Mr. Smith:');
    });

    it('should generate informal salutation', () => {
      const derived = deriveContactFields(mockContact);
      expect(derived.salutationInformal).toBe('Dear John,');
    });

    it('should generate address block', () => {
      const derived = deriveContactFields(mockContact);
      expect(derived.addressBlock).toContain('John Michael Smith');
      expect(derived.addressBlock).toContain('123 Main Street');
      expect(derived.addressBlock).toContain('Boston, MA 02101');
    });

    it('should generate city state zip', () => {
      const derived = deriveContactFields(mockContact);
      expect(derived.cityStateZip).toBe('Boston, MA 02101');
    });

    it('should generate city state (full)', () => {
      const derived = deriveContactFields(mockContact);
      expect(derived.cityState).toBe('Boston, Massachusetts');
    });

    it('should generate email line', () => {
      const derived = deriveContactFields(mockContact);
      expect(derived.emailLine).toBe('Via Email: john.smith@acme.com');
    });
  });

  describe('derivePartyFields', () => {
    it('should format single plaintiff', () => {
      const parties: Party[] = [mockParty];
      const derived = derivePartyFields(parties);
      expect(derived.plaintiffNames).toBe('JOHN MICHAEL SMITH');
      expect(derived.plaintiffNamesEtAl).toBe('JOHN MICHAEL SMITH');
    });

    it('should format multiple plaintiffs with et al.', () => {
      const party2: Party = { ...mockParty, id: 'party-2', firstName: 'Jane', lastName: 'Doe' };
      const parties: Party[] = [mockParty, party2];
      const derived = derivePartyFields(parties);
      expect(derived.plaintiffNamesEtAl).toBe('JOHN MICHAEL SMITH, et al.');
    });

    it('should use correct versus text', () => {
      const derived1 = derivePartyFields([mockParty], 'v.');
      expect(derived1.versusText).toBe('v.');

      const derived2 = derivePartyFields([mockParty], 'vs.');
      expect(derived2.versusText).toBe('vs.');
    });
  });

  describe('deriveAttorneyFields', () => {
    it('should generate bar line', () => {
      const derived = deriveAttorneyFields(mockAttorney);
      expect(derived.barLine).toBe('Bar No. 123456');
    });

    it('should generate signature block', () => {
      const derived = deriveAttorneyFields(mockAttorney);
      expect(derived.signatureBlock).toContain('Respectfully submitted');
      expect(derived.signatureBlock).toContain('Jane Doe, Esq.');
      expect(derived.signatureBlock).toContain('Bar No. 123456');
    });

    it('should generate counsel block', () => {
      const derived = deriveAttorneyFields(mockAttorney);
      expect(derived.counselBlock).toContain('Jane Doe, Esq.');
      expect(derived.counselBlock).toContain('Doe & Associates LLP');
    });

    it('should generate firm block', () => {
      const derived = deriveAttorneyFields(mockAttorney);
      expect(derived.firmBlock).toContain('Doe & Associates LLP');
      expect(derived.firmBlock).toContain('Boston, MA 02102');
    });
  });
});

// ============================================================================
// VARIABLE ENGINE TESTS
// ============================================================================

describe('Variable Engine', () => {
  let engine: VariableEngine;

  beforeEach(() => {
    engine = createVariableEngine(mockTemplate);
  });

  describe('setValue', () => {
    it('should set a variable value', () => {
      engine.setValue('clientName', 'Test Client');
      expect(engine.getValue('clientName')).toBe('Test Client');
    });

    it('should process contact cascade', () => {
      engine.setValue('recipient', mockContact);
      
      const derived = engine.getDerivedValue('recipient.salutation');
      expect(derived).toBe('Dear Mr. Smith:');
    });
  });

  describe('conditional visibility', () => {
    it('should hide conditional variables when condition not met', () => {
      expect(engine.isVariableVisible('signerName')).toBe(false);
    });

    it('should show conditional variables when condition met', () => {
      engine.setValue('includeSignature', true);
      expect(engine.isVariableVisible('signerName')).toBe(true);
    });
  });

  describe('validation', () => {
    it('should mark required fields as invalid when empty', () => {
      const state = engine.getValidationState();
      expect(state.isValid).toBe(false);
      expect(state.errors.some(e => e.variableId === 'clientName')).toBe(true);
    });

    it('should validate when required fields are filled', () => {
      engine.setValue('clientName', 'Test Client');
      engine.setValue('recipient', mockContact);
      
      const state = engine.getValidationState();
      expect(state.isValid).toBe(true);
    });
  });

  describe('template context', () => {
    it('should provide combined context for rendering', () => {
      engine.setValue('clientName', 'Test Client');
      engine.setValue('recipient', mockContact);

      const context = engine.getTemplateContext();
      
      expect(context.clientName).toBe('Test Client');
      expect(context.recipient).toEqual(mockContact);
      expect((context['recipient$'] as Record<string, unknown>).salutation).toBe('Dear Mr. Smith:');
    });
  });

  describe('getVisibleVariables', () => {
    it('should return only visible variables', () => {
      const visible = engine.getVisibleVariables();
      const ids = visible.map(v => v.id);
      
      expect(ids).toContain('clientName');
      expect(ids).toContain('includeSignature');
      expect(ids).not.toContain('signerName'); // Hidden by condition
    });

    it('should include newly visible variables', () => {
      engine.setValue('includeSignature', true);
      
      const visible = engine.getVisibleVariables();
      const ids = visible.map(v => v.id);
      
      expect(ids).toContain('signerName');
    });
  });
});

// ============================================================================
// INTEGRATION TESTS
// ============================================================================

describe('Integration', () => {
  it('should handle full document workflow', () => {
    const engine = createVariableEngine(mockTemplate);

    // Step 1: Fill required fields
    engine.setValue('clientName', 'Acme Corp');
    engine.setValue('recipient', mockContact);

    // Step 2: Enable optional section
    engine.setValue('includeSignature', true);
    engine.setValue('signerName', 'John Smith');

    // Step 3: Verify complete
    expect(engine.isComplete()).toBe(true);

    // Step 4: Get render context
    const context = engine.getTemplateContext();
    expect(context.clientName).toBe('Acme Corp');
    expect((context['recipient$'] as Record<string, unknown>).addressBlock).toContain('Boston');
  });
});
